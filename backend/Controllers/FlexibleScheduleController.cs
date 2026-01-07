using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using backend.Models.Repository;
using backend.Models;

namespace backend.Controllers
{
    /// <summary>
    /// 柔軟な計画スケジュール用コントローラー
    /// 
    /// 【新設計の特徴】
    /// - 1セル = 1レコード方式で、日によって排出回数を柔軟に変更可能
    /// - 実績との紐付けは date + time + wasteType で行う
    /// - 横軸：時間順（1回目、2回目、3回目...）
    /// - 縦軸：日付
    /// </summary>
    [RoutePrefix("api/flexible-schedule")]
    public class FlexibleScheduleController : ApiController
    {
        private readonly FlexibleScheduleRepository _repository;

        public FlexibleScheduleController()
        {
            _repository = new FlexibleScheduleRepository();
        }

        /// <summary>
        /// 月次計画スケジュールを取得
        /// </summary>
        [HttpGet]
        [Route("monthly/{year}/{month}")]
        public IHttpActionResult GetMonthlySchedule(int year, int month, int version = 0)
        {
            try
            {
                var schedules = _repository.GetMonthlySchedule(year, month, version);
                
                // 日付ごとにグループ化してフロントエンド用の形式に変換
                var grouped = schedules
                    .GroupBy(s => s.Date)
                    .Select(g => new
                    {
                        date = g.Key.ToString("yyyy-MM-dd"),
                        schedules = g.OrderBy(s => s.ScheduleOrder).Select(s => new
                        {
                            scheduleId = s.ScheduleId,
                            wasteType = s.WasteType,
                            companyId = s.CompanyId,
                            vol = s.Vol,
                            plannedTime = s.PlannedTime?.ToString(@"hh\:mm"),
                        }).ToList(),
                        note = g.First().Note
                    })
                    .OrderBy(x => x.date)
                    .ToList();

                return Ok(grouped);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        /// <summary>
        /// 月次計画スケジュールを保存
        /// </summary>
        [HttpPost]
        [Route("save")]
        public IHttpActionResult SaveMonthlySchedule([FromBody] List<ScheduleSaveRequest> requests)
        {
            if (requests == null || !requests.Any())
            {
                return BadRequest("保存データが空です。");
            }

            try
            {
                var year = requests.First().Year;
                var month = requests.First().Month;
                
                // 既存データを削除（バージョン0のみ）
                _repository.DeleteMonthlySchedule(year, month, 0);
                
                // 新しいデータを挿入
                foreach (var req in requests)
                {
                    var schedule = new FlexibleSchedule
                    {
                        Year = req.Year,
                        Month = req.Month,
                        Version = 0,
                        Date = DateTime.Parse(req.Date),
                        ScheduleOrder = req.ScheduleOrder,
                        WasteType = req.WasteType,
                        CompanyId = req.CompanyId,
                        Vol = req.Vol,
                        PlannedTime = string.IsNullOrEmpty(req.PlannedTime) 
                            ? (TimeSpan?)null 
                            : TimeSpan.Parse(req.PlannedTime),
                        Note = req.Note,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    };
                    
                    _repository.InsertSchedule(schedule);
                }

                return Ok(new { message = "保存が完了しました。" });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        /// <summary>
        /// バージョンを作成（スナップショット）
        /// </summary>
        [HttpPost]
        [Route("create-version/{year}/{month}")]
        public IHttpActionResult CreateVersion(int year, int month)
        {
            try
            {
                // 最新バージョンを取得
                var latestVersion = _repository.GetLatestVersion(year, month);
                var newVersion = latestVersion + 1;

                // 現在のversion=0のデータを新バージョンとしてコピー
                _repository.CopyToNewVersion(year, month, 0, newVersion);

                return Ok(new { message = $"バージョン{newVersion}を作成しました。", version = newVersion });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        /// <summary>
        /// 利用可能なバージョンを取得
        /// </summary>
        [HttpGet]
        [Route("versions/{year}/{month}")]
        public IHttpActionResult GetAvailableVersions(int year, int month)
        {
            try
            {
                var versions = _repository.GetAvailableVersions(year, month);
                return Ok(versions);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        /// <summary>
        /// 月次設定を取得（その月の最大排出回数など）
        /// </summary>
        [HttpGet]
        [Route("config/{year}/{month}")]
        public IHttpActionResult GetMonthlyConfig(int year, int month)
        {
            try
            {
                var config = _repository.GetMonthlyConfig(year, month);
                
                if (config == null)
                {
                    // デフォルト設定を返す
                    return Ok(new { maxScheduleCount = 3 });
                }

                return Ok(new { maxScheduleCount = config.MaxScheduleCount });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        /// <summary>
        /// 種別マスタを取得
        /// </summary>
        [HttpGet]
        [Route("waste-types")]
        public IHttpActionResult GetWasteTypes()
        {
            try
            {
                var wasteTypes = _repository.GetWasteTypes();
                return Ok(wasteTypes);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        /// <summary>
        /// 計画と実績を突合
        /// </summary>
        [HttpGet]
        [Route("match-with-actual/{year}/{month}")]
        public IHttpActionResult MatchWithActual(int year, int month)
        {
            try
            {
                // 計画データを取得
                var plans = _repository.GetMonthlySchedule(year, month, 0);
                
                // 実績データを取得（別テーブルから）
                var actuals = _repository.GetMonthlyActual(year, month);

                // 突合ロジック：date + wasteType で紐付け、時刻が近いものを優先
                var matched = plans.Select(plan => new
                {
                    plan = new
                    {
                        date = plan.Date.ToString("yyyy-MM-dd"),
                        scheduleOrder = plan.ScheduleOrder,
                        wasteType = plan.WasteType,
                        companyId = plan.CompanyId,
                        vol = plan.Vol,
                        plannedTime = plan.PlannedTime?.ToString(@"hh\:mm"),
                    },
                    actual = actuals
                        .Where(a => 
                            a.Date == plan.Date && 
                            a.WasteType == plan.WasteType)
                        .OrderBy(a => Math.Abs((a.ActualTime - (plan.PlannedTime ?? TimeSpan.Zero)).TotalMinutes))
                        .Select(a => new
                        {
                            date = a.Date.ToString("yyyy-MM-dd"),
                            actualTime = a.ActualTime.ToString(@"hh\:mm"),
                            wasteType = a.WasteType,
                            companyId = a.CompanyId,
                            vol = a.Vol,
                        })
                        .FirstOrDefault()
                }).ToList();

                return Ok(matched);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }
    }

    /// <summary>
    /// 保存リクエストDTO
    /// </summary>
    public class ScheduleSaveRequest
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public string Date { get; set; }
        public int ScheduleOrder { get; set; }
        public string WasteType { get; set; }
        public int? CompanyId { get; set; }
        public decimal? Vol { get; set; }
        public string PlannedTime { get; set; }
        public string Note { get; set; }
    }
}

