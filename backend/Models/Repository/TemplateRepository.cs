using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using Dapper;
using backend.Models.DTOs;
using Newtonsoft.Json;

namespace backend.Models.Repository
{
    /// <summary>
    /// テンプレート関連のデータアクセス
    /// </summary>
    public class TemplateRepository
    {
        private readonly string _connectionString;

        public TemplateRepository(string connectionString)
        {
            _connectionString = connectionString;
        }

        /// <summary>
        /// テンプレートを新規登録
        /// </summary>
        public int InsertTemplate(ReportTemplateDto template)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    INSERT INTO t_report_templates 
                    (template_name, template_code, description, file_name, file_path, 
                     file_hash, is_active, created_at, created_user)
                    VALUES 
                    (@TemplateName, @TemplateCode, @Description, @FileName, @FilePath, 
                     @FileHash, @IsActive, GETDATE(), @CreatedUser);
                    SELECT CAST(SCOPE_IDENTITY() as int);";

                return connection.QuerySingle<int>(sql, template);
            }
        }

        /// <summary>
        /// テンプレートフィールドを一括登録
        /// </summary>
        public void InsertTemplateFields(int templateId, List<TemplateFieldDto> fields)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    INSERT INTO t_template_fields 
                    (template_id, field_name, field_label, field_type, cell_address, 
                     row_number, column_number, options, is_required, validation_rule, 
                     default_value, display_order, created_at)
                    VALUES 
                    (@TemplateId, @FieldName, @FieldLabel, @FieldType, @CellAddress, 
                     @RowNumber, @ColumnNumber, @Options, @IsRequired, @ValidationRule, 
                     @DefaultValue, @DisplayOrder, GETDATE())";

                connection.Execute(sql, fields.Select(f => new
                {
                    TemplateId = templateId,
                    f.FieldName,
                    f.FieldLabel,
                    f.FieldType,
                    f.CellAddress,
                    f.RowNumber,
                    f.ColumnNumber,
                    f.Options,
                    f.IsRequired,
                    f.ValidationRule,
                    f.DefaultValue,
                    f.DisplayOrder
                }));
            }
        }

        /// <summary>
        /// テンプレート一覧を取得
        /// </summary>
        public List<TemplateListItemDto> GetTemplateList()
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        t.template_id AS TemplateId,           -- テンプレートID
                        t.template_name AS TemplateName,       -- テンプレート名
                        t.template_code AS TemplateCode,       -- テンプレートコード
                        t.description AS Description,          -- 説明
                        t.is_active AS IsActive,               -- 有効フラグ
                        t.created_at AS CreatedAt,             -- 作成日時
                        t.created_user AS CreatedUser,         -- 作成者
                        COUNT(f.field_id) AS FieldCount        -- フィールド数（集計）
                    FROM t_report_templates t
                    LEFT JOIN t_template_fields f ON t.template_id = f.template_id
                    GROUP BY t.template_id, t.template_name, t.template_code, t.description, 
                            t.is_active, t.created_at, t.created_user
                    ORDER BY t.created_at DESC
";
                return connection.Query<TemplateListItemDto>(sql).ToList();
            }
        }

        /// <summary>
        /// テンプレート詳細を取得（フィールド含む）
        /// </summary>
        public ReportTemplateDto GetTemplateById(int templateId)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        template_id AS TemplateId,
                        template_name AS TemplateName,
                        template_code AS TemplateCode,
                        description AS Description,
                        file_name AS FileName,
                        file_path AS FilePath,
                        is_active AS IsActive,
                        created_at AS CreatedAt,
                        created_user AS CreatedUser
                    FROM t_report_templates
                    WHERE template_id = @TemplateId";

                var template = connection.QuerySingleOrDefault<ReportTemplateDto>(sql, new { TemplateId = templateId });

                if (template != null)
                {
                    template.Fields = GetTemplateFields(templateId);
                }

                return template;
            }
        }

        /// <summary>
        /// テンプレートコードでテンプレートを取得
        /// </summary>
        public ReportTemplateDto GetTemplateByCode(string templateCode)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        template_id AS TemplateId,
                        template_name AS TemplateName,
                        template_code AS TemplateCode,
                        description AS Description,
                        file_name AS FileName,
                        file_path AS FilePath,
                        is_active AS IsActive,
                        created_at AS CreatedAt,
                        created_user AS CreatedUser
                    FROM t_report_templates
                    WHERE template_code = @TemplateCode";

                var template = connection.QuerySingleOrDefault<ReportTemplateDto>(sql, new { TemplateCode = templateCode });

                if (template != null)
                {
                    template.Fields = GetTemplateFields(template.TemplateId);
                }

                return template;
            }
        }

        /// <summary>
        /// テンプレートのフィールド定義を取得
        /// </summary>
        public List<TemplateFieldDto> GetTemplateFields(int templateId)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    SELECT 
                        field_id AS FieldId,
                        template_id AS TemplateId,
                        field_name AS FieldName,
                        field_label AS FieldLabel,
                        field_type AS FieldType,
                        cell_address AS CellAddress,
                        row_number AS RowNumber,
                        column_number AS ColumnNumber,
                        options AS Options,
                        is_required AS IsRequired,
                        validation_rule AS ValidationRule,
                        default_value AS DefaultValue,
                        display_order AS DisplayOrder
                    FROM t_template_fields
                    WHERE template_id = @TemplateId
                    ORDER BY display_order";

                return connection.Query<TemplateFieldDto>(sql, new { TemplateId = templateId }).ToList();
            }
        }

        /// <summary>
        /// テンプレートを更新
        /// </summary>
        public void UpdateTemplate(ReportTemplateDto template)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    UPDATE t_report_templates
                    SET template_name = @TemplateName,
                        description = @Description,
                        is_active = @IsActive,
                        updated_at = GETDATE(),
                        updated_user = @UpdatedUser
                    WHERE template_id = @TemplateId";

                connection.Execute(sql, template);
            }
        }

        /// <summary>
        /// テンプレートを削除（論理削除）
        /// </summary>
        public void DeleteTemplate(int templateId, string deletedUser)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    UPDATE t_report_templates
                    SET is_active = 0,
                        updated_at = GETDATE(),
                        updated_user = @DeletedUser
                    WHERE template_id = @TemplateId";

                connection.Execute(sql, new { TemplateId = templateId, DeletedUser = deletedUser });
            }
        }

        /// <summary>
        /// メタデータを更新
        /// </summary>
        public void UpdateMetadata(int templateId, object metadata)
        {
            using (var connection = new SqlConnection(_connectionString))
            {
                var sql = @"
                    UPDATE t_report_templates
                    SET metadata_json = @MetadataJson,
                        last_parsed_at = GETDATE()
                    WHERE template_id = @TemplateId";

                var metadataJson = JsonConvert.SerializeObject(metadata);
                connection.Execute(sql, new { TemplateId = templateId, MetadataJson = metadataJson });
            }
        }
    }
}

