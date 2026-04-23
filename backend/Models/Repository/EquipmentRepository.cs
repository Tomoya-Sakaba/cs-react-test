using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using Dapper;
using backend.Models.Entities;

namespace backend.Models.Repository
{
    public class EquipmentRepository
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;

        public List<EquipmentEntity> GetAll(bool includeInactive = false)
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
                    WHERE (@IncludeInactive = 1 OR is_active = 1)
                    ORDER BY equipment_id;
                ";
                return db.Query<EquipmentEntity>(sql, new { IncludeInactive = includeInactive ? 1 : 0 }).ToList();
            }
        }

        public EquipmentEntity GetById(int reportNo)
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

                    SELECT
                        equipment_id AS EquipmentId,
                        picture_tab AS PictureTab,
                        picture_no AS PictureNo,
                        picture_path AS PicturePath,
                        picture_comments AS PictureComments,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt
                    FROM dbo.t_pictures
                    WHERE equipment_id = @EquipmentId
                    ORDER BY picture_tab, picture_no;
                ";
                using (var multi = db.QueryMultiple(sql, new { EquipmentId = reportNo }))
                {
                    var equipment = multi.ReadSingleOrDefault<EquipmentEntity>();
                    if (equipment == null) return null;

                    equipment.Pictures = multi.Read<EquipmentPictureEntity>().ToList();
                    equipment.PicturesSubParts = new List<EquipmentPictureEntity>();
                    return equipment;
                }
            }
        }

        /// <summary>
        /// 印刷（GemBox）用に、機器の単票データを snake_case キーの辞書で返す。
        /// DTO/Entity のプロパティ名に依存せず、マッピングJSONの dbColumn と 1:1 で対応させる目的。
        /// </summary>
        public Dictionary<string, object> GetEquipmentMasterScalarRow(int equipmentId)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                var sql = @"
                    SELECT
                        e.equipment_id   AS equipment_id,
                        e.equipment_code AS equipment_code,
                        e.equipment_name AS equipment_name,
                        e.category       AS category,
                        e.manufacturer   AS manufacturer,
                        e.model          AS model,
                        e.location       AS location,
                        e.note           AS note,
                        e.updated_at     AS updated_at,
                        u.name         AS created_user_name
                    FROM dbo.m_equipment e
                    LEFT JOIN dbo.t_users u ON u.id = e.created_user_id
                    WHERE e.equipment_id = @EquipmentId;
                ";

                var row = db.QuerySingleOrDefault(sql, new { EquipmentId = equipmentId });
                if (row == null) return null;

                // DapperRow は IDictionary<string, object> として扱える
                var dict = (IDictionary<string, object>)row;
                return new Dictionary<string, object>(dict, System.StringComparer.OrdinalIgnoreCase);
            }
        }

        public void Update(EquipmentEntity entity)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                var sql = @"
                    UPDATE dbo.m_equipment
                    SET
                        equipment_name = @EquipmentName,
                        category = @Category,
                        manufacturer = @Manufacturer,
                        model = @Model,
                        location = @Location,
                        note = @Note,
                        is_active = @IsActive,
                        updated_at = GETDATE()
                    WHERE equipment_id = @EquipmentId;
                ";
                db.Execute(sql, entity);
            }
        }
    }
}

