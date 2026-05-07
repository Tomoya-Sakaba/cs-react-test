export type Kouji = {
  koujiId: number;
  koujiName: string;
  cycleYears: number;
  cycleTimes: number;
};

export type KoujiMonthlyType = "budget" | "actual";

export type KoujiMonthly = {
  koujiId: number;
  yyyymm: number; // 例: 202604
  type: KoujiMonthlyType;
  amount: number;
};

export const KoujiTestData: Kouji[] = [
  { koujiId: 1, koujiName: "空調更新（第1工場）", cycleYears: 10, cycleTimes: 1 },
  { koujiId: 2, koujiName: "屋根防水改修", cycleYears: 12, cycleTimes: 1 },
  { koujiId: 3, koujiName: "受電設備点検", cycleYears: 3, cycleTimes: 1 },
];

export function fiscalYearMonths(fiscalYearStartYear: number) {
  // 年度: 4月〜翌年3月（例: 2026年度 = 2026/04..2027/03）
  const out: Array<{ label: string; yyyymm: number }> = [];
  for (let m = 4; m <= 12; m++) {
    out.push({ label: `${m}月`, yyyymm: fiscalYearStartYear * 100 + m });
  }
  for (let m = 1; m <= 3; m++) {
    out.push({ label: `${m}月`, yyyymm: (fiscalYearStartYear + 1) * 100 + m });
  }
  return out;
}

export const KoujiMonthlyTestData: KoujiMonthly[] = [
  // 2026年度（例）
  { koujiId: 1, yyyymm: 202606, type: "budget", amount: 2500000 },
  { koujiId: 1, yyyymm: 202607, type: "budget", amount: 2500000 },
  { koujiId: 2, yyyymm: 202611, type: "budget", amount: 1800000 },
  { koujiId: 2, yyyymm: 202612, type: "budget", amount: 2200000 },
  { koujiId: 3, yyyymm: 202609, type: "budget", amount: 300000 },
  { koujiId: 3, yyyymm: 202610, type: "budget", amount: 300000 },

  // 実績（見せる用。UIは後で切替）
  { koujiId: 3, yyyymm: 202610, type: "actual", amount: 280000 },
];

