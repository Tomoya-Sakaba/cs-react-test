import { pdf } from "@react-pdf/renderer";
import { useState, type ComponentType } from "react";

// PDFコンポーネントに渡すpropsの型を汎用的にする
export type PdfPreviewData<T> = {
  fileName: string;
  pdfBlob: Blob;
  data: T;
};

// APIレスポンスの型定義
export type TestPdfData = {
  dayLabel: string;
  isHoliday: boolean;
  isSaturday: boolean;
  content1: { time: string; company: string };
  content2: { time: string; company: string };
  content3: { time: string; company: string };
  content4: { time: string; company: string };
  note: string;
};

type UsePdfPreviewReturn<T> = {
  handlePreviewPdf: (
    data: T,
    PdfComponent: ComponentType<{ data: T }>
  ) => Promise<void>;
  closePreview: () => void;
  previewData: PdfPreviewData<T> | null;
  loading: boolean;
  error: string | null;
  isOpen: boolean;
};

export const usePdfPreview = <T,>(
  currentYear: number,
  currentIndexMonth: number
): UsePdfPreviewReturn<T> => {
  const [previewData, setPreviewData] = useState<PdfPreviewData<T> | null>(
    null
  );
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = currentIndexMonth + 1;

  // PDF モーダルプレビュー
  const handlePreviewPdf = async (
    data: T,
    PdfComponent: ComponentType<{ data: T }>
  ) => {
    setIsOpen(true);
    setLoading(true);
    setError(null);

    try {
      // PDF element生成
      const pdfElement = <PdfComponent data={data} />;

      // PDF binary生成
      const blob = await pdf(pdfElement).toBlob();

      const fileName = `${currentYear}_${currentMonth
        .toString()
        .padStart(2, "0")}テストPDF.pdf`;

      // プレビューデータをセット
      setPreviewData({
        fileName: fileName,
        pdfBlob: blob,
        data: data,
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

export const fetchTestData = async (
  year: number,
  month: number
): Promise<PdfPreviewData<TestPdfData[]>> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    fileName: `${year}_${month.toString().padStart(2, "0")}テストPDF.pdf`,
    pdfBlob: new Blob(),
    data: [
      {
        dayLabel: "1（月）",
        isHoliday: false,
        isSaturday: false,
        content1: { time: "09:00", company: "A株式会社" },
        content2: { time: "19:00", company: "B株式会社" },
        content3: { time: "09:00", company: "C株式会社" },
        content4: { time: "18:00", company: "D株式会社" },
        note: "",
      },
      {
        dayLabel: "2（火）",
        isHoliday: false,
        isSaturday: false,
        content1: { time: "09:00", company: "A株式会社" },
        content2: { time: "18:00", company: "B株式会社" },
        content3: { time: "09:00", company: "C株式会社" },
        content4: { time: "18:00", company: "D株式会社" },
        note: "",
      },
      {
        dayLabel: "3（水）",
        isHoliday: false,
        isSaturday: false,
        content1: { time: "09:00", company: "A株式会社" },
        content2: { time: "18:00", company: "B株式会社" },
        content3: { time: "09:00", company: "C株式会社" },
        content4: { time: "18:00", company: "D株式会社" },
        note: "",
      },
    ],
  };
};
