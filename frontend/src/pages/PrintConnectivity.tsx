import Button from "../components/Button";
import { httpClient } from "../api/httpClient";
import { printApi } from "../api/printApi";
import { downloadExcelOrThrowApiError, downloadPdfOrThrowApiError } from "../utils/pdfUtils";

/**
 * backend ↔ backend-print 疎通確認用（Hello/Test/Echo）と GemBox デモ PDF / Excel。
 */
const PrintConnectivity = () => {
  const showAxiosData = (data: unknown) => {
    alert(typeof data === "string" ? data : JSON.stringify(data));
  };

  const handleHelloThroughPrint = async () => {
    try {
      const res = await httpClient.get("/api/print-gembox/hello", {
        headers: { Accept: "application/json" },
      });
      showAxiosData(res.data);
    } catch (e) {
      console.error("print hello 失敗:", e);
      alert("print hello 失敗（consoleを確認）");
    }
  };

  const handleTestThroughPrint = async () => {
    try {
      const res = await httpClient.get("/api/print-gembox/test", {
        headers: { Accept: "application/json" },
      });
      showAxiosData(res.data);
    } catch (e) {
      console.error("print test 失敗:", e);
      alert("print test 失敗（consoleを確認）");
    }
  };

  const handleEchoPostThroughPrint = async () => {
    try {
      const res = await httpClient.post(
        "/api/print-gembox/echo",
        {
          message: "疎通ページからの POST テスト",
          clientTime: new Date().toISOString(),
        },
        {
          headers: { Accept: "application/json", "Content-Type": "application/json" },
        }
      );
      showAxiosData(res.data);
    } catch (e) {
      console.error("print echo POST 失敗:", e);
      alert("print echo POST 失敗（consoleを確認）");
    }
  };

  const handleGemBoxDemoPdf = async () => {
    try {
      const res = await printApi.fetchGemBoxPdf({ report: "demo" });
      await downloadPdfOrThrowApiError(res, "demo_gembox.pdf");
    } catch (e) {
      console.error("GemBox デモ PDF 失敗:", e);
      alert("PDFの取得に失敗しました");
      alert(`ErrCode: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleGemBoxDemoExcel = async () => {
    try {
      const res = await printApi.fetchGemBoxExcel({ report: "demo" });
      await downloadExcelOrThrowApiError(res, "demo_gembox.xlsx");
    } catch (e) {
      console.error("GemBox デモ Excel 失敗:", e);
      alert("Excelの取得に失敗しました");
      alert(`ErrCode: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <>
      <div className="mx-8 flex h-full flex-col">
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
          <Button onClick={handleHelloThroughPrint}>
            Hello（backend→backend-print）
          </Button>
          <Button onClick={handleTestThroughPrint}>
            Test GET（backend→backend-print）
          </Button>
          <Button onClick={handleEchoPostThroughPrint}>
            Echo POST（backend→backend-print）
          </Button>
          <Button onClick={handleGemBoxDemoPdf}>
            GemBox デモ PDF ダウンロード
          </Button>
          <Button onClick={handleGemBoxDemoExcel}>
            GemBox デモ Excel ダウンロード
          </Button>
        </div>
      </div>
    </>
  );
};

export default PrintConnectivity;
