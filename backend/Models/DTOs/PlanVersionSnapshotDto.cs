using System;

namespace backend.Models.DTOs
{
    public class PlanVersionSnapshotDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public int CurrentVersion { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedUser { get; set; }
    }
}

