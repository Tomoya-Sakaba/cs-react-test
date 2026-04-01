namespace backend.Models.DTOs
{
    public class UpdateEquipmentRequestDto
    {
        public string EquipmentName { get; set; }
        public string Category { get; set; }
        public string Manufacturer { get; set; }
        public string Model { get; set; }
        public string Location { get; set; }
        public string Note { get; set; }
        public bool? IsActive { get; set; }
        public string UpdatedUser { get; set; }
    }
}

