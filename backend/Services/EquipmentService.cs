using System.Collections.Generic;
using System.Linq;
using backend.Models.DTOs;
using backend.Models.Repository;

namespace backend.Services
{
    public class EquipmentService
    {
        private readonly EquipmentRepository _repository = new EquipmentRepository();

        public List<EquipmentDto> GetList(bool includeInactive = false)
        {
            var entities = _repository.GetAll(includeInactive);
            return entities.Select(e => new EquipmentDto
            {
                ReportNo = e.EquipmentId,
                EquipmentCode = e.EquipmentCode,
                EquipmentName = e.EquipmentName,
                Category = e.Category,
                Manufacturer = e.Manufacturer,
                Model = e.Model,
                Location = e.Location,
                Note = e.Note,
                IsActive = e.IsActive,
                UpdatedAt = e.UpdatedAt.ToString("o")
            }).ToList();
        }

        public EquipmentDto Get(int reportNo)
        {
            var e = _repository.GetById(reportNo);
            if (e == null) return null;
            return new EquipmentDto
            {
                ReportNo = e.EquipmentId,
                EquipmentCode = e.EquipmentCode,
                EquipmentName = e.EquipmentName,
                Category = e.Category,
                Manufacturer = e.Manufacturer,
                Model = e.Model,
                Location = e.Location,
                Note = e.Note,
                IsActive = e.IsActive,
                UpdatedAt = e.UpdatedAt.ToString("o")
            };
        }

        public EquipmentDto Update(int reportNo, UpdateEquipmentRequestDto req)
        {
            var existing = _repository.GetById(reportNo);
            if (existing == null) return null;

            existing.EquipmentName = req.EquipmentName ?? existing.EquipmentName;
            existing.Category = req.Category ?? existing.Category;
            existing.Manufacturer = req.Manufacturer;
            existing.Model = req.Model;
            existing.Location = req.Location;
            existing.Note = req.Note;
            if (req.IsActive.HasValue) existing.IsActive = req.IsActive.Value;

            _repository.Update(existing);
            return Get(reportNo);
        }
    }
}

