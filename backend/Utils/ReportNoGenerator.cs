using backend.Models.Entity;
using System;
using System.Collections.Generic;
using System.Linq;

namespace backend.Utils
{
    /// <summary>
    /// ReportNo生成に関するユーティリティクラス
    /// </summary>
    public static class ReportNoGenerator
    {
        /// <summary>
        /// ReportNoを生成（プレフィックス年度月配番形式）
        /// </summary>
        /// <param name="fiscalYearStartMonth">年度開始月（1-12）</param>
        /// <param name="prefix">ReportNoのプレフィックス</param>
        /// <param name="existingReports">既存のレポートリスト（同じ期間のレポート数をカウントするために使用）</param>
        /// <returns>生成されたReportNo（例: RPT20250101）</returns>
        public static string GenerateReportNo(int fiscalYearStartMonth, string prefix, List<ReportEntity> existingReports)
        {
            if (fiscalYearStartMonth < 1 || fiscalYearStartMonth > 12)
            {
                throw new ArgumentException("年度開始月は1から12の間で指定してください。");
            }

            if (string.IsNullOrWhiteSpace(prefix))
            {
                throw new ArgumentException("ReportNoプレフィックスは必須です。");
            }

            if (existingReports == null)
            {
                throw new ArgumentNullException(nameof(existingReports));
            }

            DateTime now = DateTime.Now;
            int currentYear = now.Year;
            int currentMonth = now.Month;

            // 年度を計算
            int fiscalYear = currentYear;
            if (currentMonth < fiscalYearStartMonth)
            {
                // 年度開始月より前の月は前年度
                fiscalYear = currentYear - 1;
            }

            // 年度+月の文字列を生成（YYYYMM形式）
            string yearMonthStr = $"{fiscalYear}{currentMonth:D2}";

            // 同じ年度+月の既存レポートを取得して配番を決定
            // ReportNoがプレフィックスYYYYMMXX形式のものをフィルタリング
            var samePeriodReports = existingReports
                .Where(r => r.ReportNo != null && r.ReportNo.StartsWith($"{prefix}{yearMonthStr}"))
                .ToList();

            // 配番は01から始まる
            int sequence = samePeriodReports.Count + 1;

            return $"{prefix}{yearMonthStr}{sequence:D2}";
        }
    }
}

