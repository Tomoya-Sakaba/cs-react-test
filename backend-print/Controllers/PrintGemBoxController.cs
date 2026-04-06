using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Web.Http;
using backend_print.Models.Repository;
using backend_print.Services;

namespace backend_print.Controllers
{
    /// <summary>
    /// GemBox版のPDF生成（テンプレはファイル固定）
    /// GET /api/print-gembox/equipment/{equipmentId}/pdf
    /// </summary>
    [RoutePrefix("api/print-gembox")]
    public class PrintGemBoxController : ApiController
    {
        private readonly GemBoxPdfGenerationService _pdfService;
        private readonly EquipmentRepository _equipmentRepository;
        private readonly string _templateBasePath;
        private readonly int _timeoutSeconds;

        public PrintGemBoxController()
        {
            // GemBoxの実処理（Excel差し込み＋PDF化）を行うサービス。
            // ※GemBoxのライセンス設定もサービス側コンストラクタで行う。
            _pdfService = new GemBoxPdfGenerationService();

            // 帳票の元データは m_equipment のみ参照する方針。
            // （テンプレ/マッピングのDB管理はしない運用）
            _equipmentRepository = new EquipmentRepository();

            // テンプレ配置フォルダ（Web.config で差し替え可能）
            // 例) C:\app_data\b-templates
            _templateBasePath = ConfigurationManager.AppSettings["BReportTemplateBasePath"]
                ?? @"C:\app_data\b-templates";

            // PDF生成のタイムアウト（秒）
            // GemBox処理が重い/ハングに見える場合でも、APIとしては時間で打ち切って返す。
            _timeoutSeconds = int.TryParse(ConfigurationManager.AppSettings["GemBoxPdfTimeoutSeconds"], out var s)
                ? s
                : 60;
        }

        [HttpGet]
        [Route("equipment/{equipmentId:int}/pdf")]
        public async Task<HttpResponseMessage> GenerateEquipmentPdf(int equipmentId)
        {
            // --- 1) テンプレの決定（固定名運用） ---
            // このAPIは「機器台帳」を出す専用として、テンプレ名を固定にしている。
            // テンプレを増やす場合は、別エンドポイント/別pageCode運用などに拡張する。
            var templatePath = Path.Combine(_templateBasePath, "equipment_master.xlsx");

            // テンプレファイルが無い場合は 404（配置ミス）
            if (!File.Exists(templatePath))
                return Request.CreateErrorResponse(HttpStatusCode.NotFound, "テンプレートファイルが見つかりません。");

            // --- 2) 帳票対象データの取得（DB: m_equipment） ---
            var equipment = _equipmentRepository.GetById(equipmentId);

            // 対象の機器が無い場合は 404
            if (equipment == null)
                return Request.CreateErrorResponse(HttpStatusCode.NotFound, "機器が見つかりません。");

            // --- 3) Excel埋め込み用データの組み立て ---
            // Excelテンプレ側の {{placeholder}} と一致するキーを Dictionary に詰める。
            // 例) {{equipment_code}} → data["equipment_code"]
            // 明細は {{table:history}} + {{history.xxx}} の運用。
            var data = BuildEquipmentPrintData(equipment);

            // --- 4) GemBox処理（Excel差し込み → PDF化） ---
            // 同期処理を Task.Run で別スレッド実行し、WhenAny でタイムアウト制御する。
            // ※.NET Framework + Web API で “本当にキャンセル” は難しいため、ここでは API応答だけ打ち切る。
            var work = Task.Run(() => _pdfService.GeneratePdf(templatePath, data));
            var finished = await Task.WhenAny(work, Task.Delay(TimeSpan.FromSeconds(_timeoutSeconds)));
            if (finished != work)
                return Request.CreateErrorResponse((HttpStatusCode)504, $"PDF生成がタイムアウトしました（{_timeoutSeconds}秒）。テンプレや環境を確認してください。");

            // work が完了しているので結果（PDFストリーム）を受け取る
            var pdfStream = await work;

            // --- 5) HTTPレスポンス（PDF）を組み立てて返す ---
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StreamContent(pdfStream)
            };

            // ブラウザがPDFとして扱えるように Content-Type を設定
            response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");

            // ダウンロードファイル名を指定（ブラウザの保存名になる）
            response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
            {
                FileName = $"equipment_{equipment.EquipmentCode}_gembox.pdf"
            };

            // ここでPDFレスポンスが返る
            return response;
        }

        private Dictionary<string, object> BuildEquipmentPrintData(backend_print.Models.Entities.EquipmentEntity equipment)
        {
            // Excelテンプレ内の {{print_date}} 用
            var now = DateTime.Now;
            var printDate = now.ToString("yyyy/MM/dd");

            // 明細（テーブル）サンプル。
            // テンプレでは以下のように書く:
            // - 行のどこかに {{table:history}} を置く（行テンプレのマーカー）
            // - 同じ行に {{history.date}} / {{history.action}} / {{history.note}} を置く
            //
            // 今は固定データだが、必要なら別テーブル参照や別API呼び出しに置き換える。
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

            // 単票（キー・バリュー） + 明細（history）をひとつの Dictionary にまとめて返す。
            // GemBoxPdfGenerationService はこの Dictionary を使って {{...}} を置換する。
            return new Dictionary<string, object>
            {
                // --- 単票（テンプレ側: {{print_date}} 等） ---
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

                // --- 明細（テンプレ側: {{table:history}} / {{history.xxx}}） ---
                { "history", history },
            };
        }
    }
}

