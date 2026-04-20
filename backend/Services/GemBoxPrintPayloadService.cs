using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Configuration;
using System.Linq;
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

        private const string EquipmentMappingFileName = "equipment_gembox.json";
        private const string EquipmentDetailMappingFileName = "equipment_detail_gembox.json";
        private const string EquipmentListMappingFileName = "equipment_list_gembox.json";
        private const string DemoMappingFileName = "demo_gembox.json";

        private static void LogMappingLoadFailure(string message)
        {
            var path = (ConfigurationManager.AppSettings["PrintProxyLogFilePath"] ?? "").Trim();
            SimpleFileLogger.Log(path, message);
        }

        /// <summary>
        /// 機器台帳テンプレ用のリクエストを組み立てる。対象機器が無い場合は null。
        /// マッピングJSONが読めない場合は <see cref="InvalidOperationException"/>。
        /// </summary>
        public GemBoxPrintRequestDto BuildEquipmentMasterPdfRequest(int equipmentId)
        {
            var e = _repository.GetById(equipmentId);
            if (e == null) return null;

            var def = GemBoxPrintMappingEngine.LoadDefinition(EquipmentMappingFileName, out var resolvedPath);
            if (def == null)
            {
                LogMappingLoadFailure($"[GemBox] mapping load failed. kind=equipment, path='{resolvedPath}', exists={File.Exists(resolvedPath)}");
                throw new InvalidOperationException(
                    "印刷設定の読み込みに失敗しました（帳票定義）。管理者に連絡してください。");
            }

            return GemBoxPrintMappingEngine.BuildRequest(def, scalarSource: e, pictureSource: e, tableRowSourcesByKey: null);
        }

        /// <summary>
        /// 機器詳細＋部品(parts)＋関連機器(linked) の GemBox 用テンプレ（equipment_detail_gembox.json / equipment_master_detail.xlsx）。
        /// parts / linked はテストデータ（<see cref="EquipmentDetailGemBoxTestData"/>）。
        /// </summary>
        public GemBoxPrintRequestDto BuildEquipmentDetailListsPdfRequest(int equipmentId)
        {
            // 1) DBから「単票に使う基本情報」を取得する。
            //    ここでは EquipmentRepository が EquipmentEntity（= 1件分のDTO/Entity）を返す。
            var e = _repository.GetById(equipmentId);
            if (e == null) return null;

            // 2) 帳票定義（マッピングJSON）を読み込む。
            //    JSONには「Excelのキー」と「取得元キー(dbColumn)」の対応（scalars / tables / pictures）が書かれている。
            var def = GemBoxPrintMappingEngine.LoadDefinition(EquipmentDetailMappingFileName, out var resolvedPath);
            if (def == null)
            {
                LogMappingLoadFailure($"[GemBox] mapping load failed. kind=equipment_detail, path='{resolvedPath}', exists={File.Exists(resolvedPath)}");
                throw new InvalidOperationException(
                    "印刷設定の読み込みに失敗しました（帳票定義）。管理者に連絡してください。");
            }

            // 3) 明細（テーブル）用の「行データ」を用意する。
            //    - キー: JSON定義の tableKey（例: parts / linked）
            //    - 値  : 行の配列（IEnumerable<object>）。1行は DTO/Entity/辞書のどれでもよい。
            //
            //    BuildRequest はこの行データを受け取り、JSON定義の columns に従って
            //    {{parts.xxx}} / {{linked.xxx}} の "xxx" に値を流し込める形へ変換する。
            var tableSources = new Dictionary<string, IEnumerable<object>>(StringComparer.OrdinalIgnoreCase)
            {
                ["parts"] = EquipmentDetailGemBoxTestData.GetPartsRows(equipmentId).Cast<object>(),
                ["linked"] = EquipmentDetailGemBoxTestData.GetLinkedEquipmentRows(equipmentId).Cast<object>(),
            };

            // 4) 汎用マッピング関数で「backend-print に渡す DTO」を組み立てる。
            //    - scalarSource: 単票の取得元（JSONの scalars の dbColumn をここから引く）
            //    - pictureSource: 画像の取得元（JSONの pictures の dbColumn をここから引く）
            //    - tableRowSourcesByKey: テーブル行の取得元（JSONの tables[].tableKey ごとに行配列を渡す）
            var dto = GemBoxPrintMappingEngine.BuildRequest(def, scalarSource: e, pictureSource: e, tableRowSourcesByKey: tableSources);
            if (dto?.Tables == null)
                return dto;

            return dto;
        }

        /// <summary>
        /// 機器マスタ一覧（全件）を GemBox テンプレに流し込むリクエストを組み立てる。
        /// </summary>
        public GemBoxPrintRequestDto BuildEquipmentListPdfRequest()
        {
            var def = GemBoxPrintMappingEngine.LoadDefinition(EquipmentListMappingFileName, out var resolvedPath);
            if (def == null)
            {
                LogMappingLoadFailure($"[GemBox] mapping load failed. kind=equipment_list, path='{resolvedPath}', exists={File.Exists(resolvedPath)}");
                throw new InvalidOperationException(
                    "印刷設定の読み込みに失敗しました（帳票定義）。管理者に連絡してください。");
            }

            var list = _repository.GetAll();
            return GemBoxPrintMappingEngine.BuildRequest(
                def,
                scalarSource: null,
                pictureSource: null,
                tableRowSourcesByKey: new Dictionary<string, IEnumerable<object>>(StringComparer.OrdinalIgnoreCase)
                {
                    [(def.Tables != null && def.Tables.Count > 0 && !string.IsNullOrWhiteSpace(def.Tables[0]?.TableKey))
                        ? def.Tables[0].TableKey.Trim()
                        : "items"] = (list ?? new List<backend.Models.Entities.EquipmentEntity>()).Cast<object>()
                });
        }

        /// <summary>
        /// 疎通・デモ用: <c>common/print-mappings/demo_gembox.json</c> の定義を正として GemBox 印刷リクエストを組み立てる。
        /// テンプレは backend-print 側の <c>BReportTemplateBasePath</c> 配下に配置する。
        /// 画像は <c>demo_gembox.json</c> の <c>pictures[].dbColumn</c> と同じキーで <c>pictureSource</c> にファイル名を載せる（例: picture1 → test1.png）。
        /// </summary>
        public GemBoxPrintRequestDto BuildDemoGemBoxPdfRequest()
        {
            // 定義ファイル（jsonファイル）を読み込む
            var def = GemBoxPrintMappingEngine.LoadDefinition(DemoMappingFileName, out var resolvedPath);
            if (def == null)
            {
                LogMappingLoadFailure($"[GemBox] mapping load failed. kind=demo, path='{resolvedPath}', exists={File.Exists(resolvedPath)}");
                throw new InvalidOperationException(
                    "印刷設定の読み込みに失敗しました（デモ帳票定義）。管理者に連絡してください。");
            }

            var scalarSource = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
            {
                ["title"] = "GemBox demo",
                ["generatedAt"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
            };

            var pictureSource = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
            {
                ["picture1"] = "test1.png",
                ["picture2"] = "test2.png",
            };

            var tableSources = new Dictionary<string, IEnumerable<object>>(StringComparer.OrdinalIgnoreCase)
            {
                ["items"] = new List<Dictionary<string, object>>
                {
                    new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                    {
                        ["name"] = "Item A",
                        ["qty"] = 1.1111,
                        ["note"] = "demo row"
                    },
                    new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                    {
                        ["name"] = "Item B",
                        ["qty"] = 2.0000,
                        ["note"] = ""
                    }
                }.Cast<object>()
            };

            var dto = GemBoxPrintMappingEngine.BuildRequest(def, scalarSource, pictureSource, tableSources);
            if (dto == null)
                throw new InvalidOperationException("印刷データの組み立てに失敗しました（デモ）。");

            return dto;
        }
    }
}
