import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { testApi } from '../api/testApi';
import YearMonthFilter from '../components/YearMonthFilter';
import { useYearMonthParams } from '../hooks/useYearMonthParams';
import {
  mapMonthlyTestData,
  mapMonthlyTestDataWithDefaults,
} from '../utils/mappingData';
import Toggle from '../components/Toggle';
import { convertPlanData } from '../utils/convertData';
import type {
  MapdePlan,
  ContentTypeList,
  Company,
  testItem,
} from './AgTest';

// DHTMLX Suiteのグローバル型定義
declare global {
  interface Window {
    dhx: any;
  }
}

// 初期表示するcontentTypeIdのリストを決定する関数
const getInitialContentTypeIds = (data: MapdePlan[]): number[] => {
  const initialIds: number[] = [2, 4]; // デフォルトは2, 4のみ
  let hasContentType1 = false;
  let hasContentType3 = false;

  data.some((row) => {
    if (!hasContentType1) {
      const contentType1 = row.contentType[1];
      if (contentType1) {
        hasContentType1 =
          contentType1.company != null ||
          contentType1.vol != null ||
          contentType1.time != null;
      }
    }

    if (!hasContentType3) {
      const contentType3 = row.contentType[3];
      if (contentType3) {
        hasContentType3 =
          contentType3.company != null ||
          contentType3.vol != null ||
          contentType3.time != null;
      }
    }

    return hasContentType1 && hasContentType3;
  });

  if (hasContentType1) {
    initialIds.push(1);
  }
  if (hasContentType3) {
    initialIds.push(3);
  }

  return initialIds;
};

