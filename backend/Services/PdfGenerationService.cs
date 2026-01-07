using System;
using System.Collections.Generic;
using System.IO;
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
                        var picture = worksheet.AddPicture(image.FilePath)
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
        /// Excel → PDF 変換
        /// </summary>
        private void ConvertExcelToPdf(string excelPath, string pdfPath)
        {
            // Spire.XLS を使用した変換
            var workbook = new Workbook();
            workbook.LoadFromFile(excelPath);

            // PDF設定
            workbook.ConverterSetting.SheetFitToPage = true;

            // PDF保存
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

