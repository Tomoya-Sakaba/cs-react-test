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

        public List<PlanRecordDto> GetAllPlanRecords(int year, int month)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                SELECT
                    ISNULL(p.date, n.note_date) AS date,
                    p.content_type_id,
                    p.company,
                    p.vol,
                    p.time,
                    n.note_text
                FROM t_plan p
                FULL OUTER JOIN note n
                    ON p.date = n.note_date
                    AND p.is_active = 1
                WHERE
                    YEAR(ISNULL(p.date, n.note_date)) = @Year
                    AND MONTH(ISNULL(p.date, n.note_date)) = @Month
                ORDER BY ISNULL(p.date, n.note_date), p.content_type_id
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
            LEFT JOIN note n ON n.note_date = p.date
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

        public void Insert(DateTime date, int contentTypeId, TestItem item)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                var sql = @"
                    INSERT INTO t_plan (date, content_type_id, company, vol, time)
                    VALUES (@date, @contentTypeId, @company, @vol, @time)";
                db.Execute(sql, new
                {
                    date,
                    contentTypeId,
                    company = item.Company,
                    vol = item.Vol,
                    time = item.Time
                });
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
        public void InsertNote(IDbConnection db, IDbTransaction tran, string date, string noteText, string userName)
        {
            const string sql = @"
                INSERT INTO note (
                    note_date,
                    note_text,
                    created_at,
                    created_user,
                    updated_at,
                    updated_user
                )
                VALUES (
                    @NoteDate,
                    @NoteText,
                    GETDATE(),
                    @UserName,
                    GETDATE(),
                    @UserName
                );";


            db.Execute(sql, new
            {
                NoteDate = DateTime.Parse(date),
                NoteText = noteText,
                UserName = userName
            }, tran);
        }
    }
}