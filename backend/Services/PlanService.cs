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
                            ct => new TestItem { Company = 0, Vol = 0, Time = "", Version = 0 }
                        );

                    // 実際のデータで上書き
                    foreach (var record in g)
                    {
                        contentTypeDict[record.content_type_id] = new TestItem
                        {
                            Company = record.company,
                            Vol = record.vol,
                            Time = record.time,
                            Version = record.version
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

        bool IsSame(PlanRecordDto existing, TestItem newItem)
        {
            return existing.company == newItem.Company
                && existing.vol == newItem.Vol
                && existing.time == newItem.Time;
        }

        //---------------------------------------------------------------------
        // 保存処理
        //---------------------------------------------------------------------
        public void SavePlans(List<TestPlanDto> plans)
        {
            try
            {
                // 本リクエストの共通 version を取得
                var firstPlan = plans.First();
                var date = DateTime.Parse(firstPlan.Date);
                int year = date.Year;
                int month = date.Month;

                int newVersion = _repository.GetNextVersion(year, month);

                foreach (var plan in plans)
                {
                    // 1. 既存データをその日の分取得（最新ver）
                    var existingPlans = _repository.GetLatestByDate(DateTime.Parse(plan.Date));

                    // 2. 新データの contentTypeId 一覧
                    var newIds = plan.ContentType.Keys;

                    // 3. 既存データの contentTypeId 一覧
                    var existingIds = existingPlans.Select(x => x.content_type_id);


                    // 4. 追加（新にあって既存にない）
                    foreach (var id in newIds.Except(existingIds))
                    {
                        var item = plan.ContentType[id];
                        _repository.Insert(DateTime.Parse(plan.Date), id, item, newVersion);
                    }

                    // 5. 更新（既存にあり内容が違う）
                    foreach (var id in newIds.Intersect(existingIds))
                    {
                        var existing = existingPlans.First(x => x.content_type_id == id);
                        var newItem = plan.ContentType[id];

                        if (!IsSame(existing, newItem))
                        {
                            _repository.Insert(DateTime.Parse(plan.Date), id, newItem, newVersion);
                        }
                    }

                    // 6. 削除（既存にあって新にない）
                    // TODO: フロントからわたってくるときにそもそもレコード事消えてしまったら、一番最初のplansに含まれてないのでforeachに引っかからない
                    foreach (var id in existingIds.Except(newIds))
                    {
                        _repository.InsertDeleted(DateTime.Parse(plan.Date), id, newVersion);
                    }

                }
            }
            catch
            {
                throw;
            }
        }

        //---------------------------------------------------------------------
        // 保存処理（追加・更新・削除 一括）
        //---------------------------------------------------------------------
        public void SavePlans2(List<TestPlanDto> plans)
        {
            try
            {
                if (plans == null || plans.Count == 0)
                    throw new ArgumentException("プランデータが存在しません。");

                // すべてのplansの中から、月単位のversionを決定
                var firstPlan = plans.First();
                var baseDate = DateTime.Parse(firstPlan.Date);
                int year = baseDate.Year;
                int month = baseDate.Month;

                // 今回保存分で共通のversionを取得
                int newVersion = _repository.GetNextVersion(year, month);

                //---------------------------------------------------------------
                // まず、この月に存在する既存データを全件取得（最新version）
                //---------------------------------------------------------------
                var existingAll = _repository.GetAllPlanRecords(year, month);

                // 既存日付の一覧（例: 2025-11-01, 2025-11-02 ...）
                var existingDates = existingAll
                    .Select(x => x.date.Date)
                    .Distinct()
                    .ToList();

                // 新しく渡ってきた日付の一覧
                var newDates = plans
                    .Select(p => DateTime.Parse(p.Date).Date)
                    .Distinct()
                    .ToList();

                //---------------------------------------------------------------
                // 各日ごとに処理
                //---------------------------------------------------------------
                foreach (var plan in plans)
                {
                    DateTime date = DateTime.Parse(plan.Date);
                    var existingPlans = existingAll
                        .Where(x => x.date.Date == date)
                        .ToList();

                    var newIds = plan.ContentType.Keys.ToList();
                    var existingIds = existingPlans.Select(x => x.content_type_id).ToList();

                    // ✅ case1: その日のデータが空なら ⇒ 全削除扱い
                    if (newIds.Count == 0)
                    {
                        foreach (var e in existingPlans)
                        {
                            _repository.InsertDeleted(date, e.content_type_id, newVersion);
                        }
                        continue;
                    }

                    // ✅ case2: 新規（既存にないID）
                    foreach (var id in newIds.Except(existingIds))
                    {
                        var item = plan.ContentType[id];
                        _repository.Insert(date, id, item, newVersion);
                    }

                    // ✅ case3: 更新（既存にあり内容が異なる）
                    foreach (var id in newIds.Intersect(existingIds))
                    {
                        var existing = existingPlans.First(x => x.content_type_id == id);
                        var newItem = plan.ContentType[id];

                        if (!IsSame(existing, newItem))
                        {
                            _repository.Insert(date, id, newItem, newVersion);
                        }
                    }

                    // ✅ case4: 削除（既存にあって新にない）
                    foreach (var id in existingIds.Except(newIds))
                    {
                        _repository.InsertDeleted(date, id, newVersion);
                    }
                }

                //---------------------------------------------------------------
                // ✅ plansに含まれていない「日ごと削除」
                // （＝フロントでその日付自体が送られてこなかった場合）
                //---------------------------------------------------------------
                var toDeleteDates = existingDates.Except(newDates);
                foreach (var date in toDeleteDates)
                {
                    var existingPlans = existingAll.Where(x => x.date.Date == date).ToList();
                    foreach (var e in existingPlans)
                    {
                        _repository.InsertDeleted(date, e.content_type_id, newVersion);
                    }
                }
            }
            catch (Exception ex)
            {
                // 実運用ではログ出力推奨
                throw new Exception("プラン保存処理でエラーが発生しました。", ex);
            }
        }
    }
}