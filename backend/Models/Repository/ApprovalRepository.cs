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
                        approval_id, report_no, user_name, flow_order, status, comment, action_date, created_at, updated_at
                    )
                    VALUES (
                        @ApprovalId, @ReportNo, @UserName, @FlowOrder, @Status, @Comment, @ActionDate, GETDATE(), GETDATE()
                    )";
                db.Execute(sql, approval);
            }
        }

        // ApprovalIdと報告書Noで上程データを取得
        public List<ApprovalEntity> GetApprovalsByReport(string approvalId, string reportNo)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                // ApprovalIdとReportNoで検索
                string sql = @"
                    SELECT 
                        approval_id AS ApprovalId,
                        report_no AS ReportNo,
                        user_name AS UserName,
                        flow_order AS FlowOrder,
                        status AS Status,
                        comment AS Comment,
                        action_date AS ActionDate,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt
                    FROM dbo.t_approvals
                    WHERE approval_id = @ApprovalId AND report_no = @ReportNo
                    ORDER BY flow_order";
                
                var parameters = new { ApprovalId = approvalId, ReportNo = reportNo };
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
                        approval_id AS ApprovalId,
                        report_no AS ReportNo,
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
                    WHERE approval_id = @ApprovalId AND report_no = @ReportNo AND flow_order = @FlowOrder";
                db.Execute(sql, approval);
            }
        }

        // 報告書Noで上程データを削除（取り戻し時など）
        public void DeleteApprovalsByReport(string reportNo)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                // ReportNoで削除
                string sql = @"
                    DELETE FROM dbo.t_approvals
                    WHERE report_no = @ReportNo";
                db.Execute(sql, new { ReportNo = reportNo });
            }
        }

        // 複合主キーで上程データを削除
        public void DeleteApproval(string approvalId, string reportNo, int flowOrder)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    DELETE FROM dbo.t_approvals
                    WHERE approval_id = @ApprovalId AND report_no = @ReportNo AND flow_order = @FlowOrder";
                db.Execute(sql, new { ApprovalId = approvalId, ReportNo = reportNo, FlowOrder = flowOrder });
            }
        }

        // 複合主キーで上程データを取得
        public ApprovalEntity GetApprovalByKey(string approvalId, string reportNo, int flowOrder)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT 
                        approval_id AS ApprovalId,
                        report_no AS ReportNo,
                        user_name AS UserName,
                        flow_order AS FlowOrder,
                        status AS Status,
                        comment AS Comment,
                        action_date AS ActionDate,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt
                    FROM dbo.t_approvals
                    WHERE approval_id = @ApprovalId AND report_no = @ReportNo AND flow_order = @FlowOrder";
                return db.Query<ApprovalEntity>(sql, new { ApprovalId = approvalId, ReportNo = reportNo, FlowOrder = flowOrder }).FirstOrDefault();
            }
        }
    }
}

