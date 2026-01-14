using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using backend.Models.Repository;
using backend.Models;

namespace backend.Controllers
{
    /// <summary>
    /// 廃棄物排出計画スケジュール用コントローラー
    /// 
    /// 【設計方針】
    /// - ヘッダーは種別ベース（廃プラ①、汚泥①、廃プラ②など）
    /// - 月ごとに通常日用・特殊日用のヘッダー定義を管理
    /// - 実績との紐付け：date + wasteType + typeSequence
    /// </summary>
    [RoutePrefix("api/waste-schedule")]
    public class WasteScheduleController : ApiController
    {
        private readonly WasteScheduleRepository _repository;

        public WasteScheduleController()
        {
            _repository = new WasteScheduleRepository();
        }

        /// <summary>
        /// ヘッダー定義を取得
        /// </summary>
        [HttpGet]
        [Route("header-definition/{year}/{month}")]
        public IHttpActionResult GetHeaderDefinition(int year, int month, int isSpecialDay = 0)
        {
            try
            {
                var headers = _repository.GetHeaderDefinition(year, month, isSpecialDay == 1);
                return Ok(headers);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        /// <summary>
        /// ヘッダー定義を保存・更新
        /// </summary>
        [HttpPost]
        [Route("header-definition")]
        public IHttpActionResult SaveHeaderDefinition([FromBody] HeaderDefinitionSaveRequest request)
        {
            if (request == null || request.Headers == null || !request.Headers.Any())
            {
                return BadRequest("ヘッダー定義が空です。");
            }

            try
            {
                // 既存のヘッダー定義を削除
                _repository.DeleteHeaderDefinition(request.Year, request.Month, request.IsSpecialDay);

                // 新しいヘッダー定義を挿入
                foreach (var header in request.Headers)
                {
                    var headerDef = new HeaderDefinition
                    {
                        Year = request.Year,
                        Month = request.Month,
                        Version = 0,
                        IsSpecialDay = request.IsSpecialDay,
                        HeaderOrder = header.HeaderOrder,
                        WasteType = header.WasteType,
                        TypeSequence = header.TypeSequence,
                        DisplayName = header.DisplayName,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    };

                    _repository.InsertHeaderDefinition(headerDef);
                }

                return Ok(new { message = "ヘッダー定義の保存が完了しました。" });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        /// <summary>
        /// 月次計画データを取得
        /// </summary>
        [HttpGet]
        [Route("monthly/{year}/{month}")]
        public IHttpActionResult GetMonthlyPlan(int year, int month, int version = 0)
        {
            try
            {
                var plans = _repository.GetMonthlyPlan(year, month, version);

                // 日付ごとにグループ化してフロントエンド用の形式に変換
                var grouped = plans
                    .GroupBy(p => p.Date)
                    .Select(g => new
                    {
                        date = g.Key.ToString("yyyy-MM-dd"),
                        isSpecialDay = g.First().IsSpecialDay,
                        plans = g.OrderBy(p => _repository.GetHeaderOrder(p.HeaderId)).Select(p => new
                        {
                            planId = p.PlanId,
                            headerId = p.HeaderId,
                            wasteType = p.WasteType,
                            typeSequence = p.TypeSequence,
                            companyId = p.CompanyId,
                            vol = p.Vol,
                            plannedTime = p.PlannedTime?.ToString(@"hh\:mm"),
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
        /// 月次計画データを保存
        /// </summary>
        [HttpPost]
        [Route("save")]
        public IHttpActionResult SaveMonthlyPlan([FromBody] List<PlanSaveRequest> requests)
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
                _repository.DeleteMonthlyPlan(year, month, 0);

                // 新しいデータを挿入
                foreach (var req in requests)
                {
                    var plan = new PlanData
                    {
                        Year = req.Year,
                        Month = req.Month,
                        Version = 0,
                        Date = DateTime.Parse(req.Date),
                        IsSpecialDay = req.IsSpecialDay,
                        HeaderId = req.HeaderId,
                        WasteType = req.WasteType,
                        TypeSequence = req.TypeSequence,
                        CompanyId = req.CompanyId,
                        Vol = req.Vol,
                        PlannedTime = string.IsNullOrEmpty(req.PlannedTime)
                            ? (TimeSpan?)null
                            : TimeSpan.Parse(req.PlannedTime),
                        Note = req.Note,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    };

                    _repository.InsertPlan(plan);
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

                // ヘッダー定義をコピー
                _repository.CopyHeaderDefinitionToNewVersion(year, month, 0, newVersion);

                // 計画データをコピー
                _repository.CopyPlanToNewVersion(year, month, 0, newVersion);

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
        /// 計画と実績を突合
        /// </summary>
        [HttpGet]
        [Route("match-with-actual/{year}/{month}")]
        public IHttpActionResult MatchWithActual(int year, int month)
        {
            try
            {
                var matched = _repository.GetPlanActualMatch(year, month);
                return Ok(matched);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }
    }

    /// <summary>
    /// ヘッダー定義保存リクエストDTO
    /// </summary>
    public class HeaderDefinitionSaveRequest
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public bool IsSpecialDay { get; set; }
        public List<HeaderDefinitionItem> Headers { get; set; }
    }

    public class HeaderDefinitionItem
    {
        public int HeaderOrder { get; set; }
        public string WasteType { get; set; }
        public int TypeSequence { get; set; }
        public string DisplayName { get; set; }
    }

    /// <summary>
    /// 計画保存リクエストDTO
    /// </summary>
    public class PlanSaveRequest
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public string Date { get; set; }
        public bool IsSpecialDay { get; set; }
        public int HeaderId { get; set; }
        public string WasteType { get; set; }
        public int TypeSequence { get; set; }
        public int? CompanyId { get; set; }
        public decimal? Vol { get; set; }
        public string PlannedTime { get; set; }
        public string Note { get; set; }
    }
}

