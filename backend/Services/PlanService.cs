using backend.Models.DTOs;
using backend.Models.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace backend.Services
{
    public class PlanService
    {
        private readonly PlanRepository _repository = new PlanRepository();

        public List<TestPlanDto> GetPlanData()
        {
            // 生データ取得
            var rawData = _repository.GetAllPlanRecords();

            // content_type テーブルから全タイプを取得
            var allContentTypes = _repository.GetAllContentTypes(); // List<ContentTypeDto> の想定

            // 日付ごとにグループ化
            var grouped = rawData
                .GroupBy(r => r.date)
                .Select(g =>
                {
                    // すべての contentType をまず 0 初期化で作る
                    var contentTypeDict = allContentTypes
                        .GroupBy(ct => ct.content_type_id)
                        .Select(grp => grp.First())
                        .ToDictionary(
                            ct => ct.content_type_id,
                            ct => new TestItem { Company = 0, Vol = 0, Time = "" }
                        );

                    // 実際のデータで上書き
                    foreach (var record in g)
                    {
                        contentTypeDict[record.content_type_id] = new TestItem
                        {
                            Company = record.company,
                            Vol = record.vol,
                            Time = record.time
                        };
                    }

                    return new TestPlanDto
                    {
                        Date = g.Key.ToString("yyyy-MM-dd"),
                        ContentType = contentTypeDict,
                        Note = g.FirstOrDefault()?.note_text ?? "",
                    };
                })
                .ToList();

            return grouped;
        }

        public List<ContentTypeListDto> GetContentTypeList()
        {
            var allContentTypes = _repository.GetAllContentTypes();

            var contentType = allContentTypes
                .Select(a =>
                {
                    return new ContentTypeListDto
                    {
                        ContentTypeId = a.content_type_id,
                        ContentName = a.content_name
                    };
                }).
                ToList();
            return contentType;
        }
    }
}