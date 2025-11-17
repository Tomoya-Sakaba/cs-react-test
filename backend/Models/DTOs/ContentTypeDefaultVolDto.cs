using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.DTOs
{
    public class ContentTypeDefaultVolDto
    {
        [JsonProperty("id")]
        public int Id { get; set; }

        [JsonProperty("contentTypeId")]
        public int ContentTypeId { get; set; }

        [JsonProperty("defVol")]
        public decimal? DefVol { get; set; }
    }
}

