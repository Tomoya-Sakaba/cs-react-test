/* ---------------------------------------------
/ NowDateTime.tsx
/ 現在日時表示コンポーネント
/ --------------------------------------------- */

import { useCurrentTime } from "../../hooks/useCurrentTime";

interface NowDateTimeProps {
  className?: string;
}

const NowDateTime: React.FC<NowDateTimeProps> = ({ className }) => {
  const currentTime = useCurrentTime();

  const date = currentTime.toLocaleDateString();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const dayOfWeek = weekdays[currentTime.getDay()];
  const time = currentTime.toLocaleTimeString();

  return (
    <>
      <div className={`${className || ""}`}>
        <div className="text-4xl">
          {date}（{dayOfWeek}）
        </div>
        <div className="text-7xl">{time}</div>
      </div>
    </>
  );
};

export default NowDateTime;
