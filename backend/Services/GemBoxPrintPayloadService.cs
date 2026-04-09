using System;
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
    }
}
