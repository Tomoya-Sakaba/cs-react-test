using System;
using System.Collections.Generic;
using System.Globalization;

namespace backend.Helpers
{
    /// <summary>
    /// データのバリデーションと型変換を行う共通ヘルパークラス
    /// </summary>
    public static class ValidationHelpers
    {
        /// <summary>
        /// 日付文字列を検証してDateTime型に変換します
        /// </summary>
        public static DateTime ValidateAndConvertDateTime(string value, string columnName, List<string> errors)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                errors.Add($"「{columnName}」列が空です。");
                return DateTime.MinValue;
            }

            // 標準的な日付・日時形式をパース
            // YYYY-MM-DD, YYYY/MM/DD, YYYY-MM-DD HH:mm:ss, YYYY/MM/DD HH:mm:ss など
            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime dateValue))
            {
                return dateValue.Date; // 時刻部分を切り捨てて日付のみを返す
            }

            // Excel シリアル値の処理（例: 45000）
            if (double.TryParse(value, out double excelDate))
            {
                try
                {
                    DateTime result = DateTime.FromOADate(excelDate);
                    return result.Date; // 時刻部分を切り捨てて日付のみを返す
                }
                catch
                {
                    // シリアル値が無効な場合
                }
            }

            errors.Add($"「{columnName}」列に不正な文字があります（値: {value}）。日付形式（YYYY-MM-DD または YYYY/MM/DD）で入力してください。");
            return DateTime.MinValue;
        }

        /// <summary>
        /// 整数文字列を検証してint型に変換します（NULL不可）
        /// </summary>
        public static int ValidateAndConvertInt(string value, string columnName, List<string> errors, int defaultValue = 0)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                if (defaultValue != 0)
                {
                    return defaultValue;
                }
                errors.Add($"「{columnName}」列が空です。");
                return 0;
            }

            if (int.TryParse(value, out int intValue))
            {
                return intValue;
            }

            errors.Add($"「{columnName}」列に不正な文字があります（値: {value}）。整数で入力してください。");
            return 0;
        }

        /// <summary>
        /// 整数文字列を検証してint?型に変換します（NULL可）
        /// </summary>
        public static int? ValidateAndConvertNullableInt(string value, string columnName, List<string> errors)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            if (int.TryParse(value, out int intValue))
            {
                return intValue;
            }

            errors.Add($"「{columnName}」列に不正な文字があります（値: {value}）。整数で入力してください。");
            return null;
        }

        /// <summary>
        /// 小数文字列を検証してdecimal?型に変換します（NULL可）
        /// </summary>
        public static decimal? ValidateAndConvertDecimal(string value, string columnName, List<string> errors)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            if (decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal decimalValue))
            {
                return decimalValue;
            }

            errors.Add($"「{columnName}」列に不正な文字があります（値: {value}）。数値で入力してください。");
            return null;
        }

        /// <summary>
        /// 時刻文字列を検証してTimeSpan型に変換します（NULL不可）
        /// SQL ServerのTIME型に対応
        /// </summary>
        public static TimeSpan ValidateAndConvertTime(string value, string columnName, List<string> errors)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                errors.Add($"「{columnName}」列が空です。");
                return TimeSpan.Zero;
            }

            // 標準的な時刻形式をパース (HH:mm:ss, HH:mm など)
            if (TimeSpan.TryParse(value, CultureInfo.InvariantCulture, out TimeSpan timeValue))
            {
                return timeValue;
            }

            // DateTime形式の場合（例: "2024/12/01 14:30:00" → 時刻部分のみ取得）
            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime dateTimeValue))
            {
                return dateTimeValue.TimeOfDay;
            }

            // Excel数値形式の処理（0.0～1.0の範囲、例: 0.5 = 12:00:00）
            if (double.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out double excelTime))
            {
                // 0.0 ～ 1.0 の範囲チェック
                if (excelTime >= 0.0 && excelTime < 1.0)
                {
                    try
                    {
                        // Excelの時刻は日付のシリアル値の小数部分
                        // 0.5 = 12時間 = 43200秒
                        double totalSeconds = excelTime * 24 * 60 * 60;
                        return TimeSpan.FromSeconds(totalSeconds);
                    }
                    catch
                    {
                        // 変換失敗
                    }
                }
                // 1.0以上の場合はExcelのシリアル値（日付＋時刻）として処理
                else if (excelTime >= 1.0)
                {
                    try
                    {
                        DateTime result = DateTime.FromOADate(excelTime);
                        return result.TimeOfDay;
                    }
                    catch
                    {
                        // シリアル値が無効な場合
                    }
                }
            }

            errors.Add($"「{columnName}」列に不正な文字があります（値: {value}）。時刻形式（HH:mm:ss）で入力してください。");
            return TimeSpan.Zero;
        }

        /// <summary>
        /// 時刻文字列を検証してTimeSpan?型に変換します（NULL可）
        /// SQL ServerのTIME型に対応
        /// </summary>
        public static TimeSpan? ValidateAndConvertNullableTime(string value, string columnName, List<string> errors)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            // 標準的な時刻形式をパース (HH:mm:ss, HH:mm など)
            if (TimeSpan.TryParse(value, CultureInfo.InvariantCulture, out TimeSpan timeValue))
            {
                return timeValue;
            }

            // DateTime形式の場合（例: "2024/12/01 14:30:00" → 時刻部分のみ取得）
            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime dateTimeValue))
            {
                return dateTimeValue.TimeOfDay;
            }

            // Excel数値形式の処理（0.0～1.0の範囲、例: 0.5 = 12:00:00）
            if (double.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out double excelTime))
            {
                // 0.0 ～ 1.0 の範囲チェック
                if (excelTime >= 0.0 && excelTime < 1.0)
                {
                    try
                    {
                        // Excelの時刻は日付のシリアル値の小数部分
                        // 0.5 = 12時間 = 43200秒
                        double totalSeconds = excelTime * 24 * 60 * 60;
                        return TimeSpan.FromSeconds(totalSeconds);
                    }
                    catch
                    {
                        // 変換失敗
                    }
                }
                // 1.0以上の場合はExcelのシリアル値（日付＋時刻）として処理
                else if (excelTime >= 1.0)
                {
                    try
                    {
                        DateTime result = DateTime.FromOADate(excelTime);
                        return result.TimeOfDay;
                    }
                    catch
                    {
                        // シリアル値が無効な場合
                    }
                }
            }

            errors.Add($"「{columnName}」列に不正な文字があります（値: {value}）。時刻形式（HH:mm:ss）で入力してください。");
            return null;
        }
    }
}

