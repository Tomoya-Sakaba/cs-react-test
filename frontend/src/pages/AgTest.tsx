import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { ColDef, ColGroupDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { fetchTestData, usePdfPreview, type PdfPreviewData, type TestPdfData } from '../hooks/usePdfPreview';
import TestPdf from '../components/TestPdf';
import PdfPreview from '../components/PdfPreview';
import { useEffect, useRef, useState } from 'react';
import { testApi } from '../api/testApi';
import YearMonthFilter from '../components/YearMonthFilter';
import { useYearMonthParams } from '../hooks/useYearMonthParams';
import { mapMonthlyTestData } from '../utils/mappingData';
import Toggle from '../components/Toggle';
import CustomInputEditor from '../components/CustomInputEditor';
import type { AgGridReact as AgGridReactType } from "ag-grid-react"; // 型補完用
import { convertPlanData } from '../utils/convertData';

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
  company: number | null,
  vol: number | null,
  time: string | null,
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
        field: `contentType.${type.contentTypeId}.company`,
        minWidth: 90,
        flex: 1,
        editable: isEditing,
        cellEditor: CustomInputEditor,
        cellEditorParams: { type: "number" },
      },
      {
        headerName: "数量",
        field: `contentType.${type.contentTypeId}.vol`,
        minWidth: 90,
        flex: 1,
        editable: isEditing,
        cellEditor: CustomInputEditor,
        cellEditorParams: { type: "number" },
      },
      {
        headerName: "時間",
        field: `contentType.${type.contentTypeId}.time`,
        flex: 1,
        minWidth: 90,
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
  const [isEditing, setIsEditing] = useState(false);
  const [rowData, setRowData] = useState<MapdePlan[]>([]);
  const [agRowData, setAgRowData] = useState<MapdePlan[]>([]);
  const [constentType, setContentType] = useState<ContentTypeList[]>([])
  const gridRef = useRef<AgGridReactType<MapdePlan>>(null);

  //---------------------------------------------------------------------------
  // 初回レンダリング処理
  //---------------------------------------------------------------------------
  const [isNew, setIsNew ] = useState(false);
  useEffect(() => {
    const fetchData = async () => {

      // fetch
      const res = await testApi.fetchPlanData(currentYear, currentIndexMonth + 1);
      console.log("res", res);

      // fetch
      const resContent = await testApi.fetchContentTypeList();
      console.log("resContent", resContent);

      setContentType(resContent);
      const contentTypeIdList = getContentTypeIdList(resContent);
      console.log("contentTypeIdList", contentTypeIdList);

      //const defaultData = getDefaultRecord(contentTypeIdList);
      //console.log("defaultData", defaultData);

      if (res.length === 0 || !res) {
        setIsNew(true);
        console.log("isNew:", isNew);

        // 全日マッピング処理
        const mapData = mapMonthlyTestData([], currentYear, currentIndexMonth, getDefaultRecord, contentTypeIdList)
        console.log("mapData(新規)", mapData)
        setRowData(mapData);
        setAgRowData(JSON.parse(JSON.stringify(mapData)));

      } else {
        // 全日マッピング処理
        const mapData = mapMonthlyTestData(res, currentYear, currentIndexMonth, getDefaultRecord, contentTypeIdList)
        console.log("mapData(既存)", mapData)
        setRowData(mapData);
        setAgRowData(JSON.parse(JSON.stringify(mapData)));
      }
      
    }
    fetchData()
  }, [currentYear, currentIndexMonth, isNew])


  const getContentTypeIdList = (list: ContentTypeList[]): number[] => {
    return list.map(item => item.contentTypeId);
  }
  const getDefaultRecord = (IdList: number[]): Record<number, testItem> => {
    return IdList.reduce((acc, id) => {
      acc[id] = { company: null, vol: null, time: null };
      return acc;
    }, {} as Record<number, testItem>);
  };


  //---------------------------------------------------------------------------
  // 編集
  //---------------------------------------------------------------------------
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

  //---------------------------------------------------------------------------
  // 保存処理
  //---------------------------------------------------------------------------
  const handleSave = async() => {
    if (!gridRef.current) return;

    // --- 編集中のセルの値を確定 ---
    gridRef.current.api.stopEditing();

    const updatedRows: MapdePlan[] = [];

    gridRef.current.api.forEachNode(node => {
      if (node.data) updatedRows.push(node.data);
    });

    console.log("保存処理：", updatedRows);


    const reqData = convertPlanData(updatedRows);
    console.log("コンバート後：", reqData);

    try {

      if (isNew) {
        // --- API呼び出し（あなたのtestApi経由）---
        const res = await testApi.createNewPlan(reqData);
        console.log("登録成功:", res);
        alert("新規登録が完了しました。");

      } else {
        // --- API呼び出し（あなたのtestApi経由）---
        const res = await testApi.savePlan(reqData);
        console.log("登録成功:", res);
        alert("新規登録が完了しました。");

      }

      // 編集モード解除
      setIsEditing(false);

      // Grid内の現在の状態をagRowDataとrowDataにセット
      setAgRowData(updatedRows);
      setRowData(updatedRows);

    } catch (error) {
      console.error("登録エラー:", error);
      alert("登録に失敗しました。サーバーを確認してください。");
    }
  };


  //---------------------------------------------------------------------------
  // PDF
  //---------------------------------------------------------------------------
  const pdfHook = usePdfPreview<PdfPreviewData<TestPdfData[]>>(2025, 9)

  const handleClick = async () => {
    const pdfData = await fetchTestData(2025, 9 + 1);

    await pdfHook.handlePreviewPdf(pdfData, TestPdf);
  };

  //---------------------------------------------------------------------------
  // 描画JSX
  //---------------------------------------------------------------------------
  return (
    <>
      <div className="mx-5 flex h-full flex-col">
        <div className="flex w-full justify-between">
          <div className="">
            <button
              className="mr-5 h-full w-24 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
              onClick={handleClick}
            >
              pdf
            </button>
            <button
              className="h-full w-24 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
              onClick={handleSave}
            >
              保存
            </button>
          </div>
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
              ref={gridRef}
              rowData={agRowData}
              columnDefs={getColumnDefs(isEditing, constentType)}
              defaultColDef={{
                resizable: false,
                singleClickEdit: true,
                valueFormatter: (params) => {
                  const v = params.value;
                  if (v === "" || v === 0) return "-";
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
