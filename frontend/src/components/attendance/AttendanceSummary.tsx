type AttendanceSummaryProps = {
  summary: {
    totalWorkDays: number;
    totalActualHours: number;
    totalOvertime: number;
    totalNightHours: number;
    totalHolidayWorkHours: number;
  };
  isSummaryOpen: boolean;
  setIsSummaryOpen: () => void;
};

const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({
  summary,
  isSummaryOpen,
  setIsSummaryOpen,
}) => {
  return (
    <div
      className={`border rounded-lg mx-8 bg-gray-50 shadow-sm w-[calc(100%-4rem)] overflow-hidden flex-shrink-0 transition-all duration-500 ease-in-out hover:border-gray-700 hover:shadow-md ${
        isSummaryOpen ? "max-h-96 border-gray-700 shadow-md" : "max-h-16"
      }`}
      onClick={setIsSummaryOpen}
    >
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-xl">集計結果</h3>
          <div
            className={`transform transition-transform ${
              isSummaryOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            ▼
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-left text-gray-700">
          <div>
            <strong>実働日数:</strong> {summary.totalWorkDays} 日
          </div>
          <div>
            <strong>実働時間:</strong> {summary.totalActualHours.toFixed(2)}{" "}
            時間
          </div>
          <div>
            <strong>残業時間:</strong> {summary.totalOvertime.toFixed(2)} 時間
          </div>
          <div>
            <strong>深夜時間:</strong> {summary.totalNightHours.toFixed(2)} 時間
          </div>
          <div>
            <strong>休日出勤時間:</strong>{" "}
            {summary.totalHolidayWorkHours.toFixed(2)} 時間
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummary;
