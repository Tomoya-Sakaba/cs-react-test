using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
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
                SuccessCount = 0,
                FailureCount = 0,
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

                    int rowNumber = 4; // データは4行目から開始

                    // データ行を1行ずつ処理
                    while (csv.Read())
                    {
                        try
                        {
                            // CSV列を順番で取得
                            // 列の順番: 0=日付, 1=空(スキップ), 2=コンテンツタイプ, 3=量, 4=企業ID, 5=企業名
                            var dateStr = csv.GetField(0);         // 日付
                            // csv.GetField(1) は空カラムなのでスキップ
                            var contentTypeIdStr = csv.GetField(2); // コンテンツタイプ
                            var volStr = csv.GetField(3);          // 量
                            var companyIdStr = csv.GetField(4);    // 企業ID
                            var companyName = csv.GetField(5);     // 企業名

                            // バリデーション & 変換（必須チェックなし）
                            var entity = ConvertToEntity(
                                dateStr,
                                contentTypeIdStr,
                                volStr,
                                companyIdStr,
                                companyName,
                                createdUser,
                                rowNumber
                            );

                            // DBに挿入
                            _repository.Insert(entity);
                            result.SuccessCount++;
                        }
                        catch (Exception ex)
                        {
                            result.Errors.Add($"行 {rowNumber}: {ex.Message}");
                            result.FailureCount++;
                        }

                        rowNumber++;
                    }
                }

                // 結果メッセージ
                if (result.FailureCount == 0)
                {
                    result.Message = $"CSV取り込みが完了しました。（成功: {result.SuccessCount}件）";
                }
                else
                {
                    result.Message = $"CSV取り込みが完了しました。（成功: {result.SuccessCount}件、失敗: {result.FailureCount}件）";
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
        /// CSV行データをEntityに変換（必須チェックなし）
        /// </summary>
        private ResultEntity ConvertToEntity(
            string dateStr,
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

            // 日付の変換（空白の場合はデフォルト値）
            if (!string.IsNullOrWhiteSpace(dateStr))
            {
                if (DateTime.TryParse(dateStr, out DateTime date))
                {
                    entity.Date = date;
                }
                else
                {
                    throw new ArgumentException($"日付の形式が不正です: {dateStr}");
                }
            }
            else
            {
                // 日付が空の場合は現在日付を使用
                entity.Date = DateTime.Now.Date;
            }

            // コンテンツタイプIDの変換（空白の場合は0）
            if (!string.IsNullOrWhiteSpace(contentTypeIdStr))
            {
                if (int.TryParse(contentTypeIdStr, out int contentTypeId))
                {
                    entity.ContentTypeId = contentTypeId;
                }
                else
                {
                    throw new ArgumentException($"コンテンツタイプIDが数値ではありません: {contentTypeIdStr}");
                }
            }
            else
            {
                entity.ContentTypeId = 0;
            }

            // 量の変換（オプショナル）
            if (!string.IsNullOrWhiteSpace(volStr))
            {
                if (decimal.TryParse(volStr, out decimal vol))
                {
                    entity.Vol = vol;
                }
                else
                {
                    throw new ArgumentException($"量が数値ではありません: {volStr}");
                }
            }
            else
            {
                entity.Vol = null;
            }

            // 企業IDの変換（オプショナル）
            if (!string.IsNullOrWhiteSpace(companyIdStr))
            {
                if (int.TryParse(companyIdStr, out int companyId))
                {
                    entity.CompanyId = companyId;
                }
                else
                {
                    throw new ArgumentException($"企業IDが数値ではありません: {companyIdStr}");
                }
            }
            else
            {
                entity.CompanyId = null;
            }

            // 企業名（オプショナル）
            entity.CompanyName = string.IsNullOrWhiteSpace(companyName) ? null : companyName;

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
                SuccessCount = 0,
                FailureCount = 0,
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
                            // 列の順番: 0=日付, 1=空(スキップ), 2=コンテンツタイプ, 3=量, 4=企業ID, 5=企業名
                            var dateStr = csv.GetField(0);         // 日付
                            // csv.GetField(1) は空カラムなのでスキップ
                            var contentTypeIdStr = csv.GetField(2); // コンテンツタイプ
                            var volStr = csv.GetField(3);          // 量
                            var companyIdStr = csv.GetField(4);    // 企業ID
                            var companyName = csv.GetField(5);     // 企業名

                            // バリデーション & 変換（必須チェックなし）
                            var entity = ConvertToEntity(
                                dateStr,
                                contentTypeIdStr,
                                volStr,
                                companyIdStr,
                                companyName,
                                createdUser,
                                rowNumber
                            );

                            entitiesToInsert.Add(entity);
                        }
                        catch (Exception ex)
                        {
                            result.Errors.Add($"行 {rowNumber}: {ex.Message}");
                            result.FailureCount++;
                        }

                        rowNumber++;
                    }
                }

                // バリデーションエラーがあった場合、挿入は行わない
                if (result.FailureCount > 0)
                {
                    result.Message = $"CSV読み込み中にエラーが発生しました。（成功: 0件、失敗: {result.FailureCount}件）";
                    return result;
                }

                // バリデーションが全て成功した場合のみ、一括でDBに挿入
                if (entitiesToInsert.Count > 0)
                {
                    try
                    {
                        _repository.BulkInsert(entitiesToInsert);
                        result.SuccessCount = entitiesToInsert.Count;
                        result.Message = $"CSV取り込みが完了しました。（成功: {result.SuccessCount}件）";
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"バルクインサートエラー: {ex.Message}");
                        result.FailureCount = entitiesToInsert.Count;
                        result.SuccessCount = 0;
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
                SuccessCount = 0,
                FailureCount = 0,
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
                dataTable.Columns.Add("content_type_id", typeof(int));
                dataTable.Columns.Add("vol", typeof(decimal));
                dataTable.Columns.Add("company_id", typeof(int));
                dataTable.Columns.Add("company_name", typeof(string));
                dataTable.Columns.Add("created_at", typeof(DateTime));
                dataTable.Columns.Add("created_user", typeof(string));

                // CSVを読み込んでDataTableに格納
                using (var reader = new StreamReader(fileStream, Encoding.GetEncoding(932)))
                using (var csv = new CsvReader(reader, config))
                {
                    // 最初の2行をスキップ
                    csv.Read();
                    csv.Read();
                    
                    // 3行目をヘッダーとして読む
                    csv.Read();
                    csv.ReadHeader();

                    int rowNumber = 4;

                    while (csv.Read())
                    {
                        try
                        {
                            var dateStr = csv.GetField(0);
                            var contentTypeIdStr = csv.GetField(2);
                            var volStr = csv.GetField(3);
                            var companyIdStr = csv.GetField(4);
                            var companyName = csv.GetField(5);

                            // データ行を作成
                            var row = dataTable.NewRow();

                            // 日付
                            if (!string.IsNullOrWhiteSpace(dateStr) && DateTime.TryParse(dateStr, out DateTime date))
                            {
                                row["date"] = date;
                            }
                            else
                            {
                                row["date"] = DateTime.Now.Date;
                            }

                            // コンテンツタイプID
                            if (!string.IsNullOrWhiteSpace(contentTypeIdStr) && int.TryParse(contentTypeIdStr, out int contentTypeId))
                            {
                                row["content_type_id"] = contentTypeId;
                            }
                            else
                            {
                                row["content_type_id"] = 0;
                            }

                            // 量
                            if (!string.IsNullOrWhiteSpace(volStr) && decimal.TryParse(volStr, out decimal vol))
                            {
                                row["vol"] = vol;
                            }
                            else
                            {
                                row["vol"] = DBNull.Value;
                            }

                            // 企業ID
                            if (!string.IsNullOrWhiteSpace(companyIdStr) && int.TryParse(companyIdStr, out int companyId))
                            {
                                row["company_id"] = companyId;
                            }
                            else
                            {
                                row["company_id"] = DBNull.Value;
                            }

                            // 企業名
                            row["company_name"] = string.IsNullOrWhiteSpace(companyName) ? (object)DBNull.Value : companyName;

                            // 作成日時・作成者
                            row["created_at"] = DateTime.Now;
                            row["created_user"] = createdUser;

                            dataTable.Rows.Add(row);
                        }
                        catch (Exception ex)
                        {
                            result.Errors.Add($"行 {rowNumber}: {ex.Message}");
                            result.FailureCount++;
                        }

                        rowNumber++;
                    }
                }

                // バリデーションエラーがあった場合、挿入は行わない
                if (result.FailureCount > 0)
                {
                    result.Message = $"CSV読み込み中にエラーが発生しました。（成功: 0件、失敗: {result.FailureCount}件）";
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
                                    result.SuccessCount = dataTable.Rows.Count;
                                    result.Message = $"CSV取り込みが完了しました。（成功: {result.SuccessCount}件）※SqlBulkCopy使用";
                                }
                                catch (Exception ex)
                                {
                                    transaction.Rollback();
                                    result.Errors.Add($"SqlBulkCopyエラー: {ex.Message}");
                                    result.FailureCount = dataTable.Rows.Count;
                                    result.SuccessCount = 0;
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

