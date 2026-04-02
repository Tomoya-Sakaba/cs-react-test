using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Web.Http;
using backend.Models.Repository;
using backend.Services;
using System.Diagnostics;
using System.Threading.Tasks;

namespace backend.Controllers
{
    /// <summary>
    /// GemBox版のPDF生成（テンプレ/マッピングはソース固定）
    ///
    /// - テンプレExcelはサーバ上の固定パスに配置（DB管理しない）
    /// - DBは機器マスタ(m_equipment)のみ参照
    /// - Excel内の {{placeholder}} を埋めてPDF化して返す
    /// </summary>
    [RoutePrefix("api/print-gembox")]
    public class PrintGemBoxController : ApiController
    {
        private readonly GemBoxPdfGenerationService _pdfService;
        private readonly EquipmentRepository _equipmentRepository;
        private readonly string _templateBasePath;
        private readonly string _logPath;
        private readonly int _timeoutSeconds;

        public PrintGemBoxController()
        {
            _pdfService = new GemBoxPdfGenerationService();
            _equipmentRepository = new EquipmentRepository();
            _templateBasePath = ConfigurationManager.AppSettings["BReportTemplateBasePath"]
                ?? @"C:\app_data\b-templates";
            _logPath = ConfigurationManager.AppSettings["GemBoxLogFilePath"];
            _timeoutSeconds = int.TryParse(ConfigurationManager.AppSettings["GemBoxPdfTimeoutSeconds"], out var s)
                ? s
                : 60;
        }

        /// <summary>
        /// 機器台帳PDF生成（GemBox / テンプレはファイル固定）
        /// GET /api/print-gembox/equipment/{equipmentId}/pdf
        /// </summary>
        [HttpGet]
        [Route("equipment/{equipmentId:int}/pdf")]
        public async Task<HttpResponseMessage> GenerateEquipmentPdf(int equipmentId)
        {
            var sw = Stopwatch.StartNew();
            // ログ出力（切り分け用）
            // backend.Services.SimpleFileLogger.Log(_logPath, $"API start. equipmentId={equipmentId}");
            try
            {
                // テンプレは固定ファイル名運用:
                // - Web.config の BReportTemplateBasePath 配下に equipment_master.xlsx を置く
                // - これを “機器台帳テンプレ” として扱う
                var templatePath = Path.Combine(_templateBasePath, "equipment_master.xlsx");
                if (!File.Exists(templatePath))
                {
                    // backend.Services.SimpleFileLogger.Log(_logPath, $"API fail: template not found. templatePath='{templatePath}'");
                    return Request.CreateErrorResponse(HttpStatusCode.NotFound, "テンプレートファイルが見つかりません。");
                }

                // ここで参照するDBは機器マスタのみ（帳票テンプレ/設定はDBに保存しない方針）
                var equipment = _equipmentRepository.GetById(equipmentId);
                if (equipment == null)
                {
                    // backend.Services.SimpleFileLogger.Log(_logPath, $"API fail: equipment not found. equipmentId={equipmentId}");
                    return Request.CreateErrorResponse(HttpStatusCode.NotFound, "機器が見つかりません。");
                }

                // テンプレ内の {{...}} と対応するキーをここで作る
                // - 例: {{equipment_code}} → equipment.EquipmentCode
                // - 明細は {{table:history}} 行テンプレ + {{history.xxx}} で展開
                var data = BuildEquipmentPrintData(equipment);

                // GemBox処理が長時間化した場合にレスポンスを返せるよう、タイムアウトで遮断する
                var work = Task.Run(() => _pdfService.GeneratePdf(templatePath, data));
                var finished = await Task.WhenAny(work, Task.Delay(TimeSpan.FromSeconds(_timeoutSeconds)));
                if (finished != work)
                {
                    // backend.Services.SimpleFileLogger.Log(_logPath, $"API TIMEOUT. equipmentId={equipmentId}, timeoutSeconds={_timeoutSeconds}, elapsedMs={sw.ElapsedMilliseconds}");
                    return Request.CreateErrorResponse((HttpStatusCode)504, $"PDF生成がタイムアウトしました（{_timeoutSeconds}秒）。テンプレや環境を確認してください。");
                }

                var pdfStream = await work;

                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StreamContent(pdfStream)
                };

                response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
                response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
                {
                    FileName = $"equipment_{equipment.EquipmentCode}_gembox.pdf"
                };

                // backend.Services.SimpleFileLogger.Log(_logPath, $"API ok. equipmentId={equipmentId}, elapsedMs={sw.ElapsedMilliseconds}");
                return response;
            }
            catch (Exception ex)
            {
                // backend.Services.SimpleFileLogger.Log(_logPath, $"API ERROR. equipmentId={equipmentId}, elapsedMs={sw.ElapsedMilliseconds}. {ex}");
                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError,
                    $"PDFの生成に失敗しました: {ex.Message}");
            }
        }

        private Dictionary<string, object> BuildEquipmentPrintData(backend.Models.Entities.EquipmentEntity equipment)
        {
            var now = DateTime.Now;
            var printDate = now.ToString("yyyy/MM/dd");

            var history = new List<Dictionary<string, object>>
            {
                new Dictionary<string, object>
                {
                    { "date", "2026/03/01" },
                    { "action", "点検" },
                    { "note", "外観確認" },
                },
                new Dictionary<string, object>
                {
                    { "date", "2026/03/20" },
                    { "action", "交換" },
                    { "note", "フィルタ交換" },
                },
            };

            var data = new Dictionary<string, object>
            {
                // 単票（テンプレ側で {{equipment_code}} 等を使う）
                { "print_date", printDate },
                { "equipment_id", equipment.EquipmentId },
                { "equipment_code", equipment.EquipmentCode ?? "" },
                { "equipment_name", equipment.EquipmentName ?? "" },
                { "category", equipment.Category ?? "" },
                { "manufacturer", equipment.Manufacturer ?? "" },
                { "model", equipment.Model ?? "" },
                { "location", equipment.Location ?? "" },
                { "note", equipment.Note ?? "" },
                { "updated_at", equipment.UpdatedAt.ToString("yyyy/MM/dd HH:mm") },

                // 明細（テンプレ側で {{table:history}} / {{history.date}}）
                { "history", history }
            };

            return data;
        }
    }
}

