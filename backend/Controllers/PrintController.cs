using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Web.Http;
using backend.Models.DTOs;
using backend.Models.Repository;
using backend.Services;
using System.Configuration;
using System.Collections.Generic;
using System.Linq;

namespace backend.Controllers
{
    [RoutePrefix("api/print")]
    public class PrintController : ApiController
    {
        private readonly string _connectionString;
        private readonly TemplateRepository _templateRepository;
        private readonly PrintSettingsRepository _printSettingsRepository;
        private readonly PrintFieldMappingRepository _printFieldMappingRepository;
        private readonly PdfGenerationService _pdfService;
        private readonly EquipmentRepository _equipmentRepository;

        public PrintController()
        {
            _connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;
            _templateRepository = new TemplateRepository(_connectionString);
            _printSettingsRepository = new PrintSettingsRepository(_connectionString);
            _printFieldMappingRepository = new PrintFieldMappingRepository(_connectionString);
            _pdfService = new PdfGenerationService();
            _equipmentRepository = new EquipmentRepository();
        }

        /// <summary>
        /// テンプレートIDとデータからPDFを直接生成して返す
        /// POST /api/print/pdf
        /// </summary>
        [HttpPost]
        [Route("pdf")]
        public HttpResponseMessage GeneratePdf([FromBody] GeneratePdfRequestDto request)
        {
            try
            {
                if (request == null)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "リクエストが不正です。");
                }

