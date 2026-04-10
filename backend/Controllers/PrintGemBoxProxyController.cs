using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;
using backend.Models.DTOs;
using backend.Services;

namespace backend.Controllers
{
    /// <summary>
    /// GemBox印刷は backend-print へHTTPで委譲する。
    /// DB取得・データ整形は backend（GemBoxPrintPayloadService）で行い、JSONで渡す。
    ///
    /// GET /api/print-gembox/equipment/{equipmentId}/pdf
    /// GET /api/print-gembox/demo/pdf
    ///   → 内部で backend-print POST /api/print/gembox/pdf（PrintServiceHttpProxyService）
    /// </summary>
    [RoutePrefix("api/print-gembox")]
    public class PrintGemBoxProxyController : ApiController
    {
        /// <summary>
        /// テンプレートのエクセルファイル名や中身のデータを構成するサービスクラス
        /// </summary>
        private readonly GemBoxPrintPayloadService _payloadService = new GemBoxPrintPayloadService();

        /// <summary>
        /// backend-print へ転送するためのサービスクラス
        /// </summary>
        private readonly PrintServiceHttpProxyService _printProxy = new PrintServiceHttpProxyService();

        [HttpGet]
        [Route("equipment/{equipmentId:int}/pdf")]
        public async Task<HttpResponseMessage> GenerateEquipmentPdf(int equipmentId)
        {
            GemBoxPrintRequestDto gemBoxPrintRequest;
            try
            {
                gemBoxPrintRequest = _payloadService.BuildEquipmentMasterPdfRequest(equipmentId);
            }
            catch (InvalidOperationException ex)
            {
                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, ex.Message);
            }

            if (gemBoxPrintRequest == null)
                return Request.CreateErrorResponse(HttpStatusCode.NotFound, "機器が見つかりません。");

            return await ForwardGemBoxPrintAsync(gemBoxPrintRequest);
        }

        /// <summary>
        /// デモ用 PDF（Web.config の GemBoxDemoTemplateFileName）。テンプレは backend-print のテンプレフォルダに配置。
        /// </summary>
        [HttpGet]
        [Route("demo/pdf")]
        public async Task<HttpResponseMessage> DemoGemBoxPdf()
        {
            GemBoxPrintRequestDto gemBoxPrintRequest;
            try
            {
                gemBoxPrintRequest = _payloadService.BuildDemoGemBoxPdfRequest();
            }
            catch (InvalidOperationException ex)
            {
                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, ex.Message);
            }

            return await ForwardGemBoxPrintAsync(gemBoxPrintRequest);
        }

        /// <summary>
        /// backend-print へ転送。<c>Request</c> は <see cref="ApiController.Request"/>（フレームワークが付与する現在の HTTP リクエスト）。
        /// </summary>
        private async Task<HttpResponseMessage> ForwardGemBoxPrintAsync(GemBoxPrintRequestDto gemBoxPrintRequest)
        {
            try
            {
                // ApiController.Request の名前は変えられないため、意味が分かる名前でローカルに取る
                HttpRequestMessage incomingHttpRequest = Request;
                return await _printProxy.ForwardGemBoxPdfPostAsync(gemBoxPrintRequest, incomingHttpRequest)
                    .ConfigureAwait(false);
            }
            catch (InvalidOperationException ex)
            {
                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, ex.Message);
            }
        }
    }
}
