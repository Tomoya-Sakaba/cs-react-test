using System;
using System.Configuration;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Web.Http;

namespace backend.Controllers
{
    /// <summary>
    /// GemBox印刷は別プロジェクト（backend-print）へ分離する。
    /// このControllerはフロント互換のための中継（proxy）のみを担当する。
    ///
    /// GET /api/print-gembox/equipment/{equipmentId}/pdf
    ///   → {PrintServiceBaseUrl}/api/print-gembox/equipment/{equipmentId}/pdf
    /// </summary>
    [RoutePrefix("api/print-gembox")]
    public class PrintGemBoxProxyController : ApiController
    {
        [HttpGet]
        [Route("equipment/{equipmentId:int}/pdf")]
        public async Task<HttpResponseMessage> GenerateEquipmentPdf(int equipmentId)
        {
            // このエンドポイントは「PDF生成を行わない」。
            // backend-print（別プロジェクト）へHTTPでリクエストを転送し、そのレスポンス（PDF）をそのまま返す。
            // 目的は、GemBoxをbackendから切り離してデバッグ/障害影響範囲を分離すること。

            // 転送先（backend-print）のベースURLを解決する。
            // - PrintServiceBaseUrl が設定されていればそれを使う
            // - 未設定なら、環境に応じて「localhost用fallback」か「同一オリジン + /print/」を使う
            var baseUrl = ResolvePrintServiceBaseUrl();

            // backend → backend-print のHTTPタイムアウト。
            // PDF生成が重い場合でも、フロント側が無限待ちにならないように上限を設ける。
            var timeoutSeconds = int.TryParse(ConfigurationManager.AppSettings["PrintServiceTimeoutSeconds"], out var s) ? s : 60;

            // 転送先URLを組み立てる。
            // baseUrl例:
            // - http://localhost:62165/
            // - https://your-domain/print/
            //
            // ここに相対パス "api/..." を連結して、backend-print の同一エンドポイントへ投げる。
            var target = new Uri(new Uri(baseUrl, UriKind.Absolute), $"api/print-gembox/equipment/{equipmentId}/pdf");

            // HttpClientを生成（使い捨て）。
            // ※本番で高負荷なら HttpClient の再利用を検討するが、現状はシンプル優先。
            using (var http = new HttpClient { Timeout = TimeSpan.FromSeconds(timeoutSeconds) })
            // upstream（backend-printのレスポンス）を受け取る。
            // ResponseHeadersRead にして、本文を一気にダウンロードせずヘッダを先に受け取る（＝本来はストリーム転送向け）。
            using (var upstream = await http.GetAsync(target, HttpCompletionOption.ResponseHeadersRead))
            {
                // backend-print が 404 / 500 / 504 などを返した場合は、ここでそのままエラーとして返す。
                // （フロントは backend を叩いているため、backendが“エラー中継”をする）
                if (!upstream.IsSuccessStatusCode)
                {
                    // backend-print 側のエラー本文を文字列として取得して返す。
                    // ※今はJSONが返ってくることが多いが、プレーンテキストでもそのまま返せる。
                    var body = await upstream.Content.ReadAsStringAsync();
                    return Request.CreateErrorResponse(upstream.StatusCode, body);
                }

                // upstream の Stream をそのまま返すと、using ブロックで upstream が Dispose された時点で
                // クライアントへの転送中に接続が切れる（= Connection reset）ことがある。
                //
                // そのためここでは一度PDF全体を byte[] として読み取り、backendのレスポンスとして返す。
                // （帳票PDFが非常に巨大になる運用なら、別の転送方式を検討する）
                var bytes = await upstream.Content.ReadAsByteArrayAsync();

                // backend → フロントへのレスポンスを作る。
                // ステータスは 200 固定（ここに来る時点で upstream は成功している）。
                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(bytes)
                };

                // Content-Type / Content-Disposition を極力そのまま返す。
                // - Content-Type: application/pdf
                // - Content-Disposition: attachment; filename=...
                response.Content.Headers.ContentType = upstream.Content.Headers.ContentType ?? new MediaTypeHeaderValue("application/pdf");

                // backend-print がファイル名を指定している場合はそれをそのまま引き継ぐ。
                if (upstream.Content.Headers.ContentDisposition != null)
                    response.Content.Headers.ContentDisposition = upstream.Content.Headers.ContentDisposition;
                else
                    // backend-print側にContent-Dispositionが無い場合の保険。
                    response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment") { FileName = $"equipment_{equipmentId}_gembox.pdf" };

                // ここでフロントへPDFが返る。
                return response;
            }
        }

        private string ResolvePrintServiceBaseUrl()
        {
            // 明示設定（最優先）:
            // - 別ドメイン/別サーバに置く場合や、検証用URLが固定の場合に使う。
            var configured = (ConfigurationManager.AppSettings["PrintServiceBaseUrl"] ?? "").Trim();
            if (!string.IsNullOrWhiteSpace(configured))
                return EnsureTrailingSlash(configured);

            // 未設定の場合:
            // - 開発(localhost)は backend-print を別ポートで起動する運用が多いため、専用のfallback設定を使う
            // - それ以外は同一オリジン + /print/ を採用
            var host = Request?.RequestUri?.Host ?? "";
            if (string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(host, "127.0.0.1", StringComparison.OrdinalIgnoreCase))
            {
                // 開発用fallback:
                // 例) backend-print を Ctrl+F5 で http://localhost:62165/ で起動しているケース
                var local = (ConfigurationManager.AppSettings["PrintServiceLocalDebugBaseUrl"] ?? "").Trim();
                if (!string.IsNullOrWhiteSpace(local))
                    return EnsureTrailingSlash(local);
            }

            // 本番/検証/テスト向けの自動解決:
            // backend が受けたリクエストのオリジン（例: https://example.com）を取り出し、/print/ を付ける。
            // これにより環境ごとにドメインが違っても Web.config を変更せずに済む。
            var origin = Request?.RequestUri?.GetLeftPart(UriPartial.Authority) ?? "http://localhost";
            return EnsureTrailingSlash(origin) + "print/";
        }

        private static string EnsureTrailingSlash(string url)
        {
            return url.EndsWith("/", StringComparison.Ordinal) ? url : url + "/";
        }
    }
}

