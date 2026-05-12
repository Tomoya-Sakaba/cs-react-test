using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using backend.Models.Config;
using backend.Models.DTOs;
using backend.Models.Entities;
using backend.Models.Repository;
using log4net;

namespace backend.Services
{
    /// <summary>
    /// GemBox印刷向けに、DBから取得した内容を backend-print 用ペイロードへ組み立てる。
    /// 各 <c>case</c> ではリポジトリ取得と scalar / picture / tables の組み立てのみ。
    /// マッピング読込と <see cref="GemBoxPrintMappingEngine.BuildRequest"/> は <see cref="BuildFromMappingFile"/> に集約。
    /// </summary>
    public class GemBoxPrintPayloadService
    {
        private static readonly ILog Log = LogManager.GetLogger(typeof(GemBoxPrintPayloadService));
        /// <summary>
        /// <c>BuildGemBoxPdfRequest</c> の <c>switch</c> と GET <c>report</c> クエリを揃える（追加時はここだけでなくフロントも更新）。
        /// </summary>
        private static class ReportCodes
        {
            public const string EquipmentMaster = "equipment_master";
            public const string EquipmentDetailLists = "equipment_detail_lists";
            public const string EquipmentList = "equipment_list";
            public const string KoujiBudget = "kouji_budget";
            public const string Demo = "demo";
        }

        private readonly EquipmentRepository _repository = new EquipmentRepository();
        private readonly KoujiRepository _koujiRepository = new KoujiRepository();

        private const string EquipmentMappingFileName = "equipment_gembox.json";
        private const string EquipmentDetailMappingFileName = "equipment_detail_gembox.json";
        private const string EquipmentListMappingFileName = "equipment_list_gembox.json";
        private const string KoujiBudgetMappingFileName = "kouji_budget_gembox.json";
        private const string DemoMappingFileName = "demo_gembox.json";

        private static Dictionary<string, object> BuildPictureSource<T>(
            T entity,
            Func<T, IEnumerable<EquipmentPictureEntity>> getPictures,
            string keyPrefix = "pic")
        {
            var dict = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            if (entity == null || getPictures == null) return dict;

            var pictures = getPictures(entity);
            if (pictures == null) return dict;

            foreach (var p in pictures)
            {
                if (p == null) continue;

                var key = $"{keyPrefix}_{p.PictureTab}_{p.PictureNo}";
                dict[key] = (p.PicturePath ?? "").Trim();
            }
            return dict;
        }

        private static Dictionary<string, object> BuildPictureCommentsOverrides<T>(
            T entity,
            Func<T, IEnumerable<EquipmentPictureEntity>> getPictures,
            string commentKeyPrefix = "pic_comment")
        {
            var dict = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            if (entity == null || getPictures == null) return dict;

            var pictures = getPictures(entity);
            if (pictures == null) return dict;

            foreach (var p in pictures)
            {
                if (p == null) continue;
                var key = $"{commentKeyPrefix}_{p.PictureTab}_{p.PictureNo}";
                dict[key] = (p.PictureComments ?? "").Trim();
            }
            return dict;
        }

