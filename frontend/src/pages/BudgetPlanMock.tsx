import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const VendorMaster = [
  {
    id: "a",
    name: "A社",
    costs: { disposalPerTon: 12000, transportPerTrip: 8000, transportProcessPerTon: 3500 },
  },
  {
    id: "b",
    name: "B社",
    costs: { disposalPerTon: 11000, transportPerTrip: 9000, transportProcessPerTon: 3200 },
  },
  {
    id: "c",
    name: "C社",
    costs: { disposalPerTon: 13000, transportPerTrip: 7000, transportProcessPerTon: 4000 },
  },
  {
    id: "d",
    name: "D社",
    costs: { disposalPerTon: 12500, transportPerTrip: 8500, transportProcessPerTon: 3600 },
  },
] as const satisfies ReadonlyArray<{ id: string; name: string; costs: VendorCost }>;

const CategoryKeys = ["hp1", "hp2", "sun"] as const;
type CategoryKey = (typeof CategoryKeys)[number];

const CategoryLabel: Record<CategoryKey, string> = {
  hp1: "廃プラ①（AM）",
  hp2: "廃プラ②（PM）",
  sun: "日曜日（1回）",
};

const MonthLabels = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
] as const;

function getVendorName(vendorId: string) {
  return VendorMaster.find((v) => v.id === vendorId)?.name ?? vendorId;
}

function clampYear(y: number) {
  if (!Number.isFinite(y)) return new Date().getFullYear();
  return Math.min(2100, Math.max(2000, Math.trunc(y)));
}

function monthWeekdayCounts(year: number, month1to12: number) {
  const y = clampYear(year);
  const m = Math.min(12, Math.max(1, Math.trunc(month1to12)));
  const daysInMonth = new Date(y, m, 0).getDate();
  let monToSat = 0;
  let sundays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(y, m - 1, d).getDay(); // 0:Sun..6:Sat
    if (dow === 0) sundays += 1;
    else monToSat += 1;
  }
  return { daysInMonth, monToSat, sundays };
}

type VendorCost = {
  disposalPerTon: number;
  transportPerTrip: number;
  transportProcessPerTon: number;
};

const schema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()),
  avgIn: z.coerce.number().nonnegative().default(0),
  mixRatio: z.coerce.number().min(0).max(1).default(0),
  distribution: z.object({
    hp1: z.coerce.number().min(0).max(100).default(50),
    hp2: z.coerce.number().min(0).max(100).default(40),
    sun: z.coerce.number().min(0).max(100).default(10),
  }),
  vendors: z.object({
    hp1: z
      .array(
        z.object({
          vendorId: z.string().min(1),
          count: z.coerce.number().int().min(0).default(0),
          altVendorId: z.string().optional().default(""),
        })
      )
      .default([]),
    hp2: z
      .array(
        z.object({
          vendorId: z.string().min(1),
          count: z.coerce.number().int().min(0).default(0),
          altVendorId: z.string().optional().default(""),
        })
      )
      .default([]),
    sun: z
      .array(
        z.object({
          vendorId: z.string().min(1),
          count: z.coerce.number().int().min(0).default(0),
          altVendorId: z.string().optional().default(""),
        })
      )
      .default([]),
  }),
});

type FormValues = z.infer<typeof schema>;

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(n);
}

function formatYen(n: number) {
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(n);
}

function sumCounts(items: Array<{ count: number }>) {
  return items.reduce((acc, x) => acc + (Number.isFinite(x.count) ? x.count : 0), 0);
}

function splitIntegerByWeights(total: number, weights: number[]) {
  const t = Math.max(0, Math.trunc(total));
  const w = weights.map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
  const wSum = w.reduce((a, b) => a + b, 0);
  if (t === 0) return weights.map(() => 0);
  if (wSum === 0) return weights.map(() => 0);
  const raw = w.map((x) => (x / wSum) * t);
  const flo = raw.map((x) => Math.floor(x));
  let remaining = t - flo.reduce((a, b) => a + b, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac)
    .map((x) => x.i);
  const out = [...flo];
  for (let k = 0; k < out.length && remaining > 0; k++) {
    out[order[k]] += 1;
    remaining -= 1;
  }
  return out;
}

