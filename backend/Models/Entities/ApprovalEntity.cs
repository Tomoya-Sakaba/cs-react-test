using System;

namespace backend.Models.Entity
{
    public class ApprovalEntity
    {
        public int Id { get; set; }
        public string ReportNo { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public string UserName { get; set; }
        public int FlowOrder { get; set; }
        public int Status { get; set; }
        public string Comment { get; set; }
        public DateTime? ActionDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

