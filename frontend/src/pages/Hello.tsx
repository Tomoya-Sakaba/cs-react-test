import axios from "axios";
import { useState } from "react";

const Hello = () => {

  const [posts, setPosts] = useState([]);


  const handleFech = () => {
      axios.get("/api/test").then((res) => {
      setPosts(res.data.message);
    })
      .catch((err) => {
        console.error('エラー:', err);
      });
  }

  return (
    <>
      <div className="mx-8 h-full flex flex-col">
        <button type="button" onClick={handleFech }>hello</button>
        <div>{posts}</div>
      </div>
    </>
  )
};

export default Hello;
