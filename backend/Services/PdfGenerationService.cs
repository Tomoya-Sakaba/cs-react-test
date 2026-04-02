using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using Spire.Xls;
using backend.Models.DTOs;

namespace backend.Services
{
    /// <summary>
    /// Excel → PDF 変換サービス
    /// </summary>
    public class PdfGenerationService
    {
        private readonly string _tempPath;

        public PdfGenerationService()
        {
            _tempPath = Path.GetTempPath();
        }

        /// <summary>
        /// テンプレートにデータを埋め込んでPDF生成
        /// </summary>
        /// <param name="templatePath">Excelテンプレートパス</param>
        /// <param name="data">埋め込むデータ</param>
        /// <param name="images">画像リスト（オプション）</param>
        /// <returns>PDFストリーム</returns>
        public Stream GeneratePdf(string templatePath, Dictionary<string, object> data, List<ReportImageDto> images = null)
        {
            string tempExcelPath = null;
            string tempPdfPath = null;

            try
            {
                // 1. テンプレートExcelをコピー（一時ファイル）
                tempExcelPath = Path.Combine(_tempPath, $"report_{Guid.NewGuid()}.xlsx");
                File.Copy(templatePath, tempExcelPath, true);

                // 2. データを埋め込み
                EmbedDataToExcel(tempExcelPath, data, images);

                // 3. Excel → PDF 変換
                tempPdfPath = Path.Combine(_tempPath, $"report_{Guid.NewGuid()}.pdf");
                ConvertExcelToPdf(tempExcelPath, tempPdfPath);

                // 4. PDFをメモリストリームに読み込み
                var pdfStream = new MemoryStream(File.ReadAllBytes(tempPdfPath));
                pdfStream.Position = 0;

                return pdfStream;
            }
            finally
            {
                // 5. 一時ファイルをクリーンアップ
                CleanupTempFile(tempExcelPath);
                CleanupTempFile(tempPdfPath);
            }
        }

        /// <summary>
        /// Excelにデータを埋め込み
        /// </summary>
        private void EmbedDataToExcel(string excelPath, Dictionary<string, object> data, List<ReportImageDto> images)
        {
            using (var workbook = new XLWorkbook(excelPath))
            {
                var worksheet = workbook.Worksheet(1);

                // プレースホルダーを値に置換
                var regex = new Regex(@"\{\{(.+?)(?::(.+?))?(?::(.+?))?\}\}");

                // 明細テーブル展開（Excel側に行テンプレを置く方式）
                // - 例: A10セルに {{table:items}} を置く（この行が「テンプレ行」）
                // - その同じ行に {{items.name}} / {{items.qty}} のように書いておく
                // - data["items"] に List<Dictionary<string, object>> を渡すと、その件数分行を複製して埋める
                ExpandTableRegions(worksheet, data);

                foreach (var cell in worksheet.CellsUsed())
                {
                    var cellValue = cell.Value.ToString();

                    if (string.IsNullOrWhiteSpace(cellValue))
                        continue;

                    var newValue = regex.Replace(cellValue, match =>
                    {
                        var fieldName = match.Groups[1].Value.Trim();

                        if (data.ContainsKey(fieldName))
                        {
                            var value = data[fieldName];
                            return FormatValue(value);
                        }

                        // データが見つからない場合は空文字
                        return "";
                    });

                    // セルの値を更新
                    if (newValue != cellValue)
                    {
                        cell.Value = newValue;
                    }
                }

                // 画像の挿入
                if (images != null && images.Count > 0)
                {
                    InsertImages(worksheet, images);
                }

                workbook.Save();
            }
        }

        private void ExpandTableRegions(IXLWorksheet worksheet, Dictionary<string, object> data)
        {
            // テーブル開始マーカー: {{table:items}}
            var tableStartRegex = new Regex(@"\{\{\s*table\s*:\s*([a-zA-Z0-9_]+)\s*\}\}");

            // 対象セル（行）を上から順に処理（行挿入でズレるため、都度再探索しつつも安全側に動く）
            var startCells = worksheet.CellsUsed().Cast<IXLCell>()
                .Where(c => tableStartRegex.IsMatch(c.GetString()))
                .OrderBy(c => c.Address.RowNumber)
                .ToList();

            foreach (var startCell in startCells)
            {
                var match = tableStartRegex.Match(startCell.GetString());
                if (!match.Success) continue;

                var tableKey = match.Groups[1].Value.Trim();
                if (!data.ContainsKey(tableKey)) { startCell.Value = ""; continue; }

                var rowsObj = data[tableKey];
                var rows = rowsObj as IEnumerable<Dictionary<string, object>>;
                if (rows == null) { startCell.Value = ""; continue; }

                var tableRows = rows.ToList();
                var templateRowNumber = startCell.Address.RowNumber;

                // 行テンプレを含む「使用範囲の列幅」を推定して、その範囲のセルを複製対象にする
                // ※ CellsUsed はその時点のシート全体なので、同じ行の使用セルに限定する
                var templateRowCells = worksheet.Row(templateRowNumber).CellsUsed().Cast<IXLCell>().ToList();
                if (templateRowCells.Count == 0) { startCell.Value = ""; continue; }

                int minCol = templateRowCells.Min(c => c.Address.ColumnNumber);
                int maxCol = templateRowCells.Max(c => c.Address.ColumnNumber);

                // マーカー自体は出力しない
                startCell.Value = "";

                // 0件ならテンプレ行を空に（ヘッダだけ残す想定）
                if (tableRows.Count == 0)
                {
                    ClearRowPlaceholders(worksheet, templateRowNumber, minCol, maxCol, tableKey);
                    continue;
                }

                // 1件目はテンプレ行に埋める、2件目以降は行を挿入してテンプレを複製
                for (int i = 0; i < tableRows.Count; i++)
                {
                    var targetRowNumber = templateRowNumber + i;

                    if (i > 0)
                    {
                        worksheet.Row(targetRowNumber).InsertRowsAbove(1);
                        // スタイル/数式/結合を含めた複製（ClosedXMLのCopyToで行複製）
                        worksheet.Row(templateRowNumber).CopyTo(worksheet.Row(targetRowNumber));
                    }

                    FillTableRow(
                        worksheet,
                        targetRowNumber,
                        minCol,
                        maxCol,
                        tableKey,
                        tableRows[i]
                    );
                }
            }
        }

