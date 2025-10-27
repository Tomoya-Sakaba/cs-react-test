/* ----------------------------------------------------------------
 * useAttendanceRecord.ts
 * 勤怠表ページのカスタムフック
 * マウント時に勤怠データを取得し、加工して表示する
 * ---------------------------------------------------------------- */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useYearMonthParams } from './useYearMonthParams';
import type { AttendanceData, ProcessedAttendanceData } from "../types/attendance";
import { calculateTimes, generateMonthlyAttendanceData, calculateSummary } from "../utils/attendance/attendanceDataProcessor";
import { fetchAttendanceData } from "../utils/attendance/attendanceApi";
//import { useSetAtom } from "jotai";
//import { currentUserAtom } from "../atoms/currentUserAtom";

export const useAttendanceRecord = () => {
  const [attendanceList, setAttendanceList] = useState<ProcessedAttendanceData[]>([]);
  //const setCurrentUser = useSetAtom(currentUserAtom);
  
  // URLパラメータからuserIdを取得
  const { userId } = useParams<{ userId: string }>();
  const targetUserId = userId || "";
  
  // URLパラメータから年月を取得（なければ現在年月を使用）
  const { currentYear, currentIndexMonth, setCurrentYear, setCurrentMonth } = useYearMonthParams();
  const currentMonth = currentIndexMonth + 1;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // rawDataが変更されるたびに処理済みデータを再生成
  useEffect(() => {
    const fetchAndProcessData = async () => {
      if (!targetUserId || !currentYear || currentIndexMonth === undefined) return;
      
      setLoading(true);
      setError(null);

      try {
        // 1. 勤怠データ取得
        const fetchdata = await fetchAttendanceData(targetUserId, currentYear, currentMonth);

        // 2. ユーザー情報をセット
        //setCurrentUser({
        //  userId: targetUserId,
        //  userName: fetchdata.userName,
        //});

        // 3. 勤怠データ加工
        const processedData = generateMonthlyAttendanceData(fetchdata, currentYear, currentIndexMonth);

        // 4. 勤怠データをセット
        setAttendanceList(processedData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'データの取得に失敗しました';
        setError(errorMessage);
        console.error('勤怠データ処理エラー:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAndProcessData();
  }, [targetUserId, currentYear, currentIndexMonth, currentMonth]);

  // 勤怠データの入力変更ハンドラー
  const handleInputChange = <K extends keyof AttendanceData>(
    index: number,
    field: K,
    value: string | number
  ) => {
    const updatedList = [...attendanceList];
    const currentItem = { ...updatedList[index] };
    
    // ベースデータを更新
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (currentItem as any)[field] = value;
    
    const calculatedTimes = calculateTimes(currentItem.date, currentItem.startTime, currentItem.endTime, currentItem.breakTime);
    const isAbsent = currentItem.status === "欠勤";
    
    // 処理済みフィールドを更新
    updatedList[index] = {
      ...currentItem,
      calculatedTimes,
      isAbsent,
      actualHours: calculatedTimes?.actualHours ?? 0,
      basicHours: calculatedTimes?.basicHours ?? 0,
      overtime: calculatedTimes?.overtime ?? 0,
      nightHours: calculatedTimes?.nightHours ?? 0,
    };
    
    setAttendanceList(updatedList);
  };

  // 休憩時間の変更ハンドラー
  const handleBreakChange = (index: number, value: string) => {
    const minutes = Number(value);
    if (isNaN(minutes) || minutes < 0) return;
    handleInputChange(index, "breakTime", minutes);
  };

  // 集計計算
  const summary = calculateSummary(attendanceList);

  // 各行の背景色を決定する関数
  const getRowBgClass = (item: AttendanceData) => {
    // 勤務時間（出勤・退勤）が入力されていれば常に白背景（実働日）
    if (item.startTime && item.endTime) {
      return "bg-white";
    }
    // 勤務時間が未入力で、「欠勤」または「有給」ステータス、または「休日（土日・祝日）」である場合は赤系背景
    if (item.status === "欠勤" || item.status === "有給" || item.isHoliday) {
      return "bg-red-50"; // 欠勤、有給、休日で勤務なしの場合
    }
    // その他の場合（勤務時間が未入力の平日など）はデフォルトの白背景
    return "bg-white";
  };

  return {
    // 状態
    attendanceList,
    processedAttendanceData: attendanceList,
    currentYear,
    currentIndexMonth,
    summary,
    targetUserId, // URLから取得したuserIdを返す
    
    // データ取得状態
    loading,
    error,
    
    // ハンドラー
    setCurrentYear,
    setCurrentMonth,
    handleInputChange,
    handleBreakChange,
    
    // ユーティリティ関数
    getRowBgClass,
  };
};
