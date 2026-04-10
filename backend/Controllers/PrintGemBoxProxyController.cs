using System;
using System.Configuration;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using System.Web.Http;
using backend.Models.DTOs;
using backend.Services;
using Newtonsoft.Json;

namespace backend.Controllers
{
    /// <summary>
    /// GemBox印刷は backend-print へHTTPで委譲する。
    /// DB取得・データ整形は backend（GemBoxPrintPayloadService）で行い、JSONで渡す。
    ///
    /// GET /api/print-gembox/equipment/{equipmentId}/pdf
    ///   → 機器台帳PDF（内部で backend-print POST /api/print/gembox/pdf）
    /// </summary>
    [RoutePrefix("api/print-gembox")]
    public class PrintGemBoxProxyController : ApiController
    {
        private readonly GemBoxPrintPayloadService _payloadService = new GemBoxPrintPayloadService();

        [HttpGet]
        [Route("equipment/{equipmentId:int}/pdf")]
        public async Task<HttpResponseMessage> GenerateEquipmentPdf(int equipmentId)
        {
            GemBoxPrintRequestDto request;
            try
            {
                request = _payloadService.BuildEquipmentMasterPdfRequest(equipmentId);
            }
            catch (InvalidOperationException ex)
            {
                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, ex.Message);
            }

            if (request == null)
                return Request.CreateErrorResponse(HttpStatusCode.NotFound, "機器が見つかりません。");

            return await ForwardGemBoxPrintAsync(request);
        }

        private async Task<HttpResponseMessage> ForwardGemBoxPrintAsync(GemBoxPrintRequestDto request)
        {
            string baseUrl;
            try
            {
                baseUrl = PrintServiceHttpProxyService.ResolvePrintServiceBaseUrl(Request);
            }
            catch (InvalidOperationException ex)
            {
                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, ex.Message);
            }
            var timeoutSeconds = int.TryParse(ConfigurationManager.AppSettings["PrintServiceTimeoutSeconds"], out var s) ? s : 60;

            var target = new Uri(new Uri(baseUrl, UriKind.Absolute), "api/print/gembox/pdf");

            var json = JsonConvert.SerializeObject(request);
            using (var http = new HttpClient { Timeout = TimeSpan.FromSeconds(timeoutSeconds) })
            using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
            using (var upstream = await http.PostAsync(target, content))
            {
                if (!upstream.IsSuccessStatusCode)
                {
                    var body = await upstream.Content.ReadAsStringAsync();
                    return Request.CreateErrorResponse(upstream.StatusCode, body);
                }

                var bytes = await upstream.Content.ReadAsByteArrayAsync();

                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(bytes)
                };

                response.Content.Headers.ContentType = upstream.Content.Headers.ContentType ?? new MediaTypeHeaderValue("application/pdf");

                if (upstream.Content.Headers.ContentDisposition != null)
                    response.Content.Headers.ContentDisposition = upstream.Content.Headers.ContentDisposition;
                else if (!string.IsNullOrWhiteSpace(request.DownloadFileName))
                    response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
                    {
                        FileName = request.DownloadFileName
                    };
                else
                    response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
                    {
                        FileName = "document.pdf"
                    };

                return response;
            }
        }

    }
}
