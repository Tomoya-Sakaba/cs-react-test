using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.DTOs
{
    public class CreateUserRequest
    {
        public string Name { get; set; }
        public string Password { get; set; }
    }
}