using backend.Models.DTOs;
using backend.Services;
using System;
using System.Web.Http;

namespace backend.Controllers
{
    public class ReportController : ApiController
    {
        private readonly ReportService _service = new ReportService();

        // 報告書を作成
        [HttpPost]
        [Route("api/reports")]
        public IHttpActionResult CreateReport([FromBody] CreateReportRequest request)
        {
            try
            {
                // TODO: 認証情報からユーザー名を取得（現在は仮で"System"を使用）
                string createdUser = "System";

                var report = _service.CreateReport(request, createdUser);
                return Ok(report);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // 報告書を更新
        [HttpPut]
        [Route("api/reports")]
        public IHttpActionResult UpdateReport([FromBody] UpdateReportRequest request)
        {
            try
            {
                // TODO: 認証情報からユーザー名を取得（現在は仮で"System"を使用）
                string updatedUser = "System";

                var report = _service.UpdateReport(request, updatedUser);
                return Ok(report);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // ReportNoで報告書を取得
        [HttpGet]
        [Route("api/reports/{reportNo}")]
        public IHttpActionResult GetReportByReportNo(string reportNo)
        {
            try
            {
                var report = _service.GetReportByReportNo(reportNo);
                return Ok(report);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound();
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // すべての報告書を取得（一覧用）
        [HttpGet]
        [Route("api/reports")]
        public IHttpActionResult GetReports()
        {
            try
            {
                var reports = _service.GetAllReports();
                return Ok(reports);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // 報告書を削除
        [HttpDelete]
        [Route("api/reports/{reportNo}")]
        public IHttpActionResult DeleteReport(string reportNo)
        {
            try
            {
                _service.DeleteReport(reportNo);
                return Ok(new { message = "報告書を削除しました。" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }
    }
}

