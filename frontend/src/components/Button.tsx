import React from "react";

type ButtonProps = {
  children: React.ReactNode;
  colorScheme?:
  | "blue"
  | "green"
  | "red"
  | "purple"
  | "gray"
  | "indigo"
  | "orange";
  fontSize?: "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  disabled?: boolean;
  onClick?: () => void;
};

const Button: React.FC<ButtonProps> = ({
  children,
  colorScheme = "blue",
  fontSize = "base",
  disabled,
  onClick,
}) => {
  // 色系統の設定
  const colorClasses = {
    blue: "bg-blue-900 shadow-blue-800/50 hover:bg-blue-700 hover:shadow-blue-600/70",
    green:
      "bg-green-900 shadow-green-800/50 hover:bg-green-700 hover:shadow-green-600/70",
    red: "bg-red-900 shadow-red-800/50 hover:bg-red-700 hover:shadow-red-600/70",
    purple:
      "bg-purple-900 shadow-purple-800/50 hover:bg-purple-700 hover:shadow-purple-600/70",
    gray: "bg-gray-800 shadow-gray-800/50 hover:bg-gray-700 hover:shadow-gray-600/70",
    indigo:
      "bg-indigo-900 shadow-indigo-800/50 hover:bg-indigo-700 hover:shadow-indigo-600/70",
    orange:
      "bg-orange-900 shadow-orange-800/50 hover:bg-orange-700 hover:shadow-orange-600/70",
  };

  // フォントサイズの設定
  const fontSizeClasses = {
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full
        py-2 px-4
        rounded-lg
        font-bold text-white
        ${colorClasses[colorScheme]}
        ${fontSizeClasses[fontSize]}
        shadow-md
        transition-colors duration-300 ease-in-out
        hover:brightness-110
        transform hover:scale-105
        hover:shadow-lg
        active:scale-95 active:brightness-90
      `}
    >
      {children}
    </button>
  );
};

export default Button;
