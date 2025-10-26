import axios from "axios";
import { useState } from "react";

const CreateUser = () => {

  type User = {
    name: string,
    password: string,
  }
  const [user, setUser] = useState<User>({ name: "", password: "" });

  const hadleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const createUser = async () => {
    try {
      const res = await axios.post("/api/users", user);
      return res.data;
    } catch (err) {
      console.error("error:", err);
      throw err;
    }
  };

  return (
    <>
      <div className="mx-8 h-full">
        <h1 className="mb-10 text-2xl font-bold">ユーザー作成</h1>

        <div className="w-1/2">
          <form onSubmit={(e) => e.preventDefault} className="flex flex-col">
            <p>name</p>
            <input name="name" value={user.name} type="text" onChange={hadleChange} className="rounded-xl border border-gray-900 p-3" />
            <p>password</p>
            <input name="password" value={user.password} type="password" onChange={hadleChange} className="mb-5 rounded-xl border border-gray-900 p-3" />
            <div className="w-32">
              <button type="button" onClick={createUser} className="rounded-lg bg-blue-900 p-3 text-white shadow-blue-800/50 hover:bg-blue-700 hover:shadow-blue-600/70">ユーザー作成</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
};

export default CreateUser;
