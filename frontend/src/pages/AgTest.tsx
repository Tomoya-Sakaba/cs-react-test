import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { ColDef, ColGroupDef, CellClassParams } from 'ag-grid-community';
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { testApi } from '../api/testApi';
import YearMonthFilter from '../components/YearMonthFilter';
import { useYearMonthParams } from '../hooks/useYearMonthParams';
import {
  mapMonthlyTestData,
  mapMonthlyTestDataWithDefaults,
} from '../utils/mappingData';
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
  isChanged?: boolean;
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

// 初期表示するcontentTypeIdのリストを決定する関数
const getInitialContentTypeIds = (data: MapdePlan[]): number[] => {
  const initialIds: number[] = [2, 4]; // デフォルトは2, 4のみ
  let hasContentType1 = false;
  let hasContentType3 = false;

  // contentTypeIdをチェック
  data.some((row) => {
    // contentTypeId 1のチェック
    if (!hasContentType1) {
      const contentType1 = row.contentType[1];
      if (contentType1) {
        hasContentType1 =
          contentType1.company !== null ||
          contentType1.vol !== null ||
          contentType1.time !== null;
      }
    }

    // contentTypeId 3のチェック
    if (!hasContentType3) {
      const contentType3 = row.contentType[3];
      if (contentType3) {
        hasContentType3 =
          contentType3.company !== null ||
          contentType3.vol !== null ||
          contentType3.time !== null;
      }
    }

    // 両方見つかったら早期終了
    return hasContentType1 && hasContentType3;
  });

  // データがある場合のみ追加
  if (hasContentType1) {
    initialIds.push(1);
  }
  if (hasContentType3) {
    initialIds.push(3);
  }

  return initialIds;
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
          cellClass: (params: CellClassParams<MapdePlan>) => {
            const item = params.data?.contentType?.[type.contentTypeId];
            return item?.isChanged ? 'bg-red-100' : '';
          },
        },
        {
          headerName: '数量',
          field: `contentType.${type.contentTypeId}.vol`,
          minWidth: 90,
          flex: 1,
          editable: isEditing,
          cellEditor: CustomInputEditor,
          cellEditorParams: { type: 'number' },
          cellClass: (params: CellClassParams<MapdePlan>) => {
            const item = params.data?.contentType?.[type.contentTypeId];
            return item?.isChanged ? 'bg-red-100' : '';
          },
        },
        {
          headerName: '時間',
          field: `contentType.${type.contentTypeId}.time`,
          flex: 1,
          minWidth: 90,
          editable: isEditing,
          cellEditor: CustomInputEditor,
          cellEditorParams: { type: 'time' },
          cellClass: (params: CellClassParams<MapdePlan>) => {
            const item = params.data?.contentType?.[type.contentTypeId];
            return item?.isChanged ? 'bg-red-100' : '';
          },
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNewMode = searchParams.get('mode') === 'new';

  // 利用可能な年月のリスト
  const [availableYearMonths, setAvailableYearMonths] = useState<
    { year: number; month: number }[]
  >([]);
  const [loadingYearMonths, setLoadingYearMonths] = useState(true);

  const { currentYear, currentIndexMonth } = useYearMonthParams(
    isNewMode ? undefined : availableYearMonths // 新規作成モードの場合は利用可能な年月のチェックをスキップ
  );
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
  // バージョン選択関連
  const [availableVersions, setAvailableVersions] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const gridRef = useRef<AgGridReactType<MapdePlan>>(null);

  //---------------------------------------------------------------------------
  // 利用可能な年月を取得
  //---------------------------------------------------------------------------
  useEffect(() => {
    const fetchAvailableYearMonths = async () => {
      try {
        const data = await testApi.fetchAvailableYearMonths();
        setAvailableYearMonths(data);
      } catch (error) {
        console.error('利用可能な年月の取得に失敗しました:', error);
      } finally {
        setLoadingYearMonths(false);
      }
    };
    fetchAvailableYearMonths();
  }, []);

  //---------------------------------------------------------------------------
  // 利用可能なバージョンを取得
  //---------------------------------------------------------------------------
  useEffect(() => {
    // 新規作成モードの場合はバージョン0を設定
    if (isNewMode) {
      setAvailableVersions([0]);
      setSelectedVersion(0);
      return;
    }

    const fetchVersions = async () => {
      setIsLoadingVersions(true);
      try {
        const versions = await testApi.fetchAvailableVersions(
          currentYear,
          currentIndexMonth + 1
        );
        setAvailableVersions(versions);
        // 最新バージョン（最大値）をデフォルト選択（データがない場合も[0]が返ってくる）
        const latestVersion = Math.max(...versions);
        setSelectedVersion(latestVersion);
      } catch (error) {
        console.error('利用可能なバージョンの取得に失敗しました:', error);
        setAvailableVersions([]);
        setSelectedVersion(null);
      } finally {
        setIsLoadingVersions(false);
      }
    };

    fetchVersions();
  }, [currentYear, currentIndexMonth, isNewMode]);

  //---------------------------------------------------------------------------
  // 新規作成モードで年月変更時に既存データをチェック
  //---------------------------------------------------------------------------
  const [showExistingDataDialog, setShowExistingDataDialog] = useState(false);

  useEffect(() => {
    // 新規作成モードで年月が変更された時、既存データがあるかチェック
    // ダイアログ表示中、利用可能な年月がまだ取得されていない場合はスキップ
    if (isNewMode && availableYearMonths.length > 0) {
      // URLパラメータから直接年月を取得（currentYear/currentIndexMonthの更新を待たない）
      const yearParam = searchParams.get('year');
      const monthParam = searchParams.get('month');

      if (yearParam && monthParam) {
        const urlYearMonth = `${yearParam}-${monthParam}`;

        // 利用可能な年月のセットを作成
        const availableSet = new Set(
          availableYearMonths.map((ym) => `${ym.year}-${ym.month}`)
        );

        // 既存データがあるかチェック（利用可能な年月に含まれているか）
        if (availableSet.has(urlYearMonth)) {
          setShowExistingDataDialog(true);
        } else {
          // 既存データがない場合は、モーダルを閉じる（戻った場合など）
          setShowExistingDataDialog(false);
        }
      }
    }
  }, [searchParams, isNewMode, availableYearMonths]);

  // 既存データを読み込む
  const handleLoadExistingData = () => {
    setShowExistingDataDialog(false);
    // URLからmode=newを削除し、年月を設定して通常モードに切り替え
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('mode');
      newParams.set('year', currentYear.toString());
      newParams.set('month', (currentIndexMonth + 1).toString()); // 1-12の形式に変換
      return newParams;
    });
  };

  // 戻る（ブラウザの履歴を一つ前に戻す）
  const handleGoBack = () => {
    setShowExistingDataDialog(false);
    // ブラウザの履歴を一つ前に戻す
    navigate(-1);
  };

  //---------------------------------------------------------------------------
  // 初回レンダリング処理
  //---------------------------------------------------------------------------
  const [isNew, setIsNew] = useState(false);

  // データ取得関数を抽出（再利用可能にする）
  const fetchData = async (skipNewModeCheck = false) => {
    // ダイアログ表示中は処理をスキップ
    if (showExistingDataDialog && !skipNewModeCheck) {
      return;
    }

    // ヘッダーに設定可能なコンテントタイプを取得
    const resContent = await testApi.fetchContentTypeList();
    console.log('resContent', resContent);

    // オリジナルの順序を保持
    setOriginalContentType(resContent);

    // コンテントタイプIDの数字リストを取得
    const contentTypeIdList = getContentTypeIdList(resContent);
    console.log('contentTypeIdList', contentTypeIdList);

    // 新規作成モードの場合は、isNewをtrueにしてselectedContentTypeIdsを設定
    // skipNewModeCheckがtrueの場合は、強制的に通常モードとしてデータを取得
    if (isNewMode && !skipNewModeCheck) {
      setIsNew(true);
      setSelectedContentTypeIds([2, 4]);
    }

    // バージョンを決定（新規モードの場合は0、通常モードの場合は選択されたバージョン、nullの場合は0）
    const versionToFetch = isNewMode && !skipNewModeCheck
      ? 0
      : (selectedVersion !== null ? selectedVersion : 0);

    // バージョン指定でデータを取得（常にfetchPlanHistoryを使用）
    const res = await testApi.fetchPlanHistory(
      currentYear,
      currentIndexMonth + 1,
      versionToFetch
    );
    console.log('res', res);

    // 全日マッピング処理
    const mapData = mapMonthlyTestData(
      res,
      currentYear,
      currentIndexMonth,
      getDefaultRecord,
      contentTypeIdList
    );

    console.log('mapData', mapData);

    setRowData(mapData);
    setAgRowData(JSON.parse(JSON.stringify(mapData)));

    // 初期表示するcontentTypeIdのリストを決定（新規モードの場合は既に設定済みなのでスキップ）
    if (!isNewMode || skipNewModeCheck) {
      const initialIds = getInitialContentTypeIds(mapData);
      setSelectedContentTypeIds(initialIds);
    }
  };


  //---------------------------------------------------------------------------
  // 初回レンダリング処理
  //---------------------------------------------------------------------------
  useEffect(() => {
    fetchData();
  }, [currentYear, currentIndexMonth, isNewMode, showExistingDataDialog, selectedVersion]);

  //---------------------------------------------------------------------------
  // コンテントタイプIDを数字のリストに変換する関数
  //---------------------------------------------------------------------------
  const getContentTypeIdList = (list: ContentTypeList[]): number[] => {
    return list.map((item) => item.contentTypeId);
  };

  //---------------------------------------------------------------------------
  // コンテントタイプIDごとにデフォルト値を設定する関数（マッピングで使用）
  //---------------------------------------------------------------------------
  const getDefaultRecord = (IdList: number[]): Record<number, testItem> => {
    return IdList.reduce((acc, id) => {
      acc[id] = { company: null, vol: null, time: null };
      return acc;
    }, {} as Record<number, testItem>);
  };

  //---------------------------------------------------------------------------
  // デフォルト値を設定する処理（新規モード用）
  //---------------------------------------------------------------------------
  const handleSetDefaultValues = async () => {
    if (!isNewMode) return;

    try {
      // マスターデータを取得
      const [defaultTimeData, defaultVolData] = await Promise.all([
        testApi.fetchContentTypeDefaultTime(),
        testApi.fetchContentTypeDefaultVol(),
      ]);

      // 現在のcontentTypeIdListを取得
      const contentTypeIdList = getContentTypeIdList(originalContentType);

      // マスターデータから初期値を設定した月次データを生成
      const mapDataWithDefaults = mapMonthlyTestDataWithDefaults(
        currentYear,
        currentIndexMonth,
        contentTypeIdList,
        defaultTimeData,
        defaultVolData,
        getDefaultRecord
      );

      console.log('mapData(デフォルト値設定)', mapDataWithDefaults);
      setRowData(mapDataWithDefaults);
      setAgRowData(JSON.parse(JSON.stringify(mapDataWithDefaults)));

      // 初期表示するcontentTypeIdのリストを決定
      const initialIds = getInitialContentTypeIds(mapDataWithDefaults);
      setSelectedContentTypeIds(initialIds);
    } catch (error) {
      console.error('デフォルト値の設定に失敗しました:', error);
      alert('デフォルト値の設定に失敗しました。');
    }
  };

  //---------------------------------------------------------------------------
  // 編集
  //---------------------------------------------------------------------------
  const toggleEditMode = () => {
    // 新規作成モードの場合は上程チェックをスキップ
    if (!isNewMode) {
      // 上程完了済みの場合は編集不可
      if (approvalStatus.some((a) => a.status === 5)) {
        alert('上程が完了しているため、編集できません。');
        return;
      }

      // 上程中は承認者のみが編集可能
      if (!canEdit()) { // useApproval: 編集可能かどうか判定
        alert('上程中です。承認者のみが編集できます。');
        return;
      }
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

        // 新規モードを解除（URLパラメータからmodeを削除）
        if (isNewMode) {
          setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);
            newParams.delete('mode');
            return newParams;
          });
        }

        // 新規登録後、現在の年月でデータを再取得（強制的に通常モードとして取得）
        // skipNewModeCheck=trueで、isNewModeのチェックをスキップし、現在の年月のデータを取得
        await fetchData(true);

        // 編集モード解除
        setIsEditing(false);
      } else {
        // --- API呼び出し（あなたのtestApi経由）---
        const res = await testApi.savePlan(reqData);
        console.log('保存成功:', res);
        alert('保存が完了しました。');

        // 編集モード解除
        setIsEditing(false);

        // Grid内の現在の状態をagRowDataとrowDataにセット
        setAgRowData(updatedRows);
        setRowData(updatedRows);
      }
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

      // データを再取得（最新バージョンを指定）
      const fetchData = async () => {
        // 最新バージョンを取得
        const versions = await testApi.fetchAvailableVersions(
          currentYear,
          currentIndexMonth + 1
        );
        const latestVersion = Math.max(...versions);

        // バージョン指定でデータを取得
        const res = await testApi.fetchPlanHistory(
          currentYear,
          currentIndexMonth + 1,
          latestVersion
        );

        const resContent = await testApi.fetchContentTypeList();
        setOriginalContentType(resContent);
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

        // 初期表示するcontentTypeIdのリストを決定
        const initialIds = getInitialContentTypeIds(mapData);
        setSelectedContentTypeIds(initialIds);

        // 最新バージョンを選択状態に設定
        setSelectedVersion(latestVersion);
        setAvailableVersions(versions);
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
  const reportNo = `計画${currentYear}-${currentIndexMonth + 1}`;
  const {
    approvalStatus,
    canEdit,
    isCompleted,
    isDrawerOpen,
    setIsDrawerOpen,
    refresh: refreshApprovalStatus,
    getApprovalFlowDirection,
  } = useApproval({
    year: currentYear,
    month: currentIndexMonth + 1,
    reportNo: reportNo, // ページ固有のreportNo（year-month形式）
    autoFetch: true,
  });


  // 上程状態をチェック（承認者のみが操作可能かどうか）
  const checkCanEdit = (): boolean => {
    // 新規作成モードの場合は常に編集可能
    if (isNewMode) {
      return true;
    }
    // 完了済みの場合は編集不可
    if (isCompleted()) { // useApproval: 完了しているか判定
      return false;
    }
    return canEdit(); // useApproval: 編集可能かどうか判定
  };

  //---------------------------------------------------------------------------
  // 描画JSX
  //---------------------------------------------------------------------------
  return (
    <>
      <div className="mx-5 flex h-full flex-col">
        <div className="flex w-full justify-between">
          <div className="flex items-center gap-4">
            <button
              className="h-full w-24 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
              onClick={handleClick}
            >
              pdf
            </button>
            {/* 新規モードの時のみ表示される初期値設定ボタン */}
            {isNewMode && (
              <button
                className="h-full w-32 rounded-lg bg-yellow-500 px-4 py-2 text-sm text-white hover:bg-yellow-600"
                onClick={handleSetDefaultValues}
              >
                初期値を設定
              </button>
            )}
            <button
              className="h-full w-24 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
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
              className="h-full w-32 rounded-lg bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600"
              onClick={() => setIsHeaderConfigOpen(true)}
            >
              ヘッダー設定
            </button>
            <button
              className="h-full w-32 rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600"
              onClick={() => setIsDrawerOpen(true)} // useApproval: Drawerの開閉状態を設定
            >
              上程
            </button>

            {/* 上程状態表示（上程ボタンの右側） */}
            {approvalStatus.length > 0 && (() => {
              const flowDirection = getApprovalFlowDirection();
              return (
                <div className="flex flex-col rounded-lg border-2 border-orange-500 bg-orange-50 px-3 py-2">
                  {flowDirection.action === '完了' ? (
                    <div className="text-sm font-bold text-green-700">
                      承認完了
                    </div>
                  ) : flowDirection.action === '差し戻し' ? (
                    <>
                      <div className="text-sm font-bold text-red-700">
                        {flowDirection.flow.join(' → ')}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-red-600">
                        <span>差戻</span>
                        {flowDirection.actionDate && (
                          <span>
                            ({new Date(flowDirection.actionDate).toLocaleString('ja-JP')})
                          </span>
                        )}
                      </div>
                    </>
                  ) : flowDirection.flow.length > 0 ? (
                    <>
                      <div className="text-sm font-bold text-orange-700">
                        {flowDirection.flow.join(' → ')}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-orange-600">
                        <span>上程中</span>
                        {flowDirection.actionDate && (
                          <span>
                            ({new Date(flowDirection.actionDate).toLocaleString('ja-JP')})
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm font-bold text-orange-700">
                      上程中
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div>
            <p className="mb-2 text-xl">編集モード</p>
            <Toggle value={isEditing} onChange={toggleEditMode} />
          </div>
        </div>

        <div className="my-5 flex gap-4">
          <YearMonthFilter
            availableYearMonths={availableYearMonths}
            loading={loadingYearMonths}
            allowAllMonths={isNewMode}
          />
          {/* バージョン選択ドロップダウン（新規作成モード以外で表示） */}
          {!isNewMode && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                バージョン:
              </label>
              <select
                value={selectedVersion ?? ''}
                onChange={(e) => {
                  const version = e.target.value === '' ? null : parseInt(e.target.value, 10);
                  setSelectedVersion(version);
                }}
                disabled={isLoadingVersions || availableVersions.length === 0}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {isLoadingVersions ? (
                  <option>読み込み中...</option>
                ) : availableVersions.length === 0 ? (
                  <option>バージョンなし</option>
                ) : (
                  availableVersions.map((version) => (
                    <option key={version} value={version}>
                      {version === Math.max(...availableVersions)
                        ? `v${version} (最新)`
                        : `v${version}`}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
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

        {/* 上程Drawer（開いている時のみレンダリング） */}
        {isDrawerOpen && ( // useApproval: Drawerの開閉状態を取得
          <ApprovalDrawer
            onClose={() => setIsDrawerOpen(false)} // useApproval: Drawerの開閉状態を設定
            year={currentYear}
            month={currentIndexMonth + 1}
            reportNo={reportNo}
            onApprovalChange={refreshApprovalStatus} // useApproval: 上程状態を再取得
          />
        )}

        {/* 既存データがある場合の確認ダイアログ */}
        {showExistingDataDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-96 rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  既存データが見つかりました
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {currentYear}年{currentIndexMonth + 1}
                  月には既にデータが存在します。
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  既存データを読み込むか、前の年月に戻りますか？
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleGoBack}
                  className="rounded bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-600"
                >
                  戻る
                </button>
                <button
                  onClick={handleLoadExistingData}
                  className="rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
                >
                  既存データを読み込む
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AgTest;
