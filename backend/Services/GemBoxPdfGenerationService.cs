using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using GemBox.Spreadsheet;
using System.Diagnostics;

namespace backend.Services
{
    /// <summary>
    /// GemBoxでExcel→PDFを生成（既存Spire版とは別系統）
    ///
    /// ## 何をしているか（運用前提）
    /// - テンプレExcelはサーバに配置しておき、コードからパス指定して使用（DBに保存しない）
    /// - Excel内の `{{placeholder}}` を、呼び出し側が渡す `data` で置換
    /// - 明細（繰り返し行）は `{{table:key}}` を起点に “行テンプレ” を複製して展開
    /// - 最後にGemBoxの保存機能でPDFへ変換し、APIからダウンロードさせる
    ///
    /// ## パフォーマンス上の注意
    /// - シート全セル走査は非常に遅くなるため、UsedRange（使用範囲）のみを走査する
    /// </summary>
    public class GemBoxPdfGenerationService
    {
        private readonly string _tempPath;

        public GemBoxPdfGenerationService()
        {
            _tempPath = Path.GetTempPath();

            var key = ConfigurationManager.AppSettings["GemBoxSpreadsheetLicenseKey"];
            SpreadsheetInfo.SetLicense(string.IsNullOrWhiteSpace(key) ? "FREE-LIMITED-KEY" : key);
        }

        public Stream GeneratePdf(string templatePath, Dictionary<string, object> data)
        {
            string tempExcelPath = null;
            string tempPdfPath = null;
            var sw = Stopwatch.StartNew();

            try
            {
                tempExcelPath = Path.Combine(_tempPath, $"gembox_{Guid.NewGuid()}.xlsx");
                // ログ出力（切り分け用）
                // SimpleFileLogger.Log(GetLogPath(), $"GeneratePdf start. templatePath='{templatePath}', tempExcel='{tempExcelPath}'");
                File.Copy(templatePath, tempExcelPath, true);

                // SimpleFileLogger.Log(GetLogPath(), $"EmbedData start. elapsedMs={sw.ElapsedMilliseconds}");
                EmbedData(tempExcelPath, data);
                // SimpleFileLogger.Log(GetLogPath(), $"EmbedData end. elapsedMs={sw.ElapsedMilliseconds}");

                tempPdfPath = Path.Combine(_tempPath, $"gembox_{Guid.NewGuid()}.pdf");
                // SimpleFileLogger.Log(GetLogPath(), $"ConvertExcelToPdf start. tempPdf='{tempPdfPath}', elapsedMs={sw.ElapsedMilliseconds}");
                ConvertExcelToPdf(tempExcelPath, tempPdfPath);
                // SimpleFileLogger.Log(GetLogPath(), $"ConvertExcelToPdf end. pdfBytes={new FileInfo(tempPdfPath).Length}, elapsedMs={sw.ElapsedMilliseconds}");

                var pdfStream = new MemoryStream(File.ReadAllBytes(tempPdfPath));
                pdfStream.Position = 0;
                // SimpleFileLogger.Log(GetLogPath(), $"GeneratePdf done. elapsedMs={sw.ElapsedMilliseconds}");
                return pdfStream;
            }
            catch (Exception ex)
            {
                // SimpleFileLogger.Log(GetLogPath(), $"GeneratePdf ERROR. elapsedMs={sw.ElapsedMilliseconds}. {ex}");
                throw;
            }
            finally
            {
                Cleanup(tempExcelPath);
                Cleanup(tempPdfPath);
            }
        }

        private string GetLogPath()
        {
            return ConfigurationManager.AppSettings["GemBoxLogFilePath"];
        }

        private void EmbedData(string excelPath, Dictionary<string, object> data)
        {
            var logPath = GetLogPath();
            var sw = Stopwatch.StartNew();
            // 置換ステップ:
            // - Excelをロード
            // - 明細展開（行コピー）
            // - UsedRangeのセルだけ走査して {{...}} を置換
            // - Excelを保存
            //
            // ログ出力（切り分け用）
            // SimpleFileLogger.Log(logPath, $"EmbedData: load start. excelPath='{excelPath}'");
            var workbook = ExcelFile.Load(excelPath);
            // SimpleFileLogger.Log(logPath, $"EmbedData: load end. elapsedMs={sw.ElapsedMilliseconds}");
            var ws = workbook.Worksheets[0];

            // SimpleFileLogger.Log(logPath, $"EmbedData: expand tables start. elapsedMs={sw.ElapsedMilliseconds}");
            ExpandTableRegions(ws, data);
            // SimpleFileLogger.Log(logPath, $"EmbedData: expand tables end. elapsedMs={sw.ElapsedMilliseconds}");

            var regex = new Regex(@"\{\{(.+?)\}\}");

            var used = ws.GetUsedCellRange(true);
            if (used == null)
            {
                // UsedRangeが取れない場合でも保存はしておく（テンプレが空に近いケース）
                // SimpleFileLogger.Log(logPath, $"EmbedData: used range null. save start. elapsedMs={sw.ElapsedMilliseconds}");
                workbook.Save(excelPath);
                // SimpleFileLogger.Log(logPath, $"EmbedData: save end. elapsedMs={sw.ElapsedMilliseconds}");
                return;
            }

            // UsedRangeのみを走査（全セル走査は遅い/ハングに見える）
            // SimpleFileLogger.Log(logPath, $"EmbedData: replace start. used=R{used.FirstRowIndex}-R{used.LastRowIndex},C{used.FirstColumnIndex}-C{used.LastColumnIndex}. elapsedMs={sw.ElapsedMilliseconds}");
            for (int r = used.FirstRowIndex; r <= used.LastRowIndex; r++)
            {
                for (int c = used.FirstColumnIndex; c <= used.LastColumnIndex; c++)
                {
                    var cell = ws.Cells[r, c];
                    if (cell.ValueType != CellValueType.String) continue;
                    var s = cell.StringValue;
                    if (string.IsNullOrWhiteSpace(s)) continue;

                    // プレースホルダがないセルはスキップ（高速化）
                    if (s.IndexOf("{{", StringComparison.Ordinal) < 0) continue;

                    var replaced = regex.Replace(s, m =>
                    {
                        var key = m.Groups[1].Value.Trim();
                        if (data.TryGetValue(key, out var v))
                            return FormatValue(v);
                        return "";
                    });

                    if (replaced != s) cell.Value = replaced;
                }
            }
            // SimpleFileLogger.Log(logPath, $"EmbedData: replace end. elapsedMs={sw.ElapsedMilliseconds}");

            // SimpleFileLogger.Log(logPath, $"EmbedData: save start. elapsedMs={sw.ElapsedMilliseconds}");
            workbook.Save(excelPath);
            // SimpleFileLogger.Log(logPath, $"EmbedData: save end. elapsedMs={sw.ElapsedMilliseconds}");
        }

