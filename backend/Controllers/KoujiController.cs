using System;
using System.Web.Http;
using backend.Services;
using backend.Models.DTOs;

namespace backend.Controllers
{
    public class KoujiController : ApiController
    {
        private readonly KoujiService _service = new KoujiService();

        [HttpGet]
        [Route("api/kouji")]
        public IHttpActionResult GetList(bool includeInactive = false)
        {
            return Ok(_service.GetList(includeInactive));
        }

        [HttpGet]
        [Route("api/kouji/monthly")]
        public IHttpActionResult GetFiscalYearMonthly(int fiscalYear)
        {
            return Ok(_service.GetFiscalYearMonthly(fiscalYear));
        }

        [HttpPost]
        [Route("api/kouji/monthly")]
        public IHttpActionResult UpsertMonthly([FromBody] UpsertKoujiMonthlyRequestDto request)
        {
            try
            {
                _service.UpsertMonthly(request);
                return Ok(new { ok = true });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete]
        [Route("api/kouji/monthly")]
        public IHttpActionResult DeleteMonthly(int koujiId, int yyyymm, string type)
        {
            try
            {
                _service.DeleteMonthly(koujiId, yyyymm, type);
                return Ok(new { ok = true });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}

