import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTextColor } from "../utils/colorUtils";

const UserList = () => {

  type Users = {
    id: number,
    name: string,
    createdAt: string,
    updatedAt: string,
    color: string,
  }
  const [users, setUsers] = useState<Users[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/users");
      console.log("fetchUsers");
      console.log(res);
      setUsers(res.data);
    } catch (error) {
      console.error("ユーザーの取得に失敗しました。：" + error)
    }

  }

  return (
    <>
      <div className="mx-8 h-full">
        <h1 className="mb-5 text-2xl font-bold">ユーザー一覧</h1>

        <Link to={"new"} >
          <div className="mb-5 w-32 cursor-pointer rounded-xl bg-blue-500 p-2 text-center text-white">
            ユーザー新規作成
          </div>
        </Link>

        <div className="w-1/2">
          {Array.isArray(users) && users.map((item, index) => {
            const backgroundColor = item.color ?? "#ffffff";
            const textColor = getTextColor(backgroundColor);
            return (
              <Link to={`/user/list/${item.id}`} key={index} >
                <div
                  className="mb-2 rounded border p-2 shadow-sm"
                  style={{
                    backgroundColor: backgroundColor,
                    color: textColor
                  }}
                >
                  <p className="text-lg font-bold">{item.name}</p>
                  <p className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                    登録日: {new Date(item.createdAt).toLocaleDateString().replaceAll('/', '-').toLocaleString()}
                  </p>
                  <p className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                    登録日: {item.createdAt}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  )
};

export default UserList;
