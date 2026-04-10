using System;
using System.Collections.Generic;
using System.Configuration;
using backend.Models.DTOs;
using backend.Models.Repository;

namespace backend.Services
{
    /// <summary>
    /// GemBox印刷向けに、DBから取得した内容を backend-print 用ペイロードへ組み立てる。
    /// 単票・明細の対応は <c>common/print-mappings/equipment_gembox.json</c> のみ（C#固定マッピングは使わない）。
    /// </summary>
    public class GemBoxPrintPayloadService
    {
        private readonly EquipmentRepository _repository = new EquipmentRepository();

        /// <summary>
        /// 機器台帳テンプレ用のリクエストを組み立てる。対象機器が無い場合は null。
        /// マッピングJSONが読めない場合は <see cref="InvalidOperationException"/>。
        /// </summary>
        public GemBoxPrintRequestDto BuildEquipmentMasterPdfRequest(int equipmentId)
        {
            var e = _repository.GetById(equipmentId);
            if (e == null) return null;

            var path = GemBoxPrintMappingEngine.ResolveMappingFilePath();
            var def = GemBoxPrintMappingEngine.LoadDefinition(path);
            if (def == null)
            {
                throw new InvalidOperationException(
                    "GemBox のマッピング定義JSONを読み込めません。Web.config の GemBoxPrintMappingFile と、" +
                    "サイト配下の common/print-mappings/equipment_gembox.json の配置を確認してください。解決パス: " +
                    path);
            }

            return GemBoxPrintMappingEngine.BuildEquipmentRequest(e, def);
        }

        /// <summary>
        /// 疎通・デモ用: Web.config のテンプレートファイル名と固定データで GemBox 印刷リクエストを組み立てる。
        /// テンプレは backend-print 側の <c>BReportTemplateBasePath</c> 配下に配置する。
        /// </summary>
        public GemBoxPrintRequestDto BuildDemoGemBoxPdfRequest()
        {
            var template = (ConfigurationManager.AppSettings["GemBoxDemoTemplateFileName"] ?? "").Trim();
            if (string.IsNullOrWhiteSpace(template))
            {
                throw new InvalidOperationException(
                    "GemBoxDemoTemplateFileName を Web.config に設定してください（例: demo_gembox.xlsx）。backend-print のテンプレフォルダに同名ファイルを置きます。");
            }

            // デモ用 DTO の DownloadFileName（Web.config の GemBoxDemoPdfFileName）。JSON で backend-print に送り、返ってきた PDF には gateway が同じ名前で Content-Disposition を付ける
            var download = (ConfigurationManager.AppSettings["GemBoxDemoPdfFileName"] ?? "document.pdf")
                .Trim();
            if (string.IsNullOrEmpty(download))
                download = "document.pdf";

            return new GemBoxPrintRequestDto
            {
                TemplateFileName = template,
                Data = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                {
                    { "title", "GemBox demo" },
                    { "generatedAt", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") },
                },
                Tables = new Dictionary<string, List<Dictionary<string, object>>>(StringComparer.OrdinalIgnoreCase),
                DownloadFileName = download,
            };
        }
    }
}
