using System;

namespace backend.Models
{
    /// <summary>
    /// ヘッダー定義モデル
    /// </summary>
    public class HeaderDefinition
    {
        public int HeaderId { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public int Version { get; set; }
        public bool IsSpecialDay { get; set; }
        public int HeaderOrder { get; set; }
        public string WasteType { get; set; }
        public int TypeSequence { get; set; }
        public string DisplayName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// 計画データモデル
    /// </summary>
    public class PlanData
    {
        public int PlanId { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public int Version { get; set; }
        public DateTime Date { get; set; }
        public bool IsSpecialDay { get; set; }
        public int HeaderId { get; set; }
        public string WasteType { get; set; }
        public int TypeSequence { get; set; }
        public int? CompanyId { get; set; }
        public decimal? Vol { get; set; }
        public TimeSpan? PlannedTime { get; set; }
        public string Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// 実績データモデル
    /// </summary>
    public class ActualData
    {
        public int ActualId { get; set; }
        public DateTime Date { get; set; }
        public TimeSpan ActualTime { get; set; }
        public string WasteType { get; set; }
        public int? CompanyId { get; set; }
        public decimal? Vol { get; set; }
        public string Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// 計画と実績の突合結果モデル
    /// </summary>
    public class PlanActualMatch
    {
        public DateTime Date { get; set; }
        public string WasteType { get; set; }
        public int TypeSequence { get; set; }
        public string HeaderName { get; set; }
        public int? PlanCompanyId { get; set; }
        public decimal? PlanVol { get; set; }
        public TimeSpan? PlannedTime { get; set; }
        public TimeSpan? ActualTime { get; set; }
        public int? ActualCompanyId { get; set; }
        public decimal? ActualVol { get; set; }
        public string Status { get; set; }
        public int? TimeDiffMinutes { get; set; }
    }
}

