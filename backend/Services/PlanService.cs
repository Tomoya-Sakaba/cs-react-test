using backend.Models.DTOs;
using backend.Models.Entities;
using backend.Models.Repository;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;

namespace backend.Services
{
    public class PlanService
    {
        private readonly string connectionString = ConfigurationManager.ConnectionStrings["MyDbConnection"].ConnectionString;
        private readonly PlanRepository _repository = new PlanRepository();

        //---------------------------------------------------------------------
        // Planデータの取得（最新のバージョン）
        //---------------------------------------------------------------------
        public List<TestPlanDto> GetPlanData(int year, int month)
        {
            // 生データ取得
            var rawData = _repository.GetAllPlanRecords(year, month);

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


        //---------------------------------------------------------------------
        // バージョニングされたPlanデータの取得
        //---------------------------------------------------------------------
        public List<TestPlanHistoryDto> GetPlanHistoryData(int targetVersion, int year, int month)
        {
            // バージョン指定で履歴付きデータを取得
            var rawData = _repository.GetPlanHistory(targetVersion, year, month);

            // content_type テーブルから全タイプを取得
            var allContentTypes = _repository.GetAllContentTypes();

            // 日付ごとにグループ化
            var grouped = rawData
                .GroupBy(r => r.Date)
                .Select(g =>
                {
                    // すべての contentType をまず初期化（変更フラグも追加）
                    var contentTypeDict = allContentTypes
                        .GroupBy(ct => ct.content_type_id)
                        .Select(grp => grp.First())
                        .ToDictionary(
                            ct => ct.content_type_id,
                            ct => new TestItemHistory
                            {
                                Company = 0,
                                Vol = 0,
                                Time = "",
                                IsChanged = false
                            }
                        );

                    // 実際のデータで上書き
                    foreach (var record in g)
                    {
                        contentTypeDict[record.ContentTypeId] = new TestItemHistory
                        {
                            Company = record.Company,
                            Vol = record.Vol,
                            Time = record.Time,
                            IsChanged = record.IsChanged
                        };
                    }

                    return new TestPlanHistoryDto
                    {
                        Date = g.Key.ToString("yyyy-MM-dd"),
                        ContentType = contentTypeDict,
                        Note = g.FirstOrDefault()?.NoteText ?? "",
                    };
                })
                .ToList();

            return grouped;
        }

        //---------------------------------------------------------------------
        // ContentTypeをすべて取得
        //---------------------------------------------------------------------
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
        //---------------------------------------------------------------------
        // 新規登録処理
        //---------------------------------------------------------------------
        public void CreateNewPlans(List<TestPlanDto> plans, string userName)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                db.Open();
                using (var tran = db.BeginTransaction())
                {
                    try
                    {
                        foreach (var plan in plans)
                        {
                            // --- note 登録 ---
                            if (!string.IsNullOrEmpty(plan.Note))
                            {
                                _repository.InsertNote(db, tran, plan.Date, plan.Note, userName);
                            }

                            // --- t_plan 登録 ---
                            foreach (var content in plan.ContentType)
                            {
                                var contentTypeId = content.Key;
                                var item = content.Value;

                                var planEntity = new PlanEntity
                                {
                                    Date = DateTime.Parse(plan.Date),
                                    ContentTypeId = contentTypeId,
                                    Company = item.Company,
                                    Vol = item.Vol,
                                    Time = item.Time,
                                    Version = 1,
                                    IsActive = true,
                                    CreatedAt = DateTime.Now,
                                    CreatedUser = userName,
                                    UpdatedAt = DateTime.Now,
                                    UpdatedUser = userName
                                };

                                _repository.InsertPlan(db, tran, planEntity);
                            }
                        }
                        tran.Commit();
                    }
                    catch (Exception ex)
                    {
                        tran.Rollback();
                        throw;
                    }
                }
            }
        }

        //---------------------------------------------------------------------
        // 保存処理
        //---------------------------------------------------------------------
        public void SavePlans(List<TestPlanDto> plans)
        {
            try
            {
                foreach (var plan in plans)
                {
                    // 1. 既存データをその日の分取得
                    var existingPlans = _repository.GetByDate(DateTime.Parse(plan.Date));

                    // 2. 新データの contentTypeId 一覧
                    var newIds = plan.ContentType.Keys;

                    // 3. 既存データの contentTypeId 一覧
                    var existingIds = existingPlans.Select(x => x.content_type_id);


                    // 4. 更新・挿入対象
                    foreach (var kv in plan.ContentType)
                    {
                        int contentTypeId = kv.Key;
                        var contentItem = kv.Value;


                        if (existingIds.Contains(contentTypeId))
                        {
                            // 既存 → 更新
                            //_repository.Update(DateTime.Parse(plan.Date), contentTypeId, contentItem);
                        }
                        else
                        {
                            // 新規 → 挿入
                            _repository.Insert(DateTime.Parse(plan.Date), contentTypeId, contentItem);
                        }

                    }

                    // 5. 削除対象（今回のデータに含まれないID）
                    var toDeleteIds = existingIds.Except(newIds).ToList();
                    foreach (var deleteId in toDeleteIds)
                    {
                        //_repository.Delete(plan.Date, deleteId);
                    }

                }
            }
            catch
            {
                throw;
            }
        }
    }
}