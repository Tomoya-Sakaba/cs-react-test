import { useYearMonthParams } from "../hooks/useYearMonthParams";

const YearMonthFilter = () => {
  const { currentYear, currentIndexMonth, setCurrentYear, setCurrentMonth } =
    useYearMonthParams();
  return (
    <>
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
        {Array.from({ length: 7 }, (_, i) => {
          const year = new Date().getFullYear() - 3 + i;
          return (
            <option key={year} value={year}>
              {year}年
            </option>
          );
        })}
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
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={i}>
            {i + 1}月
          </option>
        ))}
      </select>
    </>
  );
};

export default YearMonthFilter;
