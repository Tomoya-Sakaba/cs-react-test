import React, { useState } from "react";
import type {
  AttendanceData,
  ProcessedAttendanceData,
} from "../../types/attendance";

type AttendanceRecordDataProps = {
  attendanceList: ProcessedAttendanceData[];
  handleInputChange: (
    index: number,
    field: keyof AttendanceData,
    value: string
  ) => void;
  handleBreakChange: (index: number, value: string) => void;
  getRowBgClass: (item: AttendanceData) => string;
  isEditing: boolean;
};

const AttendanceRecordData: React.FC<AttendanceRecordDataProps> = ({
  attendanceList,
  handleInputChange,
  handleBreakChange,
  getRowBgClass,
  isEditing,
}) => {
  // UI専用の状態管理
  const [showScrollHint, setShowScrollHint] = useState(true);

  // スクロール位置が上部にある場合はスクロールヒントを表示
  const handleScrollHintCheck = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    setShowScrollHint(scrollTop === 0 && scrollHeight > clientHeight);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* テーブル枠 - 明確な境界設定 */}
      <div className="flex flex-col mt-4 mb-2 mx-4 shadow-md border border-gray-300 rounded-lg overflow-hidden flex-1 min-h-0 relative">
        {/* ヘッダー部分（固定） */}
        <div className="flex-shrink-0">
          <table className="table-fixed w-full border-collapse text-center">
            <thead className="bg-gray-100">
              <tr className="text-gray-600">
                <th className="border border-gray-300 w-20 h-8 text-center align-middle">
                  日付
                </th>
                <th className="border border-gray-300 w-16 h-8 text-center align-middle">
                  出勤
                </th>
                <th className="border border-gray-300 w-16 h-8 text-center align-middle">
                  退勤
                </th>
                <th className="border border-gray-300 w-20 h-8 text-center align-middle">
                  休憩（分）
                </th>
                <th className="border border-gray-300 w-16 h-8 text-center align-middle">
                  実働
                </th>
                <th className="border border-gray-300 w-16 h-8 text-center align-middle">
                  基本
                </th>
                <th className="border border-gray-300 w-16 h-8 text-center align-middle">
                  残業
                </th>
                <th className="border border-gray-300 w-16 h-8 text-center align-middle">
                  夜間
                </th>
                <th className="border border-gray-300 w-16 h-8 text-center align-middle">
                  休日
                </th>
                <th className="border border-gray-300 w-16 h-8 text-center align-middle">
                  欠勤
                </th>
                <th className="border border-gray-300 w-24 h-8 text-center align-middle">
                  ステータス
                </th>
                <th className="border border-gray-300 w-32 h-8 text-center align-middle">
                  備考
                </th>
              </tr>
            </thead>
          </table>
        </div>

        {/* データ部分（スクロール可能） */}
        <div
          className="flex-1 overflow-auto hidden-scrollbar min-h-0"
          onScroll={handleScrollHintCheck}
        >
          <table className="table-fixed w-full border-collapse text-center">
            <tbody>
              {attendanceList.map((item, index) => {
                return (
                  <tr key={index} className={getRowBgClass(item)}>
                    {/* 日付 */}
                    <td className="border border-gray-300 whitespace-nowrap w-20 h-8 text-center align-middle">
                      {item.dayLabel}
                    </td>
                    {/* 出勤 */}
                    <td className="border border-gray-300 w-16 h-8 text-center align-middle">
                      {isEditing ? (
                        <input
                          type="time"
                          className="input input-bordered input-sm w-full text-center"
                          value={item.startTime}
                          onChange={(e) =>
                            handleInputChange(
                              index,
                              "startTime",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        item.startTime || "-"
                      )}
                    </td>
                    {/* 退勤 */}
                    <td className="border border-gray-300 w-16 h-8 text-center align-middle">
                      {isEditing ? (
                        <input
                          type="time"
                          className="input input-bordered input-sm w-full text-center"
                          value={item.endTime}
                          onChange={(e) =>
                            handleInputChange(index, "endTime", e.target.value)
                          }
                        />
                      ) : (
                        item.endTime || "-"
                      )}
                    </td>
                    {/* 休憩 */}
                    <td className="border border-gray-300 w-20 h-8 text-center align-middle">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          max={720}
                          step={5}
                          className="input input-bordered input-sm w-full text-center"
                          value={item.breakTime ?? ""}
                          onChange={(e) =>
                            handleBreakChange(index, e.target.value)
                          }
                        />
                      ) : item.breakTime == 0 ? (
                        "-"
                      ) : (
                        `${item.breakTime ?? ""} 分`
                      )}
                    </td>
                    {/* 実働 */}
                    <td className="border border-gray-300 w-16 h-8 text-center align-middle">
                      {item.actualHours == 0
                        ? "-"
                        : item.actualHours.toFixed(2)}
                    </td>
                    {/* 基本 */}
                    <td className="border border-gray-300 w-16 h-8 text-center align-middle">
                      {item.basicHours == 0 ? "-" : item.basicHours.toFixed(2)}
                    </td>
                    {/* 残業 */}
                    <td className="border border-gray-300 w-16 h-8 text-center align-middle">
                      {item.overtime == 0 ? "-" : item.overtime.toFixed(2)}
                    </td>
                    {/* 夜間 */}
                    <td className="border border-gray-300 w-16 h-8 text-center align-middle">
                      {item.nightHours == 0 ? "-" : item.nightHours.toFixed(2)}
                    </td>
                    {/* 休日 */}
                    <td className="border border-gray-300 w-16 h-8 text-center align-middle">
                      {/* 「休日」列の表示: item.isHoliday (土日または祝日) で、かつ勤務時間が入っている場合のみ表示 */}
                      {item.isHoliday && item.startTime && item.endTime
                        ? item.actualHours == 0
                          ? "-"
                          : item.actualHours.toFixed(2)
                        : "-"}
                    </td>
                    {/* 欠勤 */}
                    <td className="border border-gray-300 w-16 h-8 text-center align-middle">
                      {item.isAbsent ? "〇" : "-"}
                    </td>
                    {/* ステータス */}
                    <td className="border border-gray-300 w-24 h-8 text-center align-middle">
                      {isEditing ? (
                        <select
                          className="input input-bordered input-sm w-full"
                          value={item.status || ""}
                          onChange={(e) =>
                            handleInputChange(index, "status", e.target.value)
                          }
                        >
                          <option value="">選択してください</option>
                          <option value="有給">有給</option>
                          <option value="欠勤">欠勤</option>
                          <option value="午前休">午前休</option>
                          <option value="午後休">午後休</option>
                        </select>
                      ) : (
                        item.status || "-"
                      )}
                    </td>
                    {/* 備考 */}
                    <td className="border border-gray-300 w-32 h-8 text-center align-middle">
                      {isEditing ? (
                        <input
                          type="text"
                          className="input input-bordered input-sm w-full"
                          value={item.note}
                          onChange={(e) =>
                            handleInputChange(index, "note", e.target.value)
                          }
                        />
                      ) : (
                        item.note || "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* スクロールヒント */}
        <div
          className={`absolute bottom-1 right-1 pointer-events-none transition-opacity duration-500 ease-in-out ${
            showScrollHint ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="rounded-full p-2 animate-bounce">
            <span className="i-mdi-chevron-down-circle text-gray-600 opacity-30 h-10 w-10"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceRecordData;