const DhtmlxAgTest = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isNewMode = searchParams.get('mode') === 'new';

  // DHTMLX Grid用のref
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<any>(null);

  // 状態管理（AgTestと同じ）
  const [availableYearMonths, setAvailableYearMonths] = useState<
    { year: number; month: number }[]
  >([]);
  const [loadingYearMonths, setLoadingYearMonths] = useState(true);

  const { currentYear, currentIndexMonth } = useYearMonthParams(
    isNewMode ? undefined : availableYearMonths
  );
  const [isEditing, setIsEditing] = useState(false);
  const [rowData, setRowData] = useState<MapdePlan[]>([]);
  const [originalContentType, setOriginalContentType] = useState<
    ContentTypeList[]
  >([]);
  const [selectedContentTypeIds, setSelectedContentTypeIds] = useState<
    number[]
  >([]);
  const [isHeaderConfigOpen, setIsHeaderConfigOpen] = useState(false);
  const [availableVersions, setAvailableVersions] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isNew, setIsNew] = useState(false);
  const [isGridReady, setIsGridReady] = useState(false);

  // 会社選択ポップアップの状態
  const [companyPopup, setCompanyPopup] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    rowId: any;
    columnId: string;
    currentValue: number | undefined;
  } | null>(null);

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
  // 会社マスタを取得
  //---------------------------------------------------------------------------
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await testApi.fetchCompanyList();
        setCompanies(data);
      } catch (error) {
        console.error('会社マスタの取得に失敗しました:', error);
      }
    };
    fetchCompanies();
  }, []);

  //---------------------------------------------------------------------------
  // 利用可能なバージョンを取得
  //---------------------------------------------------------------------------
  useEffect(() => {
    console.log(
      `🔔 [バージョン取得] useEffect発火: ${currentYear}年${currentIndexMonth + 1}月 isNewMode=${isNewMode}`
    );

    if (isNewMode) {
      console.log('→ 新規モード: version=0を設定');
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
        const latestVersion = Math.max(...versions);
        console.log(
          `→ バージョン取得完了: versions=${versions} latest=${latestVersion}`
        );
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
  // コンテントタイプIDを数字のリストに変換する関数
  //---------------------------------------------------------------------------
  const getContentTypeIdList = (list: ContentTypeList[]): number[] => {
    return list.map((item) => item.contentTypeId);
  };

  //---------------------------------------------------------------------------
  // コンテントタイプIDごとにデフォルト値を設定する関数
  //---------------------------------------------------------------------------
  const getDefaultRecord = (IdList: number[]): Record<number, testItem> => {
    return IdList.reduce((acc, id) => {
      acc[id] = { company: undefined, vol: undefined, time: undefined };
      return acc;
    }, {} as Record<number, testItem>);
  };

  //---------------------------------------------------------------------------
  // DHTMLX Gridのカラム定義を生成
  //---------------------------------------------------------------------------
  const generateColumns = useCallback(() => {
    // 日付カラム（最初）
    const columns: any[] = [
      {
        id: 'dayLabel',
        header: [{ text: '日付' }],
        width: 120,
        editable: false,
        htmlEnable: true,
        template: (text: string, row: any) => {
          const originalData = row._originalData;
          // 祝日は赤色
          if (originalData?.isHoliday) {
            return `<span style="color: #dc2626; font-weight: 600;">${text}</span>`;
          }
          // 土曜日は青色
          if (originalData?.isSturday) {
            return `<span style="color: #2563eb; font-weight: 600;">${text}</span>`;
          }
          // 平日は通常の色
          return text;
        },
      },
    ];

    // 選択されたcontentTypeに応じてカラムを追加（中間）
    selectedContentTypeIds.forEach((contentTypeId) => {
      const contentTypeName =
        originalContentType.find((ct) => ct.contentTypeId === contentTypeId)
          ?.contentName || `Content ${contentTypeId}`;

      columns.push(
        {
          id: `content_${contentTypeId}_company`,
          header: [{ text: `${contentTypeName} - 会社` }],
          width: 150,
          editable: false, // 直接編集不可（ポップアップで選択）
          htmlEnable: true,
          template: (text: string, row: any) => {
            const companyId = row[`content_${contentTypeId}_company`];
            
            if (!companyId) {
              // 未選択の場合
              return `<div style="background-color: #f3f4f6; color: #6b7280; padding: 4px 8px; border-radius: 4px; text-align: center; font-weight: 500; border: 2px dashed #d1d5db; cursor: pointer;">選択...</div>`;
            }
            
            const company = companies.find((c) => c.companyId === companyId);
            const bgColor = company?.bgColor || '#ffffff';
            const companyName = company?.companyName || text;
            
            // 背景色に応じて文字色を調整（RGB値から明度を計算）
            const hex = bgColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            // 相対輝度の計算（より正確な方法）
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const textColor = luminance > 0.5 ? '#000000' : '#ffffff';
            
            return `<div style="background-color: ${bgColor}; color: ${textColor}; padding: 4px 8px; border-radius: 4px; text-align: center; font-weight: 500; cursor: pointer; border: 2px solid ${bgColor};">${companyName}</div>`;
          },
        },
        {
          id: `content_${contentTypeId}_vol`,
          header: [{ text: `${contentTypeName} - 量` }],
          width: 100,
          editable: isEditing,
          type: 'number',
        },
        {
          id: `content_${contentTypeId}_time`,
          header: [{ text: `${contentTypeName} - 時刻` }],
          width: 100,
          editable: isEditing,
        }
      );
    });

    // 備考カラム（最後）
    columns.push({
      id: 'note',
      header: [{ text: '備考' }],
      width: 200,
      editable: isEditing,
    });

    return columns;
  }, [selectedContentTypeIds, originalContentType, companies, isEditing]);

  //---------------------------------------------------------------------------
  // DHTMLX Grid用のデータフォーマットに変換
  //---------------------------------------------------------------------------
  const convertToGridData = useCallback((data: MapdePlan[]) => {
    return data.map((row, index) => {
      const gridRow: any = {
        id: index + 1,
        dayLabel: row.dayLabel,
        note: row.note || '',
        _originalData: row, // 元データを保持
      };

      // contentTypeごとのデータを展開
      selectedContentTypeIds.forEach((contentTypeId) => {
        const content = row.contentType[contentTypeId];
        gridRow[`content_${contentTypeId}_company`] = content?.company ?? '';
        gridRow[`content_${contentTypeId}_vol`] = content?.vol ?? '';
        gridRow[`content_${contentTypeId}_time`] = content?.time ?? '';
      });

      return gridRow;
    });
  }, [selectedContentTypeIds]);

  //---------------------------------------------------------------------------
  // DHTMLX Gridからデータを取得してMapdePlan形式に変換
  //---------------------------------------------------------------------------
  const convertFromGridData = useCallback(() => {
    if (!gridInstanceRef.current) return rowData;

    const updatedData: MapdePlan[] = [];
    const gridData = gridInstanceRef.current.data.serialize();

    gridData.forEach((gridRow: any) => {
      const originalRow = gridRow._originalData as MapdePlan;
      const updatedRow: MapdePlan = {
        ...originalRow,
        note: gridRow.note || '',
        contentType: { ...originalRow.contentType },
      };

      // contentTypeごとのデータを復元
      selectedContentTypeIds.forEach((contentTypeId) => {
        updatedRow.contentType[contentTypeId] = {
          company: gridRow[`content_${contentTypeId}_company`] || undefined,
          vol: gridRow[`content_${contentTypeId}_vol`] || undefined,
          time: gridRow[`content_${contentTypeId}_time`] || undefined,
        };
      });

      updatedData.push(updatedRow);
    });

    return updatedData;
  }, [rowData, selectedContentTypeIds]);

  //---------------------------------------------------------------------------
  // DHTMLX Gridの初期化・更新
  //---------------------------------------------------------------------------
  useEffect(() => {
    if (!gridContainerRef.current || !isGridReady) return;
    if (originalContentType.length === 0 || companies.length === 0) return;

    // DHXが読み込まれているか確認
    if (typeof window.dhx === 'undefined') {
      console.error('DHTMLX Suite is not loaded');
      return;
    }

    // 既存のGridがあれば破棄
    if (gridInstanceRef.current) {
      gridInstanceRef.current.destructor();
    }

    // Gridの初期化
    const columns = generateColumns();
    const grid = new window.dhx.Grid(gridContainerRef.current, {
      columns,
      autoWidth: false,
      selection: 'row',
      editable: isEditing,
      resizable: true,
    });

    // データをセット
    const gridData = convertToGridData(rowData);
    grid.data.parse(gridData);

    // セルクリックイベント（会社選択ポップアップ表示）
    grid.events.on('cellClick', (row: any, column: any, event: MouseEvent) => {
      // 編集モードかつ会社列がクリックされた場合
      if (isEditing && column && column.id && column.id.includes('_company')) {
        // クリック位置を取得
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        
        // ポップアップのサイズ（小さめに調整）
        const popupHeight = 320;
        const popupWidth = 240;
        
        // 画面サイズ
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        
        // 下にスペースがあるかチェック
        const spaceBelow = windowHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Y座標の決定（下にスペースがなければ上に表示）
        let yPos: number;
        if (spaceBelow >= popupHeight) {
          // 下に表示
          yPos = rect.bottom + 5;
        } else if (spaceAbove >= popupHeight) {
          // 上に表示（セルの真上に配置）
          yPos = rect.top - popupHeight;
        } else {
          // どちらも足りない場合は、画面中央に表示　
          yPos = Math.max(10, (windowHeight - popupHeight) / 2);
        }
        
        // X座標の調整（右端に切れないように）
        let xPos = rect.left;
        if (xPos + popupWidth > windowWidth) {
          xPos = windowWidth - popupWidth - 10;
        }
        if (xPos < 10) {
          xPos = 10;
        }
        
        setCompanyPopup({
          isOpen: true,
          position: { x: xPos, y: yPos },
          rowId: row.id,
          columnId: column.id,
          currentValue: row[column.id] || undefined,
        });
      }
    });

    gridInstanceRef.current = grid;

    // クリーンアップ
    return () => {
      if (gridInstanceRef.current) {
        gridInstanceRef.current.destructor();
        gridInstanceRef.current = null;
      }
    };
  }, [
    isGridReady,
    rowData,
    generateColumns,
    convertToGridData,
    isEditing,
    originalContentType,
    companies,
    selectedContentTypeIds,
  ]);

  //---------------------------------------------------------------------------
  // データ取得関数
  //---------------------------------------------------------------------------
  const fetchData = async (skipNewModeCheck = false) => {
    setIsGridReady(false);

    const resContent = await testApi.fetchContentTypeList();
    const contentTypeIdList = getContentTypeIdList(resContent);

    const versionToFetch =
      isNewMode && !skipNewModeCheck
        ? 0
        : selectedVersion !== null
          ? selectedVersion
          : 0;

    const res = await testApi.fetchPlanHistory(
      currentYear,
      currentIndexMonth + 1,
      versionToFetch
    );

    const mapData = mapMonthlyTestData(
      res,
      currentYear,
      currentIndexMonth,
      getDefaultRecord,
      contentTypeIdList
    );

    let initialIds: number[];
    if (isNewMode && !skipNewModeCheck) {
      initialIds = [2, 4];
      setIsNew(true);
    } else {
      initialIds = getInitialContentTypeIds(mapData);
    }

    setOriginalContentType(resContent);
    setSelectedContentTypeIds(initialIds);
    setRowData(mapData);
    setIsGridReady(true);
  };

  //---------------------------------------------------------------------------
  // 初回レンダリング処理
  //---------------------------------------------------------------------------
  useEffect(() => {
    fetchData();
  }, [currentYear, currentIndexMonth, isNewMode]);

  //---------------------------------------------------------------------------
  // 編集モード切り替え
  //---------------------------------------------------------------------------
  const toggleEditMode = () => {
    if (isEditing) {
      const confirmDiscard = window.confirm(
        '変更内容を破棄して編集モードを解除しますか？'
      );
      if (confirmDiscard) {
        setIsEditing(false);
        // Gridを再構築
        setIsGridReady(false);
        setTimeout(() => setIsGridReady(true), 0);
      }
    } else {
      setIsEditing(true);
      // Gridを再構築
      setIsGridReady(false);
      setTimeout(() => setIsGridReady(true), 0);
    }
  };

  //---------------------------------------------------------------------------
  // 保存処理
  //---------------------------------------------------------------------------
  const handleSave = async () => {
    const updatedRows = convertFromGridData();
    const reqData = convertPlanData(updatedRows);

    try {
      if (isNew) {
        await testApi.createNewPlan(reqData);
        alert('新規登録が完了しました。');
        setIsNew(false);

        if (isNewMode) {
          setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);
            newParams.delete('mode');
            return newParams;
          });
        }

        await fetchData(true);
        setIsEditing(false);
      } else {
        await testApi.savePlan(reqData);
        alert('保存が完了しました。');
        setIsEditing(false);
        setRowData(updatedRows);
      }
    } catch (error) {
      console.error('登録エラー:', error);
      alert('登録に失敗しました。サーバーを確認してください。');
    }
  };

  //---------------------------------------------------------------------------
  // デフォルト値を設定する処理（新規モード用）
  //---------------------------------------------------------------------------
  const handleSetDefaultValues = async () => {
    if (!isNewMode) return;

    try {
      const [defaultTimeData, defaultVolData] = await Promise.all([
        testApi.fetchContentTypeDefaultTime(),
        testApi.fetchContentTypeDefaultVol(),
      ]);

      const contentTypeIdList = getContentTypeIdList(originalContentType);

      const mapDataWithDefaults = mapMonthlyTestDataWithDefaults(
        currentYear,
        currentIndexMonth,
        contentTypeIdList,
        defaultTimeData,
        defaultVolData,
        getDefaultRecord
      );

      setRowData(mapDataWithDefaults);

      const initialIds = getInitialContentTypeIds(mapDataWithDefaults);
      setSelectedContentTypeIds(initialIds);

      // Gridを再構築
      setIsGridReady(false);
      setTimeout(() => setIsGridReady(true), 0);
    } catch (error) {
      console.error('デフォルト値の設定に失敗しました:', error);
      alert('デフォルト値の設定に失敗しました。');
    }
  };

  //---------------------------------------------------------------------------
  // 会社選択ポップアップ関連
  //---------------------------------------------------------------------------
  const handleCompanySelect = (companyId: number | null) => {
    if (!companyPopup || !gridInstanceRef.current) return;

    // Gridのデータを更新
    gridInstanceRef.current.data.update(companyPopup.rowId, {
      [companyPopup.columnId]: companyId || undefined,
    });

    // ポップアップを閉じる
    setCompanyPopup(null);
  };

  const handleCloseCompanyPopup = () => {
    setCompanyPopup(null);
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
    // Gridを再構築
    setIsGridReady(false);
    setTimeout(() => setIsGridReady(true), 0);
  };

  const handleSelectAll = () => {
    const allIds = originalContentType.map((item) => item.contentTypeId);
    setSelectedContentTypeIds(allIds);
    setIsGridReady(false);
    setTimeout(() => setIsGridReady(true), 0);
  };

  const handleDeselectAll = () => {
    setSelectedContentTypeIds([]);
    setIsGridReady(false);
    setTimeout(() => setIsGridReady(true), 0);
  };


  //---------------------------------------------------------------------------
  // 描画JSX
  //---------------------------------------------------------------------------
  return (
    <>
      <div className="mx-5 flex h-full flex-col">
        <div className="flex w-full justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700">
              DHTMLX Grid版
            </div>
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
            <button
              className="h-full w-32 rounded-lg bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600"
              onClick={() => setIsHeaderConfigOpen(true)}
            >
              ヘッダー設定
            </button>
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
          {!isNewMode && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                バージョン:
              </label>
              <select
                value={selectedVersion ?? ''}
                onChange={(e) => {
                  const version =
                    e.target.value === '' ? null : parseInt(e.target.value, 10);
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
          {isGridReady ? (
            <div
              ref={gridContainerRef}
              style={{ width: '100%', height: '100%' }}
              className="rounded-lg border border-gray-300 bg-white shadow"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-center">
                <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                <p className="text-gray-600">データを読み込んでいます...</p>
              </div>
            </div>
          )}
        </div>

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

        {/* 会社選択ポップアップ */}
        {companyPopup?.isOpen && (
          <>
            {/* 背景オーバーレイ */}
            <div
              className="fixed inset-0 z-40"
              onClick={handleCloseCompanyPopup}
            />
            {/* ポップアップ本体 */}
            <div
              className="fixed z-50 rounded-lg bg-white shadow-2xl border-2 border-blue-500"
              style={{
                left: `${companyPopup.position.x}px`,
                top: `${companyPopup.position.y}px`,
                width: '240px',
                maxHeight: `${Math.min(320, window.innerHeight - 20)}px`,
              }}
            >
              <div 
                className="overflow-y-auto p-2"
                style={{
                  maxHeight: `${Math.min(310, window.innerHeight - 30)}px`,
                }}
              >
                {/* クリアボタン */}
                <button
                  onClick={() => handleCompanySelect(null)}
                  className="w-full mb-1.5 p-2 rounded border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm font-medium transition-colors"
                >
                  選択を解除
                </button>

                {/* 会社リスト */}
                <div className="space-y-1.5">
                  {companies.map((company) => {
                    // 明度計算
                    const hex = company.bgColor.replace('#', '');
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                    const textColor = luminance > 0.5 ? '#000000' : '#ffffff';

                    const isSelected = companyPopup.currentValue === company.companyId;

                    return (
                      <button
                        key={company.companyId}
                        onClick={() => handleCompanySelect(company.companyId)}
                        className={`w-full p-2 rounded font-medium text-sm transition-all transform hover:scale-[1.02] ${
                          isSelected ? 'ring-2 ring-blue-400' : ''
                        }`}
                        style={{
                          backgroundColor: company.bgColor,
                          color: textColor,
                          border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span>{company.companyName}</span>
                          {isSelected && (
                            <span className="text-base">✓</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default DhtmlxAgTest;

