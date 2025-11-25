using System;

namespace backend.Models.Entity
{
    public class ApprovalEntity
    {
        public string ApprovalId { get; set; } // nvarchar(4): 4桁の文字列（例："0101"）
        public string ReportNo { get; set; }
        public string UserName { get; set; }
        public int FlowOrder { get; set; }
        public int Status { get; set; }
        public string Comment { get; set; }
        public DateTime? ActionDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

