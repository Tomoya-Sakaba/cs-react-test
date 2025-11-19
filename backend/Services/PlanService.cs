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
                            ct => new TestItem { Company = null, Vol = null, Time = null, Version = 0 }
                        );

                    // 実際のデータで上書き
                    foreach (var record in g)
                    {
                        contentTypeDict[record.content_type_id] = new TestItem
                        {
                            Company = record.company,
                            Vol = record.vol,
                            Time = record.time.HasValue ? record.time.Value.ToString(@"hh\:mm") : null,
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
                .GroupBy(r => r.date)
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
                                Company = null,
                                Vol = null,
                                Time = null,
                                IsChanged = false
                            }
                        );

                    // 実際のデータで上書き
                    foreach (var record in g)
                    {
                        contentTypeDict[record.content_type_id] = new TestItemHistory
                        {
                            Company = record.company,
                            Vol = record.vol,
                            Time = record.Time.HasValue ? record.Time.Value.ToString(@"hh\:mm") : null,
                            IsChanged = record.is_changed
                        };
                    }

                    return new TestPlanHistoryDto
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
        // データが存在する年月のリストを取得
        //---------------------------------------------------------------------
        public List<AvailableYearMonthDto> GetAvailableYearMonths()
        {
            return _repository.GetAvailableYearMonths();
        }

        //---------------------------------------------------------------------
        // ContentTypeDefaultTimeマスターデータを取得
        //---------------------------------------------------------------------
        public List<ContentTypeDefaultTimeDto> GetContentTypeDefaultTime()
        {
            return _repository.GetAllContentTypeDefaultTime();
        }

        //---------------------------------------------------------------------
        // ContentTypeDefaultVolマスターデータを取得
        //---------------------------------------------------------------------
        public List<ContentTypeDefaultVolDto> GetContentTypeDefaultVol()
        {
            return _repository.GetAllContentTypeDefaultVol();
        }

        //---------------------------------------------------------------------
        // 指定年月の利用可能なバージョンリストを取得
        // plan_version_snapshotテーブルのcurrent_versionから0までの連続したバージョンリストを返す
        //---------------------------------------------------------------------
        public List<int> GetAvailableVersions(int year, int month)
        {
            // plan_version_snapshotからcurrent_versionを取得
            int? currentVersion = _repository.GetCurrentVersion(year, month);

            // current_versionが存在しない場合は空のリストを返す
            if (currentVersion == null)
            {
                return new List<int>();
            }

            // current_versionから0までの連続したバージョンリストを生成（降順）
            List<int> versions = new List<int>();
            for (int v = currentVersion.Value; v >= 0; v--)
            {
                versions.Add(v);
            }

            return versions;
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
                            // --- note 登録（version=0固定） ---
                            if (!string.IsNullOrEmpty(plan.Note))
                            {
                                _repository.InsertNote(db, tran, plan.Date, plan.Note, 0, userName);
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
                                    Version = 0,
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
                    catch (Exception)
                    {
                        tran.Rollback();
                        throw;
                    }
                }
            }
        }

        bool IsSame(PlanRecordDto existing, TestItem newItem)
        {
            string existingTimeStr = existing.time.HasValue
                ? existing.time.Value.ToString(@"hh\:mm")
                : null;

            return existing.company == newItem.Company
                && existing.vol == newItem.Vol
                && existingTimeStr == newItem.Time;
        }

        private bool IsEmptyPlan(PlanRecordDto plan)
        {
            // すべての主要カラムが NULL または空の場合に「空データ」と判定
            return plan?.company == null
                && plan?.vol == null
                && plan?.time == null;
        }

        //---------------------------------------------------------------------
        // 保存処理（追加・更新・削除 一括）
        //
        // 仕様:
        // - 月の「現在バージョン」を plan_version_snapshot から取得
        //   * 未作成(null) または 0 の場合: version=0 を対象に更新/挿入/削除（versionは上げない）
        //   * 1以上の場合: その version を対象に更新/挿入/削除（versionは上げない）
        //
        // version=0 の場合:
        // - UPDATE: 既存データと比較して変更がある場合のみ実行（変更がない場合は何もしない）
        // - 削除: nullでUPDATEではなく、DELETE処理（物理削除）を実行
        //
        // version>=1 の場合:
        // - 既存の最新versionのデータと比較して変更がない場合は何もしない
        //   これにより、バージョンを切った後に変更がないまま保存してもレコードが増えない
        // - 削除: 空データでINSERT/UPDATE（旧versionは保持）
        //
        // 日付単位の削除:
        // - リクエストに含まれていない日付（その日付のレコードが全てない場合）も検知して削除処理を実行
        //
        // - バージョンアップは別API(CreateVersionSnapshot)でのみ実施
        //---------------------------------------------------------------------
        ///<summary>
        /// 保存処理（追加・更新・削除 一括）
        /// </summary>
        /// <param name="plans">プランデータ</param>
        /// <returns>なし</returns>
        public void SavePlans2(List<TestPlanDto> plans)
        {
            if (plans == null || plans.Count == 0)
                throw new ArgumentException("プランデータが存在しません。");

            using (IDbConnection db = new SqlConnection(connectionString))
            {
                db.Open();
                using (var tran = db.BeginTransaction())
                {
                    try
                    {
                        // すべてのplansの中から、月単位のversionを決定
                        var firstPlan = plans.First();
                        var baseDate = DateTime.Parse(firstPlan.Date);
                        int year = baseDate.Year;
                        int month = baseDate.Month;

                        // 現在のバージョンを取得（plan_version_snapshotテーブルから）
                        int? currentVersion = _repository.GetCurrentVersion(year, month);
                        
                        // バージョンがnullまたは0の場合は0、それ以外はそのバージョンを使用
                        int targetVersion = currentVersion ?? 0;

                        //---------------------------------------------------------------
                        // この月に存在する既存データ（最新version）を取得
                        // 注意: latest を基準に existingIds を推定する（ver>=1 で version=0 のみ存在してもOK）
                        //---------------------------------------------------------------
                        var existingAll = _repository.GetAllPlanRecords(year, month);

                        // リクエストに含まれる日付の一覧を取得
                        var requestedDates = plans
                            .Select(p => DateTime.Parse(p.Date).Date)
                            .Distinct()
                            .ToList();

                        // 既存データに存在する日付の一覧を取得
                        var existingDates = existingAll
                            .Select(x => x.date.Date)
                            .Distinct()
                            .ToList();

                        // リクエストに含まれていない日付（削除対象）を取得
                        var datesToDelete = existingDates.Except(requestedDates).ToList();

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

                            // 新規または更新処理
                            foreach (var id in newIds)
                            {
                                var newItem = plan.ContentType[id];
                                
                                // 既存の最新versionのデータを取得（比較用）
                                var existingLatest = existingPlans.FirstOrDefault(e => e.content_type_id == id);
                                
                                // 指定バージョンのレコードが存在するかチェック
                                // existingLatest が null でない かつ version が targetVersion と一致する場合に存在
                                bool existsAtTarget = existingLatest != null && existingLatest.version == targetVersion;

                                if (targetVersion == 0)
                                {
                                    // version=0 期間：従来通り UPDATE/INSERT（上書き方式）
                                    // ただし、UPDATEの場合は値が変わっている場合のみ実行
                                    if (existsAtTarget)
                                    {
                                        // existingLatest が version=0 のデータなので、それを使用して比較
                                        bool hasChanges = !IsSame(existingLatest, newItem);
                                        if (hasChanges)
                                        {
                                            _repository.UpdatePlan(db, tran, date, id, newItem, targetVersion);
                                        }
                                        // 変更がない場合は何もしない
                                    }
                                    else
                                    {
                                        // 新規挿入
                                        var planEntity = new PlanEntity
                                        {
                                            Date = date,
                                            ContentTypeId = id,
                                            Company = newItem.Company,
                                            Vol = newItem.Vol,
                                            Time = newItem.Time,
                                            Version = targetVersion,
                                            IsActive = true,
                                            CreatedAt = DateTime.Now,
                                            CreatedUser = "testUser",
                                            UpdatedAt = DateTime.Now,
                                            UpdatedUser = "testUser"
                                        };
                                        _repository.InsertPlan(db, tran, planEntity);
                                    }
                                }
                                else
                                {
                                    // version>=1 期間：
                                    // - 既存の最新versionのデータと比較して、変更がない場合は何もしない
                                    // - 変更がある場合のみ、targetVersionに対してINSERT/UPDATE
                                    
                                    // 既存データがない、または既存データと異なる場合のみ処理
                                    bool hasChanges = existingLatest == null || !IsSame(existingLatest, newItem);
                                    
                                    if (hasChanges)
                                    {
                                        if (existsAtTarget)
                                        {
                                            // 既存のtargetVersionレコードを更新
                                            _repository.UpdatePlan(db, tran, date, id, newItem, targetVersion);
                                        }
                                        else
                                        {
                                            // 新規にtargetVersionレコードを挿入
                                            var planEntity = new PlanEntity
                                            {
                                                Date = date,
                                                ContentTypeId = id,
                                                Company = newItem.Company,
                                                Vol = newItem.Vol,
                                                Time = newItem.Time,
                                                Version = targetVersion,
                                                IsActive = true,
                                                CreatedAt = DateTime.Now,
                                                CreatedUser = "testUser",
                                                UpdatedAt = DateTime.Now,
                                                UpdatedUser = "testUser"
                                            };
                                            _repository.InsertPlan(db, tran, planEntity);
                                        }
                                    }
                                    // 変更がない場合は何もしない（スキップ）
                                }
                            }

                            // 削除処理（既存にあって新にない）
                            foreach (var id in existingIds.Except(newIds))
                            {
                                var existing = existingPlans.FirstOrDefault(e => e.content_type_id == id);

                                // すでに空データならスキップ
                                if (IsEmptyPlan(existing))
                                    continue;

                                // 指定バージョンのレコードが存在するかチェック
                                // existing が null でない かつ version が targetVersion と一致する場合に存在
                                bool existsAtTarget = existing != null && existing.version == targetVersion;

                                if (targetVersion == 0)
                                {
                                    // version=0 期間：DELETE処理（物理削除）
                                    if (existsAtTarget)
                                    {
                                        _repository.DeletePlan(db, tran, date, id, targetVersion);
                                    }
                                    // 存在しない場合は既に削除済みなので何もしない
                                }
                                else
                                {
                                    // version>=1 期間：
                                    // - 既存データが空でない場合のみ、targetVersionに空データをINSERT/UPDATE
                                    // - 既存データが既に空の場合は何もしない（変更がないため）
                                    
                                    // 既存データが空でない場合のみ処理
                                    if (!IsEmptyPlan(existing))
                                    {
                                        if (existsAtTarget)
                                        {
                                            var emptyItem = new TestItem { Company = null, Vol = null, Time = null };
                                            _repository.UpdatePlan(db, tran, date, id, emptyItem, targetVersion);
                                        }
                                        else
                                        {
                                            var planEntity = new PlanEntity
                                            {
                                                Date = date,
                                                ContentTypeId = id,
                                                Company = null,
                                                Vol = null,
                                                Time = null,
                                                Version = targetVersion,
                                                IsActive = true,
                                                CreatedAt = DateTime.Now,
                                                CreatedUser = "testUser",
                                                UpdatedAt = DateTime.Now,
                                                UpdatedUser = "testUser"
                                            };
                                            _repository.InsertPlan(db, tran, planEntity);
                                        }
                                    }
                                    // 既存データが既に空の場合は何もしない（スキップ）
                                }
                            }

                            // Noteの更新処理（バージョン管理対応）
                            string existingNote = existingPlans.FirstOrDefault()?.note_text ?? "";
                            string newNote = plan.Note ?? "";
                            
                            // Noteが変更されている場合のみ処理
                            if (existingNote != newNote)
                            {
                                bool noteExistsAtTarget = _repository.NoteExists(date, targetVersion);
                                string userName = "testUser";
                                
                                if (targetVersion == 0)
                                {
                                    // version=0 期間
                                    if (string.IsNullOrEmpty(newNote))
                                    {
                                        // Noteが空になった場合は物理削除
                                        if (noteExistsAtTarget)
                                        {
                                            _repository.DeleteNote(db, tran, date, targetVersion);
                                        }
                                    }
                                    else
                                    {
                                        // Noteが空でない場合
                                        if (noteExistsAtTarget)
                                        {
                                            // 既存のNoteを更新
                                            _repository.UpdateNote(db, tran, plan.Date, newNote, targetVersion, userName);
                                        }
                                        else
                                        {
                                            // 新規にNoteを挿入
                                            _repository.InsertNote(db, tran, plan.Date, newNote, targetVersion, userName);
                                        }
                                    }
                                }
                                else
                                {
                                    // version>=1 期間
                                    if (noteExistsAtTarget)
                                    {
                                        // 既存のtargetVersionのNoteを更新（空文字も含む）
                                        _repository.UpdateNote(db, tran, plan.Date, newNote, targetVersion, userName);
                                    }
                                    else
                                    {
                                        // 新規にtargetVersionのNoteを挿入（空文字でない場合のみ）
                                        if (!string.IsNullOrEmpty(newNote))
                                        {
                                            _repository.InsertNote(db, tran, plan.Date, newNote, targetVersion, userName);
                                        }
                                    }
                                }
                            }
                            // 変更がない場合は何もしない
                        }

                        //---------------------------------------------------------------
                        // リクエストに含まれていない日付の削除処理
                        //---------------------------------------------------------------
                        foreach (var dateToDelete in datesToDelete)
                        {
                            var existingPlansForDate = existingAll
                                .Where(x => x.date.Date == dateToDelete)
                                .ToList();

                            // その日付のNoteを取得
                            string existingNoteForDate = existingPlansForDate.FirstOrDefault()?.note_text ?? "";
                            
                            // Noteの削除処理（バージョン管理対応）
                            if (!string.IsNullOrEmpty(existingNoteForDate))
                            {
                                bool noteExistsAtTarget = _repository.NoteExists(dateToDelete, targetVersion);
                                string userName = "testUser";
                                
                                if (targetVersion == 0)
                                {
                                    // version=0 期間：物理削除
                                    if (noteExistsAtTarget)
                                    {
                                        _repository.DeleteNote(db, tran, dateToDelete, targetVersion);
                                    }
                                }
                                else
                                {
                                    // version>=1 期間：空文字で更新
                                    if (noteExistsAtTarget)
                                    {
                                        _repository.UpdateNote(db, tran, dateToDelete.ToString("yyyy-MM-dd"), "", targetVersion, userName);
                                    }
                                    else
                                    {
                                        // 新規に空文字のNoteを挿入
                                        _repository.InsertNote(db, tran, dateToDelete.ToString("yyyy-MM-dd"), "", targetVersion, userName);
                                    }
                                }
                            }

                            foreach (var existing in existingPlansForDate)
                            {
                                // すでに空データならスキップ
                                if (IsEmptyPlan(existing))
                                    continue;

                                // 指定バージョンのレコードが存在するかチェック
                                // existing の version が targetVersion と一致する場合に存在
                                bool existsAtTarget = existing.version == targetVersion;

                                if (targetVersion == 0)
                                {
                                    // version=0 期間：DELETE処理（物理削除）
                                    if (existsAtTarget)
                                    {
                                        _repository.DeletePlan(db, tran, dateToDelete, existing.content_type_id, targetVersion);
                                    }
                                }
                                else
                                {
                                    // version>=1 期間：
                                    // - 既存データが空でない場合のみ、targetVersionに空データをINSERT/UPDATE
                                    // - 既存データが既に空の場合は何もしない（変更がないため）
                                    
                                    if (!IsEmptyPlan(existing))
                                    {
                                        if (existsAtTarget)
                                        {
                                            var emptyItem = new TestItem { Company = null, Vol = null, Time = null };
                                            _repository.UpdatePlan(db, tran, dateToDelete, existing.content_type_id, emptyItem, targetVersion);
                                        }
                                        else
                                        {
                                            var planEntity = new PlanEntity
                                            {
                                                Date = dateToDelete,
                                                ContentTypeId = existing.content_type_id,
                                                Company = null,
                                                Vol = null,
                                                Time = null,
                                                Version = targetVersion,
                                                IsActive = true,
                                                CreatedAt = DateTime.Now,
                                                CreatedUser = "testUser",
                                                UpdatedAt = DateTime.Now,
                                                UpdatedUser = "testUser"
                                            };
                                            _repository.InsertPlan(db, tran, planEntity);
                                        }
                                    }
                                }
                            }
                        }

                        tran.Commit();
                    }
                    catch (Exception ex)
                    {
                        tran.Rollback();
                        throw new Exception("プラン保存処理でエラーが発生しました。", ex);
                    }
                }
            }
        }

        //---------------------------------------------------------------------
        // バージョンを切る処理
        //
        // 仕様（更新）:
        // - データコピーは行わず、plan_version_snapshot の current_version を更新するのみ
        //   * current_version が null/0 の場合 → 1 を設定
        //   * current_version が 1 以上の場合 → +1 に更新
        // - 以後の保存は、現在の current_version に対して INSERT/UPDATE を行う
        //---------------------------------------------------------------------
        public void CreateVersionSnapshot(int year, int month, string userName)
        {
            using (IDbConnection db = new SqlConnection(connectionString))
            {
                db.Open();
                using (var tran = db.BeginTransaction())
                {
                    try
                    {
                        // 現在のバージョンを取得
                        int? currentVersion = _repository.GetCurrentVersion(year, month);
                        
                        // データコピーは行わず、current_version の更新のみを行う
                        int nextVersion = (currentVersion == null || currentVersion == 0)
                            ? 1
                            : currentVersion.Value + 1;

                        // バージョンスナップショットを更新
                        _repository.UpsertVersionSnapshot(db, tran, year, month, nextVersion, userName);

                        tran.Commit();
                    }
                    catch (Exception ex)
                    {
                        tran.Rollback();
                        throw new Exception("バージョン作成処理でエラーが発生しました。", ex);
                    }
                }
            }
        }
    }
}