/* ----------------------------------------------------------------
 * useAttendancePdf.tsx
 * 勤怠表PDF生成フック
 *
 * Note: このフックは内部でJSX(<Pdf>)を使用するため.tsxファイルです
 * ---------------------------------------------------------------- */

import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import AttendanceSheetPdf from "../components/attendance/AttendanceSheetPdf";
import {
  calculateSummary,
  generateMonthlyAttendanceData,
} from "../utils/attendance/attendanceDataProcessor";
import type { PreviewData } from "../types/attendance";
import { fetchAttendanceData } from "../utils/attendance/attendanceApi";

type UserPrintButton = {
  handlePreviewPdf: (userId: string) => Promise<void>;
  closePreview: () => void;
  previewData: PreviewData | null;
  loading: boolean;
  error: string | null;
  isOpen: boolean;
};

export const useAttendancePdf = (
  currentYear: number,
  currentIndexMonth: number
): UserPrintButton => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = currentIndexMonth + 1;

  // PDF モーダルプレビュー
  const handlePreviewPdf = async (userId: string) => {
    setIsOpen(true);
    setLoading(true);
    setError(null);

    // 初期化
    setPreviewData({
      userId: userId,
      fileName: `${currentYear}_${currentMonth
        .toString()
        .padStart(2, "0")}勤怠表.pdf`,
      pdfBlob: new Blob(),
      attendanceData: {
        userName: "",
        clientName: "",
        storeName: "",
        startDate: "",
        tableData: [],
      },
    });

    try {
      // useAttendanceDataを使用してデータ取得
      const rawData = await fetchAttendanceData(
        userId,
        currentYear,
        currentMonth
      );

      // 共通関数でPDF用データに変換
      const processedData = generateMonthlyAttendanceData(
        rawData,
        currentYear,
        currentIndexMonth
      );

      const summary = calculateSummary(processedData);

      const pdfData = {
        userName: rawData.userName,
        clientName: rawData.clientName,
        storeName: rawData.storeName,
        startDate: `${currentYear}年${currentMonth}月`,
        summary: summary,
        tableData: processedData,
      };

      // PDF element生成
      const pdfElement = <AttendanceSheetPdf data={pdfData} />;

      // PDF binary生成
      const blob = await pdf(pdfElement).toBlob();

      const fileName = `${currentYear}_${currentMonth
        .toString()
        .padStart(2, "0")}勤怠表【${rawData.userName}】.pdf`;

      // プレビューデータをセット
      setPreviewData({
        userId: userId,
        fileName: fileName,
        pdfBlob: blob,
        attendanceData: pdfData,
      });
    } catch (err) {
      console.error("PDF生成エラー:", err);
      setError("PDFの生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // プレビューを閉じる
  const closePreview = () => {
    setPreviewData(null);
    setIsOpen(false);
    setError(null);
  };

  return {
    handlePreviewPdf,
    previewData,
    closePreview,
    loading,
    error,
    isOpen,
  };
};
