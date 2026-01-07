using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using Dapper;
using backend.Models.DTOs;
using Newtonsoft.Json;

namespace backend.Models.Repository
{
    /// <summary>
    /// 報告書関連のデータアクセス
    /// </summary>
    public class ReportRepository
    {
        private readonly string _connectionString;

        public ReportRepository(string connectionString)
        {
            _connectionString = connectionString;
        }

        /// <summary>
        /// 報告書を新規作成
        /// </summary>
        public int InsertReport(CreateReportRequestDto request)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                // 報告書番号を生成
                var reportNo = GenerateReportNo(connection);
                var reportDataJson = JsonConvert.SerializeObject(request.Data);

                var sql = @"
                    INSERT INTO t_reports 
                    (template_id, report_no, report_data, status, created_at, created_user)
                    VALUES 
                    (@TemplateId, @ReportNo, @ReportData, 'draft', GETDATE(), @CreatedUser);
                    SELECT CAST(SCOPE_IDENTITY() as int);";

                return connection.QuerySingle<int>(sql, new
                {
                    request.TemplateId,
                    ReportNo = reportNo,
                    ReportData = reportDataJson,
                    request.CreatedUser
                });
            }
        }

        /// <summary>
        /// 報告書番号を生成
        /// </summary>
        private string GenerateReportNo(SqlConnection connection)
        {
            var year = DateTime.Now.Year;
            var sql = @"
                SELECT COUNT(*) 
                FROM t_reports 
                WHERE YEAR(created_at) = @Year";

            var count = connection.QuerySingle<int>(sql, new { Year = year });
            return $"RPT-{year}-{(count + 1):D4}";
        }

        /// <summary>
        /// 報告書を更新
        /// </summary>
        public void UpdateReport(int reportId, UpdateReportRequestDto request)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var reportDataJson = JsonConvert.SerializeObject(request.Data);

                var sql = @"
                    UPDATE t_reports
                    SET report_data = @ReportData,
                        status = @Status,
                        updated_at = GETDATE(),
                        updated_user = @UpdatedUser
                    WHERE report_id = @ReportId";

                connection.Execute(sql, new
                {
                    ReportId = reportId,
                    ReportData = reportDataJson,
                    request.Status,
                    request.UpdatedUser
                });
            }
        }

        /// <summary>
        /// 報告書詳細を取得
        /// </summary>
        public ReportDetailDto GetReportById(int reportId)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        r.report_id AS ReportId,
                        r.report_no AS ReportNo,
                        r.template_id AS TemplateId,
                        t.template_name AS TemplateName,
                        r.report_data AS ReportData,
                        r.status AS Status,
                        r.created_at AS CreatedAt,
                        r.created_user AS CreatedUser
                    FROM t_reports r
                    INNER JOIN t_report_templates t ON r.template_id = t.template_id
                    WHERE r.report_id = @ReportId";

                var report = connection.QuerySingleOrDefault<dynamic>(sql, new { ReportId = reportId });

                if (report == null) return null;

                var result = new ReportDetailDto
                {
                    ReportId = report.ReportId,
                    ReportNo = report.ReportNo,
                    TemplateId = report.TemplateId,
                    TemplateName = report.TemplateName,
                    Data = JsonConvert.DeserializeObject<Dictionary<string, object>>(report.ReportData),
                    Status = report.Status,
                    CreatedAt = report.CreatedAt,
                    CreatedUser = report.CreatedUser,
                    Images = GetReportImages(reportId)
                };

                return result;
            }
        }

        /// <summary>
        /// 報告書一覧を取得（検索条件付き）
        /// </summary>
        public ReportSearchResultDto SearchReports(ReportSearchRequestDto request)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var whereClauses = new List<string>();
                var parameters = new DynamicParameters();

                if (!string.IsNullOrEmpty(request.Status))
                {
                    whereClauses.Add("r.status = @Status");
                    parameters.Add("Status", request.Status);
                }

                if (!string.IsNullOrEmpty(request.CreatedUser))
                {
                    whereClauses.Add("r.created_user LIKE @CreatedUser");
                    parameters.Add("CreatedUser", $"%{request.CreatedUser}%");
                }

                if (request.DateFrom.HasValue)
                {
                    whereClauses.Add("r.created_at >= @DateFrom");
                    parameters.Add("DateFrom", request.DateFrom.Value);
                }

                if (request.DateTo.HasValue)
                {
                    whereClauses.Add("r.created_at <= @DateTo");
                    parameters.Add("DateTo", request.DateTo.Value.AddDays(1));
                }

                var whereClause = whereClauses.Any() ? "WHERE " + string.Join(" AND ", whereClauses) : "";

                // 件数取得
                var countSql = $@"
                    SELECT COUNT(*) 
                    FROM t_reports r
                    {whereClause}";

                var total = connection.QuerySingle<int>(countSql, parameters);

                // データ取得
                var offset = (request.Page - 1) * request.Limit;
                parameters.Add("Offset", offset);
                parameters.Add("Limit", request.Limit);

                var dataSql = $@"
                    SELECT 
                        r.report_id AS ReportId,
                        r.report_no AS ReportNo,
                        r.template_id AS TemplateId,
                        t.template_name AS TemplateName,
                        r.status AS Status,
                        r.created_at AS CreatedAt,
                        r.created_user AS CreatedUser
                    FROM t_reports r
                    INNER JOIN t_report_templates t ON r.template_id = t.template_id
                    {whereClause}
                    ORDER BY r.created_at DESC
                    OFFSET @Offset ROWS
                    FETCH NEXT @Limit ROWS ONLY";

                var items = connection.Query<ReportListItemDto>(dataSql, parameters).ToList();

                return new ReportSearchResultDto
                {
                    Total = total,
                    Page = request.Page,
                    Limit = request.Limit,
                    Items = items
                };
            }
        }

        /// <summary>
        /// 報告書の画像を取得
        /// </summary>
        public List<ReportImageDto> GetReportImages(int reportId)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        image_id AS ImageId,
                        report_id AS ReportId,
                        file_name AS FileName,
                        file_path AS FilePath,
                        caption AS Caption,
                        display_order AS DisplayOrder
                    FROM t_report_images
                    WHERE report_id = @ReportId
                    ORDER BY display_order";

                return connection.Query<ReportImageDto>(sql, new { ReportId = reportId }).ToList();
            }
        }

        /// <summary>
        /// 報告書を削除
        /// </summary>
        public void DeleteReport(int reportId)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = "DELETE FROM t_reports WHERE report_id = @ReportId";
                connection.Execute(sql, new { ReportId = reportId });
            }
        }

        /// <summary>
        /// 生成したPDFパスを保存
        /// </summary>
        public void UpdateGeneratedPdfPath(int reportId, string pdfPath)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    UPDATE t_reports
                    SET generated_pdf_path = @PdfPath
                    WHERE report_id = @ReportId";

                connection.Execute(sql, new { ReportId = reportId, PdfPath = pdfPath });
            }
        }
    }
}
