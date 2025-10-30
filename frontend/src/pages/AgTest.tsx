import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { ColDef, ColGroupDef, ValueGetterParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { fetchTestData, usePdfPreview, type PdfPreviewData, type TestPdfData } from '../hooks/usePdfPreview';
import TestPdf from '../components/TestPdf';
import PdfPreview from '../components/PdfPreview';
import { useEffect, useState } from 'react';
import { testApi } from '../api/testApi';
import YearMonthFilter from '../components/YearMonthFilter';
import { useYearMonthParams } from '../hooks/useYearMonthParams';
import { mapMonthlyTestData } from '../utils/mappingData';
import Toggle from '../components/Toggle';
import CustomInputEditor from '../components/CustomInputEditor';

// モジュール登録
ModuleRegistry.registerModules([AllCommunityModule]);

export type fetchTestType = {
  date: string,
  contentType: number,
  company: number,
  vol: number,
  time: string,
  note: string,
}

export type testItem = {
  company: number,
  vol: number,
  time: string,
}

export type testType = {
  date: string,
  contentA: testItem,
  contentB: testItem,
  contentC: testItem,
  contentD: testItem,
  note: string
}

export type FetchPlanType = {
  date: string,
  contentType: Record<number, testItem>,
  note: string
}

export type MapdePlan = {
  date: string,
  dayLabel: string, // 例: "1日(月)"
  isHoliday: boolean,
  isSturday: boolean,
  contentType: Record<number, testItem>,
  note: string
}

export type ContentTypeList = {
  contentTypeId: number;
  contentName: string;
}

export type MapedTestType = {
  date: string,
  dayLabel: string, // 例: "1日(月)"
  isHoliday: boolean,
  isSturday: boolean,
  contentA: testItem,
  contentB: testItem,
  contentC: testItem,
  contentD: testItem,
  note: string
}

const getColumnDefs = (isEditing: boolean, contentTypeList: ContentTypeList[]): (ColDef<MapdePlan> | ColGroupDef<MapdePlan>)[] => [
  {
    headerName: "日付",
    field: "dayLabel",
    width: 100,
    pinned: "left",
    cellClass: params => {
      if (params.data?.isHoliday) return "text-red-500 font-bold";
      if (params.data?.isSturday) return "text-blue-500 font-bold";
      return "text-gray-800";
    },
  },
  ...contentTypeList.map(type => ({
    headerName: type.contentName,
    children: [
      {
        headerName: "会社",
        minWidth: 90,
        flex: 1,
        valueGetter: (params: ValueGetterParams<MapdePlan>) =>
          params.data?.contentType[type.contentTypeId]?.company ?? 0,
        editable: isEditing,
        cellEditor: CustomInputEditor,
        cellEditorParams: { type: "number" },
      },
      {
        headerName: "数量",
        minWidth: 90,
        flex: 1,
        valueGetter: (params: ValueGetterParams<MapdePlan>) =>
          params.data?.contentType[type.contentTypeId]?.vol ?? 0,
        editable: isEditing,
        cellEditor: CustomInputEditor,
        cellEditorParams: { type: "number" },
      },
      {
        headerName: "時間",
        flex: 1,
        minWidth: 90,
        valueGetter: (params: ValueGetterParams<MapdePlan>) =>
          params.data?.contentType[type.contentTypeId]?.time ?? "",
        editable: isEditing,
        cellEditor: CustomInputEditor,
        cellEditorParams: { type: "time" },
      },
    ],
  })),
  {
    headerName: "備考",
    field: "note",
    minWidth: 200,
    editable: isEditing, // ここで toggle 状態で編集可否切替
    cellEditor: CustomInputEditor,
    cellEditorParams: { type: "text" },
  },
];

const AgTest = () => {
  const { currentYear, currentIndexMonth } = useYearMonthParams();
  const pdfHook = usePdfPreview<PdfPreviewData<TestPdfData[]>>(2025, 9)
  const [isEditing, setIsEditing] = useState(false);
  const [rowData, setRowData] = useState<MapdePlan[]>([]);
  const [agRowData, setAgRowData] = useState<MapdePlan[]>([]);

  const toggleEditMode = () => {
    if (isEditing) {
      const hasChanges = JSON.stringify(agRowData) !== JSON.stringify(rowData);

      if (hasChanges) {
        const confirmDiscard = window.confirm(
          "変更内容を破棄して編集モードを解除しますか？"
        );

        if (confirmDiscard) {
          // 破棄して元データに戻す
          setAgRowData(JSON.parse(JSON.stringify(rowData)));
          setIsEditing(false); // 編集モード解除
        }
      } else {
        // 変更がない場合は単純に編集モード解除
        setIsEditing(false);
      }
    } else {
      // 編集モードON
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    // 新規作成・更新・削除用の配列を用意
    const insert: fetchTestType[] = [];
    const update: fetchTestType[] = [];
    const del: fetchTestType[] = [];

    // 編集済みの行データをループ
    agRowData.forEach((editedRow, i) => {
      const originalRow = rowData[i]; // 元データと比較

      // contentA〜D の各コンテンツをループ
      ["A", "B", "C", "D"].forEach((c, idx) => {
        const edited = editedRow[`content${c}` as keyof MapdePlan] as testItem;
        const original = originalRow[`content${c}` as keyof MapdePlan] as testItem;

        // 編集後・元データが空かどうか判定
        const isEmptyEdited = edited.company === 0 && edited.vol === 0 && edited.time === "";
        const isEmptyOriginal = original.company === 0 && original.vol === 0 && original.time === "";

        // fetchTestType の形に変換
        const base: fetchTestType = {
          date: editedRow.date,
          contentType: idx + 1, // contentA=1, B=2, ...
          company: edited.company,
          vol: edited.vol,
          time: edited.time,
          note: editedRow.note,
        };

        if (isEmptyOriginal && !isEmptyEdited) {
          // 元データが空で、編集後に値がある → 新規作成
          insert.push(base);
        } else if (!isEmptyOriginal && !isEmptyEdited) {
          // 元データも編集後も値がある → 変更があるか確認して更新
          if (
            original.company !== edited.company ||
            original.vol !== edited.vol ||
            original.time !== edited.time ||
            originalRow.note !== editedRow.note
          ) {
            update.push(base);
          }
        } else if (!isEmptyOriginal && isEmptyEdited) {
          // 元データがあるが編集後に空 → 削除
          del.push(base);
        }
        // 元データも編集後も空の場合は何もしない
      });
    });

    console.log("insert", insert);
    console.log("update", update);
    console.log("delete", del);
    setIsEditing(false);
  };

  const handleClick = async () => {
    const pdfData = await fetchTestData(2025, 9 + 1);

    await pdfHook.handlePreviewPdf(pdfData, TestPdf);
  };

  const getContentTypeIdList = (list: ContentTypeList[]): number[] => {
    return list.map(item => item.contentTypeId);
  }
  const getDefaultRecord = (IdList: number[]): Record<number, testItem> => {
    return IdList.reduce((acc, id) => {
      acc[id] = { company: 0, vol: 0, time: "" };
      return acc;
    }, {} as Record<number, testItem>);
  };

  const [constentType, setContentType] = useState<ContentTypeList[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const res = await testApi.fetchPlanData();
      console.log("res", res);

      const resContent = await testApi.fetchContentTypeList();
      console.log("resContent", resContent);

      setContentType(resContent);
      const contentTypeIdList = getContentTypeIdList(resContent);
      console.log("contentTypeIdList", contentTypeIdList);

      const defaultData = getDefaultRecord(contentTypeIdList);
      console.log("defaultData", defaultData);

      const mapData = mapMonthlyTestData(res, currentYear, currentIndexMonth, getDefaultRecord, contentTypeIdList)
      console.log("mapData", mapData)

      setRowData(mapData);
      setAgRowData(JSON.parse(JSON.stringify(mapData)));
    }
    fetchData()
  }, [currentYear, currentIndexMonth])


  return (
    <>
      <div className="mx-5 flex h-full flex-col">
        <div className="flex w-full justify-between">
          <button
            className="w-24 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
            onClick={handleClick}
          >
            pdf
          </button>
          <button
            className="w-24 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
            onClick={handleSave}
          >
            保存
          </button>
          <div>
            <p className="mb-2 text-xl">編集モード</p>
            <Toggle value={isEditing} onChange={toggleEditMode} />
          </div>
        </div>

        <div className="my-5 flex gap-4">
          <YearMonthFilter />
        </div>

        <div className="flex flex-1">
          <div className="ag-theme-alpine h-full min-h-0 w-full">
            <AgGridReact
              rowData={agRowData}
              columnDefs={getColumnDefs(isEditing, constentType)}
              defaultColDef={{
                resizable: true,
                valueFormatter: (params) => {
                  const v = params.value;
                  // 文字列の場合は空文字チェック、数値の場合は0チェック
                  if (v === "" || Number(v) === 0) return "-";
                  return v;
                }
              }}
            />
          </div>
        </div>


        {/* PDFプレビューモーダル */}
        {pdfHook.isOpen && pdfHook.previewData && (
          <PdfPreview
            pdfBlob={pdfHook.previewData.pdfBlob}
            fileName={pdfHook.previewData.fileName}
            onClose={pdfHook.closePreview}
            loading={pdfHook.loading}
            error={pdfHook.error}
          />
        )}
      </div>
    </>
  )
};

export default AgTest;
