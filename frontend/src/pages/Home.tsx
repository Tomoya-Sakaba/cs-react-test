import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { testApi } from "../api/testApi";
import axios from "axios";

const Home = () => {

  const navigate = useNavigate();

  const handleNewPlan = async () => {
    try {
      // 利用可能な年月を取得
      const data = await testApi.fetchAvailableYearMonths();

      if (data.length > 0) {
        // 最大年月を取得（既に降順でソートされている）
        const maxYearMonth = data[0];
        let nextYear = maxYearMonth.year;
        let nextMonth = maxYearMonth.month + 1;

        if (nextMonth > 12) {
          nextYear += 1;
          nextMonth = 1;
        }

        // 年月を含めてURLに遷移
        navigate(`/ag-test?mode=new&year=${nextYear}&month=${nextMonth}`);
      } else {
        // データがない場合は現在の年月を使用
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12の形式

        navigate(`/ag-test?mode=new&year=${currentYear}&month=${currentMonth}`);
      }
    } catch (error) {
      console.error("利用可能な年月の取得に失敗しました:", error);
      // エラー時は現在の年月を使用
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12の形式

      navigate(`/ag-test?mode=new&year=${currentYear}&month=${currentMonth}`);
    }
  };

  const showAxiosData = (data: unknown) => {
    alert(typeof data === "string" ? data : JSON.stringify(data));
  };

  const handleHelloThroughPrint = async () => {
    try {
      // 疎通確認用の最短経路:
      // frontend → backend（/api/print-gembox/hello）→ backend-print（/api/hello）
      // が通っているかだけを確認する。
      const res = await axios.get("/api/print-gembox/hello", {
        headers: { Accept: "application/json" },
      });

      // backend の中継が「文字列として透過」する形なので、念のため string / object どちらでも表示できるようにする。
      showAxiosData(res.data);
    } catch (e) {
      // 失敗時は network / CORS / backend-print 停止など、原因が色々あるので console を併用して見る。
      console.error("print hello 失敗:", e);
      alert("print hello 失敗（consoleを確認）");
    }
  };

  const handleTestThroughPrint = async () => {
    try {
      // GET: backend-print /api/test（hello 以外の経路）
      const res = await axios.get("/api/print-gembox/test", {
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
      // POST: backend-print /api/echo（body をエコーする疎通）
      const res = await axios.post(
        "/api/print-gembox/echo",
        { message: "Home からの POST テスト", clientTime: new Date().toISOString() },
        { headers: { Accept: "application/json", "Content-Type": "application/json" } }
      );
      showAxiosData(res.data);
    } catch (e) {
      console.error("print echo POST 失敗:", e);
      alert("print echo POST 失敗（consoleを確認）");
    }
  };

  return (
    <>
      <div className="mx-8 flex h-full flex-col">
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
          <Button onClick={handleNewPlan}>新規計画</Button>
          <Button onClick={() => navigate("/ag-test")}>testAg</Button>
          <Button onClick={() => navigate("/hello")}>hello</Button>
          <Button onClick={() => navigate("/user/create")}>ユーザー作成</Button>
          <Button onClick={() => navigate("/user/list")}>ユーザーリスト</Button>
          <Button onClick={() => navigate("/attendance")}>勤怠管理</Button>
          <Button onClick={() => navigate("/reports")}>📄 報告書一覧</Button>
          <Button onClick={() => navigate("/report-system/templates")}>📋 テンプレート管理</Button>
          <Button onClick={() => navigate("/new-plan")}>月次計画管理</Button>
          <Button onClick={() => navigate("/csv-import")}>CSV取り込み</Button>
          <Button onClick={() => navigate("/flexible-schedule")}>柔軟な計画スケジュール</Button>
          <Button onClick={() => navigate("/photo-comments")}>写真コメント</Button>
          {/* 疎通確認専用: 通ったら alert に backend 経由の応答が表示される */}
          <Button onClick={handleHelloThroughPrint}>Hello（backend→backend-print）</Button>
          <Button onClick={handleTestThroughPrint}>Test GET（backend→backend-print）</Button>
          <Button onClick={handleEchoPostThroughPrint}>Echo POST（backend→backend-print）</Button>
        </div>
      </div>
    </>
  )
};

export default Home;
