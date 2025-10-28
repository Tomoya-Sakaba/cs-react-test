/* ----------------------------------
* frontend/src/hooks/useYearMonthParams.ts
* 年月パラメータのフック
* ---------------------------------- */
import { useSearchParams } from 'react-router-dom';

export const useYearMonthParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URLパラメータから値を取得、なければデフォルト値
  const currentYear = (() => {
    const year = Number(searchParams.get('year'));
    const currentYear = new Date().getFullYear();
    // バリデーション: 過去3年〜3年後まで
    return year >= currentYear - 3 && year <= currentYear + 3 
      ? year 
      : currentYear;
  })();
  
  const currentIndexMonth = (() => {
    const month = Number(searchParams.get('month')) - 1;
    // バリデーション: 0-11
    return month >= 0 && month <= 11 
      ? month 
      : new Date().getMonth();
  })();
  
  const setCurrentYear = (year: number) => {
    setSearchParams(prev => ({
      ...Object.fromEntries(prev),
      year: year.toString()
    }));
  };
  
  const setCurrentMonth = (month: number) => {
    setSearchParams(prev => ({
      ...Object.fromEntries(prev),
      month: (month + 1).toString()
    }));
  };
  
  return {
    currentYear,
    currentIndexMonth,
    setCurrentYear,
    setCurrentMonth,
  };
};
