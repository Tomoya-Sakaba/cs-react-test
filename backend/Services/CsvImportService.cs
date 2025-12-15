using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using backend.Helpers;
using backend.Models.DTOs;
using backend.Models.Entities;
using backend.Models.Repository;
using CsvHelper;
using CsvHelper.Configuration;

namespace backend.Services
{
    /// <summary>
    /// CSV取り込みサービス
    /// </summary>
    public class CsvImportService
    {
        private readonly ResultRepository _repository;
        private readonly string _connectionString;

        public CsvImportService()
        {
            _repository = new ResultRepository();
            _connectionString = System.Configuration.ConfigurationManager
                .ConnectionStrings["MyDbConnection"].ConnectionString;
        }

        /// <summary>
        /// t_results用のCSVファイルをインポート
        /// </summary>
        /// <param name="fileStream">CSVファイルのストリーム</param>
        /// <param name="createdUser">作成者</param>
        /// <returns>取り込み結果</returns>
        public CsvImportResultDto ImportResultsCsv(Stream fileStream, string createdUser = "System")
        {
            var result = new CsvImportResultDto
            {
                Errors = new List<string>()
            };

            try
            {
                var config = new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,      // ヘッダー行あり
                    TrimOptions = TrimOptions.Trim, // 前後の空白を削除
                    BadDataFound = null,         // 不正なデータがあっても続行
                    MissingFieldFound = null,    // フィールドが不足していても続行
                    Encoding = Encoding.GetEncoding(932) // Shift-JIS（ANSI）エンコーディング
                };

                // Shift-JIS（ANSI）でファイルを読み込む
                using (var reader = new StreamReader(fileStream, Encoding.GetEncoding(932)))
                using (var csv = new CsvReader(reader, config))
                {
                    // 最初の2行をスキップ（1行目: ファイルヘッダー、2行目: 空行）
                    csv.Read(); // 1行目をスキップ
                    csv.Read(); // 2行目をスキップ
                    
                    // 3行目を実際のヘッダーとして読む
                    csv.Read();
                    csv.ReadHeader();

                    int successCount = 0;
                    int failureCount = 0;

                    // データ行を1行ずつ処理
                    while (csv.Read())
                    {
                        // CsvHelperの現在の行番号を取得
                        int rowNumber = csv.Parser.Row;

                        try
                        {
                            // CSV列を順番で取得
                            // 列の順番: 0=日付, 1=時間, 2=コンテンツタイプ, 3=量, 4=企業ID, 5=企業名
                            var dateStr = csv.GetField(0);         // 日付
                            var timeStr = csv.GetField(1);         // 時間
                            var contentTypeIdStr = csv.GetField(2); // コンテンツタイプ
                            var volStr = csv.GetField(3);          // 量
                            var companyIdStr = csv.GetField(4);    // 企業ID
                            var companyName = csv.GetField(5);     // 企業名

                            // バリデーション & 変換（必須チェックなし）
                            var entity = ConvertToEntity(
                                dateStr,
                                timeStr,
                                contentTypeIdStr,
                                volStr,
                                companyIdStr,
                                companyName,
                                createdUser,
                                rowNumber
                            );

                            // DBに挿入
                            _repository.Insert(entity);
                            successCount++;
                        }
                        catch (ArgumentException argEx)
                        {
                            // 型変換エラー（ConvertToEntityから）
                            result.Errors.Add($"行 {rowNumber}: {argEx.Message}");
                            failureCount++;
                        }
                        catch (SqlException sqlEx)
                        {
                            // データベースエラー
                            string errorMessage = GetSqlErrorMessage(sqlEx);
                            result.Errors.Add($"行 {rowNumber}: {errorMessage}");
                            failureCount++;
                        }
                        catch (Exception ex)
                        {
                            result.Errors.Add($"行 {rowNumber}: 予期しないエラーが発生しました（{ex.GetType().Name}: {ex.Message}）");
                            failureCount++;
                        }
                    }

                    // 結果メッセージ
                    if (failureCount == 0)
                    {
                        result.Message = $"CSV取り込みが完了しました。（成功: {successCount}件）";
                    }
                    else
                    {
                        int totalCount = successCount + failureCount;
                        result.Message = $"CSV取り込みが完了しました。{totalCount}件中{failureCount}件のエラーです。（成功: {successCount}件）";
                    }
                }
            }
            catch (Exception ex)
            {
                result.Errors.Add($"全体エラー: {ex.Message}");
                result.Message = "CSV取り込み中にエラーが発生しました。";
            }

