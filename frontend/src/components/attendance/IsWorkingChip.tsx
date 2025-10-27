/* ---------------------------------------------
/ IsWorkingChip.tsx
/ 勤務ステータス表示コンポーネント
/ ホバーで勤務中か未出勤かを表示
/ --------------------------------------------- */

import { useAtomValue } from "jotai";
import { attendanceRecordAtom } from "../../atoms/attendanceAtom";

interface IsWorkingChipProps {
  className?: string;
}

const IsWorkingChip: React.FC<IsWorkingChipProps> = ({ className }) => {
  const isWorking = useAtomValue(attendanceRecordAtom);

  return (
    <div className={`relative inline-block group ${className || ""}`}>
      {/* 勤務ステータス */}
      <div
        className={`relative w-4 h-4 rounded-full cursor-pointer transition-all duration-200 ${
          isWorking
            ? "bg-green-500 shadow-green-400 shadow-[0_0_10px_#4ade80,0_0_20px_#4ade80,0_0_30px_#22c55e] animate-pulse"
            : "bg-gray-400 shadow-lg shadow-gray-400/50"
        } hover:scale-110 ${
          isWorking
            ? "hover:shadow-[0_0_15px_#4ade80,0_0_25px_#4ade80,0_0_35px_#22c55e]"
            : ""
        }`}
      >
        {isWorking && (
          <div className="absolute inset-[2px] rounded-full bg-green-300/60"></div>
        )}
      </div>

      {/* 勤務状況のツールチップ */}
      <div className="ease-in duration-300 opacity-0 group-hover:block group-hover:opacity-100 transition-all">
        <div className="ease-in-out duration-500 pointer-events-none transition-all group-hover:translate-y-2 absolute left-1/2 top-full z-50 flex -translate-x-1/2 flex-col items-center rounded-xl text-center text-sm text-slate-300">
          <div className="h-0 w-fit border-l-8 border-r-8 border-b-8 border-transparent border-b-black"></div>
          <div className="rounded-xl bg-black py-2 px-4">
            <p className="whitespace-nowrap text-white">
              {isWorking ? "勤務中" : "未出勤"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IsWorkingChip;
