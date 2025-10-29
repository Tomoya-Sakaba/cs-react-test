using backend.Models.Repository;
using backend.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;

namespace backend.Controllers
{
    public class PlanController : ApiController
    {
        private readonly PlanService _service = new PlanService();

        [HttpGet]
        [Route("api/plan")]
        public IHttpActionResult GetPlan()
        {
            var data = _service.GetPlanData();
            return Ok(data);
        }
    }
}