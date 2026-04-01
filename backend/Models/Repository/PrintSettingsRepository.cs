using System.Data.SqlClient;
using Dapper;

namespace backend.Models.Repository
{
    public class PrintSettingsRepository
    {
        private readonly string _connectionString;

        public PrintSettingsRepository(string connectionString)
        {
            _connectionString = connectionString;
        }

        public int? GetTemplateIdByPageCode(string pageCode)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                const string sql = @"
                    SELECT template_id
                    FROM t_print_template_settings
                    WHERE page_code = @PageCode
                ";
                return connection.QuerySingleOrDefault<int?>(sql, new { PageCode = pageCode });
            }
        }

        public void Upsert(string pageCode, int templateId, string updatedUser)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                const string sql = @"
                    MERGE t_print_template_settings AS target
                    USING (SELECT @PageCode AS page_code, @TemplateId AS template_id) AS source
                    ON target.page_code = source.page_code
                    WHEN MATCHED THEN
                        UPDATE SET template_id = source.template_id, updated_at = GETDATE(), updated_user = @UpdatedUser
                    WHEN NOT MATCHED THEN
                        INSERT (page_code, template_id, updated_at, updated_user)
                        VALUES (source.page_code, source.template_id, GETDATE(), @UpdatedUser);
                ";
                connection.Execute(sql, new { PageCode = pageCode, TemplateId = templateId, UpdatedUser = updatedUser });
            }
        }
    }
}

