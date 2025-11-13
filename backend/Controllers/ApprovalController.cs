using backend.Models.DTOs;
using backend.Services;
using System;
using System.Web.Http;

namespace backend.Controllers
{
    public class ApprovalController : ApiController
    {
        private readonly ApprovalService _service = new ApprovalService();

        // 上程データを作成
        [HttpPost]
        [Route("api/approval")]
        public IHttpActionResult CreateApproval([FromBody] CreateApprovalRequest request)
        {
            try
            {
                _service.CreateApproval(request);
                return Ok(new { message = "上程が完了しました。" });
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

        // 報告書No、年、月で上程データを取得
        [HttpGet]
        [Route("api/approval")]
        public IHttpActionResult GetApprovals(string reportNo, int year, int month)
        {
            try
            {
                var dtos = _service.GetApprovalsByReport(reportNo, year, month);
                return Ok(dtos);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // ユーザー名で承認待ちの上程データを取得
        [HttpGet]
        [Route("api/approval/pending")]
        public IHttpActionResult GetPendingApprovals(string userName)
        {
            try
            {
                var dtos = _service.GetPendingApprovalsByUser(userName);
                return Ok(dtos);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // 承認アクション（承認または差し戻し）
        [HttpPost]
        [Route("api/approval/action")]
        public IHttpActionResult ProcessApprovalAction([FromBody] ApprovalActionRequest request)
        {
            try
            {
                _service.ProcessApprovalAction(request);
                return Ok(new { message = request.Action == "approve" ? "承認が完了しました。" : "差し戻しが完了しました。" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
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

        // 再上程（差し戻し後の再提出）
        [HttpPost]
        [Route("api/approval/resubmit")]
        public IHttpActionResult ResubmitApproval([FromBody] CreateApprovalRequest request)
        {
            try
            {
                _service.ResubmitApproval(request);
                return Ok(new { message = "再上程が完了しました。" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
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

