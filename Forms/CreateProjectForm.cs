﻿using pm.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace project_managment.Forms
{
    public class CreateProjectForm
    {
        [Required]
        public string Name { get; set; }

        [JsonPropertyName("des")]
        public string Description { get; set; }
        public bool IsPrivate { get; set; } = false;
    
        public Project ToProject(long creatorId)
        {
            Project project = new Project();

            project.Name = Name;
            project.Description = Description;
            project.CreatedAt = new DateTime();
            project.CreatorId = creatorId;
            project.IsPrivate = IsPrivate;

            return project;
        }
    }
}
