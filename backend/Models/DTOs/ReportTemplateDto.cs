using System;
using System.Collections.Generic;

namespace backend.Models.DTOs
{
    /// <summary>
    /// テンプレート情報DTO
    /// </summary>
    public class ReportTemplateDto
    {
        public int TemplateId { get; set; }
        public string TemplateName { get; set; }
        public string TemplateCode { get; set; }
        public string Description { get; set; }
        public string FileName { get; set; }
        public string FilePath { get; set; }
        public string FileHash { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedUser { get; set; }
        public List<TemplateFieldDto> Fields { get; set; }
    }

    /// <summary>
    /// テンプレートフィールド定義DTO
    /// </summary>
    public class TemplateFieldDto
    {
        public int FieldId { get; set; }
        public int TemplateId { get; set; }
        public string FieldName { get; set; }
        public string FieldLabel { get; set; }
        public string FieldType { get; set; }
        public string CellAddress { get; set; }
        public int? RowNumber { get; set; }
        public int? ColumnNumber { get; set; }
        public string Options { get; set; }
        public bool IsRequired { get; set; }
        public string ValidationRule { get; set; }
        public string DefaultValue { get; set; }
        public int DisplayOrder { get; set; }
    }

    /// <summary>
    /// テンプレートアップロードリクエストDTO
    /// </summary>
    public class TemplateUploadRequestDto
    {
        public string TemplateName { get; set; }
        public string TemplateCode { get; set; }
        public string Description { get; set; }
    }

    /// <summary>
    /// テンプレート一覧用DTO
    /// </summary>
    public class TemplateListItemDto
    {
        public int TemplateId { get; set; }
        public string TemplateName { get; set; }
        public string TemplateCode { get; set; }
        public string Description { get; set; }
        public int FieldCount { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedUser { get; set; }
    }
}

