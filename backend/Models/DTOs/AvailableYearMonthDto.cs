using Newtonsoft.Json;

namespace backend.Models.DTOs
{
    public class AvailableYearMonthDto
    {
        [JsonProperty("year")]
        public int Year { get; set; }

        [JsonProperty("month")]
        public int Month { get; set; }
    }
}

