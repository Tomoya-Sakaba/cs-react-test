using System.Web.Http;

namespace test.Controllers
{
    [RoutePrefix("api/test")]

    public class HelloController : ApiController
    {
        // GET: api/test
        [HttpGet]
        [Route("")]
        public IHttpActionResult GetTestData()
        {
            var testData = new
            {
                message = "Hello from API!",
                date = System.DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            };

            return Ok(testData);
        }
    }
}