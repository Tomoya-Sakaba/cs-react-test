import type { testType, MapedTestType } from "../pages/AgTest"
import Holidays from "date-holidays";

// 日本の祝日オブジェクトを一度だけ作成
const hd = new Holidays("JP");

export const mapMonthlyTestData = (
  fetchData: testType[],
  year: number,
  month: number
): MapedTestType[] => {
  const mapped: MapedTestType[] = [];
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  // fetchDataを日付キーでMap化
  const recordMap = new Map(fetchData.map(r => [r.date, r]));

  // 月初から月末まで日付を1日ずつ進める
  let current = new Date(year, month, 1);
  const nextMonth = new Date(year, month + 1, 1);

  while (current < nextMonth) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    const record = recordMap.get(dateStr);

    const isHoliday = hd.isHoliday(current) !== false || current.getDay() === 0;
    const isSturday = current.getDay() === 6;

    mapped.push({
      date: dateStr,
      dayLabel: `${current.getDate()}日(${weekdays[current.getDay()]})`,
      isHoliday,
      isSturday,
      contentA: record?.contentA || { company: 0, vol: 0, time: "" },
      contentB: record?.contentB || { company: 0, vol: 0, time: "" },
      contentC: record?.contentC || { company: 0, vol: 0, time: "" },
      contentD: record?.contentD || { company: 0, vol: 0, time: "" },
      note: record?.note || "",
    });

    // 翌日に進む
    current.setDate(current.getDate() + 1);
  }

  return mapped;
};
