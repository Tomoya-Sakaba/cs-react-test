using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Web.Http;
using backend.Models.Config;
using backend.Models.DTOs;
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

        /// <summary>帳票コード（<see cref="GemBoxReportCodes"/>）で GemBox PDF を生成する唯一の入口。</summary>
        [HttpGet]
        [Route("pdf")]
        public async Task<HttpResponseMessage> GetGemBoxPdf(string report, int? reportNo = null)
        {
            if (string.IsNullOrWhiteSpace(report))
            {
                Log.Error("PrintGemBox GetGemBoxPdf: report が空です。");
                return CreateUniformPrintErrorResponse();
            }

            GemBoxPrintRequestDto gemBoxPrintRequest;
            // BuildGemBoxPdfRequest 内で「帳票コード不正・必須パラメータ不足」などは ArgumentException、
            // 「マッピングJSONが読めない」など設定・業務上の不整合は InvalidOperationException を投げる想定。
            // クライアントには常に PRINT_ERROR、中身は log4net へ。
            try
            {
                gemBoxPrintRequest = _payloadService.BuildGemBoxPdfRequest(report.Trim(), reportNo);
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

            // サービスは「例外ではなく null」で表すケースがある。
            // ・equipment_master / equipment_detail: DB に該当設備がない（GetById が null）
            // ・equipment_list: 上記以外でペイロード組み立てが null になった場合（マッピング／BuildRequest 側の不整合など。0件リスト自体は null にはならない）
            if (gemBoxPrintRequest == null)
            {
                var isList = string.Equals(report.Trim(), GemBoxReportCodes.EquipmentList, StringComparison.OrdinalIgnoreCase);
                if (isList)
                {
                    Log.Error(
                        $"PrintGemBox: ペイロード組み立て結果が null（帳票=equipment_list, reportNo={reportNo}）。PRINT_GEMBOX_LIST_BUILD_FAILED 相当。");
                }
                else
                {
                    Log.Error(
                        $"PrintGemBox: ペイロード組み立て結果が null（帳票={report}, reportNo={reportNo}）。該当機器なし等 PRINT_GEMBOX_NOT_FOUND 相当。");
                }

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

        /// <summary>HTTP 200 + JSON。ErrCode / X-Err-Code は常に <see cref="ClientErrorCode"/>。</summary>
        private HttpResponseMessage CreateUniformPrintErrorResponse()
        {
            var dto = new ApiErrorDto { ErrCode = ClientErrorCode, Message = "PDFの取得に失敗しました。" };
            var json = JsonConvert.SerializeObject(dto);
            var res = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
            };
            res.Headers.TryAddWithoutValidation("X-Err-Code", ClientErrorCode);
            return res;
        }
    }
}
