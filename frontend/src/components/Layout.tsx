import { useState } from "react";
import { Outlet } from "react-router-dom";

const Layout = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="h-screen overflow-hidden">
      {/* �w�b�_�[ - ���S�Œ� */}
      {/*<div className="fixed top-0 left-0 right-0 z-50">*/}
      {/*  <Header />*/}
      {/*</div>*/}

      {/* �T�C�h�o�[�ƃR���e���c - �w�b�_�[���ɔz�u */}
      <div className="flex pt-14 h-full">
        {/*<div className="fixed left-0 top-14 bottom-0 z-40">*/}
        {/*  <Sidebar isHovered={isHovered} setIsHovered={setIsHovered} />*/}
        {/*</div>*/}
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