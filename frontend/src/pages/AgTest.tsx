import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { ColDef, ColGroupDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {
  fetchTestData,
  usePdfPreview,
  type PdfPreviewData,
  type TestPdfData,
} from '../hooks/usePdfPreview';
import TestPdf from '../components/TestPdf';
import PdfPreview from '../components/PdfPreview';
import { useEffect, useRef, useState } from 'react';
import { testApi } from '../api/testApi';
import YearMonthFilter from '../components/YearMonthFilter';
import { useYearMonthParams } from '../hooks/useYearMonthParams';
import { mapMonthlyTestData } from '../utils/mappingData';
import Toggle from '../components/Toggle';
import CustomInputEditor from '../components/CustomInputEditor';
import type { AgGridReact as AgGridReactType } from 'ag-grid-react'; // 型補完用
import { convertPlanData } from '../utils/convertData';
import ApprovalDrawer from '../components/ApprovalDrawer';
import { useApproval } from '../hooks/useApproval';

// モジュール登録
ModuleRegistry.registerModules([AllCommunityModule]);

export type fetchTestType = {
  date: string;
  contentType: number;
  company: number;
  vol: number;
  time: string;
  note: string;
};

export type testItem = {
  company: number | null;
  vol: number | null;
  time: string | null;
};

export type FetchPlanType = {
  date: string;
  contentType: Record<number, testItem>;
  note: string;
};

export type MapdePlan = {
  date: string;
  dayLabel: string; // 例: "1日(月)"
  isHoliday: boolean;
  isSturday: boolean;
  contentType: Record<number, testItem>;
  note: string;
};

export type ContentTypeList = {
  contentTypeId: number;
  contentName: string;
};

export type MapedTestType = {
  date: string;
  dayLabel: string; // 例: "1日(月)"
  isHoliday: boolean;
  isSturday: boolean;
  contentA: testItem;
  contentB: testItem;
  contentC: testItem;
  contentD: testItem;
  note: string;
};

const getColumnDefs = (
  isEditing: boolean,
  selectedIds: number[],
  originalList: ContentTypeList[]
): (ColDef<MapdePlan> | ColGroupDef<MapdePlan>)[] => {
  // 選択されたIDのみをフィルタリングし、オリジナルの順序でソート
  const filteredAndSorted = originalList
    .filter((type) => selectedIds.includes(type.contentTypeId))
    .sort((a, b) => {
      const indexA = originalList.findIndex(
        (t) => t.contentTypeId === a.contentTypeId
      );
      const indexB = originalList.findIndex(
        (t) => t.contentTypeId === b.contentTypeId
      );
      return indexA - indexB;
    });

  return [
    {
      headerName: '日付',
      field: 'dayLabel',
      width: 100,
      pinned: 'left',
      cellClass: (params) => {
        if (params.data?.isHoliday) return 'text-red-500 font-bold';
        if (params.data?.isSturday) return 'text-blue-500 font-bold';
        return 'text-gray-800';
      },
    },
    ...filteredAndSorted.map((type) => ({
      headerName: type.contentName,
      children: [
        {
          headerName: '会社',
          field: `contentType.${type.contentTypeId}.company`,
          minWidth: 90,
          flex: 1,
          editable: isEditing,
          cellEditor: CustomInputEditor,
          cellEditorParams: { type: 'number' },
        },
        {
          headerName: '数量',
          field: `contentType.${type.contentTypeId}.vol`,
          minWidth: 90,
          flex: 1,
          editable: isEditing,
          cellEditor: CustomInputEditor,
          cellEditorParams: { type: 'number' },
        },
        {
          headerName: '時間',
          field: `contentType.${type.contentTypeId}.time`,
          flex: 1,
          minWidth: 90,
          editable: isEditing,
          cellEditor: CustomInputEditor,
          cellEditorParams: { type: 'time' },
        },
      ],
    })),
    {
      headerName: '備考',
      field: 'note',
      minWidth: 200,
      editable: isEditing, // ここで toggle 状態で編集可否切替
      cellEditor: CustomInputEditor,
      cellEditorParams: { type: 'text' },
    },
  ];
};


const AgTest = () => {
  const { currentYear, currentIndexMonth } = useYearMonthParams();
  const [isEditing, setIsEditing] = useState(false);
  const [rowData, setRowData] = useState<MapdePlan[]>([]);
  const [agRowData, setAgRowData] = useState<MapdePlan[]>([]);
  // オリジナルのcontentTypeリスト（順序保持用）
  const [originalContentType, setOriginalContentType] = useState<
    ContentTypeList[]
  >([]);
  // 表示するcontentTypeのIDリスト
  const [selectedContentTypeIds, setSelectedContentTypeIds] = useState<
    number[]
  >([]);
  // ヘッダー設定モーダルの表示状態
  const [isHeaderConfigOpen, setIsHeaderConfigOpen] = useState(false);
  // 上程Drawerの表示状態
  const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState(false);
  const gridRef = useRef<AgGridReactType<MapdePlan>>(null);

  //---------------------------------------------------------------------------
  // 初回レンダリング処理
  //---------------------------------------------------------------------------
  const [isNew, setIsNew] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      // fetch
      const res = await testApi.fetchPlanData(
        currentYear,
        currentIndexMonth + 1
      );
      console.log('res', res);

      // fetch
      const resContent = await testApi.fetchContentTypeList();
      console.log('resContent', resContent);

      // オリジナルの順序を保持
      setOriginalContentType(resContent);
      // 初期状態では全て選択
      const allIds = resContent.map((item) => item.contentTypeId);
      setSelectedContentTypeIds(allIds);
      const contentTypeIdList = getContentTypeIdList(resContent);
      console.log('contentTypeIdList', contentTypeIdList);

      //const defaultData = getDefaultRecord(contentTypeIdList);
      //console.log("defaultData", defaultData);

      if (res.length === 0 || !res) {
        setIsNew(true);
        console.log('isNew:', isNew);

        // 全日マッピング処理
        const mapData = mapMonthlyTestData(
          [],
          currentYear,
          currentIndexMonth,
          getDefaultRecord,
          contentTypeIdList
        );
        console.log('mapData(新規)', mapData);
        setRowData(mapData);
        setAgRowData(JSON.parse(JSON.stringify(mapData)));
      } else {
        // 全日マッピング処理
        const mapData = mapMonthlyTestData(
          res,
          currentYear,
          currentIndexMonth,
          getDefaultRecord,
          contentTypeIdList
        );
        console.log('mapData(既存)', mapData);
        setRowData(mapData);
        setAgRowData(JSON.parse(JSON.stringify(mapData)));
      }
    };
    fetchData();
  }, [currentYear, currentIndexMonth, isNew]);

  const getContentTypeIdList = (list: ContentTypeList[]): number[] => {
    return list.map((item) => item.contentTypeId);
  };
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
    // 上程完了済みの場合は編集不可
    if (approvalStatus.some((a) => a.status === 5)) {
      alert('上程が完了しているため、編集できません。');
      return;
    }

    // 上程中は承認者のみが編集可能
    if (!canEdit()) {
      alert('上程中です。承認者のみが編集できます。');
      return;
    }

    if (isEditing) {
      const hasChanges = JSON.stringify(agRowData) !== JSON.stringify(rowData);

      if (hasChanges) {
        const confirmDiscard = window.confirm(
          '変更内容を破棄して編集モードを解除しますか？'
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
  const handleSave = async () => {
    if (!gridRef.current) return;

    // --- 編集中のセルの値を確定 ---
    gridRef.current.api.stopEditing();

    const updatedRows: MapdePlan[] = [];

    gridRef.current.api.forEachNode((node) => {
      if (node.data) updatedRows.push(node.data);
    });

    console.log('保存処理：', updatedRows);

    const reqData = convertPlanData(updatedRows);
    console.log('コンバート後：', reqData);

    try {
      if (isNew) {
        // --- API呼び出し（あなたのtestApi経由）---
        const res = await testApi.createNewPlan(reqData);
        console.log('登録成功:', res);
        alert('新規登録が完了しました。');

        setIsNew(false);
      } else {
        // --- API呼び出し（あなたのtestApi経由）---
        const res = await testApi.savePlan(reqData);
        console.log('保存成功:', res);
        alert('保存が完了しました。');
      }

      // 編集モード解除
      setIsEditing(false);

      // Grid内の現在の状態をagRowDataとrowDataにセット
      setAgRowData(updatedRows);
      setRowData(updatedRows);
    } catch (error) {
      console.error('登録エラー:', error);
      alert('登録に失敗しました。サーバーを確認してください。');
    }
  };

  //---------------------------------------------------------------------------
  // バージョンを切る処理
  //
  // 仕様:
  // - 現在の年/月のスナップショットversionを +1 へ進める（0→1 も含む）
  // - 以後の保存は新しいversionに対する上書き更新となる（保存ではversionを上げない）
  //---------------------------------------------------------------------------
  const handleCreateVersion = async () => {
    if (!window.confirm('バージョンを切りますか？この操作は元に戻せません。')) {
      return;
    }

    try {
      const res = await testApi.createVersion(
        currentYear,
        currentIndexMonth + 1
      );
      console.log('バージョン作成成功:', res);
      alert('バージョンの作成が完了しました。');

      // データを再取得
      const fetchData = async () => {
        const res = await testApi.fetchPlanData(
          currentYear,
          currentIndexMonth + 1
        );
        const resContent = await testApi.fetchContentTypeList();
        setOriginalContentType(resContent);
        const allIds = resContent.map((item) => item.contentTypeId);
        setSelectedContentTypeIds(allIds);
        const contentTypeIdList = getContentTypeIdList(resContent);

        const mapData = mapMonthlyTestData(
          res,
          currentYear,
          currentIndexMonth,
          getDefaultRecord,
          contentTypeIdList
        );
        setRowData(mapData);
        setAgRowData(JSON.parse(JSON.stringify(mapData)));
      };
      await fetchData();
    } catch (error) {
      console.error('バージョン作成エラー:', error);
      alert('バージョンの作成に失敗しました。サーバーを確認してください。');
    }
  };

  //---------------------------------------------------------------------------
  // PDF
  //---------------------------------------------------------------------------
  const pdfHook = usePdfPreview<PdfPreviewData<TestPdfData[]>>(2025, 9);

  const handleClick = async () => {
    const pdfData = await fetchTestData(2025, 9 + 1);

    await pdfHook.handlePreviewPdf(pdfData, TestPdf);
  };

  //---------------------------------------------------------------------------
  // ヘッダー設定関連
  //---------------------------------------------------------------------------
  const handleContentTypeToggle = (contentTypeId: number) => {
    setSelectedContentTypeIds((prev) => {
      if (prev.includes(contentTypeId)) {
        return prev.filter((id) => id !== contentTypeId);
      } else {
        return [...prev, contentTypeId];
      }
    });
  };

  const handleResetToOriginal = () => {
    const allIds = originalContentType.map((item) => item.contentTypeId);
    setSelectedContentTypeIds(allIds);
  };

  const handleSelectAll = () => {
    const allIds = originalContentType.map((item) => item.contentTypeId);
    setSelectedContentTypeIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedContentTypeIds([]);
  };

  //---------------------------------------------------------------------------
  // 上程関連（useApproval hookを使用）
  //---------------------------------------------------------------------------
  const {
    approvalStatus,
    canEdit,
    isCompleted,
  } = useApproval({
    year: currentYear,
    month: currentIndexMonth + 1,
    autoFetch: true,
  });

  // 上程状態をチェック（承認者のみが操作可能かどうか）
  const checkCanEdit = (): boolean => {
    // 完了済みの場合は編集不可
    if (isCompleted()) {
      return false;
    }
    return canEdit();
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
              className="mr-5 h-full w-24 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
              onClick={handleSave}
            >
              保存
            </button>
            {/* バージョンを切る（断面固定化） */}
            <button
              className="h-full w-32 rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600"
              onClick={handleCreateVersion}
            >
              バージョンを切る
            </button>
            <button
              className="ml-5 h-full w-32 rounded-lg bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600"
              onClick={() => setIsHeaderConfigOpen(true)}
            >
              ヘッダー設定
            </button>
            <button
              className="ml-5 h-full w-32 rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600"
              onClick={() => setIsApprovalDrawerOpen(true)}
            >
              上程
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
              columnDefs={getColumnDefs(
                isEditing && checkCanEdit(), // 編集可能かつ承認対象の場合のみ編集可能
                selectedContentTypeIds,
                originalContentType
              )}
              defaultColDef={{
                resizable: false,
                singleClickEdit: true,
                valueFormatter: (params) => {
                  const v = params.value;
                  if (v === '' || v === 0) return '-';
                  return v;
                },
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

        {/* ヘッダー設定モーダル */}
        {isHeaderConfigOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-96 rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">ヘッダー設定</h2>
                <button
                  onClick={() => setIsHeaderConfigOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="mb-4 flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
                >
                  全て選択
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="rounded bg-gray-500 px-3 py-1 text-sm text-white hover:bg-gray-600"
                >
                  全て解除
                </button>
                <button
                  onClick={handleResetToOriginal}
                  className="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                >
                  元の順序に戻す
                </button>
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {originalContentType.map((type) => (
                  <label
                    key={type.contentTypeId}
                    className="flex items-center space-x-2 rounded p-2 hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContentTypeIds.includes(
                        type.contentTypeId
                      )}
                      onChange={() =>
                        handleContentTypeToggle(type.contentTypeId)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{type.contentName}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setIsHeaderConfigOpen(false)}
                  className="rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 上程状態表示（簡易表示） */}
        {approvalStatus.length > 0 && (
          <div className="mb-4 rounded-lg border-2 border-orange-500 bg-orange-50 p-3">
            <div className="text-sm font-bold text-orange-700">
              上程中 -{' '}
              {approvalStatus
                .filter((a) => a.status === 1)
                .map((a) => a.userName)
                .join(', ')}{' '}
              が承認待ち
            </div>
            {isCompleted() && (
              <div className="mt-1 text-sm font-bold text-green-700">
                上程が完了しました
              </div>
            )}
          </div>
        )}

        {/* 上程Drawer */}
        <ApprovalDrawer
          isOpen={isApprovalDrawerOpen}
          onClose={() => setIsApprovalDrawerOpen(false)}
          year={currentYear}
          month={currentIndexMonth + 1}
        />
      </div>
    </>
  );
};

export default AgTest;
