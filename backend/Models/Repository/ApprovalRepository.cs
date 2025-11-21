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
                    INSERT INTO dbo.t_approvals (
                        page_code, report_no, year, month, user_name, flow_order, status, comment, action_date, created_at, updated_at
                    )
                    VALUES (
                        @PageCode, @ReportNo, @Year, @Month, @UserName, @FlowOrder, @Status, @Comment, @ActionDate, GETDATE(), GETDATE()
                    )";
                db.Execute(sql, approval);
            }
        }

        // PageCode、報告書No、年、月で上程データを取得
        public List<ApprovalEntity> GetApprovalsByReport(int pageCode, string reportNo, int year, int month)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                // PageCode=1（複数レコード型）の場合はReportNoを無視、PageCode=2（1レコード型）の場合はReportNo必須
                string sql;
                if (pageCode == 1)
                {
                    // 複数レコード型ページ：PageCode、Year、Monthのみで検索
                    sql = @"
                        SELECT 
                            id AS Id,
                            page_code AS PageCode,
                            report_no AS ReportNo,
                            year AS Year,
                            month AS Month,
                            user_name AS UserName,
                            flow_order AS FlowOrder,
                            status AS Status,
                            comment AS Comment,
                            action_date AS ActionDate,
                            created_at AS CreatedAt,
                            updated_at AS UpdatedAt
                        FROM dbo.t_approvals
                        WHERE page_code = @PageCode AND year = @Year AND month = @Month
                          AND (report_no IS NULL OR report_no = '')
                        ORDER BY flow_order";
                }
                else
                {
                    // 1レコード型ページ：PageCode、ReportNo、Year、Monthで検索
                    sql = @"
                        SELECT 
                            id AS Id,
                            page_code AS PageCode,
                            report_no AS ReportNo,
                            year AS Year,
                            month AS Month,
                            user_name AS UserName,
                            flow_order AS FlowOrder,
                            status AS Status,
                            comment AS Comment,
                            action_date AS ActionDate,
                            created_at AS CreatedAt,
                            updated_at AS UpdatedAt
                        FROM dbo.t_approvals
                        WHERE page_code = @PageCode AND report_no = @ReportNo AND year = @Year AND month = @Month
                        ORDER BY flow_order";
                }
                
                var parameters = new { PageCode = pageCode, ReportNo = reportNo ?? string.Empty, Year = year, Month = month };
                return db.Query<ApprovalEntity>(sql, parameters).ToList();
            }
        }

        // ユーザー名で承認待ちの上程データを取得
        public List<ApprovalEntity> GetPendingApprovalsByUser(string userName)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT 
                        id AS Id,
                        page_code AS PageCode,
                        report_no AS ReportNo,
                        year AS Year,
                        month AS Month,
                        user_name AS UserName,
                        flow_order AS FlowOrder,
                        status AS Status,
                        comment AS Comment,
                        action_date AS ActionDate,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt
                    FROM dbo.t_approvals
                    WHERE user_name = @UserName AND status = 1
                    ORDER BY created_at DESC";
                return db.Query<ApprovalEntity>(sql, new { UserName = userName }).ToList();
            }
        }

        // 上程データを更新
        public void UpdateApproval(ApprovalEntity approval)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    UPDATE dbo.t_approvals
                    SET status = @Status, comment = @Comment, action_date = @ActionDate, updated_at = GETDATE()
                    WHERE id = @Id";
                db.Execute(sql, approval);
            }
        }

        // PageCode、報告書No、年、月で上程データを削除（取り戻し時など）
        public void DeleteApprovalsByReport(int pageCode, string reportNo, int year, int month)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql;
                if (pageCode == 1)
                {
                    // 複数レコード型ページ：PageCode、Year、Monthのみで削除
                    sql = @"
                        DELETE FROM dbo.t_approvals
                        WHERE page_code = @PageCode AND year = @Year AND month = @Month
                          AND (report_no IS NULL OR report_no = '')";
                }
                else
                {
                    // 1レコード型ページ：PageCode、ReportNo、Year、Monthで削除
                    sql = @"
                        DELETE FROM dbo.t_approvals
                        WHERE page_code = @PageCode AND report_no = @ReportNo AND year = @Year AND month = @Month";
                }
                db.Execute(sql, new { PageCode = pageCode, ReportNo = reportNo ?? string.Empty, Year = year, Month = month });
            }
        }

        // IDで上程データを削除
        public void DeleteApproval(int id)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    DELETE FROM dbo.t_approvals
                    WHERE id = @Id";
                db.Execute(sql, new { Id = id });
            }
        }

        // IDで上程データを取得
        public ApprovalEntity GetApprovalById(int id)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT 
                        id AS Id,
                        page_code AS PageCode,
                        report_no AS ReportNo,
                        year AS Year,
                        month AS Month,
                        user_name AS UserName,
                        flow_order AS FlowOrder,
                        status AS Status,
                        comment AS Comment,
                        action_date AS ActionDate,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt
                    FROM dbo.t_approvals
                    WHERE id = @Id";
                return db.Query<ApprovalEntity>(sql, new { Id = id }).FirstOrDefault();
            }
        }
    }
}

