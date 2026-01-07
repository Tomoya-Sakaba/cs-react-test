using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using backend.Models.DTOs;

namespace backend.Services
{
    /// <summary>
    /// Excelテンプレートを解析してフィールド定義を抽出するサービス
    /// </summary>
    public class TemplateParserService
    {
        /// <summary>
        /// Excelテンプレートを解析
        /// </summary>
        /// <param name="excelPath">Excelファイルパス</param>
        /// <returns>フィールド定義リスト</returns>
        public List<TemplateFieldDto> ParseTemplate(string excelPath)
        {
            var fields = new List<TemplateFieldDto>();

            try
            {
                using (var workbook = new XLWorkbook(excelPath))
                {
                    var worksheet = workbook.Worksheet(1);

                    // プレースホルダーパターン: {{field_name:type:options}}
                    var regex = new Regex(@"\{\{(.+?)(?::(.+?))?(?::(.+?))?\}\}");

                    foreach (var cell in worksheet.CellsUsed())
                    {
                        var cellValue = cell.Value.ToString();

                        if (string.IsNullOrWhiteSpace(cellValue))
                            continue;

                        var matches = regex.Matches(cellValue);

                        foreach (Match match in matches)
                        {
                            var fieldName = match.Groups[1].Value.Trim();
                            var fieldType = match.Groups[2].Success ? match.Groups[2].Value.Trim() : "text";
                            var options = match.Groups[3].Success ? match.Groups[3].Value.Trim() : null;

                            // ラベルを抽出（例: "作業日: {{work_date}}" → "作業日"）
                            var label = ExtractLabel(cellValue, match.Value);

                            var field = new TemplateFieldDto
                            {
                                FieldName = fieldName,
                                FieldLabel = label,
                                FieldType = fieldType,
                                CellAddress = cell.Address.ToString(),
                                RowNumber = cell.Address.RowNumber,
                                ColumnNumber = cell.Address.ColumnNumber,
                                Options = options,
                                IsRequired = false,
                                DisplayOrder = cell.Address.RowNumber * 1000 + cell.Address.ColumnNumber
                            };

                            fields.Add(field);
                        }
                    }
                }

                return fields;
            }
            catch (Exception ex)
            {
                throw new Exception($"Excelテンプレートの解析に失敗しました: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// セル値からラベルを抽出
        /// </summary>
        private string ExtractLabel(string cellValue, string placeholder)
        {
            // "作業日: {{work_date}}" → "作業日"
            var label = cellValue.Replace(placeholder, "").Trim();

            // 末尾の":", "：", "　"などを削除
            label = label.TrimEnd(':', '：', ' ', '　');

            // ラベルが空の場合はプレースホルダーから推測
            if (string.IsNullOrWhiteSpace(label))
            {
                var match = Regex.Match(placeholder, @"\{\{(.+?)(?::|$)");
                if (match.Success)
                {
                    label = match.Groups[1].Value;
                }
            }

            return label;
        }

        /// <summary>
        /// フィールドタイプの推測
        /// </summary>
        public string GuessFieldType(string fieldName)
        {
            fieldName = fieldName.ToLower();

            if (fieldName.Contains("date") || fieldName.Contains("日"))
                return "date";

            if (fieldName.Contains("time") || fieldName.Contains("時間") || fieldName.Contains("時刻"))
                return "time";

            if (fieldName.Contains("number") || fieldName.Contains("数") || fieldName.Contains("金額") ||
                fieldName.Contains("price") || fieldName.Contains("amount"))
                return "number";

            if (fieldName.Contains("email") || fieldName.Contains("メール"))
                return "email";

            if (fieldName.Contains("tel") || fieldName.Contains("phone") || fieldName.Contains("電話"))
                return "tel";

            if (fieldName.Contains("content") || fieldName.Contains("detail") || fieldName.Contains("description") ||
                fieldName.Contains("内容") || fieldName.Contains("詳細") || fieldName.Contains("備考"))
                return "textarea";

            if (fieldName.Contains("photo") || fieldName.Contains("image") || fieldName.Contains("写真") || fieldName.Contains("画像"))
                return "image";

            return "text";
        }

        /// <summary>
        /// テンプレートのバリデーション
        /// </summary>
        public (bool IsValid, List<string> Errors) ValidateTemplate(string excelPath)
        {
            var errors = new List<string>();

            try
            {
                if (!File.Exists(excelPath))
                {
                    errors.Add("Excelファイルが存在しません。");
                    return (false, errors);
                }

                using (var workbook = new XLWorkbook(excelPath))
                {
                    if (workbook.Worksheets.Count == 0)
                    {
                        errors.Add("ワークシートが存在しません。");
                        return (false, errors);
                    }

                    var fields = ParseTemplate(excelPath);

                    if (fields.Count == 0)
                    {
                        errors.Add("プレースホルダー（{{field_name}}）が見つかりませんでした。");
                    }

                    // 重複チェック
                    var duplicates = fields.GroupBy(f => f.FieldName)
                                          .Where(g => g.Count() > 1)
                                          .Select(g => g.Key);

                    foreach (var dup in duplicates)
                    {
                        errors.Add($"フィールド名 '{dup}' が重複しています。");
                    }
                }

                return (errors.Count == 0, errors);
            }
            catch (Exception ex)
            {
                errors.Add($"バリデーションエラー: {ex.Message}");
                return (false, errors);
            }
        }

        /// <summary>
        /// サポートされているフィールドタイプ一覧
        /// </summary>
        public static readonly Dictionary<string, string> SupportedFieldTypes = new Dictionary<string, string>
        {
            { "text", "テキスト" },
            { "textarea", "複数行テキスト" },
            { "number", "数値" },
            { "date", "日付" },
            { "time", "時刻" },
            { "datetime", "日時" },
            { "email", "メールアドレス" },
            { "tel", "電話番号" },
            { "select", "選択肢" },
            { "radio", "ラジオボタン" },
            { "checkbox", "チェックボックス" },
            { "image", "画像" }
        };
    }
}

