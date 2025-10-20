import { useNavigate } from "react-router-dom";
import Button from "../components/Button";

const Home = () => {

    const navigate = useNavigate();

  return (
    <>
      <div className="mx-8 h-full flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <Button onClick={() => navigate("/ag-test")}>testAg</Button>
          <Button onClick={() => navigate("/hello")}>hello</Button>
        </div>
      </div>
    </>
    )
};

export default Home;
