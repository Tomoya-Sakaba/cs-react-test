using System.Collections.Generic;
using System.Linq;
using backend.Models.DTOs;
using backend.Models.Repository;

namespace backend.Services
{
    public class PhotoCommentService
    {
        private readonly PhotoCommentRepository _repo = new PhotoCommentRepository();

        public List<PhotoCommentDto> GetAll()
        {
            return _repo.GetAll()
                .Select(x => new PhotoCommentDto
                {
                    Id = x.Id,
                    FileName = x.FileName,
                    Comment = x.Comment,
                    CreatedAt = x.CreatedAt,
                })
                .ToList();
        }

        public PhotoCommentDto GetById(int id)
        {
            var x = _repo.GetById(id);
            if (x == null) return null;

            return new PhotoCommentDto
            {
                Id = x.Id,
                FileName = x.FileName,
                Comment = x.Comment,
                CreatedAt = x.CreatedAt,
            };
        }

        public PhotoCommentDto Create(string fileName, string comment)
        {
            var created = _repo.Create(fileName, comment);
            return new PhotoCommentDto
            {
                Id = created.Id,
                FileName = created.FileName,
                Comment = created.Comment,
                CreatedAt = created.CreatedAt,
            };
        }
    }
}

