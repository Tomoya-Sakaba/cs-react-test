using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.DTOs
{
    public class ContentTypeDto
    {
        [JsonProperty("ContentTypeId")]
        public int content_type_id { get; set; }

        [JsonProperty("ContentName")]
        public string content_name { get; set; }
    }
}