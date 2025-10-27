/* ----------------------------------------------------------------
 * AttendanceList.tsx
 * 勤怠一覧ページ
 * ユーザーの勤怠状況やサマリーを一覧表示する
 * PDFのプレビューとダウンロードを行う
 * ---------------------------------------------------------------- */

import { useEffect, useState } from "react";
import { useAttendancePdf } from "../../hooks/useAttendancePdf";
import PdfPreview from "../../components/PdfPreview";
import UserAttendanceItem from "../../components/attendance/UserAttendanceItem";
import ContentHeader from "../../components/ContentHeader";
import YearMonthFilter from "../../components/YearMonthFilter";
import { generateAndDownloadPdf } from "../../utils/attendance/pdfUtils";
import { useYearMonthParams } from "../../hooks/useYearMonthParams";

interface UserAttendanceData {
  userId: string;
  userName: string;
  // サマリーとか
}

const AttendanceList = () => {
  // 年月パラメータを取得
  const { currentYear, currentIndexMonth } = useYearMonthParams();
  const currentMonth = currentIndexMonth + 1;
  const pdfHook = useAttendancePdf(currentYear, currentIndexMonth);
  const [userAttendanceData, setUserAttendanceData] = useState<
    UserAttendanceData[]
  >([]);

  useEffect(() => {
    const fetchUserAttendanceData = async () => {
      // const response = await fetch('/api/user-attendance');
      // const data = await response.json();
      const data = [
        {
          userId: "123",
          userName: "山田 太郎",
        },
        {
          userId: "456",
          userName: "山田 花子",
        },
        {
          userId: "789",
          userName: "山田 次郎",
        },
      ];
      setUserAttendanceData(data);
    };

    fetchUserAttendanceData();
  }, []);

  return (
    <div className="mx-8 flex h-full flex-col">
      <ContentHeader subtitle="Attendance List" title="勤怠一覧" filters={<YearMonthFilter />} />

      <div className=" h-full w-full">
        <ul className="flex flex-col gap-2">
          {userAttendanceData.map((user) => (
            <UserAttendanceItem
              key={user.userId}
              userId={user.userId}
              userName={user.userName}
              onPreviewPdf={pdfHook.handlePreviewPdf}
              onDownloadPdf={() =>
                generateAndDownloadPdf(
                  user.userId,
                  currentYear,
                  currentMonth,
                  user.userName
                )
              }
            />
          ))}
        </ul>
      </div>

      {/* PDFプレビューモーダル */}
      {pdfHook.isOpen && (
        <PdfPreview
          pdfBlob={pdfHook.previewData?.pdfBlob || new Blob()}
          fileName={
            pdfHook.previewData?.fileName ||
            `${new Date().getFullYear()}_${(new Date().getMonth() + 1)
              .toString()
              .padStart(2, "0")}勤怠表.pdf`
          }
          onClose={pdfHook.closePreview}
          loading={pdfHook.loading}
          error={pdfHook.error}
        />
      )}
    </div>
  );
};

export default AttendanceList;
