﻿using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using pm.Models;
using project_managment.Data.Dto;
using project_managment.Data.Repositories;
using project_managment.Exceptions;
using project_managment.Filters;
using project_managment.Forms;

namespace project_managment.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize(Policy = "IsUserOrAdmin")]
    public class UserController : ControllerBaseExt
    {
        private readonly IUserRepository _userRepository;
        private readonly IProjectRepository _projectRepository;
        private readonly ITaskRepository _taskRepository;
        public UserController(IUserRepository userRepository, IProjectRepository projectRepository, ITaskRepository taskRepository, ICommentRepository commentRepository) : 
            base(userRepository, projectRepository, taskRepository, commentRepository)
        {
            _userRepository = userRepository;
            _projectRepository = projectRepository;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<List<UserDto>>> GetUsers([Required, FromQuery(Name = "page")] int page,
                                                [Required, FromQuery(Name = "size")] int size)
        {
            var users = await _userRepository.FindAll(page, size);
            return Ok(users.Select(u => new UserDto(u)));
        }

        [HttpGet]
        [Route("{id}")]
        [AllowAnonymous]
        public ActionResult<UserDto> GetUser(long id)
        {
            var user = _userRepository.FindById(id).Result;
            if (user == null)
                throw UserException.NotFound();
            return Ok(new UserDto(user));
        }

        [HttpGet]
        [Route("me")]
        public ActionResult<UserDto> GetMe()
        {
            var user = GetClientUser();
            if (user == null)
                throw UserException.NotFound();
            return Ok(new UserDto(user));
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> PostUser(RegistrationForm form)
        {
            var role = GetClientRoleClaim()?.Value;
            if (User.Identity.IsAuthenticated && role != Role.RoleAdmin)
                throw UserException.CreationDenied();
            var user = form.ToUser();
            long id = 0;
            try
            {
                id = _userRepository.Save(user).Result;
            }
            catch (Exception ignored)
            {
                throw UserException.CreationFailed();
            }

            user = await _userRepository.FindById(id);
            return Created("", new UserDto(user));
        }

        [HttpDelete]
        [Route("{id}")]
        [Authorize(Policy = "IsAdmin")]
        public IActionResult DeleteUser(long id)
        {
            var user = _userRepository.FindUserByEmail(User.Identity.Name).Result;
            if (user.Id == id)
                throw UserException.DeletionDenied();
            _userRepository.RemoveById(id);

            return NoContent();
        }
    }
}
