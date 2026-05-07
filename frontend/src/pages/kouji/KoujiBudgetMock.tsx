import { useEffect, useMemo, useState } from "react";
import ContentHeader from "../../components/ContentHeader";
import {
  fiscalYearMonths,
  KoujiTestData,
} from "./koujiBudgetTestData";
import { printApi } from "../../api/printApi";
import { downloadPdfOrThrowApiError } from "../../utils/pdfUtils";
import {
  deleteKoujiMonthly,
  fetchKoujiFiscalYearMonthly,
  fetchKoujiList,
  type KoujiDto,
  type KoujiMonthlyDto,
  type KoujiMonthlyType,
  upsertKoujiMonthly,
} from "../../api/koujiApi";

function formatYen(n: number) {
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(n);
}

function pickFirst(obj: any, keys: string[]) {
  for (const k of keys) {
    if (obj != null && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function pickNumber(obj: any, keys: string[], fallback = 0) {
  const v = pickFirst(obj, keys);
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pickString(obj: any, keys: string[], fallback = "") {
  const v = pickFirst(obj, keys);
  return v === undefined || v === null ? fallback : String(v);
}

function keyOf(koujiId: number, yyyymm: number, type: "budget" | "actual") {
  return `${koujiId}:${yyyymm}:${type}`;
}

function MoneyPill({ type, amount }: { type: "budget" | "actual"; amount: number }) {
  const cls =
    type === "budget"
      ? "bg-blue-600 text-white"
      : "bg-red-600 text-white";
  return (
    <div className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {formatYen(amount)}
    </div>
  );
}

export default function KoujiBudgetMock() {
  const now = new Date();
  const currentFiscalYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;

  const [fiscalYear, setFiscalYear] = useState<number>(currentFiscalYear);

  const [koujiList, setKoujiList] = useState<KoujiDto[]>([]);
  const [monthly, setMonthly] = useState<Record<string, KoujiMonthlyDto>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalOriginal, setModalOriginal] = useState<{
    koujiId: number;
    yyyymm: number;
    type: KoujiMonthlyType;
  } | null>(null);
  const [modalDraft, setModalDraft] = useState<{
    koujiId: number;
    yyyymm: number;
    type: KoujiMonthlyType;
    amount: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  const months = useMemo(() => fiscalYearMonths(fiscalYear), [fiscalYear]);

  const totalsByKoujiId = useMemo(() => {
    const totals: Record<number, number> = {};
    for (const k of koujiList) {
      totals[k.koujiId] = months.reduce((acc, m) => {
        const x = monthly[keyOf(k.koujiId, m.yyyymm, "budget")];
        return acc + (x?.amount ?? 0);
      }, 0);
    }
    return totals;
  }, [koujiList, months, monthly]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadError("");
        const list = await fetchKoujiList(false);
        if (!mounted) return;
        setKoujiList(
          (list ?? []).map((x: any) => ({
            koujiId: pickNumber(x, ["koujiId", "KoujiId", "kouji_id", "KoujiID"]),
            koujiName: pickString(x, ["koujiName", "KoujiName", "kouji_name"]),
            cycleYears: pickNumber(x, ["cycleYears", "CycleYears", "cycle_years"]),
            cycleTimes: pickNumber(x, ["cycleTimes", "CycleTimes", "cycle_times"]),
            isActive: Boolean(pickFirst(x, ["isActive", "IsActive", "is_active"]) ?? true),
          }))
        );
        console.log("list", list);
      } catch (e) {
        if (!mounted) return;
        setLoadError("工事一覧の取得に失敗しました。");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadError("");
        const rows = await fetchKoujiFiscalYearMonthly(fiscalYear);
        if (!mounted) return;
        const map: Record<string, KoujiMonthlyDto> = {};
        for (const x of rows ?? []) {
          const xx: any = x;
          const normalized: KoujiMonthlyDto = {
            koujiId: pickNumber(xx, ["koujiId", "KoujiId", "kouji_id", "KoujiID"]),
            yyyymm: pickNumber(xx, ["yyyymm", "Yyyymm", "kouji_yyyymm", "yyyymm_int"]),
            type: pickString(xx, ["type", "Type"]).toLowerCase() as any,
            amount: pickNumber(xx, ["amount", "Amount"]),
          };
          map[keyOf(normalized.koujiId, normalized.yyyymm, normalized.type)] = normalized;
        }
        setMonthly(map);

        console.log("monthly", map);

      } catch (e) {
        if (!mounted) return;
        setLoadError("月次データの取得に失敗しました。");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fiscalYear]);

  function openEditModal(row: KoujiMonthlyDto) {
    setModalOriginal({ koujiId: row.koujiId, yyyymm: row.yyyymm, type: row.type });
    setModalDraft({ koujiId: row.koujiId, yyyymm: row.yyyymm, type: row.type, amount: row.amount });
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setIsModalOpen(false);
    setModalOriginal(null);
    setModalDraft(null);
  }

  async function saveModal() {
    if (!modalDraft || !modalOriginal) return;
    setIsSaving(true);
    try {
      const originalKey = keyOf(modalOriginal.koujiId, modalOriginal.yyyymm, modalOriginal.type);
      const nextKey = keyOf(modalDraft.koujiId, modalDraft.yyyymm, modalDraft.type);

      // キーが変わった場合は元を削除（移動/タイプ変更）
      if (originalKey !== nextKey) {
        await deleteKoujiMonthly(modalOriginal.koujiId, modalOriginal.yyyymm, modalOriginal.type);
      }

      await upsertKoujiMonthly({
        koujiId: modalDraft.koujiId,
        yyyymm: modalDraft.yyyymm,
        type: modalDraft.type,
        amount: modalDraft.amount,
      });

      // ローカル状態を更新（モック段階: 再fetchではなく軽く反映）
      setMonthly((prev) => {
        const out = { ...prev };
        if (originalKey !== nextKey) delete out[originalKey];
        out[nextKey] = { koujiId: modalDraft.koujiId, yyyymm: modalDraft.yyyymm, type: modalDraft.type, amount: modalDraft.amount };
        return out;
      });

      closeModal();
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteModal() {
    if (!modalOriginal) return;
    setIsSaving(true);
    try {
      await deleteKoujiMonthly(modalOriginal.koujiId, modalOriginal.yyyymm, modalOriginal.type);
      const originalKey = keyOf(modalOriginal.koujiId, modalOriginal.yyyymm, modalOriginal.type);
      setMonthly((prev) => {
        const out = { ...prev };
        delete out[originalKey];
        return out;
      });
      closeModal();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-4">
      <ContentHeader title="工事予算（モック）" subtitle="工事を横1行で表示（予算=青 / 実績=赤）" />

      <div className="mt-4 rounded border bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">t_kouji 一覧 + 年度（月）ヘッダー（モック）</div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">年度</span>
              <input
                className="w-24 rounded border px-2 py-1"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Math.max(2000, Math.min(2100, Math.trunc(Number(e.target.value) || 0))))}
              />
            </label>
            <button
              type="button"
              className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={pdfLoading}
              onClick={async () => {
                setPdfLoading(true);
                try {
                  const res = await printApi.fetchGemBoxPdf({ report: "kouji_budget", reportNo: fiscalYear });
                  await downloadPdfOrThrowApiError(res, `kouji_budget_${fiscalYear}.pdf`);
                } finally {
                  setPdfLoading(false);
                }
              }}
            >
              {pdfLoading ? "PDF生成中..." : "年度PDF（GemBox）"}
            </button>
          </div>
        </div>

        {loadError ? <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</div> : null}

        <div className="mt-3 overflow-auto rounded border">
          <table className="min-w-[1200px] border-collapse text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b">
                <th className="w-72 border-r px-2 py-2 text-left">工事</th>
                <th className="w-28 border-r px-2 py-2 text-right">合計</th>
                {months.map((m) => (
                  <th key={m.yyyymm} className="border-r px-2 py-2 text-center">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(koujiList.length ? koujiList : (KoujiTestData as unknown as KoujiDto[])).map((kouji) => {
                const total = totalsByKoujiId[kouji.koujiId] ?? 0;
                return (
                  <tr key={kouji.koujiId} className="border-b last:border-b-0">
                    <td className="border-r px-2 py-2">
                      <div className="font-medium">{kouji.koujiName}</div>
                      <div className="text-xs text-gray-600">
                        周期: {kouji.cycleYears}年に{kouji.cycleTimes}回 / ID:{kouji.koujiId}
                      </div>
                    </td>
                    <td className="border-r px-2 py-2 text-right font-semibold">{formatYen(total)}</td>
                    {months.map((m) => {
                      const b = Number(monthly[keyOf(kouji.koujiId, m.yyyymm, "budget")]?.amount ?? 0);
                      const a = Number(monthly[keyOf(kouji.koujiId, m.yyyymm, "actual")]?.amount ?? 0);
                      const bRow = monthly[keyOf(kouji.koujiId, m.yyyymm, "budget")] ?? null;
                      const aRow = monthly[keyOf(kouji.koujiId, m.yyyymm, "actual")] ?? null;
                      return (
                        <td key={m.yyyymm} className="border-r px-1 py-1 text-center align-top">
                          <div className="flex min-h-8 flex-col items-center justify-start gap-1">
                            {a > 0 && aRow ? (
                              <button type="button" onClick={() => openEditModal(aRow)} className="hover:opacity-90">
                                <MoneyPill type="actual" amount={a} />
                              </button>
                            ) : null}
                            {b > 0 && bRow ? (
                              <button type="button" onClick={() => openEditModal(bRow)} className="hover:opacity-90">
                                <MoneyPill type="budget" amount={b} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-gray-600">
          - 表の中に「予算/実績」という文字は出しません（青=予算、赤=実績）。<br />
          - いまは DB 連携版です。ピルを押すと編集モーダルが開きます。
        </div>
      </div>

      {isModalOpen && modalDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={closeModal}>
          <div
            className="w-full max-w-md rounded border bg-white p-4 shadow"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold">予算 / 実績 編集</div>
            <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
              <label className="grid gap-1">
                <span className="text-xs text-gray-600">種類</span>
                <select
                  className="rounded border px-2 py-1"
                  value={modalDraft.type}
                  onChange={(e) => setModalDraft({ ...modalDraft, type: e.target.value as KoujiMonthlyType })}
                  disabled={isSaving}
                >
                  <option value="budget">予算（青）</option>
                  <option value="actual">実績（赤）</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-gray-600">時期（年月）</span>
                <select
                  className="rounded border px-2 py-1"
                  value={modalDraft.yyyymm}
                  onChange={(e) => setModalDraft({ ...modalDraft, yyyymm: Number(e.target.value) })}
                  disabled={isSaving}
                >
                  {months.map((m) => (
                    <option key={m.yyyymm} value={m.yyyymm}>
                      {m.yyyymm}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-gray-600">金額</span>
                <input
                  className="rounded border px-2 py-1 text-right"
                  value={String(modalDraft.amount)}
                  onChange={(e) => setModalDraft({ ...modalDraft, amount: Number((e.target.value ?? "").replaceAll(",", "")) || 0 })}
                  disabled={isSaving}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded border border-red-300 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                onClick={deleteModal}
                disabled={isSaving}
              >
                削除
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
                  onClick={closeModal}
                  disabled={isSaving}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  onClick={saveModal}
                  disabled={isSaving}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

