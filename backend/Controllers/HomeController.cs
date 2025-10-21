using backend.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Web.Http.Results;

namespace backend.Controllers
{
    [RoutePrefix("api/test")]
    public class HomeController : ApiController
    {
        private readonly TestService _testService = new TestService();

        [HttpGet]
        [Route("")]
        public IHttpActionResult GetTestData()
        {
            var data = _testService.GetTestData();

            return Ok(data);
        }
    }
}
