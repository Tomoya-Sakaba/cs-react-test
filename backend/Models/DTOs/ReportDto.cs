using System;
using System.Collections.Generic;

namespace backend.Models.DTOs
{
    /// <summary>
    /// 報告書情報DTO
    /// </summary>
    public class ReportDto
    {
        public int ReportId { get; set; }
        public int TemplateId { get; set; }
        public string ReportNo { get; set; }
        public string ReportData { get; set; } // JSON
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedUser { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string UpdatedUser { get; set; }
    }

    /// <summary>
    /// 報告書作成リクエストDTO
    /// </summary>
    public class CreateReportRequestDto
    {
        public int TemplateId { get; set; }
        public Dictionary<string, object> Data { get; set; }
        public string CreatedUser { get; set; }
    }

    /// <summary>
    /// 報告書更新リクエストDTO
    /// </summary>
    public class UpdateReportRequestDto
    {
        public Dictionary<string, object> Data { get; set; }
        public string Status { get; set; }
        public string UpdatedUser { get; set; }
    }

    /// <summary>
    /// 報告書一覧アイテムDTO
    /// </summary>
    public class ReportListItemDto
    {
        public int ReportId { get; set; }
        public string ReportNo { get; set; }
        public int TemplateId { get; set; }
        public string TemplateName { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedUser { get; set; }
    }

    /// <summary>
    /// 報告書詳細DTO
    /// </summary>
    public class ReportDetailDto
    {
        public int ReportId { get; set; }
        public string ReportNo { get; set; }
        public int TemplateId { get; set; }
        public string TemplateName { get; set; }
        public Dictionary<string, object> Data { get; set; }
        public string Status { get; set; }
        public List<ReportImageDto> Images { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedUser { get; set; }
    }

    /// <summary>
    /// 報告書画像DTO
    /// </summary>
    public class ReportImageDto
    {
        public int ImageId { get; set; }
        public int ReportId { get; set; }
        public string FileName { get; set; }
        public string FilePath { get; set; }
        public string Caption { get; set; }
        public int DisplayOrder { get; set; }
        public List<ImageAnnotationDto> Annotations { get; set; }
    }

    /// <summary>
    /// 画像注釈DTO
    /// </summary>
    public class ImageAnnotationDto
    {
        public int AnnotationId { get; set; }
        public int ImageId { get; set; }
        public string AnnotationType { get; set; }
        public string AnnotationData { get; set; } // JSON
    }

    /// <summary>
    /// 報告書検索リクエストDTO
    /// </summary>
    public class ReportSearchRequestDto
    {
        public string Status { get; set; }
        public string CreatedUser { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public int Page { get; set; } = 1;
        public int Limit { get; set; } = 20;
    }

    /// <summary>
    /// 報告書検索結果DTO
    /// </summary>
    public class ReportSearchResultDto
    {
        public int Total { get; set; }
        public int Page { get; set; }
        public int Limit { get; set; }
        public List<ReportListItemDto> Items { get; set; }
    }
}
