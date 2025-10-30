using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Models.DTOs
{
    public class ContentTypeListDto
    {
        [JsonProperty("contentTypeId")]
        public int ContentTypeId { get; set; }

        [JsonProperty("contentName")]
        public string ContentName { get; set; }
    }
}