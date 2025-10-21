import axios from "axios";
import { useState } from "react";

const Hello = () => {

  const [posts, setPosts] = useState([]);


  const handleFech = () => {
      axios.get("/api/hello").then((res) => {
      setPosts(res.data.message);
    })
      .catch((err) => {
        console.error('エラー:', err);
      });

    console.log("fetch");
  }

  const handleTest = async() => {
    await axios.get("/api/test").then((res) => {
      console.log(res.data.message);
    })
  }

  return (
    <>
      <div className="mx-8 h-full flex flex-col">
        <button type="button" onClick={handleFech }>hello</button>
        <div>{posts}</div>
        <button type="button" onClick={handleTest }>Test</button>
      </div>
    </>
  )
};

export default Hello;
