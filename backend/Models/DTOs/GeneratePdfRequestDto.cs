using System.Collections.Generic;

namespace backend.Models.DTOs
{
    public class GeneratePdfRequestDto
    {
        public int TemplateId { get; set; }
        public string FileName { get; set; }
        public Dictionary<string, object> Data { get; set; }
    }
}

