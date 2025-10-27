/* ---------------------------------------------
/ TimeStamping.tsx
/ 出退勤打刻ページ
/ 出勤打刻ボタンを押すと出勤打刻処理を行う
/ 退勤打刻ボタンを押すと退勤打刻処理を行う
/ 打刻処理はuseTimeStampingフックを使用する
/ --------------------------------------------- */

import NowDateTime from "../../components/attendance/NowDateTime";
import ContentHeader from "../../components/ContentHeader";
import Button from "../../components/Home-service-button";
import TransitionBtn from "../../components/TransitionBtn";
import { useTimeStamping } from "../../hooks/useAttendanceStamping";

const TimeStamping = () => {
  const { attendanceRecord, clockIn, clockOut } = useTimeStamping();
  // TODO: 出勤打刻処理
  function handleClockIn() {
    clockIn();
    alert("出勤したよー");
  }

  // TODO: 退勤打刻処理
  function handleClockOut() {
    clockOut();
    alert("退勤したよー");
  }

  return (
    <div className="mx-8 h-full flex flex-col">
      <ContentHeader subtitle="Time Stamping" title="勤怠打刻" />
      <article className="flex-1 flex flex-col justify-center">
        <div className="space-y-14">
          {/* 現在日時 */}
          <NowDateTime className="text-center" />

          {/* 出退勤記録 */}
          <div className="text-center rounded-lg p-6 mx-[20%]">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-center items-center">
                <h3 className="text-xl font-bold text-gray-700 mr-4">
                  出勤時刻
                </h3>
                <p
                  className={`text-2xl font-mono leading-none flex items-center h-8 ${
                    !!attendanceRecord.clockInTime
                      ? "text-green-600"
                      : "text-gray-700"
                  }`}
                >
                  {attendanceRecord.clockInTime || "--:--"}
                </p>
              </div>
              <div className="flex justify-center items-center">
                <h3 className="text-lg font-bold text-gray-700 mr-4">
                  退勤時刻
                </h3>
                <p
                  className={`text-2xl font-mono leading-none flex items-center h-8 ${
                    !!attendanceRecord.clockOutTime
                      ? "text-red-600"
                      : "text-gray-700"
                  }`}
                >
                  {attendanceRecord.clockOutTime || "--:--"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-28 px-[20%]">
            {/* 出勤ボタン */}
            <Button
              colorScheme="gray"
              fontSize="4xl"
              disabled={!!attendanceRecord.clockInTime}
              onClick={handleClockIn}
            >
              出勤
            </Button>
            {/* 退勤ボタン */}
            <Button
              colorScheme="gray"
              fontSize="4xl"
              disabled={
                !attendanceRecord.clockInTime || !!attendanceRecord.clockOutTime
              }
              onClick={handleClockOut}
            >
              退勤
            </Button>
          </div>
        </div>
      </article>
      <TransitionBtn
        to="/attendance/record/me"
        className="justify-end mr-10 mb-4"
        direction="right"
      >
        勤怠表
      </TransitionBtn>
    </div>
  );
};

export default TimeStamping;
