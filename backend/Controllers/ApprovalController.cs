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

        // ApprovalIdと報告書Noで上程データを取得
        [HttpGet]
        [Route("api/approval")]
        public IHttpActionResult GetApprovals(string approvalId, string reportNo)
        {
            try
            {
                var dtos = _service.GetApprovalsByReport(approvalId, reportNo);
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

        // 承認
        [HttpPost]
        [Route("api/approval/approve")]
        public IHttpActionResult ApproveApproval([FromBody] ApproveRequest request)
        {
            try
            {
                _service.ApproveApproval(request);
                return Ok(new { message = "承認が完了しました。" });
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

        // 差し戻し
        [HttpPost]
        [Route("api/approval/reject")]
        public IHttpActionResult RejectApproval([FromBody] RejectRequest request)
        {
            try
            {
                _service.RejectApproval(request);
                return Ok(new { message = "差し戻しが完了しました。" });
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

        // 取り戻し
        [HttpPost]
        [Route("api/approval/recall")]
        public IHttpActionResult RecallApproval([FromBody] RecallApprovalRequest request)
        {
            try
            {
                _service.RecallApproval(request.ApprovalId, request.ReportNo, request.FlowOrder, request.UserName);
                return Ok(new { message = "取り戻しが完了しました。" });
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

