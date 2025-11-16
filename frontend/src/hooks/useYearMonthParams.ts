/* ----------------------------------
 * frontend/src/hooks/useYearMonthParams.ts
 * 年月パラメータのフック
 * ---------------------------------- */
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

type AvailableYearMonth = { year: number; month: number };

export const useYearMonthParams = (
  availableYearMonths?: AvailableYearMonth[]
) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // 利用可能な年月のセットを作成（高速な検索のため）
  const availableSet =
    availableYearMonths && availableYearMonths.length > 0
      ? new Set(availableYearMonths.map((ym) => `${ym.year}-${ym.month}`))
      : null;

  // URLパラメータから値を取得、なければデフォルト値
  const currentYear = (() => {
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const year = Number(yearParam);
    const month = Number(monthParam);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12の形式

    // 利用可能な年月が指定されている場合、その中から選択
    if (availableSet && availableYearMonths && availableYearMonths.length > 0) {
      // URLパラメータの年月が利用可能かチェック
      if (year && month && availableSet.has(`${year}-${month}`)) {
        return year;
      }

      // URLパラメータがない場合、現在の年月が利用可能かチェック
      if (!yearParam && !monthParam) {
        if (availableSet.has(`${currentYear}-${currentMonth}`)) {
          return currentYear;
        }
        // 現在の年月が利用可能でない場合は、利用可能な年月の最初のものを使用
        return availableYearMonths[0].year;
      }

      // URLパラメータがあるが利用可能でない場合は、利用可能な年月の最初のものを使用
      return availableYearMonths[0].year;
    }

    // バリデーション: 過去3年〜3年後まで
    return year && year >= currentYear - 3 && year <= currentYear + 3
      ? year
      : currentYear;
  })();

  const currentIndexMonth = (() => {
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const month = Number(monthParam);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12の形式

    // 利用可能な年月が指定されている場合、その中から選択
    if (availableSet && availableYearMonths && availableYearMonths.length > 0) {
      const year = Number(yearParam);

      // URLパラメータの年月が利用可能かチェック
      if (year && month && availableSet.has(`${year}-${month}`)) {
        // monthParamは1-12の形式なので、0-11のインデックスに変換
        return month - 1;
      }

      // URLパラメータがない場合、現在の年月が利用可能かチェック
      if (!yearParam && !monthParam) {
        if (availableSet.has(`${currentYear}-${currentMonth}`)) {
          return now.getMonth(); // 0-11のインデックス
        }
        // 現在の年月が利用可能でない場合は、利用可能な年月の最初のものを使用
        return availableYearMonths[0].month - 1;
      }

      // URLパラメータがあるが利用可能でない場合は、利用可能な年月の最初のものを使用
      return availableYearMonths[0].month - 1;
    }

    // バリデーション: monthParamが1-12の範囲内かチェック
    if (month >= 1 && month <= 12) {
      return month - 1; // 0-11のインデックスに変換
    }

    // デフォルト値（現在の月）
    return now.getMonth();
  })();

  const setCurrentYear = (year: number) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      // 利用可能な年月が指定されている場合、その年が利用可能かチェック
      if (availableSet && availableYearMonths) {
        const availableMonths = availableYearMonths
          .filter((ym) => ym.year === year)
          .map((ym) => ym.month);

        if (availableMonths.length === 0) {
          // その年に利用可能な月がない場合は何もしない
          return prev;
        }

        // 現在の月を取得
        const currentMonth = Number(newParams.get('month'));

        // 現在の月がその年で利用可能でない場合、最初の利用可能な月に設定
        if (!currentMonth || !availableMonths.includes(currentMonth)) {
          newParams.set('year', year.toString());
          newParams.set('month', availableMonths[0].toString());
          return newParams;
        }
      }

      newParams.set('year', year.toString());
      return newParams;
    });
  };

  const setCurrentMonth = (month: number) => {
    const monthValue = month + 1; // 1-12に変換

    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      // 利用可能な年月が指定されている場合、その年月が利用可能かチェック
      if (availableSet && availableYearMonths) {
        // 現在の年を取得
        const yearParam = newParams.get('year');
        const targetYear = yearParam
          ? Number(yearParam)
          : new Date().getFullYear();

        // その年月が利用可能かチェック
        if (!availableSet.has(`${targetYear}-${monthValue}`)) {
          // 利用可能でない場合は何もしない
          return prev;
        }
      }

      newParams.set('month', monthValue.toString());
      return newParams;
    });
  };

  // 利用可能でない年月が指定されている場合、URLパラメータを更新
  useEffect(() => {
    if (
      !availableSet ||
      !availableYearMonths ||
      availableYearMonths.length === 0
    ) {
      return;
    }

    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const year = Number(yearParam);
    const month = Number(monthParam);

    // 年月が両方指定されているが利用可能でない場合
    if (yearParam && monthParam && !availableSet.has(`${year}-${month}`)) {
      const firstAvailable = availableYearMonths[0];
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('year', firstAvailable.year.toString());
        newParams.set('month', firstAvailable.month.toString());
        return newParams;
      });
    }
  }, [searchParams, availableSet, availableYearMonths, setSearchParams]);

  return {
    currentYear,
    currentIndexMonth,
    setCurrentYear,
    setCurrentMonth,
  };
};
