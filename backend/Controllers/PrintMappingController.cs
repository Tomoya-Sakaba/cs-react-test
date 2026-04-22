using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Net;
using System.Web.Http;
using backend.Models.DTOs;
using backend.Models.Repository;

namespace backend.Controllers
{
    [RoutePrefix("api/print-mapping")]
    public class PrintMappingController : ApiController
    {
        private readonly string _cs;
        private readonly PrintFieldMappingRepository _mappingRepo;

        public PrintMappingController()
        {
            _cs = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;
            _mappingRepo = new PrintFieldMappingRepository(_cs);
        }

        [HttpGet]
        [Route("pages/{pageCode}/templates/{templateId:int}")]
        public IHttpActionResult GetMappings(string pageCode, int templateId)
        {
            try
            {
                var mappings = _mappingRepo.GetMappings(pageCode, templateId);
                return Ok(mappings);
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new { message = ex.Message });
            }
        }

        public class UpsertRequest
        {
            public string UpdatedUser { get; set; }
            public Dictionary<string, string> Mappings { get; set; }
        }

        [HttpPut]
        [Route("pages/{pageCode}/templates/{templateId:int}")]
        public IHttpActionResult PutMappings(string pageCode, int templateId, [FromBody] UpsertRequest body)
        {
            try
            {
                if (body == null) return BadRequest("body is required");
                var updatedUser = string.IsNullOrWhiteSpace(body.UpdatedUser) ? "System" : body.UpdatedUser;
                var mappings = body.Mappings ?? new Dictionary<string, string>();

                foreach (var kv in mappings)
                {
                    if (string.IsNullOrWhiteSpace(kv.Key)) continue;
                    if (string.IsNullOrWhiteSpace(kv.Value)) continue;
                    _mappingRepo.Upsert(pageCode, templateId, kv.Key.Trim(), kv.Value.Trim(), updatedUser);
                }

                // 送られてこなかったfield_nameは削除（UX的に「現在の定義が正」）
                _mappingRepo.DeleteMissing(pageCode, templateId, mappings.Keys);

                return Ok(new { message = "updated" });
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new { message = ex.Message });
            }
        }

        [HttpGet]
        [Route("pages/{pageCode}/sources")]
        public IHttpActionResult GetSources(string pageCode)
        {
            // 現段階は equipment_master のみ対応（今後ページ追加で拡張）
            if (pageCode != "equipment_master")
            {
                return Ok(new { scalar = new object[0], tables = new object[0] });
            }

            var scalar = new[]
            {
                new { key = "equipment.reportNo", label = "機器ID" },
                new { key = "equipment.equipmentCode", label = "機器コード" },
                new { key = "equipment.equipmentName", label = "機器名" },
                new { key = "equipment.category", label = "カテゴリ" },
                new { key = "equipment.manufacturer", label = "メーカー" },
                new { key = "equipment.model", label = "型式" },
                new { key = "equipment.location", label = "設置場所" },
                new { key = "equipment.note", label = "備考" },
                new { key = "system.printDate", label = "出力日" },
                new { key = "equipment.updatedAt", label = "更新日時" },
            };

            var tables = new[]
            {
                new
                {
                    key = "history",
                    label = "履歴（明細）",
                    columns = new[]
                    {
                        new { key = "history.date", label = "日付" },
                        new { key = "history.action", label = "区分" },
                        new { key = "history.note", label = "備考" },
                    }
                }
            };

            return Ok(new { scalar, tables });
        }
    }
}