const WEEKLY_BASE: Record<CategoryKey, number> = {
  // 月〜土: 廃プラ①がAMで1回/日、廃プラ②がPMで1回/日（合計2回/日）
  // 日曜: 1回
  hp1: 6,
  hp2: 6,
  sun: 1,
};

const WEEKS_PER_YEAR = 52;

export default function BudgetPlanMock() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      year: new Date().getFullYear(),
      avgIn: 0,
      mixRatio: 0.0,
      distribution: { hp1: 50, hp2: 40, sun: 10 },
      vendors: {
        hp1: [{ vendorId: "a", count: 6 * 52, altVendorId: "b" }],
        hp2: [{ vendorId: "b", count: 6 * 52, altVendorId: "a" }],
        sun: [{ vendorId: "c", count: 1 * 52, altVendorId: "d" }],
      },
    },
    mode: "onChange",
  });

  const values = form.watch();

  const hp1Array = useFieldArray({ control: form.control, name: "vendors.hp1" });
  const hp2Array = useFieldArray({ control: form.control, name: "vendors.hp2" });
  const sunArray = useFieldArray({ control: form.control, name: "vendors.sun" });

  const annualTotal = useMemo(() => values.avgIn * values.mixRatio, [values.avgIn, values.mixRatio]);
  const distSum = useMemo(
    () => (values.distribution.hp1 ?? 0) + (values.distribution.hp2 ?? 0) + (values.distribution.sun ?? 0),
    [values.distribution.hp1, values.distribution.hp2, values.distribution.sun]
  );

  const annualByCategory = useMemo(() => {
    const hp1 = annualTotal * ((values.distribution.hp1 ?? 0) / 100);
    const hp2 = annualTotal * ((values.distribution.hp2 ?? 0) / 100);
    const sun = annualTotal * ((values.distribution.sun ?? 0) / 100);
    return { hp1, hp2, sun };
  }, [annualTotal, values.distribution.hp1, values.distribution.hp2, values.distribution.sun]);

  const baseCountsYear = useMemo(() => {
    return {
      hp1: WEEKLY_BASE.hp1 * WEEKS_PER_YEAR,
      hp2: WEEKLY_BASE.hp2 * WEEKS_PER_YEAR,
      sun: WEEKLY_BASE.sun * WEEKS_PER_YEAR,
    } as Record<CategoryKey, number>;
  }, []);

  const assignedCountsYear = useMemo(() => {
    return {
      hp1: sumCounts(values.vendors.hp1 ?? []),
      hp2: sumCounts(values.vendors.hp2 ?? []),
      sun: sumCounts(values.vendors.sun ?? []),
    } as Record<CategoryKey, number>;
  }, [values.vendors.hp1, values.vendors.hp2, values.vendors.sun]);

  const countDiff = useMemo(() => {
    return {
      hp1: assignedCountsYear.hp1 - baseCountsYear.hp1,
      hp2: assignedCountsYear.hp2 - baseCountsYear.hp2,
      sun: assignedCountsYear.sun - baseCountsYear.sun,
    } as Record<CategoryKey, number>;
  }, [assignedCountsYear, baseCountsYear]);

  const distOk = Math.abs(distSum - 100) < 0.0001;

  const monthBaseCounts = useMemo(() => {
    const y = clampYear(values.year);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    return months.map((m) => {
      const { monToSat, sundays, daysInMonth } = monthWeekdayCounts(y, m);
      const base: Record<CategoryKey, number> = {
        hp1: monToSat,
        hp2: monToSat,
        sun: sundays,
      };
      return { month: m, label: MonthLabels[m - 1], daysInMonth, base };
    });
  }, [values.year]);

  const monthVendorBreakdown = useMemo(() => {
    const yearBase: Record<CategoryKey, number> = {
      hp1: monthBaseCounts.reduce((acc, x) => acc + x.base.hp1, 0),
      hp2: monthBaseCounts.reduce((acc, x) => acc + x.base.hp2, 0),
      sun: monthBaseCounts.reduce((acc, x) => acc + x.base.sun, 0),
    };

    return monthBaseCounts.map((m) => {
      const byCategory: Record<
        CategoryKey,
        {
          totalCount: number;
          totalVolume: number;
          vendors: Array<{
            vendorId: string;
            vendorName: string;
            count: number;
            volume: number;
            disposalFee: number;
            transportFee: number;
            transportProcessFee: number;
            totalFee: number;
          }>;
        }
      > = {
        hp1: { totalCount: m.base.hp1, totalVolume: 0, vendors: [] },
        hp2: { totalCount: m.base.hp2, totalVolume: 0, vendors: [] },
        sun: { totalCount: m.base.sun, totalVolume: 0, vendors: [] },
      };

      (CategoryKeys as readonly CategoryKey[]).forEach((k) => {
        const baseCountMonth = m.base[k];
        const baseCountYear = yearBase[k] || 0;
        const categoryMonthVolume = baseCountYear > 0 ? (annualByCategory[k] * baseCountMonth) / baseCountYear : 0;
        byCategory[k].totalVolume = categoryMonthVolume;

        const assignedRows = (values.vendors[k] ?? []).filter((r) => r.vendorId);
        const assignedYearTotal = sumCounts(assignedRows as Array<{ count: number }>);
        const weights = assignedRows.map((r) => (assignedYearTotal > 0 ? r.count / assignedYearTotal : 0));
        const vendorCounts = splitIntegerByWeights(baseCountMonth, weights);

        byCategory[k].vendors = assignedRows.map((r, idx) => {
          const c = vendorCounts[idx] ?? 0;
          const vol = baseCountMonth > 0 ? (categoryMonthVolume * c) / baseCountMonth : 0;
          const masterCosts = VendorMaster.find((v) => v.id === r.vendorId)?.costs;
          const disposalPerTon = masterCosts?.disposalPerTon ?? 0;
          const transportPerTrip = masterCosts?.transportPerTrip ?? 0;
          const transportProcessPerTon = masterCosts?.transportProcessPerTon ?? 0;
          const disposalFee = vol * disposalPerTon;
          const transportFee = c * transportPerTrip;
          const transportProcessFee = vol * transportProcessPerTon;
          return {
            vendorId: r.vendorId,
            vendorName: getVendorName(r.vendorId),
            count: c,
            volume: vol,
            disposalFee,
            transportFee,
            transportProcessFee,
            totalFee: disposalFee + transportFee + transportProcessFee,
          };
        });
      });

      return { month: m.month, label: m.label, byCategory };
    });
  }, [annualByCategory, monthBaseCounts, values.vendors]);

  const monthlyTotals = useMemo(() => {
    return monthVendorBreakdown.map((m) => {
      const allRows = CategoryKeys.flatMap((k) => m.byCategory[k].vendors);
      const count = CategoryKeys.reduce((acc, k) => acc + m.byCategory[k].totalCount, 0);
      const volume = CategoryKeys.reduce((acc, k) => acc + m.byCategory[k].totalVolume, 0);
      const disposalFee = allRows.reduce((a, r) => a + r.disposalFee, 0);
      const transportFee = allRows.reduce((a, r) => a + r.transportFee, 0);
      const transportProcessFee = allRows.reduce((a, r) => a + r.transportProcessFee, 0);
      const totalFee = allRows.reduce((a, r) => a + r.totalFee, 0);
      return { month: m.month, label: m.label, count, volume, disposalFee, transportFee, transportProcessFee, totalFee };
    });
  }, [monthVendorBreakdown]);

  type MetricKey = "count" | "volume" | "disposalFee" | "transportFee" | "transportProcessFee" | "totalFee";
  const metricLabels: Record<MetricKey, string> = {
    count: "回数",
    volume: "量",
    disposalFee: "排出費用",
    transportFee: "運搬費用",
    transportProcessFee: "運搬処理費用",
    totalFee: "合計費用",
  };

  const pivotRows = useMemo(() => {
    type Cell = { count: number; volume: number; disposalFee: number; transportFee: number; transportProcessFee: number; totalFee: number };
    type Row = {
      rowKey: string;
      category: CategoryKey;
      vendorId: string;
      vendorName: string;
      months: Record<number, Cell>;
      annual: Cell;
    };

    const map = new Map<string, Row>();
    for (const m of monthVendorBreakdown) {
      for (const k of CategoryKeys) {
        for (const r of m.byCategory[k].vendors) {
          const key = `${k}__${r.vendorId}`;
          const existing = map.get(key);
          const cell: Cell = {
            count: r.count,
            volume: r.volume,
            disposalFee: r.disposalFee,
            transportFee: r.transportFee,
            transportProcessFee: r.transportProcessFee,
            totalFee: r.totalFee,
          };
          if (!existing) {
            map.set(key, {
              rowKey: key,
              category: k,
              vendorId: r.vendorId,
              vendorName: r.vendorName,
              months: { [m.month]: cell },
              annual: { ...cell },
            });
          } else {
            existing.months[m.month] = cell;
            existing.annual = {
              count: existing.annual.count + cell.count,
              volume: existing.annual.volume + cell.volume,
              disposalFee: existing.annual.disposalFee + cell.disposalFee,
              transportFee: existing.annual.transportFee + cell.transportFee,
              transportProcessFee: existing.annual.transportProcessFee + cell.transportProcessFee,
              totalFee: existing.annual.totalFee + cell.totalFee,
            };
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.vendorName.localeCompare(b.vendorName);
    });
  }, [monthVendorBreakdown]);

  const hp1AnnualTotals = useMemo(() => {
    const rows = pivotRows.filter((r) => r.category === "hp1");
    const total = rows.reduce(
      (acc, r) => {
        acc.count += r.annual.count;
        acc.volume += r.annual.volume;
        acc.disposalFee += r.annual.disposalFee;
        acc.transportFee += r.annual.transportFee;
        acc.transportProcessFee += r.annual.transportProcessFee;
        acc.totalFee += r.annual.totalFee;
        return acc;
      },
      { count: 0, volume: 0, disposalFee: 0, transportFee: 0, transportProcessFee: 0, totalFee: 0 }
    );
    return { rows, total };
  }, [pivotRows]);

  const categoryBlocks: Array<{
    key: CategoryKey;
    // 区分ごとに useFieldArray の型引数が異なるため、ここでは共通化して扱う（モック用途）
    fieldArray: typeof hp1Array | typeof hp2Array | typeof sunArray;
  }> = [
    { key: "hp1", fieldArray: hp1Array },
    { key: "hp2", fieldArray: hp2Array },
    { key: "sun", fieldArray: sunArray },
  ];

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">予算計画（モックアップ）</h1>
            <p className="mt-1 text-sm text-gray-600">
              DB/テーブル定義前のフロントモックです（入力 → 概算計算 → 割当の整合性チェック）。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => form.reset()}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
            >
              リセット
            </button>
            <button
              type="button"
              onClick={() => {
                const ok = schema.safeParse(values).success;
                alert(ok ? "入力は形式上OKです（モック）" : "入力に不正があります（モック）");
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              形式チェック
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-lg font-bold text-gray-900">基本入力</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="text-sm font-semibold text-gray-700">対象年</div>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    step={1}
                    {...form.register("year")}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="例: 2026"
                  />
                  <div className="mt-1 text-xs text-gray-500">月別の曜日回数（実日数）に反映します。</div>
                </label>

                <label className="block">
                  <div className="text-sm font-semibold text-gray-700">平均搬入量</div>
                  <input
                    type="number"
                    step="0.01"
                    {...form.register("avgIn")}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="例: 1200"
                  />
                  <div className="mt-1 text-xs text-gray-500">単位は仮（モック）。</div>
                </label>

                <label className="block">
                  <div className="text-sm font-semibold text-gray-700">前年度混合比率</div>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    {...form.register("mixRatio")}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="例: 0.35"
                  />
                  <div className="mt-1 text-xs text-gray-500">0〜1（例: 0.35）として入力。</div>
                </label>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900">基準排出量の配分（廃プラ①/②/日曜）</h2>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    distOk ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  配分合計: {formatNumber(distSum)}%
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {CategoryKeys.map((k) => (
                  <label key={k} className="block">
                    <div className="text-sm font-semibold text-gray-700">{CategoryLabel[k]}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={100}
                        {...form.register(`distribution.${k}`)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      概算: {formatNumber(annualByCategory[k])}
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                <div className="font-semibold">前提（モック固定）</div>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-600">
                  <li>月〜土は2回排出（廃プラ①がAM、廃プラ②がPM）</li>
                  <li>日曜日は1回排出</li>
                  <li>年間回数は 52週換算で表示</li>
                </ul>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-lg font-bold text-gray-900">処分先業者の割当（追加/削除/回数調整）</h2>
              <p className="mt-1 text-sm text-gray-600">
                廃プラ①/②/日曜ごとに、処分先業者と回数、代替処分業者を設定します（モック）。
              </p>

              <div className="mt-4 space-y-6">
                {categoryBlocks.map(({ key, fieldArray }) => {
                  const base = baseCountsYear[key];
                  const assigned = assignedCountsYear[key];
                  const diff = countDiff[key];
                  const badge =
                    diff === 0
                      ? "bg-green-100 text-green-800"
                      : diff > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800";

                  return (
                    <div key={key} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-base font-bold text-gray-900">{CategoryLabel[key]}</div>
                          <div className="mt-1 text-xs text-gray-600">
                            年間回数（基準）: {base} / 割当合計: {assigned}
                          </div>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-xs font-bold ${badge}`}>
                          差分: {diff > 0 ? `+${diff}` : diff}
                        </div>
                      </div>

                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-500">
                              <th className="py-2 pr-3">処分先業者</th>
                              <th className="py-2 pr-3">回数（年）</th>
                              <th className="py-2 pr-3">代替処分業者</th>
                              <th className="py-2 pr-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {fieldArray.fields.map((f, idx) => (
                              <tr key={f.id} className="align-middle">
                                <td className="py-2 pr-3">
                                  <select
                                    {...form.register(`vendors.${key}.${idx}.vendorId`)}
                                    className="w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                  >
                                    <option value="">選択</option>
                                    {VendorMaster.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-2 pr-3">
                                  <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    {...form.register(`vendors.${key}.${idx}.count`)}
                                    className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                  />
                                </td>
                                <td className="py-2 pr-3">
                                  <select
                                    {...form.register(`vendors.${key}.${idx}.altVendorId`)}
                                    className="w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                                  >
                                    <option value="">（なし）</option>
                                    {VendorMaster.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-2 pr-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => fieldArray.remove(idx)}
                                    className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                                  >
                                    削除
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            fieldArray.append({
                              vendorId: "",
                              count: 0,
                              altVendorId: "",
                            })
                          }
                          className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                        >
                          + 割当を追加
                        </button>
                        <div className="text-xs text-gray-500">
                          ※「回数（年）」はモックでは年間回数扱い（52週換算）
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-lg font-bold text-gray-900">月別配分・集計（区分 × 月 × 業者）</h2>
              <p className="mt-1 text-sm text-gray-600">
                回数は対象年の実日数（曜日）から算出し、各月の回数を業者へ按分しています（モック）。
              </p>

              <div className="mt-4 rounded-xl bg-white ring-1 ring-gray-100 overflow-x-auto">
                <div className="px-4 pt-4 text-sm font-bold text-gray-900">月ごとの合計（全区分合算）</div>
                <table className="min-w-[900px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-4 py-3">月</th>
                      <th className="px-4 py-3">回数合計</th>
                      <th className="px-4 py-3">量合計</th>
                      <th className="px-4 py-3">排出費用合計</th>
                      <th className="px-4 py-3">運搬費用合計</th>
                      <th className="px-4 py-3">運搬処理費用合計</th>
                      <th className="px-4 py-3">費用合計</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthlyTotals.map((m) => (
                      <tr key={m.month}>
                        <td className="px-4 py-2 font-semibold text-gray-900">{m.label}</td>
                        <td className="px-4 py-2">{m.count}</td>
                        <td className="px-4 py-2">{formatNumber(m.volume)}</td>
                        <td className="px-4 py-2">{formatYen(m.disposalFee)}</td>
                        <td className="px-4 py-2">{formatYen(m.transportFee)}</td>
                        <td className="px-4 py-2">{formatYen(m.transportProcessFee)}</td>
                        <td className="px-4 py-2 font-bold text-gray-900">{formatYen(m.totalFee)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200">
                    <tr className="font-bold">
                      <td className="px-4 py-3 text-gray-900">年間合計</td>
                      <td className="px-4 py-3">{monthlyTotals.reduce((a, x) => a + x.count, 0)}</td>
                      <td className="px-4 py-3">{formatNumber(monthlyTotals.reduce((a, x) => a + x.volume, 0))}</td>
                      <td className="px-4 py-3">{formatYen(monthlyTotals.reduce((a, x) => a + x.disposalFee, 0))}</td>
                      <td className="px-4 py-3">{formatYen(monthlyTotals.reduce((a, x) => a + x.transportFee, 0))}</td>
                      <td className="px-4 py-3">{formatYen(monthlyTotals.reduce((a, x) => a + x.transportProcessFee, 0))}</td>
                      <td className="px-4 py-3">{formatYen(monthlyTotals.reduce((a, x) => a + x.totalFee, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-6 rounded-xl bg-white ring-1 ring-gray-100 overflow-x-auto">
                <div className="px-4 pt-4">
                  <div className="text-sm font-bold text-gray-900">一覧集計（区分 × 排出先 × 月）</div>
                  <div className="mt-1 text-xs text-gray-600">
                    各セルは「回数/量/費用」をまとめて表示します（モック）。
                  </div>
                </div>
                <table className="min-w-[1200px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-4 py-3">区分</th>
                      <th className="px-4 py-3">排出先</th>
                      {Array.from({ length: 12 }, (_, i) => (
                        <th key={i + 1} className="px-4 py-3">{MonthLabels[i]}</th>
                      ))}
                      <th className="px-4 py-3">年間</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pivotRows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-3 text-gray-500" colSpan={15}>
                          まず各区分に排出先業者の割当を追加してください。
                        </td>
                      </tr>
                    ) : (
                      pivotRows.map((r) => (
                        <tr key={r.rowKey} className="align-top">
                          <td className="px-4 py-3 font-semibold text-gray-900">{CategoryLabel[r.category]}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{r.vendorName}</td>
                          {Array.from({ length: 12 }, (_, i) => {
                            const m = i + 1;
                            const cell = r.months[m];
                            return (
                              <td key={m} className="px-4 py-3 whitespace-nowrap">
                                {!cell ? (
                                  <span className="text-gray-400">-</span>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="text-xs text-gray-600">{metricLabels.count}: {cell.count}</div>
                                    <div className="text-xs text-gray-600">{metricLabels.volume}: {formatNumber(cell.volume)}</div>
                                    <div className="text-xs font-bold text-gray-900">{metricLabels.totalFee}: {formatYen(cell.totalFee)}</div>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 whitespace-nowrap bg-gray-50">
                            <div className="space-y-1">
                              <div className="text-xs text-gray-700">{metricLabels.count}: {r.annual.count}</div>
                              <div className="text-xs text-gray-700">{metricLabels.volume}: {formatNumber(r.annual.volume)}</div>
                              <div className="text-xs font-bold text-gray-900">{metricLabels.totalFee}: {formatYen(r.annual.totalFee)}</div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 rounded-xl bg-white ring-1 ring-gray-100 overflow-x-auto">
                <div className="px-4 pt-4">
                  <div className="text-sm font-bold text-gray-900">廃プラ① 年間合計（排出先別 + 全体）</div>
                </div>
                <table className="min-w-[900px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-4 py-3">排出先</th>
                      <th className="px-4 py-3">回数合計</th>
                      <th className="px-4 py-3">量合計</th>
                      <th className="px-4 py-3">排出費用合計</th>
                      <th className="px-4 py-3">運搬費用合計</th>
                      <th className="px-4 py-3">運搬処理費用合計</th>
                      <th className="px-4 py-3">費用合計</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {hp1AnnualTotals.rows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-3 text-gray-500" colSpan={7}>
                          廃プラ①の排出先割当が未設定です。
                        </td>
                      </tr>
                    ) : (
                      hp1AnnualTotals.rows.map((r) => (
                        <tr key={r.rowKey}>
                          <td className="px-4 py-2 font-semibold text-gray-900">{r.vendorName}</td>
                          <td className="px-4 py-2">{r.annual.count}</td>
                          <td className="px-4 py-2">{formatNumber(r.annual.volume)}</td>
                          <td className="px-4 py-2">{formatYen(r.annual.disposalFee)}</td>
                          <td className="px-4 py-2">{formatYen(r.annual.transportFee)}</td>
                          <td className="px-4 py-2">{formatYen(r.annual.transportProcessFee)}</td>
                          <td className="px-4 py-2 font-bold text-gray-900">{formatYen(r.annual.totalFee)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {hp1AnnualTotals.rows.length > 0 && (
                    <tfoot className="border-t border-gray-200">
                      <tr className="font-bold">
                        <td className="px-4 py-3 text-gray-900">全体</td>
                        <td className="px-4 py-3">{hp1AnnualTotals.total.count}</td>
                        <td className="px-4 py-3">{formatNumber(hp1AnnualTotals.total.volume)}</td>
                        <td className="px-4 py-3">{formatYen(hp1AnnualTotals.total.disposalFee)}</td>
                        <td className="px-4 py-3">{formatYen(hp1AnnualTotals.total.transportFee)}</td>
                        <td className="px-4 py-3">{formatYen(hp1AnnualTotals.total.transportProcessFee)}</td>
                        <td className="px-4 py-3">{formatYen(hp1AnnualTotals.total.totalFee)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div className="mt-4 space-y-6">
                {monthVendorBreakdown.map((m) => (
                  <div key={m.month} className="rounded-xl border border-gray-200 p-4">
                    <div className="text-base font-bold text-gray-900">{m.label}</div>

                    <div className="mt-3 space-y-5">
                      {CategoryKeys.map((k) => {
                        const rows = m.byCategory[k].vendors;
                        const totalCount = m.byCategory[k].totalCount;
                        const totalVol = m.byCategory[k].totalVolume;
                        const totalDisposal = rows.reduce((a, r) => a + r.disposalFee, 0);
                        const totalTransport = rows.reduce((a, r) => a + r.transportFee, 0);
                        const totalTP = rows.reduce((a, r) => a + r.transportProcessFee, 0);
                        const totalAll = rows.reduce((a, r) => a + r.totalFee, 0);

                        return (
                          <div key={k} className="rounded-lg bg-gray-50 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-bold text-gray-900">{CategoryLabel[k]}</div>
                              <div className="text-xs text-gray-600">
                                排出回数: {totalCount} / 排出量: {formatNumber(totalVol)}
                              </div>
                            </div>

                            <div className="mt-3 overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs text-gray-500">
                                    <th className="py-2 pr-3">業者</th>
                                    <th className="py-2 pr-3">排出回数</th>
                                    <th className="py-2 pr-3">排出量</th>
                                    <th className="py-2 pr-3">排出費用</th>
                                    <th className="py-2 pr-3">運搬費用</th>
                                    <th className="py-2 pr-3">運搬処理費用</th>
                                    <th className="py-2 pr-3">費用合計</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {rows.length === 0 ? (
                                    <tr>
                                      <td className="py-2 pr-3 text-gray-500" colSpan={7}>
                                        業者割当が未設定です（この区分の割当を追加してください）
                                      </td>
                                    </tr>
                                  ) : (
                                    rows.map((r) => (
                                      <tr key={`${k}-${m.month}-${r.vendorId}`}>
                                        <td className="py-2 pr-3 font-semibold text-gray-900">{r.vendorName}</td>
                                        <td className="py-2 pr-3">{r.count}</td>
                                        <td className="py-2 pr-3">{formatNumber(r.volume)}</td>
                                        <td className="py-2 pr-3">{formatNumber(r.disposalFee)}</td>
                                        <td className="py-2 pr-3">{formatNumber(r.transportFee)}</td>
                                        <td className="py-2 pr-3">{formatNumber(r.transportProcessFee)}</td>
                                        <td className="py-2 pr-3 font-bold text-gray-900">{formatNumber(r.totalFee)}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                                {rows.length > 0 && (
                                  <tfoot>
                                    <tr className="border-t border-gray-200 text-sm font-bold">
                                      <td className="py-2 pr-3 text-gray-900">小計</td>
                                      <td className="py-2 pr-3">{rows.reduce((a, r) => a + r.count, 0)}</td>
                                      <td className="py-2 pr-3">{formatNumber(rows.reduce((a, r) => a + r.volume, 0))}</td>
                                      <td className="py-2 pr-3">{formatNumber(totalDisposal)}</td>
                                      <td className="py-2 pr-3">{formatNumber(totalTransport)}</td>
                                      <td className="py-2 pr-3">{formatNumber(totalTP)}</td>
                                      <td className="py-2 pr-3">{formatNumber(totalAll)}</td>
                                    </tr>
                                  </tfoot>
                                )}
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-lg font-bold text-gray-900">概算結果</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="text-gray-600">年間排出量（概算）</div>
                  <div className="font-bold text-gray-900">{formatNumber(annualTotal)}</div>
                </div>
                <div className="h-px bg-gray-100" />
                {CategoryKeys.map((k) => (
                  <div key={k} className="flex items-center justify-between">
                    <div className="text-gray-600">{CategoryLabel[k]}</div>
                    <div className="font-semibold text-gray-900">{formatNumber(annualByCategory[k])}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-gray-50 p-4 text-xs text-gray-700">
                <div className="font-semibold">計算式（要件準拠）</div>
                <div className="mt-1 text-gray-600">年間排出量 = 平均搬入量 × 混合比率</div>
                <div className="mt-1 text-gray-600">各区分 = 年間排出量 × 配分%</div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-lg font-bold text-gray-900">整合性チェック（モック）</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-gray-700">配分%</div>
                  <div className={`font-bold ${distOk ? "text-green-700" : "text-red-700"}`}>
                    {distOk ? "OK（100%）" : `NG（合計 ${formatNumber(distSum)}%）`}
                  </div>
                </div>
                <div className="h-px bg-gray-100" />
                {CategoryKeys.map((k) => {
                  const diff = countDiff[k];
                  const ok = diff === 0;
                  return (
                    <div key={k} className="flex items-start justify-between gap-3">
                      <div className="text-gray-700">{CategoryLabel[k]} 回数</div>
                      <div className={`font-bold ${ok ? "text-green-700" : "text-red-700"}`}>
                        {ok ? "OK" : `NG（差分 ${diff > 0 ? `+${diff}` : diff}）`}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-xs text-gray-500">
                ※この段階では「回数の基準（年換算）」や「単位」は暫定表示です。テーブル定義後に確定できます。
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

