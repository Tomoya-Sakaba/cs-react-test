using backend.Models.Entity;
using Dapper;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;

namespace backend.Models.Repository
{
    public class ReportRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;

        // 報告書を追加
        public void AddReport(ReportEntity report)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    INSERT INTO dbo.Reports (
                        ReportNo, Title, Content, 
                        Created_At, Created_User, Updated_At, Updated_User
                    )
                    VALUES (
                        @ReportNo, @Title, @Content,
                        GETDATE(), @CreatedUser, GETDATE(), @UpdatedUser
                    )";
                db.Execute(sql, report);
            }
        }

        // 報告書を更新
        public void UpdateReport(ReportEntity report)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    UPDATE dbo.Reports
                    SET Title = @Title, Content = @Content,
                        Updated_At = GETDATE(), Updated_User = @UpdatedUser
                    WHERE ReportNo = @ReportNo";
                db.Execute(sql, report);
            }
        }

        // ReportNoで報告書を取得
        public ReportEntity GetReportByReportNo(string reportNo)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT Id, ReportNo, Title, Content,
                           Created_At AS CreatedAt, Created_User AS CreatedUser,
                           Updated_At AS UpdatedAt, Updated_User AS UpdatedUser
                    FROM dbo.Reports
                    WHERE ReportNo = @ReportNo";
                return db.QueryFirstOrDefault<ReportEntity>(sql, new { ReportNo = reportNo });
            }
        }

        // IDで報告書を取得
        public ReportEntity GetReportById(int id)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT Id, ReportNo, Title, Content,
                           Created_At AS CreatedAt, Created_User AS CreatedUser,
                           Updated_At AS UpdatedAt, Updated_User AS UpdatedUser
                    FROM dbo.Reports
                    WHERE Id = @Id";
                return db.QueryFirstOrDefault<ReportEntity>(sql, new { Id = id });
            }
        }

        // すべての報告書を取得（一覧用）
        public List<ReportEntity> GetAllReports()
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT Id, ReportNo, Title, Content,
                           Created_At AS CreatedAt, Created_User AS CreatedUser,
                           Updated_At AS UpdatedAt, Updated_User AS UpdatedUser
                    FROM dbo.Reports
                    ORDER BY Created_At DESC";
                return db.Query<ReportEntity>(sql).ToList();
            }
        }


        // 報告書を削除
        public void DeleteReport(string reportNo)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    DELETE FROM dbo.Reports
                    WHERE ReportNo = @ReportNo";
                db.Execute(sql, new { ReportNo = reportNo });
            }
        }

        // ReportNoが既に存在するかチェック
        public bool ReportNoExists(string reportNo)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT COUNT(1)
                    FROM dbo.Reports
                    WHERE ReportNo = @ReportNo";
                return db.QuerySingle<int>(sql, new { ReportNo = reportNo }) > 0;
            }
        }
    }
}

