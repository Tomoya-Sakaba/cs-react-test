using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.DTOs
{
    public class PlanHistoryDto
    {
        public DateTime date { get; set; }
        public int content_type_id { get; set; }
        public int? company { get; set; }
        public decimal? vol { get; set; }
        public TimeSpan? Time { get; set; }
        public int version { get; set; }
        public bool is_active { get; set; }
        public bool is_changed { get; set; }
        public string note_text { get; set; }
    }
}