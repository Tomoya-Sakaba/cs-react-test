// APIレスポンスの型定義
export interface FetchAttendanceData {
  userName: string;
  clientName: string;
  storeName: string;
  attendanceRecords: {
    date: string;
    startTime?: string;
    endTime?: string;
    breakTime?: number;
  }[];
}

// 勤怠データの型定義
export interface AttendanceData {
  date: Date;
  isHoliday: boolean; // その日が「土日」または「日本の祝日」であれば true
  dayLabel: string;
  startTime?: string; // 出勤 "HH:mm"
  endTime?: string; // 退勤 "HH:mm"
  breakTime?: number; // 休憩時間（分）
  status?: string; // ステータス（有給、欠勤、午前休、午後休など）
  note?: string; // 備考
}

// 計算結果の型定義
export interface TimeCalculation {
  actualHours: number;
  basicHours: number;
  overtime: number;
  nightHours: number;
}

// 処理済み勤怠データの型定義
export interface ProcessedAttendanceData extends AttendanceData {
  calculatedTimes: TimeCalculation | null;
  isAbsent: boolean;
  actualHours: number;
  basicHours: number;
  overtime: number;
  nightHours: number;
}

export interface PreviewData {
  userId: string;
  fileName: string;
  pdfBlob: Blob;
  attendanceData: {
    userName: string;
    clientName: string;
    storeName: string;
    startDate: string;
    tableData: ProcessedAttendanceData[];
  };
}
