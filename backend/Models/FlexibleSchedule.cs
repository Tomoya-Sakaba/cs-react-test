using System;

namespace backend.Models
{
    /// <summary>
    /// 柔軟な計画スケジュールモデル
    /// 
    /// 【設計思想】
    /// - 1レコード = 1セル（1回の排出）
    /// - date + scheduleOrder + wasteType で一意に識別
    /// - 日によって排出回数（scheduleOrder）を柔軟に変更可能
    /// - 実績との紐付けは date + time + wasteType で行う
    /// </summary>
    public class FlexibleSchedule
    {
        /// <summary>
        /// スケジュールID（主キー）
        /// </summary>
        public int ScheduleId { get; set; }

        /// <summary>
        /// 年
        /// </summary>
        public int Year { get; set; }

        /// <summary>
        /// 月
        /// </summary>
        public int Month { get; set; }

        /// <summary>
        /// バージョン（0=最新、1以降=過去のスナップショット）
        /// </summary>
        public int Version { get; set; }

        /// <summary>
        /// 日付
        /// </summary>
        public DateTime Date { get; set; }

        /// <summary>
        /// その日の何回目の排出か（1, 2, 3...）
        /// </summary>
        public int ScheduleOrder { get; set; }

        /// <summary>
        /// 種別（'廃プラ', '汚泥' など）
        /// </summary>
        public string WasteType { get; set; }

        /// <summary>
        /// 会社ID
        /// </summary>
        public int? CompanyId { get; set; }

        /// <summary>
        /// 量
        /// </summary>
        public decimal? Vol { get; set; }

        /// <summary>
        /// 予定時刻
        /// </summary>
        public TimeSpan? PlannedTime { get; set; }

        /// <summary>
        /// 備考
        /// </summary>
        public string Note { get; set; }

        /// <summary>
        /// 作成日時
        /// </summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// 更新日時
        /// </summary>
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// 実績データモデル（参考）
    /// </summary>
    public class ActualResult
    {
        public int ResultId { get; set; }
        public DateTime Date { get; set; }
        public TimeSpan ActualTime { get; set; }
        public string WasteType { get; set; }
        public int? CompanyId { get; set; }
        public decimal? Vol { get; set; }
        public string Note { get; set; }
    }

    /// <summary>
    /// 月次設定モデル
    /// </summary>
    public class MonthlyScheduleConfig
    {
        public int ConfigId { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public int MaxScheduleCount { get; set; }
    }

    /// <summary>
    /// 種別マスタモデル
    /// </summary>
    public class WasteType
    {
        public int WasteTypeId { get; set; }
        public string WasteTypeName { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
    }
}

