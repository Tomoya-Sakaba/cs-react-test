using backend.Models.DTOs;
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
        public IHttpActionResult GetPlan(int year, int month)
        {
            var data = _service.GetPlanData(year, month);
            return Ok(data);
        }

        [HttpGet]
        [Route("api/content")]
        public IHttpActionResult GetContentTypeList()
        {
            var data = _service.GetContentTypeList();
            return Ok(data);
        }

        //------------------------------------------------------------------------------
        // 新規Plan、note登録
        //------------------------------------------------------------------------------
        [HttpPost]
        [Route("api/plan/new")]
        public IHttpActionResult CreateNewPlan([FromBody] List<TestPlanDto> plans)
        {
            var userName = "testUser";
            _service.CreateNewPlans(plans, userName); // version=1 固定で登録
            return Ok();
        }


        [HttpPost]
        [Route("api/plan")]
        public IHttpActionResult SavePlans([FromBody] List<TestPlanDto> plans)
        {
            if (plans == null || plans.Count == 0)
                return BadRequest("データが空です。");

            _service.SavePlans(plans);
            return Ok();
        }
    }
}