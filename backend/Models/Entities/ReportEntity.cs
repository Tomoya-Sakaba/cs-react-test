using System;

namespace backend.Models.Entity
{
    public class ReportEntity
    {
        public int Id { get; set; }
        public string ReportNo { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedUser { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string UpdatedUser { get; set; }
    }
}

