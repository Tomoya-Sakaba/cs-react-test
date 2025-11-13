import { useNavigate } from "react-router-dom";
import Button from "../components/Button";

const Home = () => {

  const navigate = useNavigate();

  return (
    <>
      <div className="mx-8 flex h-full flex-col">
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
          <Button onClick={() => navigate("/ag-test")}>testAg</Button>
          <Button onClick={() => navigate("/hello")}>hello</Button>
          <Button onClick={() => navigate("/user/create")}>ユーザー作成</Button>
          <Button onClick={() => navigate("/user/list")}>ユーザーリスト</Button>
          <Button onClick={() => navigate("/attendance")}>勤怠管理</Button>
        </div>
      </div>
    </>
  )
};

export default Home;
