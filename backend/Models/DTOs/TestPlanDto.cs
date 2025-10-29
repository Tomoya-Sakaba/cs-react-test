using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI.WebControls;

namespace backend.Models.DTOs
{
    public class TestPlanDto
    {
        public string Date { get; set; }  // "yyyy-MM-dd"
        public Dictionary<int, TestItem> ContentType { get; set; }
        public string Note { get; set; }
    }
}