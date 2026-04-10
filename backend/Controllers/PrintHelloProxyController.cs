using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;
using backend.Services;
using Newtonsoft.Json.Linq;

namespace backend.Controllers
{
    /// <summary>
    /// 疎通確認: frontend → backend → backend-print。
    /// 実装の本体は <see cref="PrintServiceHttpProxyService"/>（GET/POST の透過転送）。
    ///
    /// GET  /api/print-gembox/hello → backend-print GET /api/hello
    /// GET  /api/print-gembox/test  → backend-print GET /api/test
    /// POST /api/print-gembox/echo  → backend-print POST /api/echo（POST 汎用転送の例）
    /// </summary>
    [RoutePrefix("api/print-gembox")]
    public class PrintHelloProxyController : ApiController
    {
        private readonly PrintServiceHttpProxyService _printProxy = new PrintServiceHttpProxyService();

        [HttpGet]
        [Route("hello")]
        public Task<HttpResponseMessage> Hello()
        {
            return _printProxy.ForwardGetAsync("api/hello", Request);
        }

        [HttpGet]
        [Route("test")]
        public Task<HttpResponseMessage> Test()
        {
            return _printProxy.ForwardGetAsync("api/test", Request);
        }

        /// <summary>
        /// POST 転送のサンプル。フロントは JSON を送り、backend-print の応答をそのまま受け取る。
        /// insert 相当の処理を backend-print に書く場合も、このパターンで <c>ForwardPostJsonAsync</c> を使う。
        /// </summary>
        [HttpPost]
        [Route("echo")]
        public Task<HttpResponseMessage> EchoPost([FromBody] JToken body)
        {
            var json = body == null ? "{}" : body.ToString(Newtonsoft.Json.Formatting.None);
            return _printProxy.ForwardPostJsonAsync("api/echo", json, Request);
        }
    }
}
