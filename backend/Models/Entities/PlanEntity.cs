using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.Entities
{
    public class PlanEntity
    {
        public DateTime Date { get; set; }
        public int ContentTypeId { get; set; }
        public int? Company { get; set; }
        public decimal? Vol { get; set; }
        public string Time { get; set; }
        public int Version { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedUser { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string UpdatedUser { get; set; }
    }
}