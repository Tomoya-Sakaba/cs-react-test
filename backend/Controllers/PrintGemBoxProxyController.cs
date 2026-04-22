using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;
using backend.Services;
using log4net;
using Newtonsoft.Json;

namespace backend.Controllers
{
    /// <summary>
    /// GemBox印刷は backend-print へHTTPで委譲する。
    /// DB取得・データ整形は backend（GemBoxPrintPayloadService）で行い、JSONで渡す。
    ///
    /// GET /api/print-gembox/pdf?report=equipment_master&amp;reportNo=123
    /// GET /api/print-gembox/pdf?report=equipment_detail_lists&amp;reportNo=123
    /// GET /api/print-gembox/pdf?report=equipment_list
    /// GET /api/print-gembox/pdf?report=demo
    /// </summary>
    [RoutePrefix("api/print-gembox")]
    public class PrintGemBoxProxyController : ApiController
    {
        private static readonly ILog Log = LogManager.GetLogger(typeof(PrintGemBoxProxyController));

        /// <summary>クライアントへ返すエラーコードは常にこの値（詳細は log4net）。</summary>
        private const string ClientErrorCode = "PRINT_ERROR";

        private readonly GemBoxPrintPayloadService _payloadService = new GemBoxPrintPayloadService();
        private readonly PrintServiceHttpProxyService _printProxy = new PrintServiceHttpProxyService();

        /// <summary>クエリ <c>report</c>（帳票識別子）で GemBox PDF を生成する唯一の入口。</summary>
        [HttpGet]
        [Route("pdf")]
        public async Task<HttpResponseMessage> GetGemBoxPdf(string report, int? reportNo = null)
        {
            if (string.IsNullOrWhiteSpace(report))
            {
                Log.Error("PrintGemBox GetGemBoxPdf: report が空です。");
                return CreateUniformPrintErrorResponse();
            }

            var reportFromRequest = report.Trim();

            GemBoxPrintRequestDto gemBoxPrintRequest;
            // BuildGemBoxPdfRequest 内で「帳票コード不正・必須パラメータ不足」などは ArgumentException、
            // 「マッピングJSONが読めない」など設定・業務上の不整合は InvalidOperationException を投げる想定。
            // クライアントには常に PRINT_ERROR、中身は log4net へ。
            try
            {
                gemBoxPrintRequest = _payloadService.BuildGemBoxPdfRequest(reportFromRequest, reportNo);
            }
            catch (ArgumentException ex)
            {
                Log.Error(
                    $"PrintGemBox BuildGemBoxPdfRequest: ArgumentException（report={report}, reportNo={reportNo}）。{ex.Message}",
                    ex);
                return CreateUniformPrintErrorResponse();
            }
            catch (InvalidOperationException ex)
            {
                Log.Error(
                    $"PrintGemBox BuildGemBoxPdfRequest: InvalidOperationException（report={report}, reportNo={reportNo}）。{ex.Message}",
                    ex);
                return CreateUniformPrintErrorResponse();
            }

            // サービスは「例外ではなく null」で表すケースがある（理由はログで、クライアントは PRINT_ERROR のみ）。
            if (gemBoxPrintRequest == null)
            {
                Log.Error(
                    $"PrintGemBox: ペイロード組み立て結果が null（report={reportFromRequest}, reportNo={reportNo}）。該当データなし・マッピング不整合等。");
                return CreateUniformPrintErrorResponse();
            }

            return await ForwardGemBoxPrintAsync(gemBoxPrintRequest).ConfigureAwait(false);
        }

        private async Task<HttpResponseMessage> ForwardGemBoxPrintAsync(GemBoxPrintRequestDto gemBoxPrintRequest)
        {
            try
            {
                HttpRequestMessage incomingHttpRequest = Request;
                return await _printProxy.ForwardGemBoxPdfPostAsync(gemBoxPrintRequest, incomingHttpRequest)
                    .ConfigureAwait(false);
            }
            catch (InvalidOperationException ex)
            {
                var upstreamHint = string.IsNullOrWhiteSpace(ex?.Message) ? "(メッセージなし)" : ex.Message.Trim();
                Log.Error($"PrintGemBox ForwardGemBoxPdfPostAsync: InvalidOperationException。upstream/プロキシ詳細: {upstreamHint}", ex);
                return CreateUniformPrintErrorResponse();
            }
        }

        /// <summary>HTTP 200 + JSON。errCode / X-Err-Code は常に <see cref="ClientErrorCode"/>（DTO クラスは使わない）。</summary>
        private HttpResponseMessage CreateUniformPrintErrorResponse()
        {
            var json = JsonConvert.SerializeObject(new
            {
                errCode = ClientErrorCode,
                message = "PDFの取得に失敗しました。",
            });
            var res = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
            };
            res.Headers.TryAddWithoutValidation("X-Err-Code", ClientErrorCode);
            return res;
        }
    }
}
