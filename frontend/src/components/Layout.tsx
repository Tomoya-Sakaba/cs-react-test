import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAtom } from "jotai";
import { currentUserAtom } from "../atoms/authAtom";
import Sidebar from "./Sidebar";

const Layout = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const navigate = useNavigate();

  const handleLogout = () => {
    setCurrentUser(null);
    navigate("/login");
  };

  return (
    <div className="h-screen overflow-hidden">
      {/* ヘッダー - 完全固定 */}
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b bg-white px-4 py-2 shadow-sm">
        <div className="text-lg font-semibold">
          <Link to="/">アプリケーション</Link>
        </div>
        <div className="flex items-center gap-4">
          {currentUser && (
            <>
              <span className="text-sm text-gray-700">
                ログイン中: {currentUser.name}
              </span>
              <button
                onClick={handleLogout}
                className="rounded bg-gray-500 px-3 py-1 text-sm text-white hover:bg-gray-600"
              >
                ログアウト
              </button>
            </>
          )}
        </div>
      </div>

      {/* サイドバーとコンテンツ - ヘッダー下に配置 */}
      <div className="flex h-full pt-14">
        <div className="fixed bottom-0 left-0 top-14 z-40">
          <Sidebar isHovered={isHovered} setIsHovered={setIsHovered} />
        </div>
        <main
          className={`flex-1 overflow-auto transition-all duration-300  ${isHovered ? "ml-48" : "ml-16"
            }`}
        >
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default Layout;
