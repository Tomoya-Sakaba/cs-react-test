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

    const handleTest = async () => {
        await axios.get("/api/users").then((res) => {
            console.log(res.data);
        })
    }

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
        console.log(user);
        try {
            const res = await axios.post("/api/users", user);

            console.log("ユーザー作成成功：", res.data);
            return res.data;
        } catch (err) {
            console.error("登録失敗：", err);
            throw err;
        }
    };

    return (
        <>
            <div className="mx-8 h-full flex flex-col">
                <button type="button" onClick={handleFech}>hello</button>
                <div>{posts}</div>
                <button type="button" onClick={handleTest}>Test</button>

                <form onSubmit={(e) => e.preventDefault} className="flex flex-col">
                <p>name</p>
                    <input name="name" value={user.name} type="text" onChange={hadleChange} className="border" />
                    <p>password</p>
                    <input name="password" value={user.password} type="password" onChange={hadleChange} className="mb-5" />
                    <div className="w-32">
                        <button type="button" onClick={createUser} className="bg-blue-900 shadow-blue-800/50 hover:bg-blue-700 hover:shadow-blue-600/70 text-white p-3 rounded-lg">ユーザー作成</button>
                    </div>
                </form>
            </div>
        </>
    )
};

export default Hello;
