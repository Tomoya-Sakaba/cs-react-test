import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Toggle from "../components/Toggle";
type User = {
  id: number,
  name: string,
  password: string,
  createdAt: string,
  updatedAt: string,
}

const UserDitail = () => {
  const [user, setUser] = useState<User>({
    id: 0,
    name: "",
    password: "",
    createdAt: "",
    updatedAt: ""
  });
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const isNewMode = userId === "new";

  useEffect(() => {
    setIsEditing(false);
    if (!isNewMode && userId) {
      fetchUser(userId);
    } else {
      // 新規作成モード：空の状態をセット
      setUser({
        id: 0,
        name: "",
        password: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setOriginalUser(null);
      setIsEditing(true);
    }
  }, [isNewMode, userId]);

  const fetchUser = async (userId: string) => {
    try {
      const res = await axios.get(`/api/users/${userId}`);
      const fetchedUser = res.data[0];
      setUser(fetchedUser);
      setOriginalUser(fetchedUser);
    } catch (error) {
      console.error("ユーザーの取得に失敗しました。：" + error)
    }

  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  // 保存処理
  const handleSave = async () => {
    try {
      if (isNewMode) {
        // 新規作成
        const res = await axios.post(`/api/users`, user);
        const newId = res.data.id;
        alert("ユーザーを作成しました。");

        navigate(`/user/list/${newId}`)

      } else {
        // 既存ユーザー更新
        await axios.put(`/api/users/${user.id}`, user);
        alert("ユーザーを更新しました。");
        setOriginalUser(user);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("保存に失敗しました:", err);
      alert("保存に失敗しました。");
    }
  };

  const toggleEditMode = () => {
    if (isEditing) {
      // 編集モードを解除するときに差分を確認
      const hasChanges = JSON.stringify(user) !== JSON.stringify(originalUser);
      if (hasChanges) {
        const confirmCancel = window.confirm(
          "変更内容が保存されていません。破棄してもよろしいですか？"
        );
        if (!confirmCancel) return; // キャンセルしたら解除しない
        setUser(originalUser!); // 元データに戻す
      }
    }
    setIsEditing(!isEditing);
  };

  return (
    <>
      <div className="mx-8 h-full">
        <div className="flex justify-between">
          <h1 className="mb-10 text-4xl font-bold">ユーザー詳細</h1>

          {!isNewMode ? (
            <div>
              <p className="mb-2 text-xl">編集モード</p>
              <Toggle value={isEditing} onChange={toggleEditMode} />
            </div>
          ) : (
            <></>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={!isEditing}
          className={
            `
            mb-5
            w-32
            cursor-pointer
            rounded-xl
            bg-blue-500
            p-2
            text-center
            text-white
            ${isEditing ? "" : "bg-gray-300 pointer-events-none"}
            `
          }>
          保存
        </button>

        <div className="w-1/2">
          {isEditing ? (
            <div className="flex flex-col">
              <label>ユーザー名</label>
              <input
                name="name"
                type="text"
                value={user.name}
                onChange={handleChange}
                className="rounded-xl border border-gray-900 p-3 text-3xl font-bold"
              />
            </div>
          ) : (
            <>
              <p className="p-3 text-3xl font-bold">{user.name}</p>
            </>
          )}
          {isNewMode ? (
            <div className="flex flex-col">
              <label>パスワード</label>
              <input
                name="password"
                type="password"
                value={user.password}
                onChange={handleChange}
                className="rounded-xl border border-gray-900 p-3 text-3xl font-bold"
              />
            </div>
          ) : (
            <></>
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
