using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using backend.Models.Entity;

namespace backend.Models.Repository
{
    public class UsersRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;
        // GET: UsersRepository
        public void AddUser(UsersEntity user)
        {
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();
                string sql = "INSERT INTO dbo.Users (Name, Password) VALUES (@Name, @Password)";
                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@Name", user.Name);
                    cmd.Parameters.AddWithValue("@Password", user.Password);
                    cmd.ExecuteNonQuery();
                }
            }
        }

        public List<UsersEntity> GetAllUsers()
        {
            var list = new List<UsersEntity>();
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();
                string sql = "SELECT Id, Name, Password, Created_At, Updated_At FROM dbo.Users";
                using (SqlCommand cmd = new SqlCommand(sql, conn))
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        list.Add(new UsersEntity
                        {
                            Id = (int)reader["Id"],
                            Name = (string)reader["Name"],
                            Password = (string)reader["Password"],
                            CreatedAt = (DateTime)reader["Created_At"],
                            UpdatedAt = (DateTime)reader["Updated_At"]
                        });
                    }
                }
            }
            return list;
        }
    }
}