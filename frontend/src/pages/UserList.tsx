import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const UserList = () => {

  type Users = {
    id: number,
    name: string,
    createdAt: string,
    updatedAt: string,
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
        <h1 className="mb-10 text-2xl font-bold">ユーザー一覧</h1>

        <div className="w-1/2">
          {Array.isArray(users) && users.map((item, index) => (
            <Link to={`/user/list/${item.id}`} key={index} >
              <div
                className="mb-2 rounded border bg-white p-2 shadow-sm"
              >
                <p className="text-lg font-bold">{item.name}</p>
                <p className="text-sm text-gray-500">
                  登録日: {new Date(item.createdAt).toLocaleDateString().replaceAll('/', '-').toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  登録日: {item.createdAt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
};

export default UserList;
