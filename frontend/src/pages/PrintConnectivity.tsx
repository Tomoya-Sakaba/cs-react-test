import Button from "../components/Button";
import { printApi } from "../api/printApi";
import { httpClient } from "../api/httpClient";

/**
 * backend ↔ backend-print 疎通確認用（Hello/Test/Echo）と GemBox デモ PDF。
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
      const blob = await printApi.fetchDemoGemBoxPdf();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch (e) {
      console.error("GemBox デモ PDF 失敗:", e);
      alert("GemBox デモ PDF 失敗（テンプレ配置・backend-print・consoleを確認）");
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
            GemBox デモ PDF（Excel→PDF・別タブ表示）
          </Button>
        </div>
      </div>
    </>
  );
};

export default PrintConnectivity;
