using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;

namespace test.Controllers
{
    [RoutePrefix("api/pdf")]
    public class PdfController : ApiController
    {
        // 保存先フォルダ
        private readonly string _uploadPath = @"C:\Users\nezim\OneDrive\ドキュメント\work\cs-react-test\pdf-tmp";

        [HttpPost]
        [Route("upload")]
        public async Task<IHttpActionResult> UploadPdf()
        {
            // リクエストの形式が「multipart/form-data」であるか確認
            if (!Request.Content.IsMimeMultipartContent())
                return BadRequest("Multipart/form-data 形式ではありません");

            // Multipart形式のリクエストを処理するためのプロバイダを作成
            var provider = new MultipartMemoryStreamProvider();

            // 実際にリクエストボディを読み込み、ファイル情報を provider に格納
            await Request.Content.ReadAsMultipartAsync(provider);

            foreach (var file in provider.Contents)
            {
                // ファイル名を取得（例："test.pdf"）
                // Content-Dispositionヘッダーから取得される
                var filename = file.Headers.ContentDisposition.FileName.Trim('\"');

                // ファイル内容をバイト配列として読み込む
                var buffer = await file.ReadAsByteArrayAsync();

                // 保存先フォルダが存在しない場合は自動で作成
                if (!Directory.Exists(_uploadPath))
                    Directory.CreateDirectory(_uploadPath);

                // 保存先の完全なファイルパスを組み立てる
                // （例："C:\Temp\PdfUploads\test.pdf"）
                var filePath = Path.Combine(_uploadPath, filename);

                // 読み込んだバイナリデータをファイルとして書き出し（保存）
                File.WriteAllBytes(filePath, buffer);
            }

            return Ok(new { message = "アップロード成功" });
        }
    }
}