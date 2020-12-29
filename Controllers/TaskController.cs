﻿using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration.UserSecrets;
using Microsoft.IdentityModel.Tokens;
using pm.Models;
using pm.Models.Links;
using pm.Models.UpdateModels;
using project_managment.Data.Models.Dto;
using project_managment.Data.Repositories;
using project_managment.Exceptions;
using project_managment.Filters;
using project_managment.Forms;

namespace project_managment.Controllers
{
    
    [ApiController]
    [Route("/api/tasks")]
    [Authorize(Policy = "IsUserOrAdmin")]
    public class TaskController : ControllerBaseExt
    {
        private readonly ITaskRepository _taskRepository;
        private readonly IUserRepository _userRepository;
        private readonly IProjectRepository _projectRepository;

        public TaskController(ITaskRepository taskRepository,IProjectRepository projectRepository, IUserRepository userRepository, ICommentRepository commentRepository) : 
            base(userRepository, projectRepository, taskRepository, commentRepository)
        {
            _taskRepository = taskRepository;
            _userRepository = userRepository;
            _projectRepository = projectRepository;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetTasks([Required, FromQuery(Name = "projectId")] long projectId)
        {
            var accessLevel = await GetAccessLevelForProject(projectId);
            switch (accessLevel)
            {
                case AccessLevel.Member: case AccessLevel.Creator: case AccessLevel.Admin: case AccessLevel.Anonymous:
                    var tasks = await _taskRepository.FindAllInProjectById(projectId);
                    return Ok(tasks);
                default:
                    throw ProjectException.AccessDenied();
            }
        }

        [HttpGet]
        [Route("{id}")]
        public async Task<IActionResult> GetTask(long id)
        {
            var accessLevel = await GetAccessLevelForTask(id);
            switch (accessLevel)
            {
                case AccessLevel.Member: case AccessLevel.Creator: case AccessLevel.Admin: case AccessLevel.Anonymous:
                    return Ok(Cache.Task ?? await _taskRepository.FindById(id));
                default: 
                    throw TaskException.AccessDenied();
            }
        }

        [HttpPost]
        [ValidateModel]
        public async Task<IActionResult> PostTask([FromBody]CreateTaskForm form, 
                        [Required, FromQuery(Name = "projectId")] long projectId)
        
        {
            var accessLevel = await GetAccessLevelForProject(projectId);
            switch (accessLevel)
            {
                case AccessLevel.Creator: case AccessLevel.Admin: case AccessLevel.Member:
                    var task = form.ToTask();
                    task.ProjectId = projectId;
                    task.CreatorId = GetClientId();
                    
                    var id = await _taskRepository.Save(task);
                    if (id == 0)
                        throw TaskException.PostFailed();

                    if (form.AssignedUsers != null)
                    {
                        var membersIds =
                            (Cache.ProjectMembers ?? await _userRepository.FindAllUsersInProject(projectId))
                            .Select(m => m.Id);
                        foreach (var userId in form.AssignedUsers.Intersect(membersIds))
                        {
                            var link = await _taskRepository.LinkUserAndTask(userId, id);
                        }
                    }
                    
                    return Created($"/api/tasks/{id}", new {id = id});
                default:
                    throw ProjectException.AccessDenied();
            }
        }

        [HttpDelete]
        [Route("{id}")]
        public async Task<IActionResult> DeleteTask(long id)
        {
            var accessLevel = await GetAccessLevelForTask(id);
            
            switch (accessLevel)
            {
                case AccessLevel.Creator: case AccessLevel.Admin: case AccessLevel.TaskCreatorAndMember:
                    await _taskRepository.RemoveById(id);
                    return NoContent();
                default:
                    throw TaskException.AccessDenied();
            }
        }

        [HttpPut]
        [Route("{id}")]
        public async Task<IActionResult> PutTask(long id, [FromBody] TaskUpdate form)
        {
            var accessLevel = await GetAccessLevelForTask(id);
            switch (accessLevel)
            {
                case AccessLevel.Creator: case AccessLevel.Admin: case AccessLevel.TaskCreatorAndMember:
                    try
                    {
                        await _taskRepository.Update(form.ToTask(id));

                        if (form.AssignedUsers != null)
                        {
                            var currentAssignedUsers = await _userRepository.FindAllUsersInTask(id);
                            var membersIds 
                                = (Cache.ProjectMembers ?? 
                                   await _userRepository.FindAllUsersInProject(Cache.Task.ProjectId)).Select(m => m.Id);

                            var currentAssignedUsersIds = currentAssignedUsers.Select(u => u.Id);
                            var assignUsersIds = new List<long>(form.AssignedUsers);

                            var toDeleteIds = currentAssignedUsersIds.Except(form.AssignedUsers).Intersect(membersIds);
                            var toAddIds = assignUsersIds.Except(currentAssignedUsersIds).Intersect(membersIds);
                            
                            foreach (var userId in toDeleteIds)
                            {
                                await _taskRepository.UnlinkUserAndTask(userId, id);
                            }

                            foreach (var userId in toAddIds)
                            {
                                await _taskRepository.LinkUserAndTask(userId, id);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        throw TaskException.UpdateFail();
                    }

                    return NoContent();
                default:
                    throw TaskException.AccessDenied();
            }
        }
        
        
        [HttpGet]
        [Route("{id}/users")]
        public async Task<IActionResult> GetTaskUsers(long id)
        {
            var accessLevel = await GetAccessLevelForTask(id);
            switch (accessLevel)
            {
                case AccessLevel.Member: case AccessLevel.Creator: 
                case AccessLevel.Admin: case AccessLevel.Anonymous:
                case AccessLevel.TaskCreatorAndMember:
                    var users = await _userRepository.FindAllUsersInTask(id);
                    return Ok(users.Select(u => new UserDto(u)));
                default:
                    throw ProjectException.AccessDenied();
            }
        }

        [HttpPost]
        [Route("{taskId}/users")]
        public async Task<IActionResult> PostTaskUser([FromRoute(Name = "taskId")] long taskId,
            [FromQuery(Name = "userId"), Required] long userId)
        {
            var accessLevel = await GetAccessLevelForTask(taskId);
            switch (accessLevel)
            {
                case AccessLevel.Creator: case AccessLevel.Admin: case AccessLevel.TaskCreatorAndMember:
                    var userProjectLink = await _projectRepository.FindLink(userId, Cache.Project.Id);

                    if (userProjectLink == null)
                        throw ProjectException.AccessDenied();
                    
                    var link = await _taskRepository.LinkUserAndTask(userId, taskId);
                    if (link == null)
                        throw TaskException.LinkFailed();
                    return Created("", link);
                default:
                    throw ProjectException.AccessDenied();
            }
        }

        [HttpDelete]
        [Route("{taskId}/users")]

        public async Task<IActionResult> DeleteTaskUser([FromRoute(Name = "taskId")] long taskId,
            [FromQuery(Name = "userId"), Required] long userId)
        {
            var accessLevel = await GetAccessLevelForTask(taskId);
            switch (accessLevel)
            {
                case AccessLevel.Creator: case AccessLevel.Admin: case AccessLevel.TaskCreatorAndMember:
                    await _taskRepository.UnlinkUserAndTask(userId, taskId);
                    return NoContent(); 
                default:
                    throw ProjectException.AccessDenied();
            }
        }

        [HttpGet]
        [Route("statuses")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStatuses()
        {
            return Ok(await _taskRepository.FindAllStatuses());
        }

    }
}