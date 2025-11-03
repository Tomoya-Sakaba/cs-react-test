using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.DTOs
{
    public class TestItemHistory
    {
        [JsonProperty("company")]
        public int Company { get; set; }

        [JsonProperty("vol")]
        public decimal Vol { get; set; }

        [JsonProperty("time")]
        public string Time { get; set; }

        [JsonProperty("isChanged")]
        public bool IsChanged { get; set; }
    }

}