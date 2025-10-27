type ToggleProps = {
  value: boolean;                   // 親の状態を受け取る
  onChange: () => void;             // 親の関数を呼ぶだけでOK
};

const Toggle = ({ value, onChange }: ToggleProps) => {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={value}
        onChange={onChange}
      />
      <div className="group peer ring-0 bg-gradient-to-bl from-neutral-800 via-neutral-700 to-neutral-600 rounded-full outline-none duration-1000 after:duration-300 w-24 h-12 shadow-md peer-focus:outline-none after:content-[''] after:rounded-full after:absolute after:[background:#0D2B39] peer-checked:after:rotate-180 after:[background:conic-gradient(from_135deg,_#b2a9a9,_#b2a8a8,_#ffffff,_#d7dbd9_,_#ffffff,_#b2a8a8)] after:outline-none after:h-10 after:w-10 after:top-1 after:left-1 peer-checked:after:translate-x-12 peer-hover:after:scale-95 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-emerald-900">
      </div>
    </label>
  );
};

export default Toggle;
