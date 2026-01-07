using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Web.Http;
using backend.Models.DTOs;
using backend.Models.Repository;
using backend.Services;
using Newtonsoft.Json;

namespace backend.Controllers
{
    /// <summary>
    /// 報告書管理API（新システム）
    /// </summary>
    [RoutePrefix("api/report-management")]
    public class ReportManagementController : ApiController
    {
        private readonly string _connectionString;
        private readonly ReportRepository _reportRepository;
        private readonly TemplateRepository _templateRepository;
        private readonly PdfGenerationService _pdfService;

        public ReportManagementController()
        {
            _connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;
            _reportRepository = new ReportRepository(_connectionString);
            _templateRepository = new TemplateRepository(_connectionString);
            _pdfService = new PdfGenerationService();
        }

        /// <summary>
        /// 報告書一覧取得（検索機能付き）
        /// GET /api/report-management
        /// </summary>
        [HttpGet]
        [Route("")]
        public IHttpActionResult GetReports(
            [FromUri] string status = null,
            [FromUri] string createdUser = null,
            [FromUri] int page = 1,
            [FromUri] int limit = 20)
        {
            try
            {
                var request = new ReportSearchRequestDto
                {
                    Status = status,
                    CreatedUser = string.IsNullOrWhiteSpace(createdUser) ? null : createdUser,
                    Page = page > 0 ? page : 1,
                    Limit = limit > 0 ? limit : 20
                };

                System.Diagnostics.Debug.WriteLine($"報告書検索: Status={request.Status}, CreatedUser={request.CreatedUser}, Page={request.Page}, Limit={request.Limit}");

                var result = _reportRepository.SearchReports(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"報告書一覧取得エラー: {ex.Message}");
                return InternalServerError(new Exception($"報告書一覧の取得に失敗しました: {ex.Message}", ex));
            }
        }

        /// <summary>
        /// 報告書詳細取得
        /// GET /api/reports/{id}
        /// </summary>
        [HttpGet]
        [Route("{id:int}")]
        public IHttpActionResult GetReport(int id)
        {
            try
            {
                var report = _reportRepository.GetReportById(id);

                if (report == null)
                {
                    return NotFound();
                }

                return Ok(report);
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception($"報告書の取得に失敗しました: {ex.Message}", ex));
            }
        }

        /// <summary>
        /// 報告書作成
        /// POST /api/reports
        /// </summary>
        [HttpPost]
        [Route("")]
        public IHttpActionResult CreateReport([FromBody] CreateReportRequestDto request)
        {
            try
            {
                if (request == null || request.Data == null)
                {
                    return BadRequest("報告書データは必須です。");
                }

                // テンプレートの存在確認
                var template = _templateRepository.GetTemplateById(request.TemplateId);
                if (template == null)
                {
                    return BadRequest("指定されたテンプレートが存在しません。");
                }

                // 報告書を作成
                var reportId = _reportRepository.InsertReport(request);

                System.Diagnostics.Debug.WriteLine($"報告書作成成功: ID={reportId}");

                return Ok(new
                {
                    Message = "報告書が作成されました。",
                    ReportId = reportId
                });
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception($"報告書の作成に失敗しました: {ex.Message}", ex));
            }
        }

        /// <summary>
        /// 報告書更新
        /// PUT /api/reports/{id}
        /// </summary>
        [HttpPut]
        [Route("{id:int}")]
        public IHttpActionResult UpdateReport(int id, [FromBody] UpdateReportRequestDto request)
        {
            try
            {
                // 報告書の存在確認
                var existing = _reportRepository.GetReportById(id);
                if (existing == null)
                {
                    return NotFound();
                }

                _reportRepository.UpdateReport(id, request);

                return Ok(new { message = "報告書が更新されました。" });
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception($"報告書の更新に失敗しました: {ex.Message}", ex));
            }
        }

        /// <summary>
        /// 報告書削除
        /// DELETE /api/reports/{id}
        /// </summary>
        [HttpDelete]
        [Route("{id:int}")]
        public IHttpActionResult DeleteReport(int id)
        {
            try
            {
                _reportRepository.DeleteReport(id);
                return Ok(new { message = "報告書が削除されました。" });
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception($"報告書の削除に失敗しました: {ex.Message}", ex));
            }
        }

        /// <summary>
        /// PDF生成・ダウンロード
        /// GET /api/reports/{id}/pdf
        /// </summary>
        [HttpGet]
        [Route("{id:int}/pdf")]
        public HttpResponseMessage GeneratePdf(int id)
        {
            try
            {
                // 報告書データ取得
                var report = _reportRepository.GetReportById(id);
                if (report == null)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.NotFound, "報告書が見つかりません。");
                }

                // テンプレート取得
                var template = _templateRepository.GetTemplateById(report.TemplateId);
                if (template == null)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.NotFound, "テンプレートが見つかりません。");
                }

                // PDF生成
                var pdfStream = _pdfService.GeneratePdf(template.FilePath, report.Data, report.Images);

                // HTTPレスポンス作成
                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StreamContent(pdfStream)
                };

                response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
                response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
                {
                    FileName = $"{report.ReportNo}.pdf"
                };

                return response;
            }
            catch (Exception ex)
            {
                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError,
                    $"PDFの生成に失敗しました: {ex.Message}");
            }
        }

        /// <summary>
        /// Excel生成・ダウンロード
        /// GET /api/reports/{id}/excel
        /// </summary>
        [HttpGet]
        [Route("{id:int}/excel")]
        public HttpResponseMessage GenerateExcel(int id)
        {
            try
            {
                // 報告書データ取得
                var report = _reportRepository.GetReportById(id);
                if (report == null)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.NotFound, "報告書が見つかりません。");
                }

                // テンプレート取得
                var template = _templateRepository.GetTemplateById(report.TemplateId);
                if (template == null)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.NotFound, "テンプレートが見つかりません。");
                }

                // Excel生成
                var excelStream = _pdfService.GenerateExcel(template.FilePath, report.Data, report.Images);

                // HTTPレスポンス作成
                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StreamContent(excelStream)
                };

                response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
                {
                    FileName = $"{report.ReportNo}.xlsx"
                };

                return response;
            }
            catch (Exception ex)
            {
                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError,
                    $"Excelの生成に失敗しました: {ex.Message}");
            }
        }

        /// <summary>
        /// PDFプレビュー用（インライン表示）
        /// GET /api/reports/{id}/preview
        /// </summary>
        [HttpGet]
        [Route("{id:int}/preview")]
        public HttpResponseMessage PreviewPdf(int id)
        {
            try
            {
                // 報告書データ取得
                var report = _reportRepository.GetReportById(id);
                if (report == null)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.NotFound, "報告書が見つかりません。");
                }

                // テンプレート取得
                var template = _templateRepository.GetTemplateById(report.TemplateId);
                if (template == null)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.NotFound, "テンプレートが見つかりません。");
                }

                // PDF生成
                var pdfStream = _pdfService.GeneratePdf(template.FilePath, report.Data, report.Images);

                // HTTPレスポンス作成（インライン表示）
                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StreamContent(pdfStream)
                };

                response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
                response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("inline")
                {
                    FileName = $"{report.ReportNo}.pdf"
                };

                return response;
            }
            catch (Exception ex)
            {
                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError,
                    $"PDFプレビューの生成に失敗しました: {ex.Message}");
            }
        }
    }
}

