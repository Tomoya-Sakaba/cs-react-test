using System;

namespace backend.Models.Entities
{
    public class KoujiEntity
    {
        public int KoujiId { get; set; }
        public string KoujiName { get; set; }
        public int CycleYears { get; set; }
        public int CycleTimes { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class KoujiMonthlyEntity
    {
        public int KoujiMonthlyId { get; set; }
        public int KoujiId { get; set; }
        public int Yyyymm { get; set; }
        public decimal Amount { get; set; }
        public byte Type { get; set; } // 0=budget, 1=actual
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