        private void FillTableRow(
            IXLWorksheet worksheet,
            int rowNumber,
            int minCol,
            int maxCol,
            string tableKey,
            Dictionary<string, object> rowData
        )
        {
            // 行内で {{items.xxx}} を rowData["xxx"] で置換
            var regex = new Regex(@"\{\{\s*" + Regex.Escape(tableKey) + @"\.([a-zA-Z0-9_]+)\s*\}\}");

            for (int col = minCol; col <= maxCol; col++)
            {
                var cell = worksheet.Cell(rowNumber, col);
                var cellValue = cell.GetString();
                if (string.IsNullOrWhiteSpace(cellValue)) continue;

                var newValue = regex.Replace(cellValue, m =>
                {
                    var key = m.Groups[1].Value.Trim();
                    if (rowData != null && rowData.ContainsKey(key))
                    {
                        return FormatValue(rowData[key]);
                    }
                    return "";
                });

                if (newValue != cellValue)
                {
                    cell.Value = newValue;
                }
            }
        }

        private void ClearRowPlaceholders(IXLWorksheet worksheet, int rowNumber, int minCol, int maxCol, string tableKey)
        {
            var regex = new Regex(@"\{\{\s*" + Regex.Escape(tableKey) + @"\.[a-zA-Z0-9_]+\s*\}\}");
            for (int col = minCol; col <= maxCol; col++)
            {
                var cell = worksheet.Cell(rowNumber, col);
                var cellValue = cell.GetString();
                if (string.IsNullOrWhiteSpace(cellValue)) continue;
                var newValue = regex.Replace(cellValue, "");
                if (newValue != cellValue) cell.Value = newValue;
            }
        }

        /// <summary>
        /// 値をフォーマット
        /// </summary>
        private string FormatValue(object value)
        {
            if (value == null)
                return "";

            if (value is DateTime dateTime)
                return dateTime.ToString("yyyy/MM/dd");

            return value.ToString();
        }

        /// <summary>
        /// 画像をExcelに挿入
        /// </summary>
        private void InsertImages(IXLWorksheet worksheet, List<ReportImageDto> images)
        {
            int startRow = FindImageInsertRow(worksheet);

            if (startRow == 0)
                startRow = 20; // デフォルト位置

            foreach (var image in images)
            {
                try
                {
                    if (File.Exists(image.FilePath))
                    {
                        worksheet.AddPicture(image.FilePath)
                            .MoveTo(worksheet.Cell(startRow, 1))
                            .Scale(0.4); // 40%サイズ

                        // キャプション追加
                        if (!string.IsNullOrEmpty(image.Caption))
                        {
                            worksheet.Cell(startRow - 1, 1).Value = image.Caption;
                        }

                        startRow += 15; // 次の画像位置（15行下）
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"画像挿入エラー: {ex.Message}");
                }
            }
        }

        /// <summary>
        /// 画像挿入位置を検索（{{photos}}プレースホルダー）
        /// </summary>
        private int FindImageInsertRow(IXLWorksheet worksheet)
        {
            foreach (var cell in worksheet.CellsUsed())
            {
                var cellValue = cell.Value.ToString();
                if (cellValue.Contains("{{photos}}") || cellValue.Contains("{{images}}"))
                {
                    // プレースホルダーをクリア
                    cell.Value = "";
                    return cell.Address.RowNumber;
                }
            }
            return 0;
        }

        /// <summary>
        /// Excel → PDF 変換（Spire）
        /// </summary>
        private void ConvertExcelToPdf(string excelPath, string pdfPath)
        {
            var workbook = new Workbook();
            workbook.LoadFromFile(excelPath);

            workbook.ConverterSetting.SheetFitToPage = true;
            workbook.SaveToFile(pdfPath, FileFormat.PDF);
        }

        /// <summary>
        /// 一時ファイルを削除
        /// </summary>
        private void CleanupTempFile(string filePath)
        {
            try
            {
                if (!string.IsNullOrEmpty(filePath) && File.Exists(filePath))
                {
                    File.Delete(filePath);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"一時ファイル削除エラー: {ex.Message}");
            }
        }

        /// <summary>
        /// Excelファイルを生成（PDF変換なし）
        /// </summary>
        public Stream GenerateExcel(string templatePath, Dictionary<string, object> data, List<ReportImageDto> images = null)
        {
            string tempExcelPath = null;

            try
            {
                // 1. テンプレートExcelをコピー（一時ファイル）
                tempExcelPath = Path.Combine(_tempPath, $"report_{Guid.NewGuid()}.xlsx");
                File.Copy(templatePath, tempExcelPath, true);

                // 2. データを埋め込み
                EmbedDataToExcel(tempExcelPath, data, images);

                // 3. Excelをメモリストリームに読み込み
                var excelStream = new MemoryStream(File.ReadAllBytes(tempExcelPath));
                excelStream.Position = 0;

                return excelStream;
            }
            finally
            {
                // 4. 一時ファイルをクリーンアップ
                CleanupTempFile(tempExcelPath);
            }
        }
    }
}

