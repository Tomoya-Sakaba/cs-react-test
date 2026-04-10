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
    /// backend から backend-print へ HTTP を転送する。応答本文はパースせず透過する。
    /// </summary>
    public class PrintServiceHttpProxyService
    {
        // 接続の使い回し用。Timeout は無限にし、リクエストごとに CancellationToken で打ち切る。
        private static readonly HttpClient Client = new HttpClient
        {
            Timeout = Timeout.InfiniteTimeSpan
        };

        /// <summary>
        /// 指定パスへ GET し、backend-print の HTTP 応答をそのまま返す。
        /// </summary>
        /// <param name="relativePath">ベース URL からの相対パス（例: api/hello）</param>
        /// <param name="incomingRequest">現在の API リクエスト（ベース URL 解決に使用）</param>
        public async Task<HttpResponseMessage> ForwardGetAsync(string relativePath, HttpRequestMessage incomingRequest)
        {
            // Web.config と incomingRequest から backend-print のルート URL を決める
            var baseUrl = ResolvePrintServiceBaseUrl(incomingRequest);
            // Uri 結合のため先頭スラッシュを除く
            var path = (relativePath ?? "").TrimStart('/');
            var target = new Uri(new Uri(baseUrl, UriKind.Absolute), path);

            // appSettings の秒数で打ち切り（HttpClient.Timeout は触らない）
            var timeoutSec = int.TryParse(ConfigurationManager.AppSettings["PrintServiceTimeoutSeconds"], out var s)
                ? s
                : 60;
            using (var cts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSec)))
            using (var upstream = await Client.GetAsync(target, cts.Token).ConfigureAwait(false))
            {
                // 本文は文字列として読み、下流へそのまま載せる（JSON のパースはしない）
                var body = await upstream.Content.ReadAsStringAsync().ConfigureAwait(false);
                var response = new HttpResponseMessage(upstream.StatusCode)
                {
                    Content = new StringContent(body, Encoding.UTF8)
                };
                // クライアント側で MIME を判別できるよう、上流の Content-Type をそのまま使う
                response.Content.Headers.ContentType =
                    upstream.Content.Headers.ContentType ?? new MediaTypeHeaderValue("application/json");
                return response;
            }
        }

        /// <summary>
        /// 指定パスへ POST し、backend-print の HTTP 応答をそのまま返す。
        /// </summary>
        /// <param name="relativePath">ベース URL からの相対パス</param>
        /// <param name="requestBody">送信するボディ（呼び出し側で Content-Type を付与済みであること）</param>
        /// <param name="incomingRequest">現在の API リクエスト（ベース URL 解決に使用）</param>
        public async Task<HttpResponseMessage> ForwardPostAsync(
            string relativePath,
            HttpContent requestBody,
            HttpRequestMessage incomingRequest)
        {
            // GET と同じ手順で転送先 URL を組み立てる
            var baseUrl = ResolvePrintServiceBaseUrl(incomingRequest);
            var path = (relativePath ?? "").TrimStart('/');
            var target = new Uri(new Uri(baseUrl, UriKind.Absolute), path);

            // appSettings の秒数で打ち切り（GET と同じ）
            var timeoutSec = int.TryParse(ConfigurationManager.AppSettings["PrintServiceTimeoutSeconds"], out var s)
                ? s
                : 60;
            using (var cts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSec)))
            using (var upstream = await Client.PostAsync(target, requestBody, cts.Token).ConfigureAwait(false))
            {
                // 上流のステータス・本文・Content-Type を透過（GET と同様）
                var body = await upstream.Content.ReadAsStringAsync().ConfigureAwait(false);
                var response = new HttpResponseMessage(upstream.StatusCode)
                {
                    Content = new StringContent(body, Encoding.UTF8)
                };
                // クライアント側で MIME を判別できるよう、上流の Content-Type をそのまま使う
                response.Content.Headers.ContentType =
                    upstream.Content.Headers.ContentType ?? new MediaTypeHeaderValue("application/json");
                return response;
            }
        }

        /// <summary>
        /// JSON 文字列を application/json で POST する。ForwardPostAsync の糖衣構文。
        /// </summary>
        /// <param name="relativePath">ベース URL からの相対パス</param>
        /// <param name="jsonBody">送信する JSON 文字列（null のときは "{}"）</param>
        /// <param name="incomingRequest">現在の API リクエスト（ベース URL 解決に使用）</param>
        public Task<HttpResponseMessage> ForwardPostJsonAsync(
            string relativePath,
            string jsonBody,
            HttpRequestMessage incomingRequest)
        {
            // ボディを StringContent に包み、JSON として送る（中身の検証はしない）
            var content = new StringContent(jsonBody ?? "{}", Encoding.UTF8, "application/json");
            return ForwardPostAsync(relativePath, content, incomingRequest);
        }

        /// <summary>
        /// backend-print のベース URL（末尾スラッシュ付き）を返す。
        /// </summary>
        /// <param name="incomingRequest">現在の API リクエスト（オリジン・ホスト判定に使用）</param>
        /// <exception cref="InvalidOperationException">本番分岐で PrintServiceApplicationPath が未設定のとき</exception>
        public static string ResolvePrintServiceBaseUrl(HttpRequestMessage incomingRequest)
        {
            // 1) フル URL があればそれだけ使う（任意環境・最優先）
            var configured = (ConfigurationManager.AppSettings["PrintServiceBaseUrl"] ?? "").Trim();
            if (!string.IsNullOrWhiteSpace(configured))
                return EnsureTrailingSlash(configured);

            // 2) 開発: ブラウザが localhost のときだけ、別ポートの backend-print へ直結できる
            var host = incomingRequest?.RequestUri?.Host ?? "";
            if (string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(host, "127.0.0.1", StringComparison.OrdinalIgnoreCase))
            {
                var local = (ConfigurationManager.AppSettings["PrintServiceLocalDebugBaseUrl"] ?? "").Trim();
                if (!string.IsNullOrWhiteSpace(local))
                    return EnsureTrailingSlash(local);
            }

            // 3) 本番想定: リクエストと同じスキーム・ホスト + IIS アプリの先頭1セグメント（例 BBB）
            var origin = incomingRequest?.RequestUri?.GetLeftPart(UriPartial.Authority) ?? "http://localhost";
            var segment = (ConfigurationManager.AppSettings["PrintServiceApplicationPath"] ?? "").Trim().Trim('/');

            if (string.IsNullOrEmpty(segment))
            {
                throw new InvalidOperationException(
                    "PrintServiceApplicationPath が未設定です。本番では backend-print のアプリパスを1セグメントで設定してください（例: BBB）。開発のみ PrintServiceLocalDebugBaseUrl でも可。");
            }

            return EnsureTrailingSlash(origin + "/" + segment);
        }

        /// <summary>
        /// base URL と相対パスを結合するとき、末尾が必ずスラッシュになるようにする。
        /// </summary>
        private static string EnsureTrailingSlash(string url)
        {
            return url.EndsWith("/", StringComparison.Ordinal) ? url : url + "/";
        }
    }
}
