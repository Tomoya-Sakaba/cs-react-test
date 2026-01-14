using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using Dapper;

namespace backend.Models.Repository
{
    /// <summary>
    /// 柔軟な計画スケジュール用リポジトリ
    /// 
    /// 【テーブル設計】
    /// t_plan_schedule_v2: 計画スケジュールテーブル
    ///   - scheduleId (PK)
    ///   - year, month, version, date, scheduleOrder, wasteType
    ///   - companyId, vol, plannedTime, note
    ///   - UNIQUE(year, month, version, date, scheduleOrder, wasteType)
    /// 
    /// 【外部キー制約】
    /// - 外部キー制約は設定していません（テーブル変更の柔軟性確保）
    /// - データ整合性はアプリケーション層で管理
    /// - 必要に応じて、INSERT/UPDATE前にマスタデータの存在チェックを実施
    /// </summary>
    public class FlexibleScheduleRepository
    {
        private readonly string _connectionString;

        public FlexibleScheduleRepository()
        {
            _connectionString = ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString;
        }

        /// <summary>
        /// 月次計画スケジュールを取得
        /// </summary>
        public List<FlexibleSchedule> GetMonthlySchedule(int year, int month, int version)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        scheduleId AS ScheduleId,
                        year AS Year,
                        month AS Month,
                        version AS Version,
                        date AS Date,
                        scheduleOrder AS ScheduleOrder,
                        wasteType AS WasteType,
                        companyId AS CompanyId,
                        vol AS Vol,
                        plannedTime AS PlannedTime,
                        note AS Note,
                        createdAt AS CreatedAt,
                        updatedAt AS UpdatedAt
                    FROM t_plan_schedule_v2
                    WHERE year = @Year 
                        AND month = @Month 
                        AND version = @Version
                    ORDER BY date, scheduleOrder
                ";

                return connection.Query<FlexibleSchedule>(sql, new { Year = year, Month = month, Version = version }).AsList();
            }
        }

        /// <summary>
        /// スケジュールを挿入
        /// </summary>
        public void InsertSchedule(FlexibleSchedule schedule)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    INSERT INTO t_plan_schedule_v2 
                    (year, month, version, date, scheduleOrder, wasteType, companyId, vol, plannedTime, note, createdAt, updatedAt)
                    VALUES 
                    (@Year, @Month, @Version, @Date, @ScheduleOrder, @WasteType, @CompanyId, @Vol, @PlannedTime, @Note, @CreatedAt, @UpdatedAt)
                ";

                connection.Execute(sql, schedule);
            }
        }

        /// <summary>
        /// 月次計画スケジュールを削除（バージョン指定）
        /// </summary>
        public void DeleteMonthlySchedule(int year, int month, int version)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    DELETE FROM t_plan_schedule_v2
                    WHERE year = @Year 
                        AND month = @Month 
                        AND version = @Version
                ";

                connection.Execute(sql, new { Year = year, Month = month, Version = version });
            }
        }

        /// <summary>
        /// 最新バージョンを取得
        /// </summary>
        public int GetLatestVersion(int year, int month)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT ISNULL(MAX(version), 0) AS MaxVersion
                    FROM t_plan_schedule_v2
                    WHERE year = @Year AND month = @Month
                ";

                return connection.ExecuteScalar<int>(sql, new { Year = year, Month = month });
            }
        }

        /// <summary>
        /// 新しいバージョンにコピー
        /// </summary>
        public void CopyToNewVersion(int year, int month, int fromVersion, int toVersion)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    INSERT INTO t_plan_schedule_v2 
                    (year, month, version, date, scheduleOrder, wasteType, companyId, vol, plannedTime, note, createdAt, updatedAt)
                    SELECT 
                        year, month, @ToVersion, date, scheduleOrder, wasteType, companyId, vol, plannedTime, note, GETDATE(), GETDATE()
                    FROM t_plan_schedule_v2
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
                    FROM t_plan_schedule_v2
                    WHERE year = @Year AND month = @Month
                    ORDER BY version
                ";

                return connection.Query<int>(sql, new { Year = year, Month = month }).AsList();
            }
        }

        /// <summary>
        /// 月次設定を取得
        /// </summary>
        public MonthlyScheduleConfig GetMonthlyConfig(int year, int month)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        configId AS ConfigId,
                        year AS Year,
                        month AS Month,
                        maxScheduleCount AS MaxScheduleCount
                    FROM t_monthly_schedule_config
                    WHERE year = @Year AND month = @Month
                ";

                return connection.QueryFirstOrDefault<MonthlyScheduleConfig>(sql, new { Year = year, Month = month });
            }
        }

        /// <summary>
        /// 種別マスタを取得
        /// </summary>
        public List<WasteType> GetWasteTypes()
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        wasteTypeId AS WasteTypeId,
                        wasteTypeName AS WasteTypeName,
                        displayOrder AS DisplayOrder,
                        isActive AS IsActive
                    FROM m_waste_type
                    WHERE isActive = 1
                    ORDER BY displayOrder
                ";

                return connection.Query<WasteType>(sql).AsList();
            }
        }

        /// <summary>
        /// 月次実績を取得（突合用）
        /// </summary>
        public List<ActualResult> GetMonthlyActual(int year, int month)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        resultId AS ResultId,
                        date AS Date,
                        actualTime AS ActualTime,
                        wasteType AS WasteType,
                        companyId AS CompanyId,
                        vol AS Vol,
                        note AS Note
                    FROM t_actual_result
                    WHERE YEAR(date) = @Year 
                        AND MONTH(date) = @Month
                    ORDER BY date, actualTime
                ";

                return connection.Query<ActualResult>(sql, new { Year = year, Month = month }).AsList();
            }
        }
    }
}

