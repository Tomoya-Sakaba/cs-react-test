/**
 * 機器詳細の「部品」「関連機器」テスト表示用（backend の EquipmentDetailGemBoxTestData と列キーを揃える）
 */
export type EquipmentPartTestRow = {
  partCode: string;
  qty: number;
  note: string;
};

export type EquipmentLinkedTestRow = {
  equipmentCode: string;
  equipmentName: string;
  relation: string;
};

export function getTestPartsForEquipment(reportNo: number): EquipmentPartTestRow[] {
  const code = `P-${String(reportNo).padStart(4, "0")}`;
  return [
    { partCode: `${code}-A`, qty: 2, note: "予備ベルト" },
    { partCode: `${code}-B`, qty: 1, note: "フィルタ" },
    { partCode: `${code}-C`, qty: 4, note: "ボルトセット" },
  ];
}

export function getTestLinkedEquipmentForEquipment(reportNo: number): EquipmentLinkedTestRow[] {
  const a = Math.max(1, reportNo + 100);
  const b = Math.max(1, reportNo + 200);
  return [
    {
      equipmentCode: `EQ-${String(a).padStart(5, "0")}`,
      equipmentName: `ライン連携ユニット（テスト ${reportNo}）`,
      relation: "上位機",
    },
    {
      equipmentCode: `EQ-${String(b).padStart(5, "0")}`,
      equipmentName: `予備機（テスト ${reportNo}）`,
      relation: "冗長ペア",
    },
  ];
}
