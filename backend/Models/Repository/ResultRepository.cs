using Dapper;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.Linq;
using backend.Models.Entities;

namespace backend.Models.Repository
{
    /// <summary>
    /// t_results テーブルのリポジトリ
    /// </summary>
    public class ResultRepository
    {
        private readonly string _connectionString;

        public ResultRepository()
        {
            _connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;
        }

        /// <summary>
        /// 結果データを1件挿入
        /// </summary>
        public void Insert(ResultEntity entity)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    INSERT INTO [t_results] 
                    (
                        [date],
                        [content_type_id],
                        [vol],
                        [company_id],
                        [company_name],
                        [created_at],
                        [created_user]
                    )
                    VALUES
                    (
                        @Date,
                        @ContentTypeId,
                        @Vol,
                        @CompanyId,
                        @CompanyName,
                        @CreatedAt,
                        @CreatedUser
                    )";

                connection.Execute(sql, entity);
            }
        }

        /// <summary>
        /// 複数の結果データを一括挿入（トランザクション付き）
        /// </summary>
        public void BulkInsert(List<ResultEntity> entities)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction())
                {
                    try
                    {
                        var sql = @"
                            INSERT INTO [t_results] 
                            (
                                [date],
                                [content_type_id],
                                [vol],
                                [company_id],
                                [company_name],
                                [created_at],
                                [created_user]
                            )
                            VALUES
                            (
                                @Date,
                                @ContentTypeId,
                                @Vol,
                                @CompanyId,
                                @CompanyName,
                                @CreatedAt,
                                @CreatedUser
                            )";

                        connection.Execute(sql, entities, transaction);
                        transaction.Commit();
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        /// <summary>
        /// 全ての結果データを取得
        /// </summary>
        public List<ResultEntity> GetAll()
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        [id] as Id,
                        [date] as Date,
                        [content_type_id] as ContentTypeId,
                        [vol] as Vol,
                        [company_id] as CompanyId,
                        [company_name] as CompanyName,
                        [created_at] as CreatedAt,
                        [created_user] as CreatedUser
                    FROM [t_results]
                    ORDER BY [date] DESC, [id] DESC";

                return connection.Query<ResultEntity>(sql).ToList();
            }
        }

        /// <summary>
        /// IDで結果データを取得
        /// </summary>
        public ResultEntity GetById(int id)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        [id] as Id,
                        [date] as Date,
                        [content_type_id] as ContentTypeId,
                        [vol] as Vol,
                        [company_id] as CompanyId,
                        [company_name] as CompanyName,
                        [created_at] as CreatedAt,
                        [created_user] as CreatedUser
                    FROM [t_results]
                    WHERE [id] = @Id";

                return connection.QueryFirstOrDefault<ResultEntity>(sql, new { Id = id });
            }
        }

        /// <summary>
        /// 全ての結果データを削除（テスト用）
        /// </summary>
        public void DeleteAll()
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                connection.Execute("DELETE FROM [t_results]");
            }
        }
    }
}

