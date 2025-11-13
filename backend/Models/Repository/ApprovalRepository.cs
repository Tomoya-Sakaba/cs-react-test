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
    public class ApprovalRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;

        // 上程データを追加
        public void AddApproval(ApprovalEntity approval)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    INSERT INTO dbo.Approvals (
                        ReportNo, Year, Month, UserName, FlowOrder, Status, Comment, ActionDate, Created_At, Updated_At
                    )
                    VALUES (
                        @ReportNo, @Year, @Month, @UserName, @FlowOrder, @Status, @Comment, @ActionDate, GETDATE(), GETDATE()
                    )";
                db.Execute(sql, approval);
            }
        }

        // 報告書No、年、月で上程データを取得
        public List<ApprovalEntity> GetApprovalsByReport(string reportNo, int year, int month)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                // reportNoが空の場合は年・月のみで検索
                string sql;
                if (string.IsNullOrEmpty(reportNo))
                {
                    sql = @"
                        SELECT Id, ReportNo, Year, Month, UserName, FlowOrder, Status, Comment, ActionDate, 
                               Created_At AS CreatedAt, Updated_At AS UpdatedAt
                        FROM dbo.Approvals
                        WHERE Year = @Year AND Month = @Month
                        ORDER BY FlowOrder";
                }
                else
                {
                    sql = @"
                        SELECT Id, ReportNo, Year, Month, UserName, FlowOrder, Status, Comment, ActionDate, 
                               Created_At AS CreatedAt, Updated_At AS UpdatedAt
                        FROM dbo.Approvals
                        WHERE ReportNo = @ReportNo AND Year = @Year AND Month = @Month
                        ORDER BY FlowOrder";
                }
                
                var parameters = new { ReportNo = reportNo, Year = year, Month = month };
                return db.Query<ApprovalEntity>(sql, parameters).ToList();
            }
        }

        // ユーザー名で承認待ちの上程データを取得
        public List<ApprovalEntity> GetPendingApprovalsByUser(string userName)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT Id, ReportNo, Year, Month, UserName, FlowOrder, Status, Comment, ActionDate, 
                           Created_At AS CreatedAt, Updated_At AS UpdatedAt
                    FROM dbo.Approvals
                    WHERE UserName = @UserName AND Status = 1
                    ORDER BY Created_At DESC";
                return db.Query<ApprovalEntity>(sql, new { UserName = userName }).ToList();
            }
        }

        // 上程データを更新
        public void UpdateApproval(ApprovalEntity approval)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    UPDATE dbo.Approvals
                    SET Status = @Status, Comment = @Comment, ActionDate = @ActionDate, Updated_At = GETDATE()
                    WHERE Id = @Id";
                db.Execute(sql, approval);
            }
        }

        // 報告書No、年、月で上程データを削除（取り戻し時など）
        public void DeleteApprovalsByReport(string reportNo, int year, int month)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    DELETE FROM dbo.Approvals
                    WHERE ReportNo = @ReportNo AND Year = @Year AND Month = @Month";
                db.Execute(sql, new { ReportNo = reportNo, Year = year, Month = month });
            }
        }

        // IDで上程データを削除
        public void DeleteApproval(int id)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    DELETE FROM dbo.Approvals
                    WHERE Id = @Id";
                db.Execute(sql, new { Id = id });
            }
        }
    }
}

