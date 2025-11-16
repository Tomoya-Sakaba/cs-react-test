import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useYearMonthParams } from "../hooks/useYearMonthParams";

type YearMonthFilterProps = {
  availableYearMonths: { year: number; month: number }[];
  loading?: boolean;
  allowAllMonths?: boolean; // 新規作成モードの場合、すべての年月を選択可能にする
};

const YearMonthFilter = ({
  availableYearMonths,
  loading = false,
  allowAllMonths = false,
}: YearMonthFilterProps) => {
  const { currentYear, currentIndexMonth, setCurrentYear, setCurrentMonth } =
    useYearMonthParams(allowAllMonths ? undefined : availableYearMonths);
  const [, setSearchParams] = useSearchParams();

  // 利用可能な年月のセットを作成（高速な検索のため）
  const availableSet = allowAllMonths
    ? null
    : new Set(availableYearMonths.map((ym) => `${ym.year}-${ym.month}`));

  // 利用可能な年を取得（重複を除去してソート）
  const availableYears = allowAllMonths
    ? // 新規作成モードの場合は、現在年±3年の範囲を表示
    Array.from(
      { length: 7 },
      (_, i) => new Date().getFullYear() - 3 + i
    ).sort((a, b) => b - a)
    : // 通常モードの場合は、利用可能な年のみを表示
    Array.from(
      new Set(availableYearMonths.map((ym) => ym.year))
    ).sort((a, b) => b - a);

  // 現在選択されている年で利用可能な月を取得
  const availableMonthsForCurrentYear = useMemo(() => {
    if (allowAllMonths) {
      // 新規作成モードの場合は、すべての月（1-12）を表示
      return Array.from({ length: 12 }, (_, i) => i + 1);
    }
    return availableYearMonths
      .filter((ym) => ym.year === currentYear)
      .map((ym) => ym.month)
      .sort((a, b) => a - b);
  }, [availableYearMonths, currentYear, allowAllMonths]);

  // 前月に移動
  const handlePreviousMonth = () => {
    const currentMonth = currentIndexMonth + 1; // 1-12に変換
    let targetYear = currentYear;
    let targetMonth = currentMonth - 1;

    if (targetMonth < 1) {
      // 前年の12月に移動
      targetYear = currentYear - 1;
      targetMonth = 12;
    }

    // 新規作成モードの場合は常に移動可能、通常モードの場合は利用可能な年月かチェック
    if (allowAllMonths || (availableSet && availableSet.has(`${targetYear}-${targetMonth}`))) {
      // 年と月を同時に設定
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('year', targetYear.toString());
        newParams.set('month', targetMonth.toString());
        return newParams;
      });
    }
  };

  // 来月に移動
  const handleNextMonth = () => {
    const currentMonth = currentIndexMonth + 1; // 1-12に変換
    let targetYear = currentYear;
    let targetMonth = currentMonth + 1;

    if (targetMonth > 12) {
      // 翌年の1月に移動
      targetYear = currentYear + 1;
      targetMonth = 1;
    }

    // 新規作成モードの場合は常に移動可能、通常モードの場合は利用可能な年月かチェック
    if (allowAllMonths || (availableSet && availableSet.has(`${targetYear}-${targetMonth}`))) {
      // 年と月を同時に設定
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('year', targetYear.toString());
        newParams.set('month', targetMonth.toString());
        return newParams;
      });
    }
  };

  // 前月ボタンが有効かどうか
  const canGoPrevious = allowAllMonths
    ? true // 新規作成モードの場合は常に有効
    : (() => {
      const currentMonth = currentIndexMonth + 1;
      let targetYear = currentYear;
      let targetMonth = currentMonth - 1;

      if (targetMonth < 1) {
        targetYear = currentYear - 1;
        targetMonth = 12;
      }

      return availableSet ? availableSet.has(`${targetYear}-${targetMonth}`) : false;
    })();

  // 来月ボタンが有効かどうか
  const canGoNext = allowAllMonths
    ? true // 新規作成モードの場合は常に有効
    : (() => {
      const currentMonth = currentIndexMonth + 1;
      let targetYear = currentYear;
      let targetMonth = currentMonth + 1;

      if (targetMonth > 12) {
        targetYear = currentYear + 1;
        targetMonth = 1;
      }

      return availableSet ? availableSet.has(`${targetYear}-${targetMonth}`) : false;
    })();

  if (loading && !allowAllMonths) {
    return <div>読み込み中...</div>;
  }

  if (!allowAllMonths && availableYearMonths.length === 0) {
    return <div>データが存在する年月がありません。</div>;
  }

  return (
    <div className="flex items-center gap-2">

      <select
        value={currentYear}
        onChange={(e) => setCurrentYear(Number(e.target.value))}
        className="
                block w-auto px-4 py-2 text-base text-gray-800
                bg-white border border-gray-400 rounded-md shadow-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:border-transparent
                transition duration-200 ease-in-out
                appearance-none bg-no-repeat bg-right-center pr-8
                hover:border-blue-400
              "
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundSize: "1.2em",
          backgroundPosition: "calc(100% - 12px) center",
        }}
      >
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}年
          </option>
        ))}
      </select>
      {/* 月選択プルダウンのデザイン変更 */}
      <select
        value={currentIndexMonth}
        onChange={(e) => setCurrentMonth(Number(e.target.value))}
        className="
                block w-auto px-4 py-2 text-base text-gray-800
                bg-white border border-gray-400 rounded-md shadow-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:border-transparent
                transition duration-200 ease-in-out
                appearance-none bg-no-repeat bg-right-center pr-8
                hover:border-blue-400
              "
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundSize: "1.2em",
          backgroundPosition: "calc(100% - 12px) center",
        }}
      >
        {availableMonthsForCurrentYear.map((month) => (
          <option key={month} value={month - 1}>
            {month}月
          </option>
        ))}
      </select>
      <button
        onClick={handlePreviousMonth}
        disabled={!canGoPrevious}
        className="
          flex items-center justify-center w-10 h-10
          text-gray-700 bg-white border border-gray-400 rounded-md
          hover:bg-gray-50 hover:border-blue-400
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
          transition duration-200 ease-in-out
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-400
        "
        aria-label="前月"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button
        onClick={handleNextMonth}
        disabled={!canGoNext}
        className="
          flex items-center justify-center w-10 h-10
          text-gray-700 bg-white border border-gray-400 rounded-md
          hover:bg-gray-50 hover:border-blue-400
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
          transition duration-200 ease-in-out
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-400
        "
        aria-label="来月"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  );
};

export default YearMonthFilter;
