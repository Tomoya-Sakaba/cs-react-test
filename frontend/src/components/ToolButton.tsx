type ToolButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
};

const ToolButton: React.FC<ToolButtonProps> = ({ children, onClick }) => {
  return (
    <>
      <button
        className="ml-4 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg"
        onClick={onClick}
      >
        {children}
      </button>
    </>
  );
};

export default ToolButton;
