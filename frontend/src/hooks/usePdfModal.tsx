import { pdf } from "@react-pdf/renderer";
import { useState, type ComponentType } from "react";

export type PdfModalState<T> = {
  fileName: string;
  pdfBlob: Blob;
  data: T;
};

type UsePdfModalReturn<T> = {
  openWithGeneratedPdf: (
    args: {
      fileName: string;
      data: T;
      PdfComponent: ComponentType<{ data: T }>;
    }
  ) => Promise<void>;
  close: () => void;
  state: PdfModalState<T> | null;
  isOpen: boolean;
  loading: boolean;
  error: string | null;
};

export const usePdfModal = <T,>(): UsePdfModalReturn<T> => {
  const [state, setState] = useState<PdfModalState<T> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openWithGeneratedPdf: UsePdfModalReturn<T>["openWithGeneratedPdf"] = async ({
    fileName,
    data,
    PdfComponent,
  }) => {
    setIsOpen(true);
    setLoading(true);
    setError(null);

    try {
      const pdfElement = <PdfComponent data={data} />;
      const blob = await pdf(pdfElement).toBlob();
      setState({ fileName, pdfBlob: blob, data });
    } catch (err) {
      console.error("PDF生成エラー:", err);
      setError("PDFの生成に失敗しました");
      setState(null);
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setState(null);
    setIsOpen(false);
    setError(null);
  };

  return {
    openWithGeneratedPdf,
    close,
    state,
    isOpen,
    loading,
    error,
  };
};

