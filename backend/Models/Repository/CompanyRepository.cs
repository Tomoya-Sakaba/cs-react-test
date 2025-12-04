using backend.Models.Entities;
using Dapper;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;

namespace backend.Models.Repository
{
    public class CompanyRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;

        public List<CompanyEntity> GetAllCompanies()
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                const string sql = @"
                    SELECT
                        company_id   AS CompanyId,
                        company_name AS CompanyName,
                        bg_color     AS BgColor,
                        type         AS Type,
                        def_time     AS DefTime
                    FROM dbo.m_company
                    ORDER BY company_id;
                ";

                return db.Query<CompanyEntity>(sql).ToList();
            }
        }
    }
}


