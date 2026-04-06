using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using Dapper;
using backend_print.Models.Entities;

namespace backend_print.Models.Repository
{
    public class EquipmentRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;

        public EquipmentEntity GetById(int equipmentId)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                var sql = @"
                    SELECT
                        equipment_id AS EquipmentId,
                        equipment_code AS EquipmentCode,
                        equipment_name AS EquipmentName,
                        category AS Category,
                        manufacturer AS Manufacturer,
                        model AS Model,
                        location AS Location,
                        note AS Note,
                        is_active AS IsActive,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt
                    FROM dbo.m_equipment
                    WHERE equipment_id = @EquipmentId;
                ";
                return db.QuerySingleOrDefault<EquipmentEntity>(sql, new { EquipmentId = equipmentId });
            }
        }
    }
}

