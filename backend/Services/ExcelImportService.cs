using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using ExcelDataReader;
using backend.Models.DTOs;
using backend.Helpers;

namespace backend.Services
{
    /// <summary>
    /// Excelファイルの取り込みサービス
    /// </summary>
    public class ExcelImportService
    {
        private readonly string _connectionString;

        public ExcelImportService()
        {
            _connectionString = System.Configuration.ConfigurationManager
                .ConnectionStrings["MyDbConnection"].ConnectionString;
            // .NET Framework 4.x ではエンコーディングプロバイダーの登録は不要
            // (.NET Core / .NET 5以降の場合のみ Encoding.RegisterProvider が必要)
        }

        public ExcelImportService(string connectionString)
        {
            _connectionString = connectionString;
            // .NET Framework 4.x ではエンコーディングプロバイダーの登録は不要
        }

        /// <summary>
        /// Excelファイルを読み込んで SqlBulkCopy で t_results テーブルに一括投入します
        /// </summary>
        /// <param name="fileStream">Excelファイルのストリーム</param>
        /// <param name="createdUser">作成ユーザー</param>
        /// <returns>取り込み結果</returns>
        public CsvImportResultDto ImportResultsExcelBulkCopy(Stream fileStream, string createdUser = "System")
        {
            var result = new CsvImportResultDto
            {
                Errors = new List<string>(),
                Message = ""
            };

            var dataTable = new DataTable();

            try
            {
                // DataTableの列定義
                dataTable.Columns.Add("date", typeof(DateTime));
                dataTable.Columns.Add("time", typeof(TimeSpan));
                dataTable.Columns.Add("content_type_id", typeof(int));
                dataTable.Columns.Add("vol", typeof(decimal));
                dataTable.Columns.Add("company_id", typeof(int));
                dataTable.Columns.Add("company_name", typeof(string));
                dataTable.Columns.Add("created_at", typeof(DateTime));
                dataTable.Columns.Add("created_user", typeof(string));

                int failureCount = 0;

                // ExcelDataReaderでExcelファイルを読み込む
                using (var reader = ExcelReaderFactory.CreateReader(fileStream))
                {
                    // 最初のシートを読み込む
                    var dataSet = reader.AsDataSet(new ExcelDataSetConfiguration()
                    {
                        ConfigureDataTable = (_) => new ExcelDataTableConfiguration()
                        {
                            UseHeaderRow = false // ヘッダー行は手動で処理
                        }
                    });

                    if (dataSet.Tables.Count == 0)
                    {
                        result.Message = "Excelファイルにシートが見つかりません。";
                        return result;
                    }

                    var sheet = dataSet.Tables[0];

                    if (sheet.Rows.Count < 2) // ヘッダー + 最低1行のデータ
                    {
                        result.Message = "Excelファイルにデータが見つかりません。";
                        return result;
                    }

                    // 1行目: ヘッダー（スキップ）
                    // 2行目以降: データ行
                    for (int i = 1; i < sheet.Rows.Count; i++)
                    {
                        int rowNumber = i + 1; // Excelの行番号（1始まり）
                        var rowErrors = new List<string>();

                        try
                        {
                            var excelRow = sheet.Rows[i];

                            // 各列のデータを取得（カラム順: 日付, 時間, コンテンツタイプ, 量, 企業ID, 企業名）
                            var dateValue = excelRow[0];
                            var timeValue = excelRow[1];
                            var contentTypeIdValue = excelRow[2];
                            var volValue = excelRow[3];
                            var companyIdValue = excelRow[4];
                            var companyNameValue = excelRow[5];

                            // 空行チェック（全列が空の場合はスキップ）
                            if ((dateValue == null || dateValue == DBNull.Value || string.IsNullOrWhiteSpace(dateValue.ToString())) &&
                                (timeValue == null || timeValue == DBNull.Value || string.IsNullOrWhiteSpace(timeValue.ToString())) &&
                                (contentTypeIdValue == null || contentTypeIdValue == DBNull.Value || string.IsNullOrWhiteSpace(contentTypeIdValue.ToString())) &&
                                (volValue == null || volValue == DBNull.Value || string.IsNullOrWhiteSpace(volValue.ToString())) &&
                                (companyIdValue == null || companyIdValue == DBNull.Value || string.IsNullOrWhiteSpace(companyIdValue.ToString())) &&
                                (companyNameValue == null || companyNameValue == DBNull.Value || string.IsNullOrWhiteSpace(companyNameValue.ToString())))
                            {
                                continue; // 空行はスキップ
                            }

                            // DataRowを作成
                            var row = dataTable.NewRow();

                            // 日付の処理（既にDateTime型の場合はそのまま使用）
                            if (dateValue is DateTime dateTime)
                            {
                                row["date"] = dateTime.Date; // 時刻部分を切り捨て
                            }
                            else
                            {
                                string dateStr = dateValue?.ToString() ?? "";
                                row["date"] = ValidationHelpers.ValidateAndConvertDateTime(dateStr, "日付", rowErrors);
                            }

                            // 時間の処理（既にDateTime型の場合は時刻部分を取得）
                            if (timeValue is DateTime timeDateTime)
                            {
                                row["time"] = timeDateTime.TimeOfDay;
                            }
                            else if (timeValue is TimeSpan timeSpan)
                            {
                                row["time"] = timeSpan;
                            }
                            else
                            {
                                string timeStr = timeValue?.ToString() ?? "";
                                var time = ValidationHelpers.ValidateAndConvertNullableTime(timeStr, "時間", rowErrors);
                                row["time"] = time.HasValue ? (object)time.Value : DBNull.Value;
                            }

                            // その他のフィールドを文字列に変換してバリデーション
                            string contentTypeIdStr = contentTypeIdValue?.ToString() ?? "";
                            string volStr = volValue?.ToString() ?? "";
                            string companyIdStr = companyIdValue?.ToString() ?? "";
                            string companyName = companyNameValue?.ToString() ?? "";

                            row["content_type_id"] = ValidationHelpers.ValidateAndConvertInt(contentTypeIdStr, "コンテンツタイプ", rowErrors, defaultValue: 0);

                            var vol = ValidationHelpers.ValidateAndConvertDecimal(volStr, "量", rowErrors);
                            row["vol"] = vol.HasValue ? (object)vol.Value : DBNull.Value;

                            var companyId = ValidationHelpers.ValidateAndConvertNullableInt(companyIdStr, "企業ID", rowErrors);
                            row["company_id"] = companyId.HasValue ? (object)companyId.Value : DBNull.Value;

                            row["company_name"] = string.IsNullOrWhiteSpace(companyName) ? (object)DBNull.Value : companyName;
                            row["created_at"] = DateTime.Now;
                            row["created_user"] = createdUser;

                            // エラーがあれば記録
                            if (rowErrors.Count > 0)
                            {
                                result.Errors.Add($"行 {rowNumber}: {string.Join(" / ", rowErrors)}");
                                failureCount++;
                            }
                            else
                            {
                                dataTable.Rows.Add(row);
                            }
                        }
                        catch (Exception ex)
                        {
                            result.Errors.Add($"行 {rowNumber}: 予期しないエラーが発生しました（{ex.GetType().Name}: {ex.Message}）");
                            failureCount++;
                        }
                    }
                }

                // バリデーションエラーがある場合は投入しない
                if (failureCount > 0)
                {
                    int totalCount = dataTable.Rows.Count + failureCount;
                    result.Message = $"Excel取り込み中にエラーが発生しました。{totalCount}件中{failureCount}件のエラーです。";
                    return result;
                }

                // SqlBulkCopy で一括投入
                using (var connection = new SqlConnection(_connectionString))
                {
                    connection.Open();
                    using (var transaction = connection.BeginTransaction())
                    {
                        try
                        {
                            using (var bulkCopy = new SqlBulkCopy(connection, SqlBulkCopyOptions.Default, transaction))
                            {
                                bulkCopy.DestinationTableName = "t_results";

                                // カラムマッピング
                                bulkCopy.ColumnMappings.Add("date", "date");
                                bulkCopy.ColumnMappings.Add("time", "time");
                                bulkCopy.ColumnMappings.Add("content_type_id", "content_type_id");
                                bulkCopy.ColumnMappings.Add("vol", "vol");
                                bulkCopy.ColumnMappings.Add("company_id", "company_id");
                                bulkCopy.ColumnMappings.Add("company_name", "company_name");
                                bulkCopy.ColumnMappings.Add("created_at", "created_at");
                                bulkCopy.ColumnMappings.Add("created_user", "created_user");

                                bulkCopy.WriteToServer(dataTable);
                            }

                            transaction.Commit();

                            int successCount = dataTable.Rows.Count;
                            result.Message = $"Excel取り込みが完了しました。（成功: {successCount}件）";
                        }
                        catch (SqlException sqlEx)
                        {
                            transaction.Rollback();
                            string errorMessage = GetSqlErrorMessage(sqlEx);
                            result.Errors.Add($"{errorMessage}");
                            result.Errors.Add($"詳細: {sqlEx.Message}");
                            result.Message = "DBへの一括挿入中にエラーが発生しました。";
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                result.Errors.Add($"全体エラー: {ex.Message}");
                result.Message = "Excel取り込み中に予期しないエラーが発生しました。";
            }

            return result;
        }

        /// <summary>
        /// SqlExceptionから分かりやすいエラーメッセージを生成します
        /// </summary>
        private string GetSqlErrorMessage(SqlException ex)
        {
            switch (ex.Number)
            {
                case 2627: // 主キー違反
                case 2601: // 一意制約違反
                    return "データベースに重複したデータがあります。";
                case 547: // 外部キー制約違反
                    return "関連するデータが存在しません（外部キー制約エラー）。";
                case 515: // NULL制約違反
                    return "必須項目にNULLが含まれています。";
                case 8152: // 文字列切り捨て
                    return "データが長すぎます（文字数制限を超えています）。";
                case 245: // 型変換エラー
                    return "データ型が一致しません。";
                default:
                    return $"データベースエラーが発生しました（エラーコード: {ex.Number}）。";
            }
        }
    }
}

