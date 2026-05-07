using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using Dapper;
using backend.Models.Entities;

namespace backend.Models.Repository
{
    public class KoujiRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;

        public List<KoujiEntity> GetAll(bool includeInactive = false)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                var sql = @"
                    SELECT
                        kouji_id AS KoujiId,
                        kouji_name AS KoujiName,
                        cycle_years AS CycleYears,
                        cycle_times AS CycleTimes,
                        is_active AS IsActive,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt
                    FROM dbo.t_kouji
                    WHERE (@IncludeInactive = 1 OR is_active = 1)
                    ORDER BY kouji_id;
                ";
                return db.Query<KoujiEntity>(sql, new { IncludeInactive = includeInactive ? 1 : 0 }).ToList();
            }
        }

        public List<KoujiMonthlyEntity> GetMonthlyByYyyymmRange(int fromYyyymmInclusive, int toYyyymmInclusive)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                var sql = @"
                    SELECT
                        kouji_monthly_id AS KoujiMonthlyId,
                        kouji_id AS KoujiId,
                        yyyymm AS Yyyymm,
                        amount AS Amount,
                        type AS Type,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt
                    FROM dbo.t_kouji_monthly
                    WHERE yyyymm BETWEEN @FromYyyymm AND @ToYyyymm
                    ORDER BY kouji_id, yyyymm, type;
                ";
                return db.Query<KoujiMonthlyEntity>(sql, new { FromYyyymm = fromYyyymmInclusive, ToYyyymm = toYyyymmInclusive }).ToList();
            }
        }

        public void UpsertMonthly(int koujiId, int yyyymm, byte type, decimal amount)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                var sql = @"
                    MERGE dbo.t_kouji_monthly AS t
                    USING (VALUES (@KoujiId, @Yyyymm, @Type)) AS s(kouji_id, yyyymm, type)
                    ON t.kouji_id = s.kouji_id AND t.yyyymm = s.yyyymm AND t.type = s.type
                    WHEN MATCHED THEN
                      UPDATE SET amount = @Amount, updated_at = GETDATE()
                    WHEN NOT MATCHED THEN
                      INSERT (kouji_id, yyyymm, amount, type, created_at, updated_at)
                      VALUES (@KoujiId, @Yyyymm, @Amount, @Type, GETDATE(), GETDATE());
                ";
                db.Execute(sql, new { KoujiId = koujiId, Yyyymm = yyyymm, Type = type, Amount = amount });
            }
        }

        public void DeleteMonthly(int koujiId, int yyyymm, byte type)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                var sql = @"
                    DELETE FROM dbo.t_kouji_monthly
                    WHERE kouji_id = @KoujiId AND yyyymm = @Yyyymm AND type = @Type;
                ";
                db.Execute(sql, new { KoujiId = koujiId, Yyyymm = yyyymm, Type = type });
            }
        }
    }
}

