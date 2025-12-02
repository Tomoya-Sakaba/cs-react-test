using backend.Services;
using System.Web.Http;

namespace backend.Controllers
{
    public class CompanyController : ApiController
    {
        private readonly CompanyService _service = new CompanyService();

        // 会社マスタ一覧取得
        // GET /api/company
        [HttpGet]
        [Route("api/company")]
        public IHttpActionResult GetCompanyList()
        {
            var data = _service.GetCompanyList();
            return Ok(data);
        }
    }
}


