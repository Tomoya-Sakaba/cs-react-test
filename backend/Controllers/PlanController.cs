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

        //------------------------------------------------------------------------------
        // 最新のPlanデータ取得API
        //------------------------------------------------------------------------------
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
            _service.CreateNewPlans(plans, userName); // version=0 固定で登録
            return Ok();
        }


        [HttpPost]
        [Route("api/plan")]
        public IHttpActionResult SavePlans([FromBody] List<TestPlanDto> plans)
        {
            if (plans == null || plans.Count == 0)
                return BadRequest("データが空です。");

            _service.SavePlans2(plans);
            return Ok();
        }

        //------------------------------------------------------------------------------
        // バージョンを切るAPI
        //
        // 仕様（更新）:
        // - データのコピーは行わない
        // - current_version が null/0 → 1 に設定
        // - current_version が 1 以上 → +1 に更新
        // - 以後、保存は常に current_version に対して上書き保存（保存では version を上げない）
        //------------------------------------------------------------------------------
        [HttpPost]
        [Route("api/plan/create-version")]
        public IHttpActionResult CreateVersion([FromBody] VersionRequest request)
        {
            if (request == null)
                return BadRequest("リクエストが空です。");

            var userName = "testUser";
            _service.CreateVersionSnapshot(request.Year, request.Month, userName);
            return Ok();
        }

        //------------------------------------------------------------------------------
        // データが存在する年月のリストを取得
        //------------------------------------------------------------------------------
        [HttpGet]
        [Route("api/plan/available-year-months")]
        public IHttpActionResult GetAvailableYearMonths()
        {
            var data = _service.GetAvailableYearMonths();
            return Ok(data);
        }
    }

    public class VersionRequest
    {
        public int Year { get; set; }
        public int Month { get; set; }
    }
}