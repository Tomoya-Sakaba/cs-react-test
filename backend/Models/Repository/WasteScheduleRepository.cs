using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.Linq;
using Dapper;

namespace backend.Models.Repository
{
    /// <summary>
    /// 廃棄物排出計画スケジュール用リポジトリ
    /// 
    /// 【テーブル】
    /// - v2_t_header_definition: ヘッダー定義
    /// - v2_t_plan_data: 計画データ
    /// - v2_t_actual_data: 実績データ
    /// 
    /// 【外部キー制約】なし
    /// </summary>
    public class WasteScheduleRepository
    {
        private readonly string _connectionString;

        public WasteScheduleRepository()
        {
            _connectionString = ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString;
        }

        // ====================================================================
        // ヘッダー定義関連
        // ====================================================================

        /// <summary>
        /// ヘッダー定義を取得
        /// </summary>
        public List<HeaderDefinition> GetHeaderDefinition(int year, int month, bool isSpecialDay)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        headerId AS HeaderId,
                        year AS Year,
                        month AS Month,
                        version AS Version,
                        isSpecialDay AS IsSpecialDay,
                        headerOrder AS HeaderOrder,
                        wasteType AS WasteType,
                        typeSequence AS TypeSequence,
                        displayName AS DisplayName,
                        createdAt AS CreatedAt,
                        updatedAt AS UpdatedAt
                    FROM v2_t_header_definition
                    WHERE year = @Year 
                        AND month = @Month 
                        AND version = 0
                        AND isSpecialDay = @IsSpecialDay
                    ORDER BY headerOrder
                ";

