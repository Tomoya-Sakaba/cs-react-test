using backend.Models.DTOs;
using Dapper;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;

namespace backend.Models.Repository
{
    public class PlanRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;

        public List<PlanRecordDto> GetAllPlanRecords()
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                SELECT 
                    p.date,
                    p.content_type_id,
                    p.company,
                    p.vol,
                    p.time,
                    n.note_text
                FROM t_plan p
                LEFT JOIN note n ON n.note_date = p.date
                ORDER BY p.date, p.content_type_id
            ";

                return db.Query<PlanRecordDto>(sql).ToList();
            }
        }

        public List<ContentTypeDto> GetAllContentTypes()
        {
            using(IDbConnection db = new SqlConnection(connectionString))
            {
                string sql = @"
                SELECT 
                    content_type_id,
                    content_name
                FROM content_type
            ";

                return db.Query<ContentTypeDto>(sql).ToList();
            }
        }
    }
}