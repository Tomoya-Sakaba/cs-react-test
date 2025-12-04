using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.Entities
{
    public class CompanyEntity
    {
        public int CompanyId { get; set; }
        public string CompanyName { get; set; }
        public string BgColor { get; set; }
        public int Type { get; set; }
        public TimeSpan? DefTime { get; set; }
    }
}