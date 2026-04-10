using System;
using System.Configuration;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace backend.Services
{
    /// <summary>
    /// backend → backend-print への HTTP を「透過プロキシ」として行う。
    /// GET/POST ともに、上流（backend-print）のステータス・本文・Content-Type をそのままクライアントへ返す用途。
    ///
    /// ※ DB の insert などの業務処理は backend-print 側で実装する。
    ///   本サービスは JSON やボディを転送するだけ（backend は原則 DB に触らない print 専用 API 向け）。
    /// </summary>
    public class PrintServiceHttpProxyService
    {
        private static readonly HttpClient Client = new HttpClient
        {
            Timeout = Timeout.InfiniteTimeSpan
        };

        /// <summary>
        /// backend-print へ GET を転送する。
        /// </summary>
        /// <param name="relativePath">
        /// ベースURLからの相対パス（例: <c>api/hello</c>、先頭スラッシュ不要でも可）
        /// </param>
        /// <param name="incomingRequest">現在の <see cref="System.Web.Http.ApiController.Request"/> を渡す（ベースURL解決に使用）</param>
        public async Task<HttpResponseMessage> ForwardGetAsync(string relativePath, HttpRequestMessage incomingRequest)
        {
            var target = BuildTargetUri(relativePath, incomingRequest);
            using (var cts = CreateCancellationSource())
            using (var upstream = await Client.GetAsync(target, cts.Token).ConfigureAwait(false))
            {
                return await ToTransparentResponseAsync(upstream).ConfigureAwait(false);
            }
        }

        /// <summary>
        /// backend-print へ POST を転送する（ボディは呼び出し側が組み立てた <see cref="HttpContent"/>）。
        /// </summary>
        public async Task<HttpResponseMessage> ForwardPostAsync(
            string relativePath,
            HttpContent requestBody,
            HttpRequestMessage incomingRequest)
        {
            var target = BuildTargetUri(relativePath, incomingRequest);
            using (var cts = CreateCancellationSource())
            using (var upstream = await Client.PostAsync(target, requestBody, cts.Token).ConfigureAwait(false))
            {
                return await ToTransparentResponseAsync(upstream).ConfigureAwait(false);
            }
        }

        /// <summary>
        /// JSON 文字列を <c>application/json</c> で POST する（よくある用途のショートカット）。
        /// </summary>
        public Task<HttpResponseMessage> ForwardPostJsonAsync(
            string relativePath,
            string jsonBody,
            HttpRequestMessage incomingRequest)
        {
            var content = new StringContent(jsonBody ?? "{}", Encoding.UTF8, "application/json");
            return ForwardPostAsync(relativePath, content, incomingRequest);
        }

        private static Uri BuildTargetUri(string relativePath, HttpRequestMessage incomingRequest)
        {
            var baseUrl = ResolvePrintServiceBaseUrl(incomingRequest);
            var path = (relativePath ?? "").TrimStart('/');
            return new Uri(new Uri(baseUrl, UriKind.Absolute), path);
        }

        private static CancellationTokenSource CreateCancellationSource()
        {
            var seconds = int.TryParse(ConfigurationManager.AppSettings["PrintServiceTimeoutSeconds"], out var s)
                ? s
                : 60;
            return new CancellationTokenSource(TimeSpan.FromSeconds(seconds));
        }

        /// <summary>
        /// <see cref="PrintGemBoxProxyController"/> と同じルールで backend-print のベースURLを決める。
        /// </summary>
        private static string ResolvePrintServiceBaseUrl(HttpRequestMessage incomingRequest)
        {
            var configured = (ConfigurationManager.AppSettings["PrintServiceBaseUrl"] ?? "").Trim();
            if (!string.IsNullOrWhiteSpace(configured))
                return EnsureTrailingSlash(configured);

            var host = incomingRequest?.RequestUri?.Host ?? "";
            if (string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(host, "127.0.0.1", StringComparison.OrdinalIgnoreCase))
            {
                var local = (ConfigurationManager.AppSettings["PrintServiceLocalDebugBaseUrl"] ?? "").Trim();
                if (!string.IsNullOrWhiteSpace(local))
                    return EnsureTrailingSlash(local);
            }

            var origin = incomingRequest?.RequestUri?.GetLeftPart(UriPartial.Authority) ?? "http://localhost";
            return EnsureTrailingSlash(origin) + "print/";
        }

        private static string EnsureTrailingSlash(string url)
        {
            return url.EndsWith("/", StringComparison.Ordinal) ? url : url + "/";
        }

        private static async Task<HttpResponseMessage> ToTransparentResponseAsync(HttpResponseMessage upstream)
        {
            var body = await upstream.Content.ReadAsStringAsync().ConfigureAwait(false);

            var response = new HttpResponseMessage(upstream.StatusCode)
            {
                Content = new StringContent(body, Encoding.UTF8)
            };

            response.Content.Headers.ContentType =
                upstream.Content.Headers.ContentType ?? new MediaTypeHeaderValue("application/json");

            return response;
        }
    }
}
