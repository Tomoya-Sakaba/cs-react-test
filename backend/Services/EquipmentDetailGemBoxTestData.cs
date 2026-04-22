using System;
using System.Collections.Generic;

namespace backend.Services
{
    /// <summary>
    /// 機器詳細の「部品」「関連機器」GemBox 明細用テストデータ（本番はDBから組み立てる想定）。
    /// フロントの equipmentDetailTestData と列キーを揃える。
    /// </summary>
    public static class EquipmentDetailGemBoxTestData
    {
        public static List<Dictionary<string, object>> GetPartsRows(int reportNo)
        {
            var code = $"P-{reportNo:D4}";
            return new List<Dictionary<string, object>>
            {
                NewRow(
                    ("part_code", $"{code}-A"),
                    ("qty", 2),
                    ("note", "予備ベルト")),
                NewRow(
                    ("part_code", $"{code}-B"),
                    ("qty", 1),
                    ("note", "フィルタ")),
                NewRow(
                    ("part_code", $"{code}-C"),
                    ("qty", 4),
                    ("note", "ボルトセット")),
                
                NewRow(
                    ("part_code", $"{code}-C"),
                    ("qty", 4),
                    ("note", "ボルトセット")),
                NewRow(
                    ("part_code", $"{code}-C"),
                    ("qty", 4),
                    ("note", "ボルトセット")),
                NewRow(
                    ("part_code", $"{code}-C"),
                    ("qty", 4),
                    ("note", "ボルトセット")),
                NewRow(
                    ("part_code", $"{code}-C"),
                    ("qty", 4),
                    ("note", "ボルトセット")),
                NewRow(
                    ("part_code", $"{code}-C"),
                    ("qty", 4),
                    ("note", "ボルトセット")),
                NewRow(
                    ("part_code", $"{code}-C"),
                    ("qty", 5),
                    ("note", "ボルトセット")),
            };
        }

        public static List<Dictionary<string, object>> GetLinkedEquipmentRows(int reportNo)
        {
            var a = Math.Max(1, reportNo + 100);
            var b = Math.Max(1, reportNo + 200);
            return new List<Dictionary<string, object>>
            {
                NewRow(
                    ("equipment_code", $"EQ-{a:D5}"),
                    ("equipment_name", $"ライン連携ユニット（テスト {reportNo}）"),
                    ("relation", "上位機")),
                NewRow(
                    ("equipment_code", $"EQ-{b:D5}"),
                    ("equipment_name", $"予備機（テスト {reportNo}）"),
                    ("relation", "冗長ペア")),
                NewRow(
                    ("equipment_code", $"EQ-{b:D5}"),
                    ("equipment_name", $"予備機（テスト {reportNo}）"),
                    ("relation", "冗長ペア")),
                
                NewRow(
                    ("equipment_code", $"EQ-{b:D5}"),
                    ("equipment_name", $"予備機（テスト {reportNo}）"),
                    ("relation", "冗長ペア")),
                NewRow(
                    ("equipment_code", $"EQ-{b:D5}"),
                    ("equipment_name", $"予備機（テスト {reportNo}）"),
                    ("relation", "冗長ペア")),
                NewRow(
                    ("equipment_code", $"EQ-{b:D5}"),
                    ("equipment_name", $"予備機（テスト {reportNo}）"),
                    ("relation", "冗長ペア")),
                NewRow(
                    ("equipment_code", $"EQ-{b:D5}"),
                    ("equipment_name", $"予備機（テスト {reportNo}）"),
                    ("relation", "冗長ペア")),
                NewRow(
                    ("equipment_code", $"EQ-{b:D5}"),
                    ("equipment_name", $"予備機（テスト {reportNo}）"),
                    ("relation", "冗長ペア")),
                NewRow(
                    ("equipment_code", $"EQ-{b:D5}"),
                    ("equipment_name", $"予備機（テスト {reportNo}）"),
                    ("relation", "冗長ペア")),
                NewRow(
                    ("equipment_code", $"EQ-{b:D5}"),
                    ("equipment_name", $"予備機（テスト {reportNo}）"),
                    ("relation", "冗長ペア")),
                NewRow(
                    ("equipment_code", $"EQ-{b:D5}"),
                    ("equipment_name", $"予備機（テスト {reportNo}）"),
                    ("relation", "冗長ペア")),
                NewRow(
                    ("equipment_code", $"EQ-{b:D5}"),
                    ("equipment_name", $"予備機（テスト {reportNo}）"),
                    ("relation", "冗長ペア")),
                NewRow(
                    ("equipment_code", $"EQ-{b:D5}"),
                    ("equipment_name", $"予備機（テスト {reportNo}）"),
                    ("relation", "冗長ペア")),
            };
        }

        private static Dictionary<string, object> NewRow(params (string Key, object Value)[] pairs)
        {
            var d = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            foreach (var p in pairs)
                d[p.Key] = p.Value ?? "";
            return d;
        }
    }
}
