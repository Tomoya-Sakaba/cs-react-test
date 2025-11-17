using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.DTOs
{
    public class ContentTypeDefaultTimeDto
    {
        [JsonProperty("id")]
        public int Id { get; set; }

        [JsonProperty("contentTypeId")]
        public int ContentTypeId { get; set; }

        [JsonProperty("dayType")]
        public string DayType { get; set; }

        [JsonProperty("defTime")]
        public string DefTime { get; set; }
    }
}

