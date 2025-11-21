using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.DTOs
{
    public class PlanRecordDto
    {
        public DateTime Date { get; set; }
        public int ContentTypeId { get; set; }
        public int? Company { get; set; }
        public decimal? Vol { get; set; }
        public TimeSpan? Time { get; set; }
        public int Version { get; set; }
        public string NoteText { get; set; }
    }
}