using backend.Models.DTOs;
using backend.Models.Entities;
using Dapper;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Drawing;
using System.Linq;
using System.Web;
using System.Web.Razor.Parser.SyntaxTree;

namespace backend.Models.Repository
{
    public class PlanRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;

        // Planデータ取得（最新バージョン）
        public List<PlanRecordDto> GetAllPlanRecords(int year, int month)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                SELECT
                    COALESCE(p.date, n.note_date) AS date,
                    p.content_type_id,
                    p.company,
                    p.vol,
                    p.time,
                    p.version,
                    n.note_text
                FROM t_plan p
                FULL OUTER JOIN (
                    SELECT 
                        note_date,
                        note_text
                    FROM note n2
                    WHERE n2.version = (
                        SELECT MAX(n3.version)
                        FROM note n3
                        WHERE n3.note_date = n2.note_date
                    )
                ) n ON n.note_date = p.date
                WHERE 
                    (
                        p.version IS NULL
                        OR p.version = (
                            SELECT MAX(tp.version)
                            FROM t_plan tp
                            WHERE tp.date = p.date
                              AND tp.content_type_id = p.content_type_id
                        )
                    )
                    AND YEAR(COALESCE(p.date, n.note_date)) = @Year
                    AND MONTH(COALESCE(p.date, n.note_date)) = @Month
                ORDER BY 
                    COALESCE(p.date, n.note_date),
                    p.content_type_id;
            ";

