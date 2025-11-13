using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.Entity
{
    public class UsersEntity
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Password { get; set; }
        public string Email { get; set; }
        public string Department { get; set; }
        public string Position { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}