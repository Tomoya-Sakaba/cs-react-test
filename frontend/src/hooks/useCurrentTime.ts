/* ---------------------------------------------
/ useCurrentTime.ts
/ 現在時刻を管理するカスタムフック
/ --------------------------------------------- */

import { useEffect, useState } from "react";

export const useCurrentTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const tick = () => setCurrentTime(new Date());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return currentTime;
}