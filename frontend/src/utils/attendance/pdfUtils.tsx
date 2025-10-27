/* ----------------------------------------------------------------
 * pdfUtils.tsx
 * 勤怠表PDF生成ユーティリティ
 *
 * PDFファイルのダウンロード、生成、ファイル名生成を行う
 * ---------------------------------------------------------------- */

import { pdf } from "@react-pdf/renderer";
import { fetchAttendanceData } from "./attendanceApi";
import {
  calculateSummary,
  generateMonthlyAttendanceData,
} from "./attendanceDataProcessor";
import AttendanceSheetPdf from "../../components/attendance/AttendanceSheetPdf";

// PDF ダウンロード
export const downloadPdf = async (blob: Blob, fileName: string) => {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("PDF生成エラー:", error);
    throw error;
  }
};

// PDF 生成とダウンロード
export const generateAndDownloadPdf = async (
  userId: string,
  year: number,
  month: number,
  userName: string
) => {
  const blob = await generatePdfBlob(userId, year, month);
  const fileName = generatePdfFilename(userName, year, month);
  downloadPdf(blob, fileName);
};

// PDF 生成
const generatePdfBlob = async (userId: string, year: number, month: number) => {
  try {
    const rawData = await fetchAttendanceData(userId, year, month);

    const tableData = generateMonthlyAttendanceData(rawData, year, month);

    const summary = calculateSummary(tableData);

    const pdfData = {
      userName: rawData.userName,
      clientName: rawData.clientName,
      storeName: rawData.storeName,
      startDate: `${year}年${month}月`,
      tableData: tableData,
      summary: summary,
    };
    // PDF データ生成
    const pdfElement = <AttendanceSheetPdf data={pdfData} />;

    // PDF ダウンロード
    const blob = await pdf(pdfElement).toBlob();
    return blob;
  } catch (error) {
    console.error("PDF生成エラー:", error);
    throw error;
  }
};

const generatePdfFilename = (userName: string, year: number, month: number) => {
  const fileName = `${year}_${month
    .toString()
    .padStart(2, "0")}勤怠表【${userName}】.pdf`;
  return fileName;
};
