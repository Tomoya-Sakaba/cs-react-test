import type { testItem, MapdePlan, FetchPlanType } from '../pages/AgTest';
import Holidays from 'date-holidays';

// 日本の祝日オブジェクトを一度だけ作成
const hd = new Holidays('JP');

export const mapMonthlyTestData = (
  fetchData: FetchPlanType[],
  year: number,
  month: number,
  getDefaultRecord: (n: number[]) => Record<number, testItem>,
  contentTypeIdList: number[]
): MapdePlan[] => {
  const mapped: MapdePlan[] = [];
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  // fetchDataを日付キーでMap化
  const recordMap = new Map(fetchData.map((r) => [r.date, r]));

  // 月初から月末まで日付を1日ずつ進める
  const current = new Date(year, month, 1);
  const nextMonth = new Date(year, month + 1, 1);

  while (current < nextMonth) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
      current.getDate()
    ).padStart(2, '0')}`;
    const record = recordMap.get(dateStr);

    const isHoliday = hd.isHoliday(current) !== false || current.getDay() === 0;
    const isSturday = current.getDay() === 6;

    const defaultContentType = getDefaultRecord(contentTypeIdList);
    // record.contentTypeのisChangedプロパティも保持する
    const mergedContentType = record
      ? Object.keys({ ...defaultContentType, ...record.contentType }).reduce(
          (acc, key) => {
            const contentTypeId = Number(key);
            const recordItem = record.contentType[contentTypeId];
            acc[contentTypeId] = {
              ...defaultContentType[contentTypeId],
              ...(recordItem && {
                // API などからの null は undefined に正規化して扱う
                company: recordItem.company ?? undefined,
                vol: recordItem.vol ?? undefined,
                time: recordItem.time ?? undefined,
                isChanged: recordItem.isChanged,
              }),
            };
            return acc;
          },
          {} as Record<number, testItem>
        )
      : defaultContentType;

    mapped.push({
      date: dateStr,
      dayLabel: `${current.getDate()}日(${weekdays[current.getDay()]})`,
      isHoliday,
      isSturday,
      contentType: mergedContentType,
      note: record?.note || '',
    });

    // 翌日に進む
    current.setDate(current.getDate() + 1);
  }

  return mapped;
};

// 曜日タイプを判定する関数
const getDayType = (date: Date): string => {
  const dayOfWeek = date.getDay();
  const isHoliday = hd.isHoliday(date) !== false || dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;

  if (dayOfWeek === 1) {
    return '月';
  } else if (isHoliday) {
    return '祭';
  } else if (isSaturday) {
    return '土';
  } else if (dayOfWeek === 0) {
    return '日';
  } else {
    return '平';
  }
};

// マスターデータから初期値を設定した月次データを生成
export const mapMonthlyTestDataWithDefaults = (
  year: number,
  month: number,
  contentTypeIdList: number[],
  defaultTimeData: Array<{
    contentTypeId: number;
    dayType: string;
    defTime: string | null;
  }>,
  defaultVolData: Array<{
    contentTypeId: number;
    defVol: number | null;
  }>,
  getDefaultRecord: (n: number[]) => Record<number, testItem>
): MapdePlan[] => {
  // まず基本データを作成
  const mapData = mapMonthlyTestData(
    [],
    year,
    month,
    getDefaultRecord,
    contentTypeIdList
  );

  // 各日付に対してマスターデータから初期値を設定
  const mapDataWithDefaults = mapData.map((dayData) => {
    const date = new Date(dayData.date);
    const dayType = getDayType(date);

    const updatedContentType: Record<number, testItem> = {};

    for (const contentTypeId of Object.keys(dayData.contentType)) {
      const id = parseInt(contentTypeId);

      // ContentTypeDefaultTimeから該当レコードを取得
      const timeRecord = defaultTimeData.find(
        (d) => d.contentTypeId === id && d.dayType === dayType
      );

      // ContentTypeDefaultVolから該当レコードを取得
      const volRecord = defaultVolData.find((d) => d.contentTypeId === id);

      // time が設定されている日だけ、「量」のデフォルトを反映する
      // ※ 時間はここでは設定せず、会社選択時に別途設定する
      if (timeRecord && timeRecord.defTime !== null) {
        updatedContentType[id] = {
          company: undefined,
          // defVol が null の場合も undefined に正規化
          vol: volRecord?.defVol ?? undefined,
          time: undefined,
        };
      } else {
        updatedContentType[id] = {
          company: undefined,
          vol: undefined,
          time: undefined,
        };
      }
    }

    return {
      ...dayData,
      contentType: updatedContentType,
    };
  });

  return mapDataWithDefaults;
};
