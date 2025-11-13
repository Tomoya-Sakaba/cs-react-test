using System;
using Newtonsoft.Json;

namespace backend.Models.DTOs
{
    public class ApprovalDto
    {
        [JsonProperty("id")]
        public int Id { get; set; }

        [JsonProperty("reportNo")]
        public string ReportNo { get; set; }

        [JsonProperty("year")]
        public int Year { get; set; }

        [JsonProperty("month")]
        public int Month { get; set; }

        [JsonProperty("userName")]
        public string UserName { get; set; }

        [JsonProperty("flowOrder")]
        public int FlowOrder { get; set; }

        [JsonProperty("status")]
        public int Status { get; set; }

        [JsonProperty("comment")]
        public string Comment { get; set; }

        [JsonProperty("actionDate")]
        public DateTime? ActionDate { get; set; }

        [JsonProperty("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonProperty("updatedAt")]
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateApprovalRequest
    {
        [JsonProperty("reportNo")]
        public string ReportNo { get; set; }

        [JsonProperty("year")]
        public int Year { get; set; }

        [JsonProperty("month")]
        public int Month { get; set; }

        [JsonProperty("comment")]
        public string Comment { get; set; }

        [JsonProperty("approverNames")]
        public string[] ApproverNames { get; set; }

        [JsonProperty("submitterName")]
        public string SubmitterName { get; set; }
    }

    public class ApprovalActionRequest
    {
        [JsonProperty("id")]
        public int Id { get; set; }

        [JsonProperty("reportNo")]
        public string ReportNo { get; set; }

        [JsonProperty("year")]
        public int Year { get; set; }

        [JsonProperty("month")]
        public int Month { get; set; }

        [JsonProperty("userName")]
        public string UserName { get; set; }

        [JsonProperty("action")]
        public string Action { get; set; } // "approve" or "reject"

        [JsonProperty("comment")]
        public string Comment { get; set; }
    }
}

