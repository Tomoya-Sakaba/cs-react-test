using backend.Models.DTOs;
using backend.Models.Repository;
using System.Collections.Generic;
using System.Linq;

namespace backend.Services
{
    public class CompanyService
    {
        private readonly CompanyRepository _repository = new CompanyRepository();

        public List<CompanyDto> GetCompanyList()
        {
            var entities = _repository.GetAllCompanies();
            return entities.Select(e => new CompanyDto
            {
                CompanyId = e.CompanyId,
                CompanyName = e.CompanyName,
                BgColor = e.BgColor,
                Type = e.Type,
                // time 型 (TimeSpan?) を "HH:mm" 文字列に変換（NULL はそのまま null を返す）
                DefTime = e.DefTime.HasValue
                    ? e.DefTime.Value.ToString(@"h\:mm")
                    : null
            }).ToList();
        }
    }
}


