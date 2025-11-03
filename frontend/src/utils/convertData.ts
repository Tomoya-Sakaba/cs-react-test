import type { MapdePlan, FetchPlanType, testItem } from "../pages/AgTest"

export const convertPlanData = (data: MapdePlan[]): FetchPlanType[] => {
  return data
    .map((item) => {
      const filteredContentType: Record<number, testItem> = {};

      // contentType 内の空要素を除外
      Object.entries(item.contentType).forEach(([key, value]) => {
        const isEmpty =
          value.company === 0 &&
          value.vol === 0 &&
          value.time === "";

        if (!isEmpty) {
          filteredContentType[Number(key)] = value;
        }
      });

      return {
        date: item.date,
        contentType: filteredContentType,
        note: item.note,
      };
    })
    // contentType が空 かつ note が空文字 の場合は除外
    .filter((item) => {
      const hasContent = Object.keys(item.contentType).length > 0;
      const hasNote = item.note.trim() !== "";
      return hasContent || hasNote;
    });
};
