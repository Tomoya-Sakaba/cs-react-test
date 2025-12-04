using Newtonsoft.Json;

namespace backend.Models.DTOs
{
    public class CompanyDto
    {
        [JsonProperty("companyId")]
        public int CompanyId { get; set; }

        [JsonProperty("companyName")]
        public string CompanyName { get; set; }

        [JsonProperty("bgColor")]
        public string BgColor { get; set; }

        [JsonProperty("type")]
        public int Type { get; set; }

        [JsonProperty("defTime")]
        public string DefTime { get; set; }
    }
}


