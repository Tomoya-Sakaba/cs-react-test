namespace backend.Models.DTOs
{
    public class EquipmentDto
    {
        public int EquipmentId { get; set; }
        public string EquipmentCode { get; set; }
        public string EquipmentName { get; set; }
        public string Category { get; set; }
        public string Manufacturer { get; set; }
        public string Model { get; set; }
        public string Location { get; set; }
        public string Note { get; set; }
        public string UpdatedAt { get; set; }
        public bool IsActive { get; set; }
    }
}