                return db.Query<PlanRecordDto>(sql, new { Year = year, Month = month }).ToList();
            }
        }

        // バージョン指定ありのPlanデータ取得
        public List<PlanHistoryDto> GetPlanHistory(int targetVersion, int year, int month)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
            SELECT
                p.date AS Date,
                p.content_type_id AS ContentTypeId,
                p.company AS Company,
                p.vol AS Vol,
                p.time AS Time,
                p.version AS Version,
                p.is_active AS IsActive,
                CASE 
                    WHEN EXISTS (
                        SELECT 1
                        FROM t_plan newer
                        WHERE newer.date = p.date
                          AND newer.content_type_id = p.content_type_id
                          AND newer.version > p.version
                          AND newer.is_active = 1
                    ) THEN 1
                    ELSE 0
                END AS IsChanged,
                n.note_text AS NoteText
            FROM t_plan p
            LEFT JOIN (
                SELECT 
                    note_date,
                    note_text
                FROM note n2
                WHERE n2.version = (
                    SELECT MAX(n3.version)
                    FROM note n3
                    WHERE n3.note_date = n2.note_date
                      AND n3.version <= @TargetVersion
                )
            ) n ON n.note_date = p.date
            WHERE p.version = (
                SELECT MAX(version) 
                FROM t_plan 
                WHERE date = p.date
                  AND content_type_id = p.content_type_id
                  AND version <= @TargetVersion
                )
                AND YEAR(p.date) = @Year
                AND MONTH(p.date) = @Month
            ORDER BY p.date, p.content_type_id;
        ";

                return db.Query<PlanHistoryDto>(
                    sql,
                    new { TargetVersion = targetVersion, Year = year, Month = month }
                ).ToList();
            }
        }

        public List<ContentTypeDto> GetAllContentTypes()
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                SELECT 
                    content_type_id,
                    content_name
                FROM content_type
            ";

                return db.Query<ContentTypeDto>(sql).ToList();
            }
        }

        public IEnumerable<PlanRecordDto> GetByDate(DateTime date)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                var sql = @"
                SELECT
                    date,
                    content_type_id
                FROM t_plan
                WHERE date = @date
                ";

                return db.Query<PlanRecordDto>(sql, new { date });
            }

        }
        
        


        // 新規Plan登録
        public void InsertPlan(IDbConnection db, IDbTransaction tran, PlanEntity plan)
        {
            const string sql = @"
                INSERT INTO t_plan (
                    date,
                    content_type_id,
                    company,
                    vol,
                    time,
                    version,
                    is_active,
                    created_at,
                    created_user,
                    updated_at,
                    updated_user
                )
                VALUES (
                    @Date,
                    @ContentTypeId,
                    @Company,
                    @Vol,
                    @Time,
                    @Version,
                    @IsActive,
                    @CreatedAt,
                    @CreatedUser,
                    @UpdatedAt,
                    @UpdatedUser
                );";

            db.Execute(sql, plan, tran);
        }

        // 新規登録（備考）
        public void InsertNote(IDbConnection db, IDbTransaction tran, string date, string noteText, int version, string userName)
        {
            const string sql = @"
                INSERT INTO note (
                    note_date,
                    note_text,
                    version,
                    is_active,
                    created_at,
                    created_user,
                    updated_at,
                    updated_user
                )
                VALUES (
                    @NoteDate,
                    @NoteText,
                    @Version,
                    1,
                    GETDATE(),
                    @UserName,
                    GETDATE(),
                    @UserName
                );";


            db.Execute(sql, new
            {
                NoteDate = DateTime.Parse(date),
                NoteText = noteText,
                Version = version,
                UserName = userName
            }, tran);
        }

        //------------------------------------------------------------------------------------------
        // Noteの更新（version指定）
        //------------------------------------------------------------------------------------------
        public void UpdateNote(IDbConnection db, IDbTransaction tran, string date, string noteText, int version, string userName)
        {
            const string sql = @"
                UPDATE note
                SET 
                    note_text = @NoteText,
                    updated_at = GETDATE(),
                    updated_user = @UserName
                WHERE 
                    note_date = @NoteDate
                    AND version = @Version;
            ";

            db.Execute(sql, new
            {
                NoteDate = DateTime.Parse(date),
                NoteText = noteText,
                Version = version,
                UserName = userName
            }, tran);
        }

        //------------------------------------------------------------------------------------------
        // Noteの存在チェック（version指定）
        //------------------------------------------------------------------------------------------
        public bool NoteExists(DateTime date, int version)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                const string sql = @"
                    SELECT COUNT(1)
                    FROM note
                    WHERE note_date = @NoteDate
                      AND version = @Version;
                ";

                int count = db.Query<int>(sql, new { NoteDate = date, Version = version }).FirstOrDefault();
                return count > 0;
            }
        }

        //------------------------------------------------------------------------------------------
        // Noteの物理削除（version=0限定）
        //------------------------------------------------------------------------------------------
        public void DeleteNote(IDbConnection db, IDbTransaction tran, DateTime date, int version)
        {
            const string sql = @"
                DELETE FROM note
                WHERE 
                    note_date = @NoteDate
                    AND version = @Version;
            ";

            db.Execute(sql, new
            {
                NoteDate = date,
                Version = version
            }, tran);
        }

        //---------------------------------------------------------------------
        // planとnoteの最新バージョン＋１を取得
        //---------------------------------------------------------------------
        public int GetNextVersion(int year, int month)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT 
                        ISNULL(MAX(v), 0) + 1 AS next_version
                    FROM (
                        SELECT MAX(version) AS v FROM t_plan
                        WHERE YEAR(date) = @Year AND MONTH(date) = @Month
                        UNION ALL
                        SELECT MAX(version) AS v FROM note
                        WHERE YEAR(note_date) = @Year AND MONTH(note_date) = @Month
                    ) AS all_versions;
                ";

                return db.Query<int>(sql, new { Year = year, Month = month }).FirstOrDefault();
            }
        }

        //---------------------------------------------------------------------
        // 該当日付の最新バージョンPlanデータを取得
        //---------------------------------------------------------------------
        public List<PlanRecordDto> GetLatestByDate(DateTime targetDate)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT
                        COALESCE(p.date, n.note_date) AS date,
                        p.content_type_id,
                        p.company,
                        p.vol,
                        p.time,
                        p.version,
                        n.note_text
                    FROM t_plan p
                    FULL OUTER JOIN (
                        SELECT 
                            note_date,
                            note_text
                        FROM note n2
                        WHERE n2.version = (
                            SELECT MAX(n3.version)
                            FROM note n3
                            WHERE n3.note_date = n2.note_date
                        )
                    ) n ON n.note_date = p.date
                    WHERE 
                        (
                            p.version IS NULL
                            OR p.version = (
                                SELECT MAX(tp.version)
                                FROM t_plan tp
                                WHERE tp.date = p.date
                                  AND tp.content_type_id = p.content_type_id
                            )
                        )
                        AND COALESCE(p.date, n.note_date) = @TargetDate
                    ORDER BY 
                        COALESCE(p.date, n.note_date),
                        p.content_type_id;
                    ";

                return db.Query<PlanRecordDto>(sql, new { TargetDate = targetDate }).ToList();
            }
        }

        //------------------------------------------------------------------------------------------
        // 追加登録（versionアップ）
        //------------------------------------------------------------------------------------------
        public void Insert(DateTime date, int contentTypeId, TestItem newItem, int version)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
            INSERT INTO t_plan (date, content_type_id, company, vol, time, version)
            VALUES (@Date, @ContentTypeId, @Company, @Vol, @Time, @Version);
        ";

                db.Execute(sql, new
                {
                    Date = date,
                    ContentTypeId = contentTypeId,
                    Company = newItem.Company,
                    Vol = newItem.Vol,
                    Time = newItem.Time,
                    Version = version
                });
            }
        }

        //------------------------------------------------------------------------------------------
        // 既存データ削除（論理削除）
        //------------------------------------------------------------------------------------------
        public void InsertDeleted(DateTime date, int contentTypeId, int newVersion)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
            INSERT INTO t_plan (date, content_type_id, company, vol, time, version)
            VALUES (@Date, @ContentTypeId, NULL, NULL, NULL, @Version);
        ";

                db.Execute(sql, new
                {
                    Date = date,
                    ContentTypeId = contentTypeId,
                    Version = newVersion
                });
            }
        }

        //------------------------------------------------------------------------------------------
        // 既存レコードの更新（version指定）
        //
        // 指定された date + content_type_id + version に一致するレコードの値のみ更新します。
        // バージョンは変更しません（据え置き）。
        //------------------------------------------------------------------------------------------
        public void UpdatePlan(IDbConnection db, IDbTransaction tran, DateTime date, int contentTypeId, TestItem item, int version)
        {
            string sql = @"
                UPDATE t_plan
                SET 
                    company = @Company,
                    vol = @Vol,
                    time = @Time,
                    updated_at = GETDATE()
                WHERE 
                    date = @Date
                    AND content_type_id = @ContentTypeId
                    AND version = @Version;
            ";

            db.Execute(sql, new
            {
                Date = date,
                ContentTypeId = contentTypeId,
                Company = item.Company,
                Vol = item.Vol,
                Time = item.Time,
                Version = version
            }, tran);
        }

        //------------------------------------------------------------------------------------------
        // レコードの物理削除（version=0限定）
        //------------------------------------------------------------------------------------------
        public void DeletePlan(IDbConnection db, IDbTransaction tran, DateTime date, int contentTypeId, int version)
        {
            string sql = @"
                DELETE FROM t_plan
                WHERE 
                    date = @Date
                    AND content_type_id = @ContentTypeId
                    AND version = @Version;
            ";

            db.Execute(sql, new
            {
                Date = date,
                ContentTypeId = contentTypeId,
                Version = version
            }, tran);
        }

        //------------------------------------------------------------------------------------------
        // 指定versionのレコードが存在するかチェック
        //------------------------------------------------------------------------------------------
        public bool ExistsPlanRecord(DateTime date, int contentTypeId, int version)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT COUNT(1)
                    FROM t_plan
                    WHERE 
                        date = @Date
                        AND content_type_id = @ContentTypeId
                        AND version = @Version;
                ";

                int count = db.Query<int>(sql, new
                {
                    Date = date,
                    ContentTypeId = contentTypeId,
                    Version = version
                }).FirstOrDefault();

                return count > 0;
            }
        }

        //------------------------------------------------------------------------------------------
        // 月の現在のバージョンを取得
        // plan_version_snapshot から current_version を取得（null の場合は未作成）
        //------------------------------------------------------------------------------------------
        public int? GetCurrentVersion(int year, int month)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT current_version
                    FROM plan_version_snapshot
                    WHERE year = @Year AND month = @Month;
                ";

                return db.Query<int?>(sql, new { Year = year, Month = month }).FirstOrDefault();
            }
        }

        //------------------------------------------------------------------------------------------
        // バージョンスナップショットを作成または更新
        // 指定の (year, month) の current_version を upsert します。
        //------------------------------------------------------------------------------------------
        public void UpsertVersionSnapshot(IDbConnection db, IDbTransaction tran, int year, int month, int version, string userName)
        {
            string sql = @"
                IF EXISTS (SELECT 1 FROM plan_version_snapshot WHERE year = @Year AND month = @Month)
                BEGIN
                    UPDATE plan_version_snapshot
                    SET current_version = @Version,
                        created_at = GETDATE(),
                        created_user = @UserName
                    WHERE year = @Year AND month = @Month;
                END
                ELSE
                BEGIN
                    INSERT INTO plan_version_snapshot (year, month, current_version, created_at, created_user)
                    VALUES (@Year, @Month, @Version, GETDATE(), @UserName);
                END;
            ";

            db.Execute(sql, new
            {
                Year = year,
                Month = month,
                Version = version,
                UserName = userName
            }, tran);
        }

        //------------------------------------------------------------------------------------------
        // version=0のレコードを取得（日付とcontentTypeIdで）
        //（必要に応じた個別参照用。今回は一括コピーAPIが主用途）
        //------------------------------------------------------------------------------------------
        public PlanRecordDto GetVersionZeroRecord(DateTime date, int contentTypeId)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT TOP 1
                        date,
                        content_type_id,
                        company,
                        vol,
                        time,
                        version,
                        '' AS note_text
                    FROM t_plan
                    WHERE 
                        date = @Date
                        AND content_type_id = @ContentTypeId
                        AND version = 0
                    ORDER BY created_at DESC;
                ";

                return db.Query<PlanRecordDto>(sql, new
                {
                    Date = date,
                    ContentTypeId = contentTypeId
                }).FirstOrDefault();
            }
        }

        //------------------------------------------------------------------------------------------
        // version=0の全レコードをversion=1としてコピー
        // バージョン切りの初回（0→1）に使用。
        //------------------------------------------------------------------------------------------
        public void CopyVersionZeroToVersionOne(IDbConnection db, IDbTransaction tran, int year, int month, string userName)
        {
            string sql = @"
                INSERT INTO t_plan (date, content_type_id, company, vol, time, version, is_active, created_at, created_user, updated_at, updated_user)
                SELECT 
                    date,
                    content_type_id,
                    company,
                    vol,
                    time,
                    1 AS version,
                    is_active,
                    GETDATE() AS created_at,
                    @UserName AS created_user,
                    GETDATE() AS updated_at,
                    @UserName AS updated_user
                FROM t_plan
                WHERE 
                    YEAR(date) = @Year
                    AND MONTH(date) = @Month
                    AND version = 0
                    AND is_active = 1;
            ";

            db.Execute(sql, new
            {
                Year = year,
                Month = month,
                UserName = userName
            }, tran);
        }

        //------------------------------------------------------------------------------------------
        // 指定バージョンの全レコードを取得
        //（デバッグ・検証用の補助API）
        //------------------------------------------------------------------------------------------
        public List<PlanRecordDto> GetPlanRecordsByVersion(int year, int month, int version)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                    SELECT
                        p.date,
                        p.content_type_id,
                        p.company,
                        p.vol,
                        p.time,
                        p.version,
                        COALESCE(n.note_text, '') AS note_text
                    FROM t_plan p
                    LEFT JOIN note n ON n.note_date = p.date
                    WHERE 
                        YEAR(p.date) = @Year
                        AND MONTH(p.date) = @Month
                        AND p.version = @Version
                        AND p.is_active = 1
                    ORDER BY p.date, p.content_type_id;
                ";

                return db.Query<PlanRecordDto>(sql, new { Year = year, Month = month, Version = version }).ToList();
            }
        }

        //------------------------------------------------------------------------------------------
        // 指定バージョンの全レコードを次のバージョンとしてコピー
        // バージョン切り(>=1 → +1)時に使用。
        //------------------------------------------------------------------------------------------
        public void CopyVersionToNextVersion(IDbConnection db, IDbTransaction tran, int year, int month, int currentVersion, int nextVersion, string userName)
        {
            string sql = @"
                INSERT INTO t_plan (date, content_type_id, company, vol, time, version, is_active, created_at, created_user, updated_at, updated_user)
                SELECT 
                    date,
                    content_type_id,
                    company,
                    vol,
                    time,
                    @NextVersion AS version,
                    is_active,
                    GETDATE() AS created_at,
                    @UserName AS created_user,
                    GETDATE() AS updated_at,
                    @UserName AS updated_user
                FROM t_plan
                WHERE 
                    YEAR(date) = @Year
                    AND MONTH(date) = @Month
                    AND version = @CurrentVersion
                    AND is_active = 1;
            ";

            db.Execute(sql, new
            {
                Year = year,
                Month = month,
                CurrentVersion = currentVersion,
                NextVersion = nextVersion,
                UserName = userName
            }, tran);
        }
    }
}