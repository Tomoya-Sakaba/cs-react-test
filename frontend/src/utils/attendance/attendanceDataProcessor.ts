/* ----------------------------------------------------------------
 * attendanceDataProcessor.ts
 * 勤怠データの加工ユーティリティ
 * 勤怠データの加工、集計計算
 * 
 * 年月、出勤時間、退勤時間、休憩時間から
 * 実働時間、基本時間、残業時間、深夜時間を計算する
 * ---------------------------------------------------------------- */

import Holidays from "date-holidays";
import type { FetchAttendanceData } from "../../types/attendance";
import type { ProcessedAttendanceData } from "../../types/attendance";

// 日本の祝日オブジェクトを一度だけ作成
const hd = new Holidays("JP");

// 月の全日付にrawDataをマッピングする基本関数
export const generateMonthlyAttendanceData = (
  fetchData: FetchAttendanceData | null,
  year: number,
  month: number
): ProcessedAttendanceData[] => {
  const days: ProcessedAttendanceData[] = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  // fetchDataから日付マップ
  const recordMap = new Map();
  fetchData?.attendanceRecords?.forEach((record) => {
    recordMap.set(record.date, record);
  });

  // 月の全日付を生成してデータをマッピング
  for (let i = 1; i <= lastDay; i++) {
    const date = new Date(year, month, i);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    
    // ① 基本データ作成
    // 祝日・土日判定
    const isHoliday =
      hd.isHoliday(date) !== false ||
      date.getDay() === 0 ||
      date.getDay() === 6;

    // 該当日のレコードを取得
    const record = recordMap.get(dateStr);

    // ② 計算処理も同時実行
    const calculatedTimes = calculateTimes(
      date, 
      record?.startTime, 
      record?.endTime, 
      record?.breakTime || 60
    );

    // ③ 最終形式で直接格納
    days.push({
      // 基本データ
      date,
      isHoliday,
      dayLabel: `${i} (${weekdays[date.getDay()]})`,
      startTime: record?.startTime || "",
      endTime: record?.endTime || "",
      breakTime: record?.breakTime || "",
      status: record?.status || "",
      note: record?.note || "",
      
      // 計算済みデータ
      calculatedTimes,
      isAbsent: record?.status === "欠勤",
      actualHours: calculatedTimes?.actualHours ?? 0,
      basicHours: calculatedTimes?.basicHours ?? 0,
      overtime: calculatedTimes?.overtime ?? 0,
      nightHours: calculatedTimes?.nightHours ?? 0,
    });
  }

  return days;
};

export const calculateTimes = (date: Date, startTime?: string, endTime?: string, breakTime = 60) => {
  let start = parseTimeWithDate(date, startTime);
  let end = parseTimeWithDate(date, endTime);

  if (!start || !end) return null;

  // 退勤時刻が出勤時刻より前の場合、日付を翌日にする（日を跨ぐ勤務）
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  // 休憩時間（分→時間）
  const restHours = breakTime / 60;
  // 実働時間 = (退勤 - 出勤) - 休憩
  const actualHours = Math.max(0, diffHours(start, end) - restHours);
  // 基本時間（8時間まで）
  const basicHours = Math.min(actualHours, 8);
  // 残業時間（8時間を超える分）
  const overtime = Math.max(0, actualHours - 8);
  // 深夜時間
  const nightHours = calculateNightHours(start, end);

  return { actualHours, basicHours, overtime, nightHours };
};

// 計算関数群（既存のAttendanceListから移動）
const parseTimeWithDate = (date: Date, timeStr?: string): Date | null => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;

  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
};

// 時間の差分を計算
const diffHours = (start: Date, end: Date): number => {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

// 深夜時間の計算
const calculateNightHours = (start: Date, end: Date): number => {
  if (end <= start) return 0;

  let totalNightHours = 0;

  // 深夜開始：当日22時
  const nightStart = new Date(start);
  nightStart.setHours(22, 0, 0, 0);

  // 深夜終了：翌日5時
  const nightEnd = new Date(start);
  nightEnd.setDate(nightEnd.getDate() + 1); // 日付を翌日に進める
  nightEnd.setHours(5, 0, 0, 0);

  // 当日の22:00から24:00までの深夜時間
  const midnight = new Date(start);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);

  const overlap1Start = Math.max(start.getTime(), nightStart.getTime());
  const overlap1End = Math.min(end.getTime(), midnight.getTime());
  if (overlap1End > overlap1Start) {
    totalNightHours += diffHours(
      new Date(overlap1Start),
      new Date(overlap1End)
    );
  }

  // 翌日の0:00から5:00までの深夜時間
  const overlap2Start = Math.max(start.getTime(), midnight.getTime());
  const overlap2End = Math.min(end.getTime(), nightEnd.getTime());
  if (overlap2End > overlap2Start) {
    totalNightHours += diffHours(
      new Date(overlap2Start),
      new Date(overlap2End)
    );
  }

  return totalNightHours;
};

/**
 * 勤怠データの集計計算を行う
 */
export const calculateSummary = (attendanceList: ProcessedAttendanceData[]) => {
  return attendanceList.reduce(
    (acc, item) => {
      // 勤務時間が入力されていれば総出勤日数をカウント
      if (item.startTime && item.endTime) {
        acc.totalWorkDays += 1;
      }

      // 処理済みデータから直接取得
      acc.totalActualHours += item.actualHours;
      acc.totalOvertime += item.overtime;
      acc.totalNightHours += item.nightHours;

      // 休日出勤日数のカウントロジック
      // その日が「isHoliday (土日または祝日)」であり、かつ「出勤・退勤時刻が入力されている」場合のみカウント
      if (item.isHoliday && item.startTime && item.endTime) {
        acc.totalHolidayWorkHours += item.actualHours;
      }

      return acc;
    },
    {
      totalWorkDays: 0,
      totalActualHours: 0,
      totalOvertime: 0,
      totalNightHours: 0,
      totalHolidayWorkHours: 0,
    }
  );
};