                if (request.TemplateId <= 0)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "templateId は必須です。");
                }

                if (request.Data == null)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "data は必須です。");
                }

                var template = _templateRepository.GetTemplateById(request.TemplateId);
                if (template == null)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.NotFound, "テンプレートが見つかりません。");
                }

                if (string.IsNullOrEmpty(template.FilePath) || !File.Exists(template.FilePath))
                {
                    return Request.CreateErrorResponse(HttpStatusCode.NotFound, "テンプレートファイルが見つかりません。");
                }

                Stream pdfStream = _pdfService.GeneratePdf(template.FilePath, request.Data, null);

                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StreamContent(pdfStream)
                };

                response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
                response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
                {
                    FileName = string.IsNullOrWhiteSpace(request.FileName) ? "report.pdf" : request.FileName
                };

                return response;
            }
            catch (Exception ex)
            {
                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError,
                    $"PDFの生成に失敗しました: {ex.Message}");
            }
        }

        /// <summary>
        /// ページコードに紐づくテンプレートでPDF生成（テンプレIDはサーバ側で解決）
        /// POST /api/print/pages/{pageCode}/pdf
        /// </summary>
        [HttpPost]
        [Route("pages/{pageCode}/pdf")]
        public HttpResponseMessage GeneratePdfByPage(string pageCode, [FromBody] GeneratePdfRequestDto request)
        {
            try
            {
                if (request == null)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "リクエストが不正です。");
                }

                var templateId = _printSettingsRepository.GetTemplateIdByPageCode(pageCode);
                if (templateId == null)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.BadRequest, $"ページ '{pageCode}' のテンプレ設定がありません。");
                }

                var template = _templateRepository.GetTemplateById(templateId.Value);
                if (template == null)
                {
                    return Request.CreateErrorResponse(HttpStatusCode.NotFound, "テンプレートが見つかりません。");
                }

                if (string.IsNullOrEmpty(template.FilePath) || !File.Exists(template.FilePath))
                {
                    return Request.CreateErrorResponse(HttpStatusCode.NotFound, "テンプレートファイルが見つかりません。");
                }

                // ページ別のデータ組み立て（DB取得 + マッピング適用）
                Dictionary<string, object> data;
                if (pageCode == "equipment_master")
                {
                    var equipmentIdStr = Request.GetQueryNameValuePairs()
                        .FirstOrDefault(kv => kv.Key == "equipmentId").Value;

                    if (string.IsNullOrWhiteSpace(equipmentIdStr) || !int.TryParse(equipmentIdStr, out int equipmentId))
                    {
                        return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "equipmentId は必須です。");
                    }

                    var equipment = _equipmentRepository.GetById(equipmentId);
                    if (equipment == null)
                    {
                        return Request.CreateErrorResponse(HttpStatusCode.NotFound, "機器が見つかりません。");
                    }

                    var mappings = _printFieldMappingRepository.GetMappings(pageCode, templateId.Value);
                    data = BuildEquipmentPrintData(equipment, mappings);
                }
                else
                {
                    // 後方互換: data を渡している場合はそれを使う
                    if (request.Data == null)
                    {
                        return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "data は必須です。");
                    }
                    data = request.Data;
                }

                Stream pdfStream = _pdfService.GeneratePdf(template.FilePath, data, null);

                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StreamContent(pdfStream)
                };

                response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
                response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
                {
                    FileName = string.IsNullOrWhiteSpace(request.FileName) ? "report.pdf" : request.FileName
                };

                return response;
            }
            catch (Exception ex)
            {
                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError,
                    $"PDFの生成に失敗しました: {ex.Message}");
            }
        }

        private Dictionary<string, object> BuildEquipmentPrintData(backend.Models.Entities.EquipmentEntity equipment, System.Collections.Generic.Dictionary<string, string> mappings)
        {
            var now = DateTime.Now;
            var printDate = now.ToString("yyyy/MM/dd");

            // 明細（例）: 本来は点検履歴テーブル等から取得。現時点はサンプル。
            var history = new System.Collections.Generic.List<System.Collections.Generic.Dictionary<string, object>>
            {
                new System.Collections.Generic.Dictionary<string, object>
                {
                    { "date", "2026/03/01" },
                    { "action", "点検" },
                    { "note", "外観確認" },
                },
                new System.Collections.Generic.Dictionary<string, object>
                {
                    { "date", "2026/03/20" },
                    { "action", "交換" },
                    { "note", "フィルタ交換" },
                },
            };

            object Resolve(string sourceKey)
            {
                if (string.IsNullOrWhiteSpace(sourceKey)) return "";

                switch (sourceKey)
                {
                    case "equipment.equipmentId": return equipment.EquipmentId;
                    case "equipment.equipmentCode": return equipment.EquipmentCode ?? "";
                    case "equipment.equipmentName": return equipment.EquipmentName ?? "";
                    case "equipment.category": return equipment.Category ?? "";
                    case "equipment.manufacturer": return equipment.Manufacturer ?? "";
                    case "equipment.model": return equipment.Model ?? "";
                    case "equipment.location": return equipment.Location ?? "";
                    case "equipment.note": return equipment.Note ?? "";
                    case "equipment.updatedAt": return equipment.UpdatedAt.ToString("yyyy/MM/dd HH:mm");
                    case "system.printDate": return printDate;
                    default:
                        return "";
                }
            }

            var data = new System.Collections.Generic.Dictionary<string, object>
            {
                // テーブル展開用の固定キー（テンプレ側で {{table:history}} / {{history.date}} を使う）
                { "history", history }
            };

            // mapping: field_name（テンプレ内 {{field_name}}） → source_key（equipment.xxx / system.xxx）
            foreach (var kv in mappings)
            {
                var fieldName = kv.Key;
                var sourceKey = kv.Value;

                // 明細列（history.*）はテンプレ行側で {{history.date}} のように記述するので、
                // ここで個別の scalar 埋めは不要（historyは上で渡している）
                if (fieldName != null && fieldName.StartsWith("history.", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                data[fieldName] = Resolve(sourceKey);
            }

            // 便利: マッピングが無くても最低限は埋まるようにデフォルトも入れる
            if (!data.ContainsKey("equipment_code")) data["equipment_code"] = equipment.EquipmentCode ?? "";
            if (!data.ContainsKey("equipment_name")) data["equipment_name"] = equipment.EquipmentName ?? "";
            if (!data.ContainsKey("print_date")) data["print_date"] = printDate;

            return data;
        }
    }
}

