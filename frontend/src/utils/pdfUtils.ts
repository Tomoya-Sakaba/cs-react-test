import axios from "axios";
import type { AxiosResponse } from "axios";

// PDF ダウンロード（DOM 操作は通常同期で例外はほぼ出ない。エラー処理は呼び出し側の try/catch に任せる）
export const downloadPdf = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

// PDF を別タブで開く（blob URL）
export const openPdfInNewTab = (blob: Blob, revokeAfterMs = 120_000) => {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), revokeAfterMs);
};

export type ApiError = { errCode?: string; message?: string };

async function downloadBlobOrThrowApiError(
  res: AxiosResponse<Blob>,
  fileName: string,
  isExpectedContentType: (contentTypeLower: string) => boolean,
  unknownErrCode: string
): Promise<void> {
  const headers = (res.headers ?? {}) as Record<string, string | undefined>;
  const contentType =
    (headers["content-type"] ?? headers["Content-Type"] ?? "").toLowerCase();

  if (isExpectedContentType(contentType)) {
    downloadPdf(res.data, fileName);
    return;
  }

  const xErr = headers["x-err-code"] ?? headers["X-Err-Code"];
  let parsed: ApiError | null = null;
  try {
    const text = await res.data.text();
    parsed = JSON.parse(text) as ApiError;
  } catch {
    parsed = null;
  }

  const errCode = parsed?.errCode ?? xErr ?? unknownErrCode;
  throw new Error(errCode);
}

/**
 * PDF取得系（responseType: blob）で「HTTP 200 だけど JSON エラーが返る」運用向け。
 * - PDF: download
 * - JSON: { errCode, message } を返す
 */
export async function downloadPdfOrThrowApiError(
  res: AxiosResponse<Blob>,
  fileName: string
): Promise<void> {
  return downloadBlobOrThrowApiError(
    res,
    fileName,
    (ct) => ct.includes("application/pdf"),
    "PRINT_PDF_UNKNOWN_ERROR"
  );
}

/**
 * GemBox 埋め込み済み Excel（responseType: blob）向け。成功時は .xlsx を保存。
 */
export async function downloadExcelOrThrowApiError(
  res: AxiosResponse<Blob>,
  fileName: string
): Promise<void> {
  return downloadBlobOrThrowApiError(
    res,
    fileName,
    (ct) =>
      ct.includes("spreadsheetml") ||
      ct.includes("application/vnd.ms-excel") ||
      ct.includes("application/octet-stream"),
    "PRINT_EXCEL_UNKNOWN_ERROR"
  );
}


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
