import React, { useCallback, useEffect } from "react";

type ImagePreviewProps = {
  imageUrl: string;
  title: string;
  onClose: () => void;
};

const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  title,
  onClose,
}) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
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
      {/* ヘッダー（PdfPreview風） */}
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
            <div className="bg-slate-600 rounded-sm w-8 h-8 flex items-center justify-center">
              <span className="i-mdi-image text-2xl" />
            </div>
            <h1 className="text-lg font-medium text-white">{title}</h1>
          </div>
        </div>
      </div>

      {/* 画像プレビュー */}
      <div className="flex-1 overflow-auto" onClick={onClose}>
        <div className="w-full flex justify-center mb-10">
          <div onClick={(e) => e.stopPropagation()} className="mt-6">
            <img
              src={imageUrl}
              alt={title}
              className="max-w-[92vw] max-h-[80vh] object-contain shadow-2xl rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreview;

