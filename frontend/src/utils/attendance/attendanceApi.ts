// utils/attendanceApi.ts

// APIレスポンスの型定義
export interface RawAttendanceData {
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

export const fetchAttendanceData = async (
  _userId: string,
  year: number, 
  month: number
): Promise<RawAttendanceData> => {
  // 実際のAPI呼び出し
  // const response = await axios.get(`/api/attendance/${_userId}/${year}/${month}`);
  // return response.data;
  
  // モック処理
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    userName: "山田 太郎",
    clientName: "クライアント名",
    storeName: "",
    attendanceRecords: [
      {
        date: `${year}-${String(month).padStart(2, '0')}-01`,
        startTime: "09:00",
        endTime: "18:00",
        breakTime: 60,
      },
      {
        date: `${year}-${String(month).padStart(2, '0')}-02`,
        startTime: "09:00",
        endTime: "19:00",
        breakTime: 60,
      },
      {
        date: `${year}-${String(month).padStart(2, '0')}-04`,
        startTime: "09:00",
        endTime: "18:00",
        breakTime: 60,
      },
      {
        date: `${year}-${String(month).padStart(2, '0')}-05`,
        startTime: "20:00",
        endTime: "08:30",
        breakTime: 60,
      },
      // ...
    ],
  };
};