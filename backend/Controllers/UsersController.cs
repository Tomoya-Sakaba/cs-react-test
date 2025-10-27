using backend.Models.Entity;
using backend.Models.Repository;
using backend.Models.DTOs;
using System;
using System.Linq;
using System.Web.Http;
using System.Text;
using System.Diagnostics;

namespace backend.Controllers
{
    public class UsersController : ApiController
    {
        private readonly UsersRepository _UserRepository = new UsersRepository();

        [HttpPost]
        [Route("api/users")]
        public IHttpActionResult CreateUser([FromBody] CreateUserRequest request)
        {
            try
            {

                // パスワードをハッシュ化
                string hash = HashPassword(request.password);

                var user = new UsersEntity
                {
                    Name = request.name,
                    Password = hash
                };

                int newUserId = _UserRepository.AddUser(user);
                return Ok(new { id = newUserId });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // ユーザー一覧取得API
        [HttpGet]
        [Route("api/users")]
        public IHttpActionResult GetUsers()
        {
            var entities = _UserRepository.GetAllUsers();
            var users = entities.Select(e => new UserResponse
            {
                Id = e.Id,
                Name = e.Name,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            }).ToList();

            return Ok(users);
        }

        // ユーザーを一件取得API
        [HttpGet]
        [Route("api/users/{userId}")]
        public IHttpActionResult GetUser(int userId)
        {
            var entities = _UserRepository.GetUser(userId);
            var users = entities.Select(e => new UserResponse
            {
                Id = e.Id,
                Name = e.Name,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            }).ToList();

            return Ok(users);
        }

        // ユーザーを更新
        [HttpPut]
        [Route("api/users/{userId}")]
        public IHttpActionResult UpdateUser(int userId, [FromBody] UpdateUserRepuest request)
        {
            try
            {

                var user = new UsersEntity
                {
                    Id = userId,
                    Name = request.name,
                };

                _UserRepository.UpdateUser(user);
                return Ok();
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // パスワードをハッシュ化する関数
        private string HashPassword(string password)
        {
            using (var sha = System.Security.Cryptography.SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(password);
                var hashBytes = sha.ComputeHash(bytes);
                return BitConverter.ToString(hashBytes).Replace("-", "");
            }
        }
    }
}