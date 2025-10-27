/* ---------------------------------------------
/ useAttendanceStamping.ts
/ 出退勤打刻フック
/ 打刻ページマウント時に今日の出退勤記録を取得
/ 出勤打刻ボタンを押すと出勤打刻処理を行う
/ 退勤打刻ボタンを押すと退勤打刻処理を行う
/ --------------------------------------------- */

import { useSetAtom } from 'jotai';
import { useState, useCallback, useEffect } from 'react';
import { attendanceRecordAtom } from '../atoms/attendanceAtom';

type AttendanceRecord = {
  clockInTime: string | null;
  clockOutTime: string | null;
  date: string;
};

export const useTimeStamping = () => {
  // 出退勤記録を管理する
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord>({
    clockInTime: null,
    clockOutTime: null,
    date: new Date().toDateString()
  });

  // 勤怠状況を管理する
  const setIsWorking = useSetAtom(attendanceRecordAtom);

  // ローディングを管理
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const adjustClockTime = (date: Date): Date => {
    const minutes = date.getMinutes();
    const hours = date.getHours();

    const rounded = new Date(date);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);

    if (minutes < 15) {
      rounded.setMinutes(0);
    } else if (minutes < 45) {
      rounded.setMinutes(30);
    } else {
      rounded.setMinutes(0);
      rounded.setHours(hours + 1);
    }
    return rounded;
  }

  // 今日の出退勤記録を取得
  const fetchTodayAttendance = useCallback(async () => {
    try {
      setIsLoading(true);
      // TODO: API呼び出し（一旦fetchだがaxiosに変更予定）
      // const res = await fetch(`/api/attendance`);
      // const data = await res.json();
      // setAttendanceRecord({
      //   clockInTime: data.clockInTime,
      //   clockOutTime: data.clockOutTime,
      //   date: new Date().toDateString()
      // });
      // setIsWorking(!!data.clockInTime && !data.clockOutTime);
      setIsLoading(false);
    } catch (error) {
      console.error('出退勤記録の取得に失敗しました', error);
      setIsLoading(false);
    }
  }, []);

  // マウント時に今日の出退勤記録を取得
  useEffect(() => {
    // fetchTodayAttendance();
    console.log('fetchTodayAttendance');
  }, [fetchTodayAttendance]);

  // 出勤処理
  const clockIn = useCallback(() => {
    const now = new Date();
    const adjustedTime = adjustClockTime(now).toLocaleTimeString('ja-JP', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    setAttendanceRecord(prev => ({
      ...prev,
      clockInTime: adjustedTime
    }));

    setIsWorking(true);

    // TODO: API呼び出し
    console.log(`出勤: ${adjustedTime}`);
  }, [setIsWorking, setAttendanceRecord]);

  // 退勤処理
  const clockOut = useCallback(() => {
    const now = new Date();
    const adjustedTime = adjustClockTime(now).toLocaleTimeString('ja-JP', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    setAttendanceRecord(prev => ({
      ...prev,
      clockOutTime: adjustedTime,
    }));

    setIsWorking(false);
    
    // TODO: API呼び出し
    console.log(`退勤: ${adjustedTime}`);
  }, [setIsWorking, setAttendanceRecord]);

  return {
    attendanceRecord,
    isLoading,
    clockIn,
    clockOut,
  };
};
