import type { fetchTestType, testType, testItem, MapedTestType } from "../pages/AgTest"

export const convertTestData = (data: fetchTestType[]): testType[] => {
  // dateごとにグループ化
  const grouped = data.reduce<Record<string, fetchTestType[]>>((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  return Object.entries(grouped).map(([date, items]) => {
    // 空データ
    const emptyContent: testItem = { company: 0, vol: 0, time: "" };

    // 初期値
    const result: testType = {
      date,
      contentA: { ...emptyContent },
      contentB: { ...emptyContent },
      contentC: { ...emptyContent },
      contentD: { ...emptyContent },
      note: "",
    };

    // contentTypeに応じて振り分け
    items.forEach((item) => {
      const content: testItem = {
        company: item.company,
        vol: item.vol,
        time: item.time,
      };

      switch (item.contentType) {
        case 1:
          result.contentA = content;
          break;
        case 2:
          result.contentB = content;
          break;
        case 3:
          result.contentC = content;
          break;
        case 4:
          result.contentD = content;
          break;
        default:
          break;
      }

      // noteは同じ日付で共通と仮定
      result.note = item.note;
    });

    return result;
  });
};


export const convertBackToFetchTestType = (mappedData: MapedTestType[]): fetchTestType[] => {
  const result: fetchTestType[] = [];

  mappedData.forEach((item) => {
    const note = item.note || "";

    // contentA～D をまとめる
    const contents: { contentType: number; company: number; vol: number; time: string }[] = [
      { contentType: 1, company: item.contentA.company, vol: item.contentA.vol, time: item.contentA.time },
      { contentType: 2, company: item.contentB.company, vol: item.contentB.vol, time: item.contentB.time },
      { contentType: 3, company: item.contentC.company, vol: item.contentC.vol, time: item.contentC.time },
      { contentType: 4, company: item.contentD.company, vol: item.contentD.vol, time: item.contentD.time },
    ];

    contents.forEach((c) => {
      // company または vol が 0、time が空文字ならスキップ
      if (c.company === 0 && c.vol === 0 && c.time === "") return;

      result.push({
        date: item.date,
        contentType: c.contentType,
        company: c.company,
        vol: c.vol,
        time: c.time,
        note: note,
      });
    });
  });

  return result;
};
