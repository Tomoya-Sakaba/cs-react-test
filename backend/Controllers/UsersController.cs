using backend.Models.Entity;
using backend.Models.Repository;
using backend.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;

namespace backend.Controllers
{
    public class UsersController : ApiController
    {
        private readonly UsersRepository repo = new UsersRepository();

        [HttpPost]
        [Route("api/users")]
        public IHttpActionResult CreateUser([FromBody] CreateUserRequest request)
        {
            string hash = HashPassword(request.Password);

            var user = new UsersEntity
            {
                Name = request.Name,
                Password = hash
            };

            repo.AddUser(user);
            return Ok();
        }

        [HttpGet]
        [Route("api/users")]
        public IHttpActionResult GetUsers()
        {
            var entities = repo.GetAllUsers();
            var users = entities.Select(e => new UserResponse
            {
                Id = e.Id,
                Name = e.Name,
                CreatedAt = e.CreatedAt
            }).ToList();

            return Ok(users);
        }

        private string HashPassword(string password)
        {
            using (var sha = System.Security.Cryptography.SHA256.Create())
            {
                var bytes = System.Text.Encoding.UTF8.GetBytes(password);
                var hashBytes = sha.ComputeHash(bytes);
                return BitConverter.ToString(hashBytes).Replace("-", "");
            }
        }
    }
}