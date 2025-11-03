using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.DTOs
{
    public class TestPlanHistoryDto
    {
        [JsonProperty("date")]
        public string Date { get; set; }

        [JsonProperty("contentType")]
        public Dictionary<int, TestItemHistory> ContentType { get; set; }

        [JsonProperty("note")]
        public string Note { get; set; }
    }
}