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
        public int AddUser(UsersEntity user)
        {
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();
                string sql = @"
                    INSERT INTO dbo.Users (Name, Password)
                    VALUES (@Name, @Password)
                    SELECT CAST(SCOPE_IDENTITY() AS int);
                ";
                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@Name", user.Name);
                    cmd.Parameters.AddWithValue("@Password", user.Password);
                    int newId = (int)cmd.ExecuteScalar();

                    return newId;
                }
            }
        }

        public List<UsersEntity> GetAllUsers()
        {
            var list = new List<UsersEntity>();
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();
                string sql = "SELECT Id, Name, Password, Email, Department, Position, Color, Created_At, Updated_At FROM dbo.Users";
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
                            Email = reader["Email"] as string,
                            Department = reader["Department"] as string,
                            Position = reader["Position"] as string,
                            Color = reader["Color"] as string,
                            CreatedAt = (DateTime)reader["Created_At"],
                            UpdatedAt = (DateTime)reader["Updated_At"]
                        });
                    }
                }
            }
            return list;
        }

        public List<UsersEntity> GetUser(int userId)
        {
            var list = new List<UsersEntity>();
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();
                string sql = "SELECT Id, Name, Password, Email, Department, Position, Created_At, Updated_At FROM dbo.Users WHERE ID = @userId";
                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@userId", userId);
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new UsersEntity
                            {
                                Id = (int)reader["Id"],
                                Name = (string)reader["Name"],
                                Password = (string)reader["Password"],
                                Email = reader["Email"] as string,
                                Department = reader["Department"] as string,
                                Position = reader["Position"] as string,
                                CreatedAt = (DateTime)reader["Created_At"],
                                UpdatedAt = (DateTime)reader["Updated_At"]
                            });
                        }
                    }
                }
            }
            return list;
        }

        public void UpdateUser(UsersEntity user)
        {
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();
                string sql = @"
                    UPDATE dbo.Users
                    SET Name = @Name, Updated_At = GETDATE()
                    WHERE id = @Id
                ";
                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@Name", user.Name);
                    cmd.Parameters.AddWithValue("@Id", user.Id);
                    cmd.ExecuteNonQuery();
                }
            }
        }
    }
}