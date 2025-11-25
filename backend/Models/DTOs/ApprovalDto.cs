using System;
using Newtonsoft.Json;

namespace backend.Models.DTOs
{
    public class ApprovalDto
    {
        [JsonProperty("approvalId")]
        public string ApprovalId { get; set; } // nvarchar(4): 4桁の文字列（例："0101"）

        [JsonProperty("reportNo")]
        public string ReportNo { get; set; }

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
        public string ReportNo { get; set; } // 必須

        [JsonProperty("approvalId")]
        public string ApprovalId { get; set; } // 必須（4桁の文字列、例："0101"）

        [JsonProperty("comment")]
        public string Comment { get; set; }

        [JsonProperty("approverNames")]
        public string[] ApproverNames { get; set; }

        [JsonProperty("submitterName")]
        public string SubmitterName { get; set; }
    }

    public class ApproveRequest
    {
        [JsonProperty("approvalId")]
        public string ApprovalId { get; set; } // nvarchar(4)

        [JsonProperty("reportNo")]
        public string ReportNo { get; set; }

        [JsonProperty("flowOrder")]
        public int FlowOrder { get; set; }

        [JsonProperty("userName")]
        public string UserName { get; set; }

        [JsonProperty("comment")]
        public string Comment { get; set; }
    }

    public class RejectRequest
    {
        [JsonProperty("approvalId")]
        public string ApprovalId { get; set; } // nvarchar(4)

        [JsonProperty("reportNo")]
        public string ReportNo { get; set; }

        [JsonProperty("flowOrder")]
        public int FlowOrder { get; set; }

        [JsonProperty("userName")]
        public string UserName { get; set; }

        [JsonProperty("comment")]
        public string Comment { get; set; } // 必須
    }

    public class RecallApprovalRequest
    {
        [JsonProperty("approvalId")]
        public string ApprovalId { get; set; } // nvarchar(4)

        [JsonProperty("reportNo")]
        public string ReportNo { get; set; }

        [JsonProperty("flowOrder")]
        public int FlowOrder { get; set; }

        [JsonProperty("userName")]
        public string UserName { get; set; }
    }
}

