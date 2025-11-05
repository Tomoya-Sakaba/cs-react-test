using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.DTOs
{
    public class PlanRecordDto
    {
        public DateTime date { get; set; }
        public int content_type_id { get; set; }
        public int? company { get; set; }
        public decimal? vol { get; set; }
        public TimeSpan? time { get; set; }
        public int version { get; set; }
        public string note_text { get; set; }
    }
}