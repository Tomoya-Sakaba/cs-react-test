using System;

namespace backend.Models.Entities
{
    /// <summary>
    /// t_results テーブルのエンティティ
    /// </summary>
    public class ResultEntity
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public TimeSpan? Time { get; set; }
        public int ContentTypeId { get; set; }
        public decimal? Vol { get; set; }
        public int? CompanyId { get; set; }
        public string CompanyName { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedUser { get; set; }
    }
}

