/* ----------------------------------------------------------------
 * PdfPreview.tsx
 * PDFプレビューモーダル
 * ダウンロードボタンとPDFプレビューを表示する
 * ESCキーで閉じることができる
 * ---------------------------------------------------------------- */

import React, { useEffect, useCallback } from "react";
import { Document, Page } from "react-pdf";
import { pdfjs } from "react-pdf";
import { downloadPdf, uploadPdf } from "../utils/pdfUtils";

// PDF.js worker設定
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfPreviewProps {
  pdfBlob: Blob;
  fileName: string;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({
  pdfBlob,
  fileName,
  onClose,
  loading,
  error,
}) => {
  // モーダル表示時に背景のスクロールを無効化
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // キーボードショートカット（ESCキーで閉じる）
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col z-50">
      {/* ヘッダー */}
      <div className="backdrop-blur-sm text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8  flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z"
              />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-red-500 rounded-sm w-8 h-8 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 32 32"
              >
                <path
                  fill="currentColor"
                  d="M9 16a1 1 0 0 0-1 1v5a1 1 0 1 0 2 0v-1h.5a2.5 2.5 0 0 0 0-5zm1.5 3H10v-1h.5a.5.5 0 0 1 0 1m3.5-2a1 1 0 0 1 1-1h.5a3.5 3.5 0 1 1 0 7H15a1 1 0 0 1-1-1zm2 3.915a1.5 1.5 0 0 0 0-2.83zM20 22v-5a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-2v1h2a1 1 0 1 1 0 2h-2v1a1 1 0 1 1-2 0M6 5v8H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1v1a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-1h1a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V9.828a3 3 0 0 0-.879-2.12l-4.828-4.83A3 3 0 0 0 18.172 2H9a3 3 0 0 0-3 3m3-1h7v5a3 3 0 0 0 3 3h5v1H8V5a1 1 0 0 1 1-1M8 27v-1h16v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1M24 9.828V10h-5a1 1 0 0 1-1-1V4h.172a1 1 0 0 1 .707.293l4.828 4.828a1 1 0 0 1 .293.707M5 15h22v9H5z"
                />
              </svg>
            </div>
            <h1 className="text-lg font-medium text-white">{fileName}</h1>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => downloadPdf(pdfBlob, fileName)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 bg-opacity-80 hover:bg-blue-700 hover:bg-opacity-90 text-white rounded-md transition-colors font-medium backdrop-blur-sm"
            title="ダウンロード"
          >
            <span className="i-uiw-download text-xl"></span>
            ダウンロード
          </button>
          <button
            onClick={() => uploadPdf(pdfBlob, fileName)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 bg-opacity-80 hover:bg-red-700 hover:bg-opacity-90 text-white rounded-md transition-colors font-medium backdrop-blur-sm"
            title="アップロード"
          >
            <span className="i-uiw-download text-xl"></span>
            アップロード
          </button>
        </div>
      </div>

      {/* PDFプレビュー */}
      <div className="flex-1 overflow-auto" onClick={onClose}>
        {loading && (
          <div className="flex justify-center items-center h-full">
            <span className="i-svg-spinners-ring-resize text-gray-600 text-5xl"></span>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-white rounded-lg shadow-2xl p-12 mt-12">
              <div className="text-red-500">PDFの読み込みに失敗しました</div>
            </div>
          </div>
        )}

        {pdfBlob && !loading && !error && (
          <div className="w-full flex justify-center mb-10">
            <div onClick={(e) => e.stopPropagation()}>
              <Document
                file={pdfBlob}
                error={
                  <div className="flex justify-center">
                    <div className="bg-white rounded-lg shadow-2xl p-12 mt-12">
                      <div className="text-red-500">
                        PDFの読み込みに失敗しました
                      </div>
                    </div>
                  </div>
                }
                onLoadError={(error) =>
                  console.error("PDF読み込みエラー:", error)
                }
              >
                <Page
                  pageNumber={1}
                  width={800}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-lg"
                />
              </Document>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfPreview;
