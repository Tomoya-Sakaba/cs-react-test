using backend.Models.DTOs;
using backend.Models.Repository;
using System.Collections.Generic;

namespace backend.Services
{
    public class CompanyService
    {
        private readonly CompanyRepository _repository = new CompanyRepository();

        public List<CompanyDto> GetCompanyList()
        {
            return _repository.GetAllCompanies();
        }
    }
}


