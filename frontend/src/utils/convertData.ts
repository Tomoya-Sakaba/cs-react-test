import type { MapdePlan, FetchPlanType, testItem } from '../pages/AgTest';
// aaa
export const convertPlanData = (data: MapdePlan[]): FetchPlanType[] => {
  return (
    data
      .map((item) => {
        const filteredContentType: Record<number, testItem> = {};

        // contentType 内の空要素を除外
        Object.entries(item.contentType).forEach(([key, value]) => {
          const company = value.company ?? 0;
          const vol = value.vol ?? 0;
          const time = value.time ?? '';

          const isEmpty = company === 0 && vol === 0 && time === '';

          if (!isEmpty) {
            filteredContentType[Number(key)] = {
              company,
              vol,
              time,
            };
          }
        });

        return {
          date: item.date,
          contentType: filteredContentType,
          note: item.note ?? '',
        };
      })
      // contentType が空 かつ note が空文字 の場合は除外
      .filter((item) => {
        const hasContent = Object.keys(item.contentType).length > 0;
        const hasNote = item.note.trim() !== '';
        return hasContent || hasNote;
      })
  );
};
