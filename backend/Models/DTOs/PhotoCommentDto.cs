using System;

namespace backend.Models.DTOs
{
    public class PhotoCommentDto
    {
        public int Id { get; set; }
        public string FileName { get; set; }
        public string Comment { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

