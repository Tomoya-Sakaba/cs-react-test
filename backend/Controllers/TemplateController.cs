using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;
using backend.Models.DTOs;
using backend.Models.Repository;
using backend.Services;

namespace backend.Controllers
{
    /// <summary>
    /// テンプレート管理API（新システム）
    /// </summary>
    [RoutePrefix("api/report-management/templates")]
    public class TemplateController : ApiController
    {
        private readonly string _connectionString;
        private readonly string _templateBasePath;
        private readonly TemplateRepository _templateRepository;
        private readonly TemplateParserService _parserService;

        public TemplateController()
        {
            _connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;
            _templateBasePath = ConfigurationManager.AppSettings["TemplateBasePath"]
                ?? @"C:\app_data\templates";

            _templateRepository = new TemplateRepository(_connectionString);
            _parserService = new TemplateParserService();

            // ディレクトリが存在しない場合は作成
            if (!Directory.Exists(_templateBasePath))
            {
                Directory.CreateDirectory(_templateBasePath);
            }
        }

        /// <summary>
        /// テンプレート一覧取得
        /// GET /api/templates
        /// </summary>
        [HttpGet]
        [Route("")]
        public IHttpActionResult GetTemplates()
        {
            try
            {
                var templates = _templateRepository.GetTemplateList();
                return Ok(templates);
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception($"テンプレート一覧の取得に失敗しました: {ex.Message}", ex));
            }
        }

