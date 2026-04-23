using System;
using System.Collections.Generic;

namespace backend.Models.Entities
{
    public class EquipmentEntity
    {
        public int EquipmentId { get; set; }
        public string EquipmentCode { get; set; }
        public string EquipmentName { get; set; }
        public string Category { get; set; }
        public string Manufacturer { get; set; }
        public string Model { get; set; }
        public string Location { get; set; }
        public string Note { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public List<EquipmentPictureEntity> Pictures { get; set; }

        public List<EquipmentPictureEntity> PicturesSubParts { get; set; }

        public UsersEntity CreatedUser { get; set; }
    }

    public class EquipmentPictureEntity
    {
        public int EquipmentId { get; set; }
        public int PictureTab { get; set; }
        public int PictureNo { get; set; }
        public string PicturePath { get; set; }
        public string PictureComments { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

