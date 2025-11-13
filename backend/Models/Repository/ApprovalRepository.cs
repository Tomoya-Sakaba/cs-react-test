using backend.Models.Entity;
using System;
using System.Collections.Generic;
using System.Configuration;
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
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();
                string sql = @"
                    INSERT INTO dbo.Approvals (
                        ReportNo, Year, Month, UserName, FlowOrder, Status, Comment, ActionDate, Created_At, Updated_At
                    )
                    VALUES (
                        @ReportNo, @Year, @Month, @UserName, @FlowOrder, @Status, @Comment, @ActionDate, GETDATE(), GETDATE()
                    )";
                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@ReportNo", approval.ReportNo);
                    cmd.Parameters.AddWithValue("@Year", approval.Year);
                    cmd.Parameters.AddWithValue("@Month", approval.Month);
                    cmd.Parameters.AddWithValue("@UserName", approval.UserName);
                    cmd.Parameters.AddWithValue("@FlowOrder", approval.FlowOrder);
                    cmd.Parameters.AddWithValue("@Status", approval.Status);
                    cmd.Parameters.AddWithValue("@Comment", (object)approval.Comment ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@ActionDate", (object)approval.ActionDate ?? DBNull.Value);
                    cmd.ExecuteNonQuery();
                }
            }
        }

        // 報告書No、年、月で上程データを取得
        public List<ApprovalEntity> GetApprovalsByReport(string reportNo, int year, int month)
        {
            var list = new List<ApprovalEntity>();
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();
                
                // reportNoが空の場合は年・月のみで検索
                string sql;
                if (string.IsNullOrEmpty(reportNo))
                {
                    sql = @"
                        SELECT Id, ReportNo, Year, Month, UserName, FlowOrder, Status, Comment, ActionDate, Created_At, Updated_At
                        FROM dbo.Approvals
                        WHERE Year = @Year AND Month = @Month
                        ORDER BY FlowOrder";
                }
                else
                {
                    sql = @"
                        SELECT Id, ReportNo, Year, Month, UserName, FlowOrder, Status, Comment, ActionDate, Created_At, Updated_At
                        FROM dbo.Approvals
                        WHERE ReportNo = @ReportNo AND Year = @Year AND Month = @Month
                        ORDER BY FlowOrder";
                }
                
                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    if (!string.IsNullOrEmpty(reportNo))
                    {
                        cmd.Parameters.AddWithValue("@ReportNo", reportNo);
                    }
                    cmd.Parameters.AddWithValue("@Year", year);
                    cmd.Parameters.AddWithValue("@Month", month);
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new ApprovalEntity
                            {
                                Id = (int)reader["Id"],
                                ReportNo = (string)reader["ReportNo"],
                                Year = (int)reader["Year"],
                                Month = (int)reader["Month"],
                                UserName = (string)reader["UserName"],
                                FlowOrder = (int)reader["FlowOrder"],
                                Status = (int)reader["Status"],
                                Comment = reader["Comment"] as string,
                                ActionDate = reader["ActionDate"] as DateTime?,
                                CreatedAt = (DateTime)reader["Created_At"],
                                UpdatedAt = (DateTime)reader["Updated_At"]
                            });
                        }
                    }
                }
            }
            return list;
        }

        // ユーザー名で承認待ちの上程データを取得
        public List<ApprovalEntity> GetPendingApprovalsByUser(string userName)
        {
            var list = new List<ApprovalEntity>();
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();
                string sql = @"
                    SELECT Id, ReportNo, Year, Month, UserName, FlowOrder, Status, Comment, ActionDate, Created_At, Updated_At
                    FROM dbo.Approvals
                    WHERE UserName = @UserName AND Status = 1
                    ORDER BY Created_At DESC";
                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@UserName", userName);
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new ApprovalEntity
                            {
                                Id = (int)reader["Id"],
                                ReportNo = (string)reader["ReportNo"],
                                Year = (int)reader["Year"],
                                Month = (int)reader["Month"],
                                UserName = (string)reader["UserName"],
                                FlowOrder = (int)reader["FlowOrder"],
                                Status = (int)reader["Status"],
                                Comment = reader["Comment"] as string,
                                ActionDate = reader["ActionDate"] as DateTime?,
                                CreatedAt = (DateTime)reader["Created_At"],
                                UpdatedAt = (DateTime)reader["Updated_At"]
                            });
                        }
                    }
                }
            }
            return list;
        }

        // 上程データを更新
        public void UpdateApproval(ApprovalEntity approval)
        {
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();
                string sql = @"
                    UPDATE dbo.Approvals
                    SET Status = @Status, Comment = @Comment, ActionDate = @ActionDate, Updated_At = GETDATE()
                    WHERE Id = @Id";
                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@Id", approval.Id);
                    cmd.Parameters.AddWithValue("@Status", approval.Status);
                    cmd.Parameters.AddWithValue("@Comment", (object)approval.Comment ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@ActionDate", (object)approval.ActionDate ?? DBNull.Value);
                    cmd.ExecuteNonQuery();
                }
            }
        }

        // 報告書No、年、月で上程データを削除（取り戻し時など）
        public void DeleteApprovalsByReport(string reportNo, int year, int month)
        {
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();
                string sql = @"
                    DELETE FROM dbo.Approvals
                    WHERE ReportNo = @ReportNo AND Year = @Year AND Month = @Month";
                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@ReportNo", reportNo);
                    cmd.Parameters.AddWithValue("@Year", year);
                    cmd.Parameters.AddWithValue("@Month", month);
                    cmd.ExecuteNonQuery();
                }
            }
        }

        // IDで上程データを削除
        public void DeleteApproval(int id)
        {
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                conn.Open();
                string sql = @"
                    DELETE FROM dbo.Approvals
                    WHERE Id = @Id";
                using (SqlCommand cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.AddWithValue("@Id", id);
                    cmd.ExecuteNonQuery();
                }
            }
        }
    }
}

