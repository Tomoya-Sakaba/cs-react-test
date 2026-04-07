using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using Dapper;
using backend.Models.Entities;

namespace backend.Models.Repository
{
    public class PhotoCommentRepository
    {
        private readonly string _connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;

        public List<PhotoCommentEntity> GetAll()
        {
            using (IDbConnection db = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT
                        id AS Id,
                        file_name AS FileName,
                        comment AS Comment,
                        created_at AS CreatedAt
                    FROM dbo.t_photo_comment
                    ORDER BY created_at DESC, id DESC;
                ";
                return db.Query<PhotoCommentEntity>(sql).ToList();
            }
        }

        public PhotoCommentEntity GetById(int id)
        {
            using (IDbConnection db = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT
                        id AS Id,
                        file_name AS FileName,
                        comment AS Comment,
                        created_at AS CreatedAt
                    FROM dbo.t_photo_comment
                    WHERE id = @Id;
                ";
                return db.QuerySingleOrDefault<PhotoCommentEntity>(sql, new { Id = id });
            }
        }

        public PhotoCommentEntity Create(string fileName, string comment)
        {
            using (IDbConnection db = new SqlConnection(_connectionString))
            {
                var sql = @"
                    INSERT INTO dbo.t_photo_comment (file_name, comment)
                    OUTPUT
                        INSERTED.id AS Id,
                        INSERTED.file_name AS FileName,
                        INSERTED.comment AS Comment,
                        INSERTED.created_at AS CreatedAt
                    VALUES (@FileName, @Comment);
                ";
                return db.QuerySingle<PhotoCommentEntity>(sql, new { FileName = fileName, Comment = comment });
            }
        }
    }
}

