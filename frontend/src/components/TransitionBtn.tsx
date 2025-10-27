/* ---------------------------------------------
/ TransitionBtn.tsx
/ 画面遷移ようのボタン
/ Props:
/ children: ボタンの中身
/ to: 遷移先のURL
/ className: ボタンのスタイル（tailwindcss）
/ direction: 矢印の向きと背景色アニメーション方向（left or right）
/ --------------------------------------------- */

import { Link } from "react-router-dom";

type TransitionBtnProps = {
  children: React.ReactNode;
  to: string;
  className?: string;
  direction?: "left" | "right";
};

export const TransitionBtn = ({
  children,
  to,
  className = "",
  direction = "right",
}: TransitionBtnProps) => {
  // 方向に応じたスタイルを決定
  const isLeft = direction === "left";

  // 矢印の向き（角度）
  const arrowRotation = isLeft ? "rotate-[315deg]" : "rotate-45";

  // ホバー時の矢印の向き
  const hoverRotation = isLeft
    ? "group-hover:rotate-[270deg]"
    : "group-hover:rotate-90";

  // ホバー時の背景色アニメーション方向
  const hoverDirection = isLeft
    ? "before:hover:right-0 before:-right-full"
    : "before:hover:left-0 before:-left-full";

  return (
    <>
      <Link to={to}>
        <div className={`flex ${className}`}>
          <button
            type="submit"
            className={`flex gap-2 items-end shadow-xl text-lg bg-gray-50 backdrop-blur-md lg:font-semibold isolation-auto border-gray-50 before:absolute before:w-full before:transition-all before:duration-700 before:hover:w-full ${hoverDirection} before:rounded-full before:bg-gray-500 hover:text-gray-50 before:-z-10 before:aspect-square before:hover:scale-150 before:hover:duration-700 relative z-10 px-4 py-2 overflow-hidden border-2 rounded-full group`}
          >
            {children}
            <svg
              className={`w-8 h-8 justify-end ${hoverRotation} group-hover:bg-gray-50 text-gray-50 ease-linear duration-300 rounded-full border border-gray-700 group-hover:border-none p-2 ${arrowRotation}`}
              viewBox="0 0 16 19"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7 18C7 18.5523 7.44772 19 8 19C8.55228 19 9 18.5523 9 18H7ZM8.70711 0.292893C8.31658 -0.0976311 7.68342 -0.0976311 7.29289 0.292893L0.928932 6.65685C0.538408 7.04738 0.538408 7.68054 0.928932 8.07107C1.31946 8.46159 1.95262 8.46159 2.34315 8.07107L8 2.41421L13.6569 8.07107C14.0474 8.46159 14.6805 8.46159 15.0711 8.07107C15.4616 7.68054 15.4616 7.04738 15.0711 6.65685L8.70711 0.292893ZM9 18L9 1H7L7 18H9Z"
                className="fill-gray-800 group-hover:fill-gray-800"
              ></path>
            </svg>
          </button>
        </div>
      </Link>
    </>
  );
};

export default TransitionBtn;
