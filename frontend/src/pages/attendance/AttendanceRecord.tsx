/* ----------------------------------------------------------------
 * AttendanceRecord.tsx
 * 勤怠表ページ
 * ---------------------------------------------------------------- */

import React, { useState } from "react";
import AttendanceRecordData from "../../components/attendance/AttendanceRecordData";
import ContentHeader from "../../components/ContentHeader";
import YearMonthFilter from "../../components/YearMonthFilter";
import ToolButton from "../../components/ToolButton";
import AttendanceSummary from "../../components/attendance/AttendanceSummary";
import PdfPreview from "../../components/PdfPreview";
import { useAttendanceRecord } from "../../hooks/useAttendanceRecord";
import { useAttendancePdf } from "../../hooks/useAttendancePdf";
import { generateAndDownloadPdf } from "../../utils/attendance/pdfUtils";
//import { useAtomValue } from "jotai";
//import { currentUserAtom } from "../../atoms/currentUserAtom";

const AttendanceRecord: React.FC = () => {
  const attendanceData = useAttendanceRecord();
  const [isEditing, setIsEditing] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  //const currentUser = useAtomValue(currentUserAtom);

  const currentYear = attendanceData.currentYear;
  const currentIndexMonth = attendanceData.currentIndexMonth;
  const currentMonth = currentIndexMonth + 1;
  const pdfHook = useAttendancePdf(currentYear, currentIndexMonth);

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  // ローディングとエラー表示
  if (attendanceData.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="i-svg-spinners-ring-resize text-5xl text-gray-600"></span>
      </div>
    );
  }

  if (attendanceData.error) {
    return (
      <div className="mx-8 flex h-full flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-red-500">エラー: {attendanceData.error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-8 flex h-full flex-col">
        {/*userName={currentUser?.userName || ""}*/}
      <ContentHeader
        subtitle="Attendance Record"
        title="勤怠表"
        userName={""}
        filters={<YearMonthFilter availableYearMonths={[]} loading={false} />}
        actions={
          <ToolButton onClick={toggleEditMode}>
            {isEditing ? "保存" : "編集"}
          </ToolButton>
        }
        spreadActions={{
          userId: attendanceData.targetUserId,
          onPreviewPdf: pdfHook.handlePreviewPdf,
          onDownloadPdf: () =>
            generateAndDownloadPdf(
              attendanceData.targetUserId,
              currentYear,
              currentMonth,
              //currentUser?.userName || "ユーザー名"
              "ユーザー名"
            ),
        }}
      />
      <main className="flex min-h-0 flex-1 flex-col pl-4">
        <AttendanceSummary
          summary={attendanceData.summary}
          isSummaryOpen={isSummaryOpen}
          setIsSummaryOpen={() => setIsSummaryOpen(!isSummaryOpen)}
        />
        <AttendanceRecordData
          isEditing={isEditing}
          attendanceList={attendanceData.processedAttendanceData}
          handleInputChange={attendanceData.handleInputChange}
          handleBreakChange={attendanceData.handleBreakChange}
          getRowBgClass={attendanceData.getRowBgClass}
        />
      </main>

      {/* PDFプレビューモーダル */}
      {pdfHook.isOpen && pdfHook.previewData && (
        <PdfPreview
          pdfBlob={pdfHook.previewData.pdfBlob}
          fileName={pdfHook.previewData.fileName}
          onClose={pdfHook.closePreview}
          loading={pdfHook.loading}
          error={pdfHook.error}
        />
      )}
    </div>
  );
};

export default AttendanceRecord;
