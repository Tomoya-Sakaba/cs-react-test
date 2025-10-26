using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.DTOs
{
    public class CreateUserRequest
    {
        public string name { get; set; }
        public string password { get; set; }
    }
}