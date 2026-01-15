//import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import NavigationItem from "./NavigationItem";
import { useSetAtom } from "jotai";
import { currentUserAtom } from "../atoms/authAtom";

type Props = {
  isHovered: boolean;
  setIsHovered: (value: boolean) => void;
};

const Sidebar = ({ isHovered, setIsHovered }: Props) => {
  //const { handleLogout } = useAuth();
  const navigate = useNavigate();
  const setCurrentUser = useSetAtom(currentUserAtom);

  const handleLogout = () => {
    setCurrentUser(null);
    navigate("/login");
  };
  return (
    <>
      <nav
        className={`${isHovered ? "w-48" : "w-16"
          } bg-gray-300 rounded-3xl m-3 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out overflow-visible h-[calc(100vh-5rem)]`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex-1 overflow-hidden p-3">
          {/* メニュー */}
          <div className="mt-3">
            <NavigationItem
              icon="i-mdi-home"
              href="/"
              name="ホーム"
              isHovered={isHovered}
            />
            <NavigationItem
              icon="i-mdi-account-clock"
              href="/attendance"
              name="勤怠管理"
              isHovered={isHovered}
            />
            <NavigationItem
              icon="i-mdi-grid"
              href="/dhtmlx-test"
              name="DHTMLX Grid"
              isHovered={isHovered}
            />
            <NavigationItem
              icon="i-mdi-table-large"
              href="/dhtmlx-ag-test"
              name="DHTMLX AgTest"
              isHovered={isHovered}
            />
            <NavigationItem
              icon="i-mdi-view-grid-plus"
              href="/dhtmlx-grid-dataview"
              name="Grid+DataView"
              isHovered={isHovered}
            />
          </div>
        </div>

        {/* ログアウトボタン */}
        <div className="relative m-4 flex h-12 items-center">
          <button
            onClick={handleLogout}
            className={`bg-gray-500 hover:bg-gray-600 text-white font-medium p-2 rounded-lg transition-all duration-300 w-full flex justify-center ${isHovered ? "opacity-0" : "opacity-100"
              }`}
          >
            <span className="i-mdi-logout text-xl"></span>
          </button>
          <button
            onClick={handleLogout}
            className={`bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg w-full absolute whitespace-nowrap transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"
              }`}
          >
            ログアウト
          </button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
