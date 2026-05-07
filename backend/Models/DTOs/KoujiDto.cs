namespace backend.Models.DTOs
{
    public class KoujiDto
    {
        public int KoujiId { get; set; }
        public string KoujiName { get; set; }
        public int CycleYears { get; set; }
        public int CycleTimes { get; set; }
        public bool IsActive { get; set; }
    }

    public class KoujiMonthlyDto
    {
        public int KoujiId { get; set; }
        public int Yyyymm { get; set; }
        public string Type { get; set; } // "budget" | "actual"
        public decimal Amount { get; set; }
    }

    public class UpsertKoujiMonthlyRequestDto
    {
        public int KoujiId { get; set; }
        public int Yyyymm { get; set; }
        public string Type { get; set; } // "budget" | "actual"
        public decimal Amount { get; set; }
    }
}

