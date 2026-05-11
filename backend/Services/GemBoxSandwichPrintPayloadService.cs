using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using backend.Models.DTOs;
using log4net;

namespace backend.Services
{
    /// <summary>
    /// サンドイッチPDF用: <see cref="GemBoxPrintPayloadService.BuildGemBoxPdfRequest"/> の各 <c>case</c> と同じく
    /// データソースを組み立て、<see cref="BuildSandwichFromMappingFile"/> でマッピング読込・DTO化する。
    /// 中間PDFパスは本クラス内の定数（帳票ごとの case で直書き）。後ほど DB 取得に差し替え予定。
    /// </summary>
    public class GemBoxSandwichPrintPayloadService
    {
        private static readonly ILog Log = LogManager.GetLogger(typeof(GemBoxSandwichPrintPayloadService));

        private static class ReportCodes
        {
            public const string SandwichDemo = "sandwich_demo";
        }

        private const string SandwichDemoMappingFileName = "gembox_sandwich_sample.json";

        /// <summary>
        /// サンドイッチ中間PDFのフルパス（backend-print へ転送。絶対パス時は backend-print 側 GemBoxSandwichAllowAbsoluteMiddlePdf=true）。
        /// TODO: DB から取得するよう置換。
        /// </summary>
        private const string SandwichDemoMiddlePdfFullPath = @"C:\app_data\b-templates\sandwich_insert.pdf";

        /// <summary>
        /// クエリ <c>report</c> で定義JSONを選び、<see cref="GemBoxPrintSandwichPdfRequestDto"/> を返す。
        /// </summary>
        public GemBoxPrintSandwichPdfRequestDto BuildSandwichPdfRequest(string reportCode, int? reportNo)
        {
            var code = (reportCode ?? "").Trim();
            if (code.Length == 0)
                throw new ArgumentException("report（帳票コード）が空です。");

            switch (code.ToLowerInvariant())
            {
                case ReportCodes.SandwichDemo:
                    {
                        _ = reportNo;
                        // デモ帳票（ReportCodes.Demo）と同じソース。マッピングは gembox_sandwich_sample.json 側。
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
                                ["note"] = "demo row",
                            },
                            new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                            {
                                ["name"] = "Item B",
                                ["qty"] = 2.0000,
                                ["note"] = "",
                            },
                        }.Cast<object>();
                        IEnumerable<object>[] tableRowsInOrder = { itemsRows };

                        return BuildSandwichFromMappingFile(
                            SandwichDemoMappingFileName,
                            "sandwich_demo",
                            SandwichDemoMiddlePdfFullPath,
                            scalarSource,
                            pictureSource,
                            tableRowsInOrder);
                    }

                default:
                    throw new ArgumentException($"未対応のサンドイッチ帳票コード: {code}");
            }
        }

        /// <summary>
        /// サンドイッチ用マッピングJSONを読み、<see cref="GemBoxPrintPayloadService.BuildFromLoadedMappingDefinition"/> で単票・明細を組み立て、
        /// シートindex・<paramref name="middlePdfFullPath"/> を付けた <see cref="GemBoxPrintSandwichPdfRequestDto"/> を返す。
        /// </summary>
        private static GemBoxPrintSandwichPdfRequestDto BuildSandwichFromMappingFile(
            string mappingFileName,
            string logKind,
            string middlePdfFullPath,
            object scalarSource,
            object pictureSource,
            IEnumerable<object>[] tableRowsInOrder)
        {
            var def = GemBoxPrintMappingEngine.LoadSandwichDefinition(mappingFileName, out var resolvedPath);
            if (def == null)
            {
                Log.Error($"[GemBox sandwich] mapping load failed. kind={logKind}, path='{resolvedPath}', exists={File.Exists(resolvedPath)}");
                throw new InvalidOperationException(
                    "サンドイッチ印刷設定の読み込みに失敗しました（帳票定義）。管理者に連絡してください。");
            }

            if (!def.FirstSheetIndex.HasValue || !def.SecondSheetIndex.HasValue)
                throw new InvalidOperationException("firstSheetIndex / secondSheetIndex が定義JSONに必要です。");

            // json定義とデータソースからbackend-print用DTOを組み立てる
            var built = GemBoxPrintPayloadService.BuildFromLoadedMappingDefinition(def, scalarSource, pictureSource, tableRowsInOrder);
            if (built == null)
                throw new InvalidOperationException("サンドイッチ印刷データの組み立てに失敗しました。");

            var middle = (middlePdfFullPath ?? "").Trim();
            if (!Path.IsPathRooted(middle))
                throw new InvalidOperationException("サンドイッチ中間PDFはフルパスで指定してください。");

            // DTOを組み立て直して返す
            return new GemBoxPrintSandwichPdfRequestDto
            {
                TemplateFileName = built.TemplateFileName,
                FirstSheetIndex = def.FirstSheetIndex,
                SecondSheetIndex = def.SecondSheetIndex,
                MiddlePdfPath = middle,
                Data = built.Data,
                Tables = built.Tables,
                Pictures = built.Pictures,
            };
        }
    }
}
