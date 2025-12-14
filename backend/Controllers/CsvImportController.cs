using System;
using System.Web;
using System.Web.Http;
using backend.Models.DTOs;
using backend.Services;

namespace backend.Controllers
{
    /// <summary>
    /// CSV取り込みコントローラー
    /// </summary>
    public class CsvImportController : ApiController
    {
        private readonly CsvImportService _service = new CsvImportService();

        /// <summary>
        /// t_results用のCSVファイルをアップロードして取り込む
        /// POST: api/csv/import/results
        /// </summary>
        /// <returns>取り込み結果</returns>
        [HttpPost]
        [Route("api/csv/import/results")]
        public IHttpActionResult ImportResultsCsv()
        {
            try
            {
                // ファイルが送信されているかチェック
                if (HttpContext.Current.Request.Files.Count == 0)
                {
                    return BadRequest("CSVファイルが送信されていません。");
                }

                var file = HttpContext.Current.Request.Files[0];

                // ファイルが空でないかチェック
                if (file == null || file.ContentLength == 0)
                {
                    return BadRequest("CSVファイルが空です。");
                }

                // ファイル拡張子チェック
                if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest("CSVファイルのみアップロード可能です。");
                }

                // ファイルサイズチェック（10MB制限）
                if (file.ContentLength > 10 * 1024 * 1024)
                {
                    return BadRequest("ファイルサイズは10MB以下にしてください。");
                }

                // 作成者（認証実装後はユーザー情報から取得）
                string createdUser = "System";

                // CSV取り込み実行
                var result = _service.ImportResultsCsv(file.InputStream, createdUser);

                // 結果を返す
                if (result.FailureCount == 0)
                {
                    return Ok(result);
                }
                else
                {
                    // 一部失敗がある場合でも200で返す（部分成功）
                    return Ok(result);
                }
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception($"CSV取り込み中にエラーが発生しました: {ex.Message}", ex));
            }
        }

        /// <summary>
        /// t_results用のCSVファイルをアップロードして取り込む（バルクインサート版）
        /// POST: api/csv/import/results/bulk
        /// </summary>
        /// <returns>取り込み結果</returns>
        [HttpPost]
        [Route("api/csv/import/results/bulk")]
        public IHttpActionResult ImportResultsCsvBulk()
        {
            try
            {
                // ファイルが送信されているかチェック
                if (HttpContext.Current.Request.Files.Count == 0)
                {
                    return BadRequest("CSVファイルが送信されていません。");
                }

                var file = HttpContext.Current.Request.Files[0];

                // ファイルが空でないかチェック
                if (file == null || file.ContentLength == 0)
                {
                    return BadRequest("CSVファイルが空です。");
                }

                // ファイル拡張子チェック
                if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest("CSVファイルのみアップロード可能です。");
                }

                // ファイルサイズチェック（10MB制限）
                if (file.ContentLength > 10 * 1024 * 1024)
                {
                    return BadRequest("ファイルサイズは10MB以下にしてください。");
                }

                // 作成者（認証実装後はユーザー情報から取得）
                string createdUser = "System";

                // CSV取り込み実行（バルクインサート版）
                var result = _service.ImportResultsCsvBulk(file.InputStream, createdUser);

                // 結果を返す
                return Ok(result);
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception($"CSV取り込み中にエラーが発生しました: {ex.Message}", ex));
            }
        }

        /// <summary>
        /// t_results用のCSVファイルをアップロードして取り込む（SqlBulkCopy版）
        /// POST: api/csv/import/results/bulkcopy
        /// </summary>
        /// <returns>取り込み結果</returns>
        [HttpPost]
        [Route("api/csv/import/results/bulkcopy")]
        public IHttpActionResult ImportResultsCsvBulkCopy()
        {
            try
            {
                // ファイルが送信されているかチェック
                if (HttpContext.Current.Request.Files.Count == 0)
                {
                    return BadRequest("CSVファイルが送信されていません。");
                }

                var file = HttpContext.Current.Request.Files[0];

                // ファイルが空でないかチェック
                if (file == null || file.ContentLength == 0)
                {
                    return BadRequest("CSVファイルが空です。");
                }

                // ファイル拡張子チェック
                if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest("CSVファイルのみアップロード可能です。");
                }

                // ファイルサイズチェック（10MB制限）
                if (file.ContentLength > 10 * 1024 * 1024)
                {
                    return BadRequest("ファイルサイズは10MB以下にしてください。");
                }

                // 作成者（認証実装後はユーザー情報から取得）
                string createdUser = "System";

                // CSV取り込み実行（SqlBulkCopy版）
                var result = _service.ImportResultsCsvBulkCopy(file.InputStream, createdUser);

                // 結果を返す
                return Ok(result);
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception($"CSV取り込み中にエラーが発生しました: {ex.Message}", ex));
            }
        }

        /// <summary>
        /// 全ての結果データを取得（確認用）
        /// GET: api/csv/results
        /// </summary>
        [HttpGet]
        [Route("api/csv/results")]
        public IHttpActionResult GetAllResults()
        {
            try
            {
                var results = _service.GetAllResults();
                return Ok(results);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        /// <summary>
        /// 全ての結果データを削除（テスト用）
        /// DELETE: api/csv/results
        /// </summary>
        [HttpDelete]
        [Route("api/csv/results")]
        public IHttpActionResult DeleteAllResults()
        {
            try
            {
                _service.DeleteAllResults();
                return Ok(new { message = "全ての結果データを削除しました。" });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }
    }
}

