using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Web;
using System.Web.Http;
using backend.Services;

namespace backend.Controllers
{
    public class PhotoCommentsController : ApiController
    {
        private static readonly string ImagesDir = Path.GetFullPath(
            Path.Combine(HttpRuntime.AppDomainAppPath, "..", "images")
        );

        private readonly PhotoCommentService _service = new PhotoCommentService();

        [HttpGet]
        [Route("api/photo-comments")]
        public IHttpActionResult GetAll()
        {
            return Ok(_service.GetAll());
        }

        [HttpGet]
        [Route("api/photo-comments/{id:int}/image")]
        public HttpResponseMessage GetImageById(int id)
        {
            var dto = _service.GetById(id);
            if (dto == null) return Request.CreateResponse(HttpStatusCode.NotFound);

            return GetImage(dto.FileName);
        }

        [HttpPost]
        [Route("api/photo-comments")]
        public IHttpActionResult Create()
        {
            var request = HttpContext.Current?.Request;
            if (request == null) return BadRequest("リクエストが不正です。");

            if (request.Files == null || request.Files.Count == 0)
            {
                return BadRequest("画像ファイルがありません。");
            }

            var file = request.Files[0];
            if (file == null || file.ContentLength <= 0) return BadRequest("画像ファイルが不正です。");

            var comment = (request.Form?["comment"] ?? "").Trim();

            var originalName = Path.GetFileName(file.FileName ?? "");
            var ext = Path.GetExtension(originalName)?.ToLowerInvariant() ?? "";
            if (!IsAllowedImageExtension(ext))
            {
                return BadRequest("対応していない画像形式です（jpg/png/gif/webp）。");
            }

            Directory.CreateDirectory(ImagesDir);
            var safeFileName = $"{Guid.NewGuid():N}{ext}";
            var savedPath = Path.Combine(ImagesDir, safeFileName);

            file.SaveAs(savedPath);

            var created = _service.Create(safeFileName, comment);
            return Ok(created);
        }

        [HttpGet]
        // IISが「.jpg等の拡張子付きURL」を静的ファイルとして処理してしまうことがあるため、クエリで受ける
        // 例: /api/photo-comments/image?fileName=xxxx.jpg
        [Route("api/photo-comments/image")]
        public HttpResponseMessage GetImage([FromUri] string fileName)
        {
            var safeName = Path.GetFileName(fileName ?? "");
            if (string.IsNullOrWhiteSpace(safeName))
            {
                return Request.CreateResponse(HttpStatusCode.BadRequest, "fileNameが不正です。");
            }

            var fullPath = Path.Combine(ImagesDir, safeName);
            if (!File.Exists(fullPath))
            {
                return Request.CreateResponse(HttpStatusCode.NotFound);
            }

            var stream = File.OpenRead(fullPath);
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StreamContent(stream)
            };

            response.Content.Headers.ContentType = new MediaTypeHeaderValue(GetMimeType(fullPath));
            response.Headers.CacheControl = new CacheControlHeaderValue
            {
                Public = true,
                MaxAge = TimeSpan.FromHours(1),
            };

            return response;
        }

        private static bool IsAllowedImageExtension(string ext)
        {
            switch (ext)
            {
                case ".jpg":
                case ".jpeg":
                case ".png":
                case ".gif":
                case ".webp":
                    return true;
                default:
                    return false;
            }
        }

        private static string GetMimeType(string path)
        {
            var mime = MimeMapping.GetMimeMapping(path);
            return string.IsNullOrWhiteSpace(mime) ? "application/octet-stream" : mime;
        }
    }
}