                return connection.Query<HeaderDefinition>(sql, new { Year = year, Month = month, IsSpecialDay = isSpecialDay }).AsList();
            }
        }

        /// <summary>
        /// ヘッダー定義を挿入
        /// </summary>
        public void InsertHeaderDefinition(HeaderDefinition header)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    INSERT INTO v2_t_header_definition 
                    (year, month, version, isSpecialDay, headerOrder, wasteType, typeSequence, displayName, createdAt, updatedAt)
                    VALUES 
                    (@Year, @Month, @Version, @IsSpecialDay, @HeaderOrder, @WasteType, @TypeSequence, @DisplayName, @CreatedAt, @UpdatedAt)
                ";

                connection.Execute(sql, header);
            }
        }

        /// <summary>
        /// ヘッダー定義を削除
        /// </summary>
        public void DeleteHeaderDefinition(int year, int month, bool isSpecialDay)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    DELETE FROM v2_t_header_definition
                    WHERE year = @Year 
                        AND month = @Month 
                        AND version = 0
                        AND isSpecialDay = @IsSpecialDay
                ";

                connection.Execute(sql, new { Year = year, Month = month, IsSpecialDay = isSpecialDay });
            }
        }

        /// <summary>
        /// ヘッダーIDからヘッダー順序を取得（並び替え用）
        /// </summary>
        public int GetHeaderOrder(int headerId)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT headerOrder
                    FROM v2_t_header_definition
                    WHERE headerId = @HeaderId
                ";

                return connection.ExecuteScalar<int>(sql, new { HeaderId = headerId });
            }
        }

        // ====================================================================
        // 計画データ関連
        // ====================================================================

        /// <summary>
        /// 月次計画データを取得
        /// </summary>
        public List<PlanData> GetMonthlyPlan(int year, int month, int version)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        planId AS PlanId,
                        year AS Year,
                        month AS Month,
                        version AS Version,
                        date AS Date,
                        isSpecialDay AS IsSpecialDay,
                        headerId AS HeaderId,
                        wasteType AS WasteType,
                        typeSequence AS TypeSequence,
                        companyId AS CompanyId,
                        vol AS Vol,
                        plannedTime AS PlannedTime,
                        note AS Note,
                        createdAt AS CreatedAt,
                        updatedAt AS UpdatedAt
                    FROM v2_t_plan_data
                    WHERE year = @Year 
                        AND month = @Month 
                        AND version = @Version
                    ORDER BY date
                ";

                return connection.Query<PlanData>(sql, new { Year = year, Month = month, Version = version }).AsList();
            }
        }

        /// <summary>
        /// 計画データを挿入
        /// </summary>
        public void InsertPlan(PlanData plan)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    INSERT INTO v2_t_plan_data 
                    (year, month, version, date, isSpecialDay, headerId, wasteType, typeSequence, companyId, vol, plannedTime, note, createdAt, updatedAt)
                    VALUES 
                    (@Year, @Month, @Version, @Date, @IsSpecialDay, @HeaderId, @WasteType, @TypeSequence, @CompanyId, @Vol, @PlannedTime, @Note, @CreatedAt, @UpdatedAt)
                ";

                connection.Execute(sql, plan);
            }
        }

        /// <summary>
        /// 月次計画データを削除（バージョン指定）
        /// </summary>
        public void DeleteMonthlyPlan(int year, int month, int version)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    DELETE FROM v2_t_plan_data
                    WHERE year = @Year 
                        AND month = @Month 
                        AND version = @Version
                ";

                connection.Execute(sql, new { Year = year, Month = month, Version = version });
            }
        }

        // ====================================================================
        // バージョン管理関連
        // ====================================================================

        /// <summary>
        /// 最新バージョンを取得
        /// </summary>
        public int GetLatestVersion(int year, int month)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT ISNULL(MAX(version), 0) AS MaxVersion
                    FROM v2_t_plan_data
                    WHERE year = @Year AND month = @Month
                ";

                return connection.ExecuteScalar<int>(sql, new { Year = year, Month = month });
            }
        }

        /// <summary>
        /// ヘッダー定義を新しいバージョンにコピー
        /// </summary>
        public void CopyHeaderDefinitionToNewVersion(int year, int month, int fromVersion, int toVersion)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    INSERT INTO v2_t_header_definition 
                    (year, month, version, isSpecialDay, headerOrder, wasteType, typeSequence, displayName, createdAt, updatedAt)
                    SELECT 
                        year, month, @ToVersion, isSpecialDay, headerOrder, wasteType, typeSequence, displayName, GETDATE(), GETDATE()
                    FROM v2_t_header_definition
                    WHERE year = @Year 
                        AND month = @Month 
                        AND version = @FromVersion
                ";

                connection.Execute(sql, new { Year = year, Month = month, FromVersion = fromVersion, ToVersion = toVersion });
            }
        }

        /// <summary>
        /// 計画データを新しいバージョンにコピー
        /// </summary>
        public void CopyPlanToNewVersion(int year, int month, int fromVersion, int toVersion)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    INSERT INTO v2_t_plan_data 
                    (year, month, version, date, isSpecialDay, headerId, wasteType, typeSequence, companyId, vol, plannedTime, note, createdAt, updatedAt)
                    SELECT 
                        year, month, @ToVersion, date, isSpecialDay, headerId, wasteType, typeSequence, companyId, vol, plannedTime, note, GETDATE(), GETDATE()
                    FROM v2_t_plan_data
                    WHERE year = @Year 
                        AND month = @Month 
                        AND version = @FromVersion
                ";

                connection.Execute(sql, new { Year = year, Month = month, FromVersion = fromVersion, ToVersion = toVersion });
            }
        }

        /// <summary>
        /// 利用可能なバージョンを取得
        /// </summary>
        public List<int> GetAvailableVersions(int year, int month)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT DISTINCT version
                    FROM v2_t_plan_data
                    WHERE year = @Year AND month = @Month
                    ORDER BY version
                ";

                return connection.Query<int>(sql, new { Year = year, Month = month }).AsList();
            }
        }

        // ====================================================================
        // 実績データ関連
        // ====================================================================

        /// <summary>
        /// 月次実績データを取得
        /// </summary>
        public List<ActualData> GetMonthlyActual(int year, int month)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        actualId AS ActualId,
                        date AS Date,
                        actualTime AS ActualTime,
                        wasteType AS WasteType,
                        companyId AS CompanyId,
                        vol AS Vol,
                        note AS Note,
                        createdAt AS CreatedAt
                    FROM v2_t_actual_data
                    WHERE YEAR(date) = @Year 
                        AND MONTH(date) = @Month
                    ORDER BY date, actualTime
                ";

                return connection.Query<ActualData>(sql, new { Year = year, Month = month }).AsList();
            }
        }

        // ====================================================================
        // 計画と実績の突合
        // ====================================================================

        /// <summary>
        /// 計画と実績を突合（ビューから取得）
        /// </summary>
        public List<PlanActualMatch> GetPlanActualMatch(int year, int month)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        date AS Date,
                        wasteType AS WasteType,
                        typeSequence AS TypeSequence,
                        headerName AS HeaderName,
                        planCompanyId AS PlanCompanyId,
                        planVol AS PlanVol,
                        plannedTime AS PlannedTime,
                        actualTime AS ActualTime,
                        actualCompanyId AS ActualCompanyId,
                        actualVol AS ActualVol,
                        status AS Status,
                        timeDiffMinutes AS TimeDiffMinutes
                    FROM v2_v_plan_actual_match
                    WHERE YEAR(date) = @Year 
                        AND MONTH(date) = @Month
                    ORDER BY date, wasteType, typeSequence
                ";

                return connection.Query<PlanActualMatch>(sql, new { Year = year, Month = month }).AsList();
            }
        }
    }
}

