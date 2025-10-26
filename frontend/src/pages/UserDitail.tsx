import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const UserDitail = () => {

  type User = {
    id: number,
    name: string,
    createdAt: string,
    updatedAt: string,
  }

  const [isEditting, setIsEditting] = useState(false);

  const [user, setUser] = useState<User>({
    id: 0,
    name: "",
    createdAt: "",
    updatedAt: ""
  });
  const { userId } = useParams<{ userId: string }>();

  useEffect(() => {
    if (userId) fetchUser(userId);
  }, [userId]);

  const fetchUser = async (userId: string) => {
    try {
      const res = await axios.get(`/api/users/${userId}`);
      console.log("fetchUser");
      console.log(res);
      setUser(res.data[0]);
    } catch (error) {
      console.error("ユーザーの取得に失敗しました。：" + error)
    }

  }

  const toggleEditMode = () => {
    setIsEditting(!isEditting);
  }

  const hadleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  //const createUser = async () => {
  //  try {
  //    const res = await axios.post("/api/users", user);
  //    return res.data;
  //  } catch (err) {
  //    console.error("error:", err);
  //    throw err;
  //  }
  //};

  return (
    <>
      <div className="mx-8 h-full">
        <h1 className="mb-10 text-4xl font-bold">ユーザー詳細</h1>

        <div onClick={toggleEditMode} className="mb-5 w-32 cursor-pointer rounded-xl bg-blue-500 p-2 text-center text-white">
          {isEditting ? "保存" : "編集"}
        </div>

        <div className="w-1/2">
          {isEditting ? (
            <>
              <input
                name="name"
                type="text"
                value={user.name}
                onChange={hadleChange}
                className="rounded-xl border border-gray-900 p-3 text-3xl font-bold"
              />
            </>
          ) : (
            <>
              <p className="p-3 text-3xl font-bold">{user.name}</p>
            </>
          )}
          <p className="text-sm text-gray-500">
            登録日: {new Date(user.createdAt).toLocaleDateString().replaceAll('/', '-').toLocaleString()}
          </p>
        </div>
      </div>
    </>
  )
};

export default UserDitail;
