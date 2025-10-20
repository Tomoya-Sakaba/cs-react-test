import axios from "axios";

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
