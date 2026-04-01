using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using Dapper;

namespace backend.Models.Repository
{
    public class PrintFieldMappingRepository
    {
        private readonly string _connectionString;

        public PrintFieldMappingRepository(string connectionString)
        {
            _connectionString = connectionString;
        }

        public Dictionary<string, string> GetMappings(string pageCode, int templateId)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                const string sql = @"
                    SELECT field_name AS FieldName, source_key AS SourceKey
                    FROM t_print_field_mappings
                    WHERE page_code = @PageCode AND template_id = @TemplateId
                ";

                var rows = connection.Query<(string FieldName, string SourceKey)>(sql, new
                {
                    PageCode = pageCode,
                    TemplateId = templateId
                }).ToList();

                return rows
                    .Where(x => !string.IsNullOrWhiteSpace(x.FieldName) && !string.IsNullOrWhiteSpace(x.SourceKey))
                    .ToDictionary(x => x.FieldName, x => x.SourceKey);
            }
        }

        public void Upsert(string pageCode, int templateId, string fieldName, string sourceKey, string updatedUser)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                const string sql = @"
                    MERGE t_print_field_mappings AS target
                    USING (SELECT @PageCode AS page_code, @TemplateId AS template_id, @FieldName AS field_name) AS source
                    ON target.page_code = source.page_code AND target.template_id = source.template_id AND target.field_name = source.field_name
                    WHEN MATCHED THEN
                        UPDATE SET source_key = @SourceKey, updated_at = GETDATE(), updated_user = @UpdatedUser
                    WHEN NOT MATCHED THEN
                        INSERT (page_code, template_id, field_name, source_key, created_at, created_user)
                        VALUES (@PageCode, @TemplateId, @FieldName, @SourceKey, GETDATE(), @UpdatedUser);
                ";

                connection.Execute(sql, new
                {
                    PageCode = pageCode,
                    TemplateId = templateId,
                    FieldName = fieldName,
                    SourceKey = sourceKey,
                    UpdatedUser = updatedUser
                });
            }
        }

        public void DeleteMissing(string pageCode, int templateId, IEnumerable<string> keepFieldNames)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var keep = (keepFieldNames ?? new string[0]).Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
                if (keep.Count == 0)
                {
                    connection.Execute(
                        "DELETE FROM t_print_field_mappings WHERE page_code = @PageCode AND template_id = @TemplateId",
                        new { PageCode = pageCode, TemplateId = templateId }
                    );
                    return;
                }

                // DapperのIN展開
                connection.Execute(@"
                    DELETE FROM t_print_field_mappings
                    WHERE page_code = @PageCode AND template_id = @TemplateId AND field_name NOT IN @Keep
                ", new { PageCode = pageCode, TemplateId = templateId, Keep = keep });
            }
        }
    }
}

