using System;
using System.Configuration;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using backend.Models.DTOs;
using log4net;
using Newtonsoft.Json;

namespace backend.Services
{
    /// <summary>
    /// backend から backend-print へ HTTP を転送する。応答本文はパースせず透過する。
    /// </summary>
    public class PrintServiceHttpProxyService
    {

        private static readonly ILog Log = LogManager.GetLogger(typeof(PrintServiceHttpProxyService));
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
        /// GemBox 印刷: backend-print の <c>POST /api/print/gembox/pdf</c> に JSON を送り、成功時は PDF をバイナリで返す。
        /// </summary>
        /// <remarks>
        /// ForwardPostAsync とは別メソッドにしている。PDF はバイナリのため <see cref="ReadAsStringAsync"/> で透過すると破損する。
        /// </remarks>
        /// <param name="gemBoxPrintRequest">テンプレ名・data/tables・ダウンロード名など（backend が組み立てた DTO）</param>
        /// <param name="incomingRequest">現在の API リクエスト（ベース URL 解決に使用）</param>
        public async Task<HttpResponseMessage> ForwardGemBoxPdfPostAsync(
            GemBoxPrintRequestDto gemBoxPrintRequest,
            HttpRequestMessage incomingRequest)
        {
            // backend-print のルート（末尾 /）と GemBox 用 API パスを結合した絶対 URI
            var baseUrl = ResolvePrintServiceBaseUrl(incomingRequest);
            var target = new Uri(new Uri(baseUrl, UriKind.Absolute), "api/print/gembox/pdf");

            // 他メソッドと同じ秒数。長い PDF 生成でもここで打ち切れるようにする
            var timeoutSec = int.TryParse(ConfigurationManager.AppSettings["PrintServiceTimeoutSeconds"], out var s)
                ? s
                : 60;

            // backend-print が期待する JSON（templateFileName / data / tables / pictures）
            var json = JsonConvert.SerializeObject(gemBoxPrintRequest);
            var correlationId = Guid.NewGuid().ToString("N");

            using (var cts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSec)))
            using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
            using (var req = new HttpRequestMessage(HttpMethod.Post, target) { Content = content })
            {
                req.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);
                using (var upstream = await Client.SendAsync(req, cts.Token).ConfigureAwait(false))
                {

                    if (!upstream.IsSuccessStatusCode)
                    {
                        var err = await upstream.Content.ReadAsStringAsync().ConfigureAwait(false);
                        Log.Error(
                            $"GemBox upstream error. correlationId={correlationId}, status={(int)upstream.StatusCode} {upstream.ReasonPhrase}, " +
                            $"target='{target}', contentType='{upstream.Content?.Headers?.ContentType}', errLen={err?.Length ?? 0}");
                        // エラー応答の整形は Controller に一元化する
                        throw new InvalidOperationException("PRINT_GEMBOX_UPSTREAM_ERROR");
                    }

                // 成功時は PDF のバイト列。ReadAsStringAsync は使わない（エンコーディングで壊れる）
                var bytes = await upstream.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(bytes),
                };

                // ブラウザや axios が application/pdf と認識できるようにする
                response.Content.Headers.ContentType =
                    upstream.Content.Headers.ContentType ?? new MediaTypeHeaderValue("application/pdf");

                // ファイル名はフロント側で決める運用のため、ここでは Content-Disposition / filename を付けない

                    return response;
                }
            }
        }

        /// <summary>
        /// GemBox: backend-print の <c>POST /api/print/gembox/excel</c> に JSON を送り、成功時は埋め込み済み <c>.xlsx</c> をバイナリで返す。
        /// </summary>
        public async Task<HttpResponseMessage> ForwardGemBoxExcelPostAsync(
            GemBoxPrintRequestDto gemBoxPrintRequest,
            HttpRequestMessage incomingRequest)
        {
            var baseUrl = ResolvePrintServiceBaseUrl(incomingRequest);
            var target = new Uri(new Uri(baseUrl, UriKind.Absolute), "api/print/gembox/excel");

            var timeoutSec = int.TryParse(ConfigurationManager.AppSettings["PrintServiceTimeoutSeconds"], out var s)
                ? s
                : 60;

            var json = JsonConvert.SerializeObject(gemBoxPrintRequest);
            var correlationId = Guid.NewGuid().ToString("N");

            using (var cts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSec)))
            using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
            using (var req = new HttpRequestMessage(HttpMethod.Post, target) { Content = content })
            {
                req.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);
                using (var upstream = await Client.SendAsync(req, cts.Token).ConfigureAwait(false))
                {
                    if (!upstream.IsSuccessStatusCode)
                    {
                        var err = await upstream.Content.ReadAsStringAsync().ConfigureAwait(false);
                        Log.Error(
                            $"GemBox excel upstream error. correlationId={correlationId}, status={(int)upstream.StatusCode} {upstream.ReasonPhrase}, " +
                            $"target='{target}', contentType='{upstream.Content?.Headers?.ContentType}', errLen={err?.Length ?? 0}");
                        throw new InvalidOperationException("PRINT_GEMBOX_UPSTREAM_ERROR");
                    }

                    var bytes = await upstream.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
                    var response = new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new ByteArrayContent(bytes),
                    };

                    response.Content.Headers.ContentType =
                        upstream.Content.Headers.ContentType
                        ?? new MediaTypeHeaderValue("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

                    return response;
                }
            }
        }

        /// <summary>
        /// GemBox サンドイッチ印刷: backend-print の <c>POST /api/print/gembox/sandwich-pdf</c> へ JSON を送る。
        /// </summary>
        public async Task<HttpResponseMessage> ForwardGemBoxSandwichPdfPostAsync(
            GemBoxPrintSandwichPdfRequestDto sandwichRequest,
            HttpRequestMessage incomingRequest)
        {
            var baseUrl = ResolvePrintServiceBaseUrl(incomingRequest);
            var target = new Uri(new Uri(baseUrl, UriKind.Absolute), "api/print/gembox/sandwich-pdf");

            var timeoutSec = int.TryParse(ConfigurationManager.AppSettings["PrintServiceTimeoutSeconds"], out var s)
                ? s
                : 60;

            var json = JsonConvert.SerializeObject(sandwichRequest);
            var correlationId = Guid.NewGuid().ToString("N");

            using (var cts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSec)))
            using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
            using (var req = new HttpRequestMessage(HttpMethod.Post, target) { Content = content })
            {
                req.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);
                using (var upstream = await Client.SendAsync(req, cts.Token).ConfigureAwait(false))
                {
                    if (!upstream.IsSuccessStatusCode)
                    {
                        var err = await upstream.Content.ReadAsStringAsync().ConfigureAwait(false);
                        Log.Error(
                            $"GemBox sandwich upstream error. correlationId={correlationId}, status={(int)upstream.StatusCode} {upstream.ReasonPhrase}, " +
                            $"target='{target}', contentType='{upstream.Content?.Headers?.ContentType}', errLen={err?.Length ?? 0}");
                        throw new InvalidOperationException("PRINT_GEMBOX_UPSTREAM_ERROR");
                    }

                    var bytes = await upstream.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
                    var response = new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new ByteArrayContent(bytes),
                    };
                    response.Content.Headers.ContentType =
                        upstream.Content.Headers.ContentType ?? new MediaTypeHeaderValue("application/pdf");
                    return response;
                }
            }
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
