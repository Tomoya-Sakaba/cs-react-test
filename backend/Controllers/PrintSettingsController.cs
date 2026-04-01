using System;
using System.Configuration;
using System.Net;
using System.Web.Http;
using backend.Models.DTOs;
using backend.Models.Repository;

namespace backend.Controllers
{
    [RoutePrefix("api/print-settings")]
    public class PrintSettingsController : ApiController
    {
        private readonly PrintSettingsRepository _repo;

        public PrintSettingsController()
        {
            var cs = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;
            _repo = new PrintSettingsRepository(cs);
        }

        [HttpGet]
        [Route("{pageCode}")]
        public IHttpActionResult Get(string pageCode)
        {
            try
            {
                var templateId = _repo.GetTemplateIdByPageCode(pageCode);
                if (templateId == null) return NotFound();
                return Ok(new { pageCode = pageCode, templateId = templateId.Value });
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new { message = ex.Message });
            }
        }

        [HttpPut]
        [Route("{pageCode}")]
        public IHttpActionResult Put(string pageCode, [FromBody] PrintTemplateSettingDto body)
        {
            try
            {
                if (body == null) return BadRequest("body is required");
                if (body.TemplateId <= 0) return BadRequest("templateId is required");

                var updatedUser = string.IsNullOrWhiteSpace(body.UpdatedUser) ? "System" : body.UpdatedUser;
                _repo.Upsert(pageCode, body.TemplateId, updatedUser);
                return Ok(new { message = "updated" });
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new { message = ex.Message });
            }
        }
    }
}

