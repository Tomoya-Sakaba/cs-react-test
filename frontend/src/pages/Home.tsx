import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { testApi } from "../api/testApi";

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
          <Button onClick={() => navigate("/reports")}>報告書一覧</Button>
          <Button onClick={() => navigate("/new-plan")}>月次計画管理</Button>
        </div>
      </div>
    </>
  )
};

export default Home;
