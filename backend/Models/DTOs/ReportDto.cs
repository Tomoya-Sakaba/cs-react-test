using System;
using Newtonsoft.Json;

namespace backend.Models.DTOs
{
    public class ReportDto
    {
        [JsonProperty("id")]
        public int Id { get; set; }

        [JsonProperty("reportNo")]
        public string ReportNo { get; set; }

        [JsonProperty("title")]
        public string Title { get; set; }

        [JsonProperty("content")]
        public string Content { get; set; }

        [JsonProperty("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonProperty("createdUser")]
        public string CreatedUser { get; set; }

        [JsonProperty("updatedAt")]
        public DateTime UpdatedAt { get; set; }

        [JsonProperty("updatedUser")]
        public string UpdatedUser { get; set; }
    }

    public class CreateReportRequest
    {
        [JsonProperty("title")]
        public string Title { get; set; }

        [JsonProperty("content")]
        public string Content { get; set; }

        [JsonProperty("fiscalYearStartMonth")]
        public int? FiscalYearStartMonth { get; set; }

        [JsonProperty("reportNoPrefix")]
        public string ReportNoPrefix { get; set; }
    }

    public class UpdateReportRequest
    {
        [JsonProperty("reportNo")]
        public string ReportNo { get; set; }

        [JsonProperty("title")]
        public string Title { get; set; }

        [JsonProperty("content")]
        public string Content { get; set; }
    }
}

