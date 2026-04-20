import axios from "axios";
import type { AxiosResponse } from "axios";

/**
 * Content-Disposition からファイル名を取り出す（filename= / RFC5987 filename*=）。
 * ブラウザの axios ではヘッダー名が小文字化されることがある。
 */
export function parseContentDispositionFileName(
  header: string | undefined | null
): string | null {
  if (!header || typeof header !== "string") return null;
  const trimmed = header.trim();
  const star = /filename\*\s*=\s*([^']*)''([^;]+)/i.exec(trimmed);
  if (star) {
    try {
      return decodeURIComponent(star[2].trim().replace(/\+/g, "%20"));
    } catch {
      return star[2].trim();
    }
  }
  const m = /filename\s*=\s*("?)([^";\n]*)\1/i.exec(trimmed);
  if (m) {
    const name = m[2].trim();
    return name.length > 0 ? name : null;
  }
  return null;
}

export type PdfBlobResult = { blob: Blob; fileName: string };

/** axios の PDF 応答から Blob と推奨ファイル名を組み立てる */
export function pdfAxiosResponseToResult(
  res: AxiosResponse<Blob>,
  fallbackFileName: string
): PdfBlobResult {
  const h = res.headers ?? {};
  const raw =
    (h["content-disposition"] as string | undefined) ??
    (h["Content-Disposition"] as string | undefined);
  const parsed = parseContentDispositionFileName(raw);
  return {
    blob: res.data,
    fileName: parsed && parsed.length > 0 ? parsed : fallbackFileName,
  };
}

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


export const uploadPdf = async (blob: Blob, fileName: string) => {

  // FormDataに詰める
  const formData = new FormData();
  formData.append("file", blob, fileName);

  // ASP.NET APIへ送信
    await axios.post("/api/pdf/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  alert("アップロード完了！");
};