        /// <summary>
        /// クエリ <c>report</c> の文字列（小文字化して比較）でペイロード組み立てを振り分ける。
        /// </summary>
        public GemBoxPrintRequestDto BuildGemBoxPdfRequest(string reportCode, int? reportNo)
        {
            var code = (reportCode ?? "").Trim();
            if (code.Length == 0)
                throw new ArgumentException("report（帳票コード）が空です。");

            switch (code.ToLowerInvariant())
            {
                case ReportCodes.EquipmentMaster:
                    if (!reportNo.HasValue || reportNo.Value <= 0)
                        throw new ArgumentException($"{ReportCodes.EquipmentMaster} では reportNo が必要です。");
                    {
                        var id = reportNo.Value;
                        var equipment = _repository.GetById(id);
                        if (equipment == null)
                            return null;

                        var scalarRow = _repository.GetEquipmentMasterScalarRow(id);
                        if (scalarRow == null)
                            return null;

                        IEnumerable<EquipmentPictureEntity> GetAllPictures(EquipmentEntity e) =>
                            (e?.Pictures ?? Enumerable.Empty<EquipmentPictureEntity>())
                            .Concat(e?.PicturesSubParts ?? Enumerable.Empty<EquipmentPictureEntity>());

                        object scalarSource = new ValueSourceWithOverrides(
                            scalarRow,
                            BuildPictureCommentsOverrides(equipment, GetAllPictures));
                        object pictureSource = BuildPictureSource(equipment, GetAllPictures);
                        IEnumerable<object>[] tableRowsInOrder = null;

                        var dto = BuildFromMappingFile(
                            EquipmentMappingFileName,
                            "equipment",
                            scalarSource,
                            pictureSource,
                            tableRowsInOrder);
                        return dto;
                    }

                case ReportCodes.EquipmentDetailLists:
                    if (!reportNo.HasValue || reportNo.Value <= 0)
                        throw new ArgumentException($"{ReportCodes.EquipmentDetailLists} では reportNo が必要です。");
                    {
                        var id = reportNo.Value;
                        var equipment = _repository.GetById(id);
                        if (equipment == null)
                            return null;

                        IEnumerable<EquipmentPictureEntity> GetAllPictures(EquipmentEntity e) =>
                            (e?.Pictures ?? Enumerable.Empty<EquipmentPictureEntity>())
                            .Concat(e?.PicturesSubParts ?? Enumerable.Empty<EquipmentPictureEntity>());

                        object scalarSource = new ValueSourceWithOverrides(
                            equipment,
                            BuildPictureCommentsOverrides(equipment, GetAllPictures));
                        object pictureSource = BuildPictureSource(equipment, GetAllPictures);
                        // テーブルキーは JSON(def.tables[]) の順序で割り当てる（ここではキー文字列を書かない）
                        IEnumerable<object> partsRows = EquipmentDetailGemBoxTestData.GetPartsRows(id).Cast<object>();
                        IEnumerable<object> linkedRows = EquipmentDetailGemBoxTestData.GetLinkedEquipmentRows(id).Cast<object>();
                        IEnumerable<object>[] tableRowsInOrder = { partsRows, linkedRows };

                        var dto = BuildFromMappingFile(
                            EquipmentDetailMappingFileName,
                            "equipment_detail",
                            scalarSource,
                            pictureSource,
                            tableRowsInOrder);
                        return dto;
                    }

                case ReportCodes.EquipmentList:
                    {
                        var list = _repository.GetAll();
                        object scalarSource = null;
                        object pictureSource = null;
                        IEnumerable<object> itemsRows = (list ?? new List<backend.Models.Entities.EquipmentEntity>()).Cast<object>();
                        IEnumerable<object>[] tableRowsInOrder = { itemsRows };

                        return BuildFromMappingFile(
                            EquipmentListMappingFileName,
                            "equipment_list",
                            scalarSource,
                            pictureSource,
                            tableRowsInOrder);
                    }

                case ReportCodes.KoujiBudget:
                    if (!reportNo.HasValue || reportNo.Value < 2000 || reportNo.Value > 2100)
                        throw new ArgumentException($"{ReportCodes.KoujiBudget} では reportNo に年度（例: 2026）が必要です。");
                    {
                        var fiscalYear = reportNo.Value;
                        var kouji = _koujiRepository.GetAll(includeInactive: false);

                        // 年度: 4月〜翌年3月
                        var from = fiscalYear * 100 + 4;
                        var to = (fiscalYear + 1) * 100 + 3;
                        var monthly = _koujiRepository.GetMonthlyByYyyymmRange(from, to);

                        object scalarSource = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                        {
                            ["fiscal_year"] = fiscalYear,
                            ["generated_at"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                        };
                        object pictureSource = null;

                        // 1工事 = 1行。月セルは1つだけ（m04..m03）。
                        // 同月に予算と実績が両方ある場合は「実績を優先」してセルに入れる（=セルの値は常に1レコード分）。
                        // 背景色は選ばれた type（budget/actual）で backend-print 側が塗る（rowData["m04_type"] 等）。
                        var monthlyByKey = (monthly ?? new List<KoujiMonthlyEntity>())
                            .GroupBy(x => $"{x.KoujiId}:{x.Yyyymm}:{x.Type}")
                            .ToDictionary(g => g.Key, g => g.First());

                        bool TryGetAmount(int koujiId, int yyyymm, byte type, out decimal amount)
                        {
                            amount = 0;
                            if (monthlyByKey.TryGetValue($"{koujiId}:{yyyymm}:{type}", out var row))
                            {
                                amount = row.Amount;
                                return true;
                            }
                            return false;
                        }

                        void FillMonth(Dictionary<string, object> r, int koujiId, int month1to12, int yyyymm)
                        {
                            // 優先順: 実績(1) -> 予算(0)
                            if (TryGetAmount(koujiId, yyyymm, 1, out var a))
                            {
                                r[$"m{month1to12:00}"] = a.ToString("0.##", CultureInfo.InvariantCulture);
                                r[$"m{month1to12:00}_type"] = "actual";
                                return;
                            }
                            if (TryGetAmount(koujiId, yyyymm, 0, out var b))
                            {
                                r[$"m{month1to12:00}"] = b.ToString("0.##", CultureInfo.InvariantCulture);
                                r[$"m{month1to12:00}_type"] = "budget";
                                return;
                            }
                            r[$"m{month1to12:00}"] = "";
                            r[$"m{month1to12:00}_type"] = "";
                        }

                        var rows = new List<Dictionary<string, object>>();
                        foreach (var k in kouji ?? new List<KoujiEntity>())
                        {
                            decimal totalBudget = 0;
                            for (int m = 4; m <= 12; m++)
                            {
                                var yyyymm = fiscalYear * 100 + m;
                                if (TryGetAmount(k.KoujiId, yyyymm, 0, out var bb)) totalBudget += bb;
                            }
                            for (int m = 1; m <= 3; m++)
                            {
                                var yyyymm = (fiscalYear + 1) * 100 + m;
                                if (TryGetAmount(k.KoujiId, yyyymm, 0, out var bb)) totalBudget += bb;
                            }

                            var r = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                            {
                                ["kouji_id"] = k.KoujiId,
                                ["kouji_name"] = k.KoujiName,
                                ["cycle"] = $"{k.CycleYears}年に{k.CycleTimes}回",
                                ["total_budget"] = totalBudget.ToString("0.##", CultureInfo.InvariantCulture),
                            };
                            for (int m = 4; m <= 12; m++)
                                FillMonth(r, k.KoujiId, m, fiscalYear * 100 + m);
                            for (int m = 1; m <= 3; m++)
                                FillMonth(r, k.KoujiId, m, (fiscalYear + 1) * 100 + m);

                            rows.Add(r);
                        }

                        IEnumerable<object> itemsRows = rows.Cast<object>();
                        IEnumerable<object>[] tableRowsInOrder = { itemsRows };

                        return BuildFromMappingFile(
                            KoujiBudgetMappingFileName,
                            "kouji_budget",
                            scalarSource,
                            pictureSource,
                            tableRowsInOrder);
                    }

                case ReportCodes.Demo:
                    {
                        object scalarSource = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                        {
                            ["title"] = "GemBox demo",
                            ["generatedAt"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                        };
                        object pictureSource = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                        {
                            ["picture1"] = "C:\\app_data\\picuture\\test1.png",
                            ["picture2"] = "C:\\app_data\\picuture\\test2.png",
                        };
                        // テーブルキーは JSON(def.tables[]) の順序で割り当てる
                        IEnumerable<object> itemsRows = new List<Dictionary<string, object>>
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
                        }.Cast<object>();
                        IEnumerable<object>[] tableRowsInOrder = { itemsRows };

                        var dto = BuildFromMappingFile(
                            DemoMappingFileName,
                            "demo",
                            scalarSource,
                            pictureSource,
                            tableRowsInOrder);
                        if (dto == null)
                            throw new InvalidOperationException("印刷データの組み立てに失敗しました（デモ）。");
                        return dto;
                    }

                default:
                    throw new ArgumentException($"不明な帳票コード: {code}");
            }
        }

        /// <summary>
        /// マッピングファイルから <c>def</c> を読み、テーブル行データを <c>def.tables[]</c> の順序で辞書化して
        /// <see cref="GemBoxPrintMappingEngine.BuildRequest"/> へ渡す。
        /// </summary>
        private static GemBoxPrintRequestDto BuildFromMappingFile(
            string mappingFileName,
            string logKind,
            object scalarSource,
            object pictureSource,
            IEnumerable<object>[] tableRowsInOrder)
        {
            var mappingDefinition = GemBoxPrintMappingEngine.LoadDefinition(mappingFileName, out var resolvedPath);
            if (mappingDefinition == null)
            {
                Log.Error($"[GemBox] mapping load failed. kind={logKind}, path='{resolvedPath}', exists={File.Exists(resolvedPath)}");
                throw new InvalidOperationException(
                    "印刷設定の読み込みに失敗しました（帳票定義）。管理者に連絡してください。");
            }

            return BuildFromLoadedMappingDefinition(
                mappingDefinition,
                scalarSource,
                pictureSource,
                tableRowsInOrder);
        }

        /// <summary>
        /// マッピング定義オブジェクト（既にロード済み）から <see cref="GemBoxPrintRequestDto"/> を組み立てる。
        /// <see cref="BuildFromMappingFile"/> と同じ経路（<see cref="BuildTableSourcesByDefinition"/> → <see cref="GemBoxPrintMappingEngine.BuildRequest"/>）。
        /// </summary>
        internal static GemBoxPrintRequestDto BuildFromLoadedMappingDefinition(
            GemBoxPrintMappingDefinition mappingDefinition,
            object scalarSource,
            object pictureSource,
            IEnumerable<object>[] tableRowsInOrder)
        {
            var tableRowSourcesByKey = BuildTableSourcesByDefinition(mappingDefinition, tableRowsInOrder);

            return GemBoxPrintMappingEngine.BuildRequest(
                mappingDefinition,
                scalarSource,
                pictureSource,
                tableRowSourcesByKey);
        }

        /// <summary>
        /// <c>def.tables[]</c> の順序でテーブル行データを辞書化する。
        /// case 側で tableKey を直書きしないための共通処理。
        /// </summary>
        private static Dictionary<string, IEnumerable<object>> BuildTableSourcesByDefinition(
            GemBoxPrintMappingDefinition mappingDefinition,
            IEnumerable<object>[] tableRowsInOrder)
        {
            if (mappingDefinition?.Tables == null || mappingDefinition.Tables.Count == 0)
                return null;

            if (tableRowsInOrder == null || tableRowsInOrder.Length == 0)
                return null;

            if (tableRowsInOrder.Length != mappingDefinition.Tables.Count)
            {
                throw new InvalidOperationException(
                    $"tables の数が一致しません。def.Tables.Count={mappingDefinition.Tables.Count}, rows={tableRowsInOrder.Length}");
            }

            var dict = new Dictionary<string, IEnumerable<object>>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < mappingDefinition.Tables.Count; i++)
            {
                var key = (mappingDefinition.Tables[i]?.TableKey ?? "").Trim();
                if (string.IsNullOrWhiteSpace(key))
                    key = "items";
                dict[key] = tableRowsInOrder[i] ?? Enumerable.Empty<object>();
            }
            return dict;
        }
    }
}