            return result;
        }

        /// <summary>
        /// 日付の変換を試行（バリデーション付き）
        /// </summary>
        private DateTime ValidateAndConvertDateTime(string value, string columnName, List<string> errors)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                if (DateTime.TryParse(value, out DateTime result))
                {
                    return result;
                }
                else
                {
                    errors.Add($"「{columnName}」列に不正な文字があります（値: {value}）。日付形式（YYYY-MM-DD または YYYY/MM/DD）で入力してください。");
                    return DateTime.Now.Date; // デフォルト値
                }
            }
            else
            {
                return DateTime.Now.Date; // 空の場合はデフォルト値
            }
        }

        /// <summary>
        /// 整数の変換を試行（バリデーション付き）
        /// </summary>
        private int ValidateAndConvertInt(string value, string columnName, List<string> errors, int defaultValue = 0)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                if (int.TryParse(value, out int result))
                {
                    return result;
                }
                else
                {
                    errors.Add($"「{columnName}」列に不正な文字があります（値: {value}）。整数で入力してください。");
                    return defaultValue;
                }
            }
            else
            {
                return defaultValue; // 空の場合はデフォルト値
            }
        }

        /// <summary>
        /// 整数の変換を試行（NULL許可版）
        /// </summary>
        private int? ValidateAndConvertNullableInt(string value, string columnName, List<string> errors)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                if (int.TryParse(value, out int result))
                {
                    return result;
                }
                else
                {
                    errors.Add($"「{columnName}」列に不正な文字があります（値: {value}）。整数で入力してください。");
                    return null;
                }
            }
            else
            {
                return null; // 空の場合はNULL
            }
        }

        /// <summary>
        /// 小数の変換を試行（バリデーション付き）
        /// </summary>
        private decimal? ValidateAndConvertDecimal(string value, string columnName, List<string> errors)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                if (decimal.TryParse(value, out decimal result))
                {
                    return result;
                }
                else
                {
                    errors.Add($"「{columnName}」列に不正な文字があります（値: {value}）。数値で入力してください。");
                    return null;
                }
            }
            else
            {
                return null; // 空の場合はNULL
            }
        }

        /// <summary>
        /// SQL Serverのエラーコードから分かりやすいメッセージを取得
        /// </summary>
        private string GetSqlErrorMessage(SqlException sqlEx)
        {
            switch (sqlEx.Number)
            {
                case 2627: // 主キー違反
                case 2601: // 一意制約違反
                    return "重複するデータが存在します。同じデータが既に登録されている可能性があります。";
                case 547: // 外部キー制約違反
                    return "参照整合性エラー。指定されたIDが存在しない、または関連データが削除されています。";
                case 8152: // 文字列切り捨てエラー
                    return "データが長すぎます。文字数制限を超えているカラムがあります。";
                case 515: // NULL制約違反
                    return "必須項目が空です。NULL値が許可されていないカラムに空のデータがあります。";
                case -2: // タイムアウト
                    return "処理がタイムアウトしました。データ量が多すぎる可能性があります。";
                default:
                    return $"データベースエラーが発生しました（エラーコード: {sqlEx.Number}）";
            }
        }

        /// <summary>
        /// CSV行データをEntityに変換（必須チェックなし）
        /// </summary>
        private ResultEntity ConvertToEntity(
            string dateStr,
            string timeStr,
            string contentTypeIdStr,
            string volStr,
            string companyIdStr,
            string companyName,
            string createdUser,
            int rowNumber)
        {
            var entity = new ResultEntity
            {
                CreatedUser = createdUser,
                CreatedAt = DateTime.Now
            };

            // ヘルパー関数を使用して変換（エラー時は例外を投げる）
            var errors = new List<string>();

            // 日付
            entity.Date = ValidateAndConvertDateTime(dateStr, "日付", errors);

            // 時間
            entity.Time = ValidationHelpers.ValidateAndConvertNullableTime(timeStr, "時間", errors);

            // コンテンツタイプID
            entity.ContentTypeId = ValidateAndConvertInt(contentTypeIdStr, "コンテンツタイプ", errors, defaultValue: 0);

            // 量
            entity.Vol = ValidateAndConvertDecimal(volStr, "量", errors);

            // 企業ID
            entity.CompanyId = ValidateAndConvertNullableInt(companyIdStr, "企業ID", errors);

            // 企業名（文字列なので型チェック不要）
            entity.CompanyName = string.IsNullOrWhiteSpace(companyName) ? null : companyName;

            // エラーがあれば例外を投げる
            if (errors.Count > 0)
            {
                throw new ArgumentException(string.Join(" / ", errors));
            }

            return entity;
        }

        /// <summary>
        /// t_results用のCSVファイルをインポート（バルクインサート版）
        /// 全データをメモリに読み込んでから一括挿入するため、大量データに適している
        /// エラー時は全てロールバックされる
        /// </summary>
        /// <param name="fileStream">CSVファイルのストリーム</param>
        /// <param name="createdUser">作成者</param>
        /// <returns>取り込み結果</returns>
        public CsvImportResultDto ImportResultsCsvBulk(Stream fileStream, string createdUser = "System")
        {
            var result = new CsvImportResultDto
            {
                Errors = new List<string>()
            };

            try
            {
                var config = new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,      // ヘッダー行あり
                    TrimOptions = TrimOptions.Trim, // 前後の空白を削除
                    BadDataFound = null,         // 不正なデータがあっても続行
                    MissingFieldFound = null,    // フィールドが不足していても続行
                    Encoding = Encoding.GetEncoding(932) // Shift-JIS（ANSI）エンコーディング
                };

                var entitiesToInsert = new List<ResultEntity>();
                int failureCount = 0;

                // Shift-JIS（ANSI）でファイルを読み込む
                using (var reader = new StreamReader(fileStream, Encoding.GetEncoding(932)))
                using (var csv = new CsvReader(reader, config))
                {
                    // 最初の2行をスキップ（1行目: ファイルヘッダー、2行目: 空行）
                    csv.Read(); // 1行目をスキップ
                    csv.Read(); // 2行目をスキップ
                    
                    // 3行目を実際のヘッダーとして読む
                    csv.Read();
                    csv.ReadHeader();

                    int rowNumber = 4; // データは4行目から開始

                    // 全データ行を読み込んでメモリに格納
                    while (csv.Read())
                    {
                        try
                        {
                            // CSV列を順番で取得
                            // 列の順番: 0=日付, 1=時間, 2=コンテンツタイプ, 3=量, 4=企業ID, 5=企業名
                            var dateStr = csv.GetField(0);         // 日付
                            var timeStr = csv.GetField(1);         // 時間
                            var contentTypeIdStr = csv.GetField(2); // コンテンツタイプ
                            var volStr = csv.GetField(3);          // 量
                            var companyIdStr = csv.GetField(4);    // 企業ID
                            var companyName = csv.GetField(5);     // 企業名

                            // バリデーション & 変換（必須チェックなし）
                            var entity = ConvertToEntity(
                                dateStr,
                                timeStr,
                                contentTypeIdStr,
                                volStr,
                                companyIdStr,
                                companyName,
                                createdUser,
                                rowNumber
                            );

                            entitiesToInsert.Add(entity);
                        }
                        catch (ArgumentException argEx)
                        {
                            // 型変換エラー（ConvertToEntityから）
                            result.Errors.Add($"行 {rowNumber}: {argEx.Message}");
                            failureCount++;
                        }
                        catch (Exception ex)
                        {
                            result.Errors.Add($"行 {rowNumber}: 予期しないエラーが発生しました（{ex.GetType().Name}: {ex.Message}）");
                            failureCount++;
                        }

                        rowNumber++;
                    }
                }

                // バリデーションエラーがあった場合、挿入は行わない
                if (failureCount > 0)
                {
                    int totalCount = entitiesToInsert.Count + failureCount;
                    result.Message = $"CSV読み込み中にエラーが発生しました。{totalCount}件中{failureCount}件のエラーです。";
                    return result;
                }

                // バリデーションが全て成功した場合のみ、一括でDBに挿入
                if (entitiesToInsert.Count > 0)
                {
                    try
                    {
                        _repository.BulkInsert(entitiesToInsert);
                        int successCount = entitiesToInsert.Count;
                        result.Message = $"CSV取り込みが完了しました。（成功: {successCount}件）";
                    }
                    catch (SqlException sqlEx)
                    {
                        string errorMessage = GetSqlErrorMessage(sqlEx);
                        result.Errors.Add($"{errorMessage}");
                        result.Errors.Add($"詳細: {sqlEx.Message}");
                        result.Message = "DBへの一括挿入中にエラーが発生しました。";
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"予期しないエラーが発生しました: {ex.GetType().Name}");
                        result.Errors.Add($"詳細: {ex.Message}");
                        result.Message = "DBへの一括挿入中にエラーが発生しました。";
                    }
                }
                else
                {
                    result.Message = "取り込むデータがありませんでした。";
                }
            }
            catch (Exception ex)
            {
                result.Errors.Add($"全体エラー: {ex.Message}");
                result.Message = "CSV取り込み中にエラーが発生しました。";
            }

            return result;
        }

        /// <summary>
        /// t_results用のCSVファイルをインポート（本物のBULK INSERT版 - SqlBulkCopy使用）
        /// SQL ServerのネイティブBULK INSERT機能を使用するため、最も高速
        /// 超大量データ（10万件以上）に最適
        /// </summary>
        /// <param name="fileStream">CSVファイルのストリーム</param>
        /// <param name="createdUser">作成者</param>
        /// <returns>取り込み結果</returns>
        public CsvImportResultDto ImportResultsCsvBulkCopy(Stream fileStream, string createdUser = "System")
        {
            var result = new CsvImportResultDto
            {
                Errors = new List<string>()
            };

            try
            {
                var config = new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,
                    TrimOptions = TrimOptions.Trim,
                    BadDataFound = null,
                    MissingFieldFound = null,
                    Encoding = Encoding.GetEncoding(932)
                };

                // DataTableを作成してCSVデータを格納
                var dataTable = new DataTable();
                dataTable.Columns.Add("date", typeof(DateTime));
                dataTable.Columns.Add("time", typeof(TimeSpan));
                dataTable.Columns.Add("content_type_id", typeof(int));
                dataTable.Columns.Add("vol", typeof(decimal));
                dataTable.Columns.Add("company_id", typeof(int));
                dataTable.Columns.Add("company_name", typeof(string));
                dataTable.Columns.Add("created_at", typeof(DateTime));
                dataTable.Columns.Add("created_user", typeof(string));

                int failureCount = 0;

                // CSVを読み込んでDataTableに格納
                using (var reader = new StreamReader(fileStream, Encoding.GetEncoding(932)))
                using (var csv = new CsvReader(reader, config))
                {
                    // 最初の2行をスキップ
                    csv.Read(); // 1行目: ファイルヘッダー
                    csv.Read(); // 2行目: 空行
                    
                    // 3行目をヘッダーとして読む
                    csv.Read(); // 3行目: データヘッダー
                    csv.ReadHeader();

                    while (csv.Read())
                    {
                        // CsvHelperの現在の行番号を取得（1始まり）
                        // csv.Parser.Row はヘッダーを除いた実際のCSV行番号
                        int rowNumber = csv.Parser.Row;

                        try
                        {
                            // 列の順番: 0=日付, 1=時間, 2=コンテンツタイプ, 3=量, 4=企業ID, 5=企業名
                            var dateStr = csv.GetField(0);         // 日付
                            var timeStr = csv.GetField(1);         // 時間
                            var contentTypeIdStr = csv.GetField(2); // コンテンツタイプ
                            var volStr = csv.GetField(3);          // 量
                            var companyIdStr = csv.GetField(4);    // 企業ID
                            var companyName = csv.GetField(5);     // 企業名

                            // データ行を作成
                            var row = dataTable.NewRow();
                            var rowErrors = new List<string>();

                            // 日付
                            row["date"] = ValidateAndConvertDateTime(dateStr, "日付", rowErrors);

                            // 時間
                            var time = ValidationHelpers.ValidateAndConvertNullableTime(timeStr, "時間", rowErrors);
                            row["time"] = time.HasValue ? (object)time.Value : DBNull.Value;

                            // コンテンツタイプID
                            row["content_type_id"] = ValidateAndConvertInt(contentTypeIdStr, "コンテンツタイプ", rowErrors, defaultValue: 0);

                            // 量
                            var vol = ValidateAndConvertDecimal(volStr, "量", rowErrors);
                            row["vol"] = vol.HasValue ? (object)vol.Value : DBNull.Value;

                            // 企業ID
                            var companyId = ValidateAndConvertNullableInt(companyIdStr, "企業ID", rowErrors);
                            row["company_id"] = companyId.HasValue ? (object)companyId.Value : DBNull.Value;

                            // 企業名（文字列なので型チェック不要）
                            row["company_name"] = string.IsNullOrWhiteSpace(companyName) ? (object)DBNull.Value : companyName;

                            // 作成日時・作成者
                            row["created_at"] = DateTime.Now;
                            row["created_user"] = createdUser;

                            // エラーがあった場合は記録
                            if (rowErrors.Count > 0)
                            {
                                result.Errors.Add($"行 {rowNumber}: {string.Join(" / ", rowErrors)}");
                                failureCount++;
                            }
                            else
                            {
                                dataTable.Rows.Add(row); // エラーがない行のみ追加
                            }
                        }
                        catch (Exception ex)
                        {
                            result.Errors.Add($"行 {rowNumber}: 予期しないエラーが発生しました（{ex.GetType().Name}: {ex.Message}）");
                            failureCount++;
                        }
                    }
                }

                // バリデーションエラーがあった場合、挿入は行わない
                if (failureCount > 0)
                {
                    int totalCount = dataTable.Rows.Count + failureCount;
                    result.Message = $"CSV読み込み中にエラーが発生しました。{totalCount}件中{failureCount}件のエラーです。";
                    return result;
                }

                // SqlBulkCopyで一括挿入
                if (dataTable.Rows.Count > 0)
                {
                    try
                    {
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
                                        bulkCopy.BatchSize = 10000; // 一度に挿入する行数
                                        bulkCopy.BulkCopyTimeout = 300; // タイムアウト（秒）

                                        // カラムマッピング
                                        bulkCopy.ColumnMappings.Add("date", "date");
                                        bulkCopy.ColumnMappings.Add("time", "time");
                                        bulkCopy.ColumnMappings.Add("content_type_id", "content_type_id");
                                        bulkCopy.ColumnMappings.Add("vol", "vol");
                                        bulkCopy.ColumnMappings.Add("company_id", "company_id");
                                        bulkCopy.ColumnMappings.Add("company_name", "company_name");
                                        bulkCopy.ColumnMappings.Add("created_at", "created_at");
                                        bulkCopy.ColumnMappings.Add("created_user", "created_user");

                                        // 一括挿入実行
                                        bulkCopy.WriteToServer(dataTable);
                                    }

                                    transaction.Commit();
                                    int successCount = dataTable.Rows.Count;
                                    result.Message = $"CSV取り込みが完了しました。（成功: {successCount}件）※SqlBulkCopy使用";
                                }
                                catch (SqlException sqlEx)
                                {
                                    transaction.Rollback();
                                    
                                    // SQL Serverエラー（バリデーション漏れ）
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
                        result.Errors.Add($"DB接続エラー: {ex.Message}");
                        result.Message = "データベース接続中にエラーが発生しました。";
                    }
                }
                else
                {
                    result.Message = "取り込むデータがありませんでした。";
                }
            }
            catch (Exception ex)
            {
                result.Errors.Add($"全体エラー: {ex.Message}");
                result.Message = "CSV取り込み中にエラーが発生しました。";
            }

            return result;
        }

        /// <summary>
        /// 全ての結果データを取得
        /// </summary>
        public List<ResultEntity> GetAllResults()
        {
            return _repository.GetAll();
        }

        /// <summary>
        /// 全ての結果データを削除（テスト用）
        /// </summary>
        public void DeleteAllResults()
        {
            _repository.DeleteAll();
        }
    }
}

