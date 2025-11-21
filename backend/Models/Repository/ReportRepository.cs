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
                    INSERT INTO dbo.t_reports (
                        report_no, title, content, 
                        created_at, created_user, updated_at, updated_user
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
                    UPDATE dbo.t_reports
                    SET title = @Title, content = @Content,
                        updated_at = GETDATE(), updated_user = @UpdatedUser
                    WHERE report_no = @ReportNo";
                db.Execute(sql, report);
            }
        }

        // ReportNoで報告書を取得
        public ReportEntity GetReportByReportNo(string reportNo)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT 
                        id AS Id,
                        report_no AS ReportNo,
                        title AS Title,
                        content AS Content,
                        created_at AS CreatedAt,
                        created_user AS CreatedUser,
                        updated_at AS UpdatedAt,
                        updated_user AS UpdatedUser
                    FROM dbo.t_reports
                    WHERE report_no = @ReportNo";
                return db.QueryFirstOrDefault<ReportEntity>(sql, new { ReportNo = reportNo });
            }
        }

        // IDで報告書を取得
        public ReportEntity GetReportById(int id)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT 
                        id AS Id,
                        report_no AS ReportNo,
                        title AS Title,
                        content AS Content,
                        created_at AS CreatedAt,
                        created_user AS CreatedUser,
                        updated_at AS UpdatedAt,
                        updated_user AS UpdatedUser
                    FROM dbo.t_reports
                    WHERE id = @Id";
                return db.QueryFirstOrDefault<ReportEntity>(sql, new { Id = id });
            }
        }

        // すべての報告書を取得（一覧用）
        public List<ReportEntity> GetAllReports()
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT 
                        id AS Id,
                        report_no AS ReportNo,
                        title AS Title,
                        content AS Content,
                        created_at AS CreatedAt,
                        created_user AS CreatedUser,
                        updated_at AS UpdatedAt,
                        updated_user AS UpdatedUser
                    FROM dbo.t_reports
                    ORDER BY created_at DESC";
                return db.Query<ReportEntity>(sql).ToList();
            }
        }


        // 報告書を削除
        public void DeleteReport(string reportNo)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    DELETE FROM dbo.t_reports
                    WHERE report_no = @ReportNo";
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
                    FROM dbo.t_reports
                    WHERE report_no = @ReportNo";
                return db.QuerySingle<int>(sql, new { ReportNo = reportNo }) > 0;
            }
        }
    }
}