        private void ExpandTableRegions(ExcelWorksheet ws, Dictionary<string, object> data)
        {
            // 行に {{table:history}} を置き、同じ行に {{history.date}} 等を書く
            //
            // “行テンプレ” のルール:
            // - `{{table:xxx}}` が書かれている行をテンプレ行とする
            // - data["xxx"] に IEnumerable<Dictionary<string, object>> を渡す
            // - 行内は {{xxx.col_name}} の形で参照する
            // - 行数が2以上なら、テンプレ行を InsertCopy で必要行数ぶん複製する
            var tableStartRegex = new Regex(@"\{\{\s*table\s*:\s*([a-zA-Z0-9_]+)\s*\}\}");
            var used = ws.GetUsedCellRange(true);
            if (used == null) return;

            for (int r = used.FirstRowIndex; r <= used.LastRowIndex; r++)
            {
                for (int c = used.FirstColumnIndex; c <= used.LastColumnIndex; c++)
                {
                    var cell = ws.Cells[r, c];
                    if (cell.ValueType != CellValueType.String) continue;
                    var s = cell.StringValue;
                    if (string.IsNullOrWhiteSpace(s)) continue;

                    var m = tableStartRegex.Match(s);
                    if (!m.Success) continue;

                    var tableKey = m.Groups[1].Value.Trim();
                    cell.Value = "";

                    if (!data.TryGetValue(tableKey, out var rowsObj)) return;
                    var rows = rowsObj as IEnumerable<Dictionary<string, object>>;
                    if (rows == null) return;
                    var list = rows.ToList();

                    if (list.Count == 0)
                    {
                        ClearTableRowPlaceholders(ws, r, tableKey);
                        return;
                    }

                    if (list.Count > 1)
                    {
                        // GemBox: InsertCopy を使用してテンプレ行を複製
                        // 行インデックスは GetUsedCellRange(true) のFirstRowIndex等と同じ（0-based）
                        ws.Rows.InsertCopy(r + 1, list.Count - 1, ws.Rows[r]);
                    }

                    for (int i = 0; i < list.Count; i++)
                        FillTableRow(ws, r + i, tableKey, list[i]);

                    return;
                }
            }
        }

        private void FillTableRow(ExcelWorksheet ws, int rowIndex, string tableKey, Dictionary<string, object> rowData)
        {
            var regex = new Regex(@"\{\{\s*" + Regex.Escape(tableKey) + @"\.([a-zA-Z0-9_]+)\s*\}\}");
            var used = ws.GetUsedCellRange(true);
            if (used == null) return;

            for (int c = used.FirstColumnIndex; c <= used.LastColumnIndex; c++)
            {
                var cell = ws.Cells[rowIndex, c];
                if (cell.ValueType != CellValueType.String) continue;
                var s = cell.StringValue;
                if (string.IsNullOrWhiteSpace(s)) continue;

                var replaced = regex.Replace(s, m =>
                {
                    var key = m.Groups[1].Value.Trim();
                    if (rowData != null && rowData.TryGetValue(key, out var v))
                        return FormatValue(v);
                    return "";
                });

                if (replaced != s) cell.Value = replaced;
            }
        }

        private void ClearTableRowPlaceholders(ExcelWorksheet ws, int rowIndex, string tableKey)
        {
            var regex = new Regex(@"\{\{\s*" + Regex.Escape(tableKey) + @"\.[a-zA-Z0-9_]+\s*\}\}");
            var used = ws.GetUsedCellRange(true);
            if (used == null) return;

            for (int c = used.FirstColumnIndex; c <= used.LastColumnIndex; c++)
            {
                var cell = ws.Cells[rowIndex, c];
                if (cell.ValueType != CellValueType.String) continue;
                var s = cell.StringValue;
                if (string.IsNullOrWhiteSpace(s)) continue;
                var replaced = regex.Replace(s, "");
                if (replaced != s) cell.Value = replaced;
            }
        }

        private string FormatValue(object value)
        {
            if (value == null) return "";
            if (value is DateTime dt) return dt.ToString("yyyy/MM/dd");
            return value.ToString();
        }

        private void ConvertExcelToPdf(string excelPath, string pdfPath)
        {
            var workbook = ExcelFile.Load(excelPath);
            workbook.Save(pdfPath);
        }

        private void Cleanup(string path)
        {
            try
            {
                if (!string.IsNullOrEmpty(path) && File.Exists(path))
                    File.Delete(path);
            }
            catch { }
        }
    }
}

