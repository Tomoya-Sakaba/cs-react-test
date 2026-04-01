using System.Web.Http;
using backend.Services;
using backend.Models.DTOs;

namespace backend.Controllers
{
    public class EquipmentController : ApiController
    {
        private readonly EquipmentService _service = new EquipmentService();

        [HttpGet]
        [Route("api/equipment")]
        public IHttpActionResult GetList(bool includeInactive = false)
        {
            var data = _service.GetList(includeInactive);
            return Ok(data);
        }

        [HttpGet]
        [Route("api/equipment/{equipmentId}")]
        public IHttpActionResult Get(int equipmentId)
        {
            var data = _service.Get(equipmentId);
            if (data == null) return NotFound();
            return Ok(data);
        }

        [HttpPut]
        [Route("api/equipment/{equipmentId}")]
        public IHttpActionResult Update(int equipmentId, [FromBody] UpdateEquipmentRequestDto request)
        {
            if (request == null) return BadRequest("リクエストが空です。");

            var updated = _service.Update(equipmentId, request);
            if (updated == null) return NotFound();
            return Ok(updated);
        }
    }
}