        /// <summary>
        /// テンプレート詳細取得
        /// GET /api/templates/{id}
        /// </summary>
        [HttpGet]
        [Route("{id:int}")]
        public IHttpActionResult GetTemplate(int id)
        {
            try
            {
                var template = _templateRepository.GetTemplateById(id);

                if (template == null)
                {
                    return NotFound();
                }

                return Ok(template);
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception($"テンプレートの取得に失敗しました: {ex.Message}", ex));
            }
        }

        /// <summary>
        /// テンプレートアップロード
        /// POST /api/templates/upload
        /// </summary>
        [HttpPost]
        [Route("upload")]
        public async Task<IHttpActionResult> UploadTemplate()
        {
            try
            {
                // ディレクトリ存在チェック
                if (!Directory.Exists(_templateBasePath))
                {
                    Directory.CreateDirectory(_templateBasePath);
                }

                // マルチパートリクエストチェック
                if (!Request.Content.IsMimeMultipartContent())
                {
                    return BadRequest("multipart/form-data形式で送信してください。");
                }

                var provider = new MultipartMemoryStreamProvider();
                await Request.Content.ReadAsMultipartAsync(provider);

                // フォームデータ取得
                string templateName = null;
                string templateCode = null;
                string description = null;
                string createdUser = "System";
                HttpContent fileContent = null;

                foreach (var content in provider.Contents)
                {
                    var name = content.Headers.ContentDisposition.Name?.Trim('"');

                    if (name == "template_name")
                    {
                        templateName = await content.ReadAsStringAsync();
                    }
                    else if (name == "template_code")
                    {
                        templateCode = await content.ReadAsStringAsync();
                    }
                    else if (name == "description")
                    {
                        description = await content.ReadAsStringAsync();
                    }
                    else if (name == "created_user")
                    {
                        createdUser = await content.ReadAsStringAsync();
                    }
                    else if (name == "excel_file")
                    {
                        fileContent = content;
                    }
                }

                // バリデーション
                if (string.IsNullOrEmpty(templateName))
                {
                    return BadRequest("テンプレート名は必須です。");
                }

                if (string.IsNullOrEmpty(templateCode))
                {
                    return BadRequest("テンプレートコードは必須です。");
                }

                if (fileContent == null)
                {
                    return BadRequest("Excelファイルは必須です。");
                }

                // ファイル保存
                var fileName = fileContent.Headers.ContentDisposition.FileName?.Trim('"');
                if (string.IsNullOrEmpty(fileName) || !fileName.EndsWith(".xlsx"))
                {
                    return BadRequest("xlsx形式のファイルをアップロードしてください。");
                }

                var safeFileName = $"{templateCode}_{DateTime.Now:yyyyMMddHHmmss}.xlsx";
                var filePath = Path.Combine(_templateBasePath, safeFileName);

                var fileBytes = await fileContent.ReadAsByteArrayAsync();
                File.WriteAllBytes(filePath, fileBytes);

                // Excelテンプレート解析
                var validation = _parserService.ValidateTemplate(filePath);
                if (!validation.IsValid)
                {
                    File.Delete(filePath);
                    return BadRequest($"テンプレートのバリデーションエラー: {string.Join(", ", validation.Errors)}");
                }

                var fields = _parserService.ParseTemplate(filePath);

                // データベースに保存
                var template = new ReportTemplateDto
                {
                    TemplateName = templateName,
                    TemplateCode = templateCode,
                    Description = description,
                    FileName = safeFileName,
                    FilePath = filePath,
                    FileHash = null, // 将来的にハッシュ値を計算する場合はここで設定
                    IsActive = true,
                    CreatedUser = createdUser
                };

                int templateId = 0;
                
                try
                {
                    System.Diagnostics.Debug.WriteLine($"テンプレートをDBに保存開始: {templateName}");
                    templateId = _templateRepository.InsertTemplate(template);
                    System.Diagnostics.Debug.WriteLine($"テンプレート保存成功 ID: {templateId}");
                }
                catch (Exception dbEx)
                {
                    System.Diagnostics.Debug.WriteLine($"テンプレート保存失敗: {dbEx.Message}");
                    File.Delete(filePath); // ファイル削除
                    throw new Exception($"データベースへのテンプレート保存に失敗: {dbEx.Message}", dbEx);
                }

                // フィールド定義を保存
                try
                {
                    System.Diagnostics.Debug.WriteLine($"フィールド定義を保存開始: {fields.Count}件");
                    _templateRepository.InsertTemplateFields(templateId, fields);
                    System.Diagnostics.Debug.WriteLine("フィールド定義保存成功");
                }
                catch (Exception dbEx)
                {
                    System.Diagnostics.Debug.WriteLine($"フィールド定義保存失敗: {dbEx.Message}");
                    throw new Exception($"フィールド定義の保存に失敗: {dbEx.Message}", dbEx);
                }

                // 結果を返す
                template.TemplateId = templateId;
                template.Fields = fields;

                return Ok(new
                {
                    message = "テンプレートが正常にアップロードされました。",
                    template_id = templateId,
                    template = template
                });
            }
            catch (Exception ex)
            {
                // 詳細なエラーログ
                var errorDetail = $"テンプレートのアップロードに失敗しました: {ex.Message}";
                if (ex.InnerException != null)
                {
                    errorDetail += $" | 内部エラー: {ex.InnerException.Message}";
                }
                errorDetail += $" | スタックトレース: {ex.StackTrace}";

                System.Diagnostics.Debug.WriteLine(errorDetail);
                
                return InternalServerError(new Exception(errorDetail, ex));
            }
        }

        /// <summary>
        /// テンプレート更新
        /// PUT /api/templates/{id}
        /// </summary>
        [HttpPut]
        [Route("{id:int}")]
        public IHttpActionResult UpdateTemplate(int id, [FromBody] ReportTemplateDto template)
        {
            try
            {
                template.TemplateId = id;
                _templateRepository.UpdateTemplate(template);

                return Ok(new { message = "テンプレートが更新されました。" });
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception($"テンプレートの更新に失敗しました: {ex.Message}", ex));
            }
        }

        /// <summary>
        /// テンプレート削除（論理削除）
        /// DELETE /api/templates/{id}
        /// </summary>
        [HttpDelete]
        [Route("{id:int}")]
        public IHttpActionResult DeleteTemplate(int id, [FromUri] string deletedUser = "System")
        {
            try
            {
                _templateRepository.DeleteTemplate(id, deletedUser);
                return Ok(new { message = "テンプレートが削除されました。" });
            }
            catch (Exception ex)
            {
                return InternalServerError(new Exception($"テンプレートの削除に失敗しました: {ex.Message}", ex));
            }
        }

        /// <summary>
        /// サポートされているフィールドタイプ一覧取得
        /// GET /api/templates/field-types
        /// </summary>
        [HttpGet]
        [Route("field-types")]
        public IHttpActionResult GetFieldTypes()
        {
            return Ok(TemplateParserService.SupportedFieldTypes);
        }
    }
}

