import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="h-screen overflow-hidden">
      {/* ヘッダー - 完全固定 */}
      {/*<div className="fixed left-0 right-0 top-0 z-50">*/}
      {/*  <Header />*/}
      {/*</div>*/}

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
