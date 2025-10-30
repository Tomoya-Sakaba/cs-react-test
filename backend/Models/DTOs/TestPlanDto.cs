using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI.WebControls;

namespace backend.Models.DTOs
{
    public class TestPlanDto
    {
        [JsonProperty("date")]
        public string Date { get; set; }  // "yyyy-MM-dd"

        [JsonProperty("contentType")]
        public Dictionary<int, TestItem> ContentType { get; set; }

        [JsonProperty("note")]
        public string Note { get; set; }
        
    }
}