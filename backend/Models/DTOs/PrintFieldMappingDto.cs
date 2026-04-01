namespace backend.Models.DTOs
{
    public class PrintFieldMappingDto
    {
        public string PageCode { get; set; }
        public int TemplateId { get; set; }
        public string FieldName { get; set; }
        public string SourceKey { get; set; }
        public string UpdatedUser { get; set; }
    }
}

