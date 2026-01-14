import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useEffect, useRef, useState, useMemo } from 'react';
import type { AgGridReact as AgGridReactType } from 'ag-grid-react';
import YearMonthFilter from '../components/YearMonthFilter';
import { useYearMonthParams } from '../hooks/useYearMonthParams';
import Toggle from '../components/Toggle';

ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * 廃棄物排出計画スケジュール（種別ベースヘッダー方式）
 * 
 * 【設計方針】
 * - ヘッダーは「廃プラ①」「汚泥①」「廃プラ②」のように種別ベースで表示
 * - 月ごとに「通常日用ヘッダー」と「特殊日用ヘッダー」を定義
 * - 特殊日モードボタンでヘッダーを切り替え
 * - 実績との紐付け：date + wasteType + typeSequence
 */

// ヘッダー定義の型
export type HeaderDefinition = {
  headerId: number;
  headerOrder: number;
  wasteType: string; // '廃プラ', '汚泥'
  typeSequence: number; // その種別の何回目か
  displayName: string; // '廃プラ①', '汚泥②' など
};

// 計画データの型（1日分）
export type DailyPlan = {
  date: string; // YYYY-MM-DD
  dayLabel: string; // 例: "1日(月)"
  isHoliday: boolean;
  isSaturday: boolean;
  isSpecialDay: boolean; // その日が特殊日かどうか
  plans: PlanCell[]; // ヘッダー定義の順序に対応
  note: string;
};

// 1つのセルのデータ
export type PlanCell = {
  planId?: number;
  headerId: number;
  wasteType: string;
  typeSequence: number;
  companyId: number | null;
  vol: number | null;
  plannedTime: string | null; // HH:mm
};

// 会社マスタ
export type Company = {
  companyId: number;
  companyName: string;
  bgColor: string;
  type: number;
  defTime?: string | null;
};

const WasteSchedule = () => {
  // 年月関連
  const [availableYearMonths] = useState<{ year: number; month: number }[]>([]);
  const [loadingYearMonths, setLoadingYearMonths] = useState(true);
  const { currentYear, currentIndexMonth } = useYearMonthParams(availableYearMonths);

  // データ関連
  const [rowData, setRowData] = useState<DailyPlan[]>([]);
  const [agRowData, setAgRowData] = useState<DailyPlan[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isGridReady, setIsGridReady] = useState(false);

  // ヘッダー定義
  const [normalHeaders, setNormalHeaders] = useState<HeaderDefinition[]>([]); // 通常日用
  const [specialHeaders, setSpecialHeaders] = useState<HeaderDefinition[]>([]); // 特殊日用

  // 特殊日モード（画面全体で通常日/特殊日を切り替える）
  const [isSpecialDayMode, setIsSpecialDayMode] = useState(false);

  // マスタデータ
  const [companies, setCompanies] = useState<Company[]>([]);

  const gridRef = useRef<AgGridReactType<DailyPlan>>(null);

  //---------------------------------------------------------------------------
  // 初期データ取得
  //---------------------------------------------------------------------------
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // TODO: 実際のAPI呼び出しに置き換える
        // const companiesData = await wasteScheduleApi.fetchCompanyList();
        // setCompanies(companiesData);

        // モックデータ（開発用）
        setCompanies([
          {
            companyId: 1,
            companyName: '会社A',
            bgColor: '#FFE5E5',
            type: 1,
            defTime: '09:00:00',
          },
          {
            companyId: 2,
            companyName: '会社B',
            bgColor: '#E5F3FF',
            type: 1,
            defTime: '10:00:00',
          },
          {
            companyId: 3,
            companyName: '会社C',
            bgColor: '#E5FFE5',
            type: 1,
            defTime: '11:00:00',
          },
        ]);

        setLoadingYearMonths(false);
      } catch (error) {
        console.error('初期データの取得に失敗:', error);
      }
    };

    fetchInitialData();
  }, []);

  //---------------------------------------------------------------------------
  // ヘッダー定義と月次データ取得
  //---------------------------------------------------------------------------
  useEffect(() => {
    const fetchMonthlyData = async () => {
      setIsGridReady(false);

      try {
        // TODO: APIからヘッダー定義を取得
        // const normalHeadersData = await wasteScheduleApi.fetchHeaderDefinition(
        //   currentYear,
        //   currentIndexMonth + 1,
        //   false // isSpecialDay
        // );
        // const specialHeadersData = await wasteScheduleApi.fetchHeaderDefinition(
        //   currentYear,
        //   currentIndexMonth + 1,
        //   true // isSpecialDay
        // );

        // モックデータ（開発用）
        const normalHeadersData: HeaderDefinition[] = [
          { headerId: 1, headerOrder: 1, wasteType: '廃プラ', typeSequence: 1, displayName: '廃プラ①' },
          { headerId: 2, headerOrder: 2, wasteType: '汚泥', typeSequence: 1, displayName: '汚泥①' },
          { headerId: 3, headerOrder: 3, wasteType: '廃プラ', typeSequence: 2, displayName: '廃プラ②' },
        ];

        const specialHeadersData: HeaderDefinition[] = [
          { headerId: 4, headerOrder: 1, wasteType: '汚泥', typeSequence: 1, displayName: '汚泥①' },
          { headerId: 5, headerOrder: 2, wasteType: '廃プラ', typeSequence: 1, displayName: '廃プラ①' },
          { headerId: 6, headerOrder: 3, wasteType: '汚泥', typeSequence: 2, displayName: '汚泥②' },
          { headerId: 7, headerOrder: 4, wasteType: '廃プラ', typeSequence: 2, displayName: '廃プラ②' },
          { headerId: 8, headerOrder: 5, wasteType: '汚泥', typeSequence: 3, displayName: '汚泥③' },
        ];

        setNormalHeaders(normalHeadersData);
        setSpecialHeaders(specialHeadersData);

        // TODO: APIから月次計画データを取得
        // const planData = await wasteScheduleApi.fetchMonthlyPlan(
        //   currentYear,
        //   currentIndexMonth + 1
        // );

        // モックデータ（開発用）
        const mockData = generateMockMonthlyData(
          currentYear,
          currentIndexMonth,
          normalHeadersData,
          specialHeadersData
        );

        setRowData(mockData);
        setAgRowData(JSON.parse(JSON.stringify(mockData)));

        setIsGridReady(true);
      } catch (error) {
        console.error('月次データの取得に失敗:', error);
        setIsGridReady(true);
      }
    };

    if (companies.length > 0) {
      fetchMonthlyData();
    }
  }, [currentYear, currentIndexMonth, companies]);

  //---------------------------------------------------------------------------
  // モックデータ生成（開発用）
  //---------------------------------------------------------------------------
  const generateMockMonthlyData = (
    year: number,
    monthIndex: number,
    normalHeaders: HeaderDefinition[],
    specialHeaders: HeaderDefinition[]
  ): DailyPlan[] => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const data: DailyPlan[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = date.getDay();
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

      // 5日を特殊日とする（サンプル）
      const isSpecialDay = day === 5;
      const headers = isSpecialDay ? specialHeaders : normalHeaders;

      // サンプルデータを一部の日に設定（1日、2日、5日）
      const plans: PlanCell[] = headers.map((header, idx) => {
        // 1日目にサンプルデータを設定
        if (day === 1) {
          return {
            headerId: header.headerId,
            wasteType: header.wasteType,
            typeSequence: header.typeSequence,
            companyId: idx % 3 === 0 ? 1 : idx % 3 === 1 ? 2 : 3,
            vol: 100 + idx * 50,
            plannedTime: `${9 + idx * 2}:00`,
          };
        }
        // 2日目にもサンプルデータ
        else if (day === 2) {
          return {
            headerId: header.headerId,
            wasteType: header.wasteType,
            typeSequence: header.typeSequence,
            companyId: idx % 3 === 0 ? 2 : idx % 3 === 1 ? 3 : 1,
            vol: 120 + idx * 30,
            plannedTime: `${10 + idx * 2}:00`,
          };
        }
        // それ以外の日は空データ
        else {
          return {
            headerId: header.headerId,
            wasteType: header.wasteType,
            typeSequence: header.typeSequence,
            companyId: null,
            vol: null,
            plannedTime: null,
          };
        }
      });

      data.push({
        date: dateStr,
        dayLabel: `${day}日(${dayNames[dayOfWeek]})`,
        isHoliday: dayOfWeek === 0,
        isSaturday: dayOfWeek === 6,
        isSpecialDay: isSpecialDay,
        plans: plans,
        note: isSpecialDay ? '特殊日' : '',
      });
    }

    return data;
  };

  //---------------------------------------------------------------------------
  // 列定義を動的に生成
  //---------------------------------------------------------------------------
  const columnDefs = useMemo(() => {
    if (!isGridReady || companies.length === 0) {
      return [];
    }

    // 現在のモードに応じたヘッダー定義を取得
    const currentHeaders = isSpecialDayMode ? specialHeaders : normalHeaders;

    if (currentHeaders.length === 0) {
      return [];
    }

    const cols: any[] = [
      {
        headerName: '日付',
        field: 'dayLabel',
        pinned: 'left',
        width: 100,
        cellStyle: (params: any) => {
          if (params.data?.isHoliday) return { backgroundColor: '#FFE5E5' };
          if (params.data?.isSaturday) return { backgroundColor: '#E5F3FF' };
          if (params.data?.isSpecialDay) return { backgroundColor: '#FFF3CD', fontWeight: 'bold' };
          return {};
        },
      },
    ];

    // ヘッダー定義に基づいて列を動的に生成
    currentHeaders.forEach((header, index) => {
      cols.push({
        headerName: header.displayName, // '廃プラ①', '汚泥①' など
        children: [
          {
            headerName: '会社',
            field: `plans.${index}.companyId`,
            width: 120,
            editable: isEditing,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
              values: ['', ...companies.map((c) => c.companyName)],
            },
            valueGetter: (params: any) => {
              const companyId = params.data?.plans?.[index]?.companyId;
              if (!companyId) return '';
              const company = companies.find((c) => c.companyId === companyId);
              return company?.companyName || '';
            },
            valueSetter: (params: any) => {
              if (params.data?.plans?.[index]) {
                if (params.newValue === '') {
                  params.data.plans[index].companyId = null;
                } else {
                  // 会社名からIDを取得
                  const company = companies.find((c) => c.companyName === params.newValue);
                  params.data.plans[index].companyId = company ? company.companyId : null;
                }
                return true;
              }
              return false;
            },
            cellStyle: (params: any) => {
              const companyId = params.data?.plans?.[index]?.companyId;
              if (companyId) {
                const company = companies.find((c) => c.companyId === companyId);
                return { 
                  backgroundColor: company?.bgColor || 'white',
                  cursor: isEditing ? 'pointer' : 'default'
                };
              }
              return { cursor: isEditing ? 'pointer' : 'default' };
            },
          },
          {
            headerName: '量',
            field: `plans.${index}.vol`,
            width: 80,
            editable: isEditing,
            cellEditor: 'agTextCellEditor',
            cellEditorParams: {
              maxLength: 10,
            },
            valueGetter: (params: any) => {
              const vol = params.data?.plans?.[index]?.vol;
              return vol !== null && vol !== undefined ? vol : '';
            },
            valueSetter: (params: any) => {
              if (params.data?.plans?.[index]) {
                const value = params.newValue === '' || params.newValue === null 
                  ? null 
                  : Number(params.newValue);
                params.data.plans[index].vol = isNaN(value as number) ? null : value;
                return true;
              }
              return false;
            },
            cellStyle: { 
              textAlign: 'right',
              cursor: isEditing ? 'pointer' : 'default'
            },
          },
          {
            headerName: '時刻',
            field: `plans.${index}.plannedTime`,
            width: 90,
            editable: isEditing,
            cellEditor: 'agTextCellEditor',
            cellEditorParams: {
              maxLength: 5,
            },
            valueGetter: (params: any) => {
              const time = params.data?.plans?.[index]?.plannedTime;
              return time || '';
            },
            valueSetter: (params: any) => {
              if (params.data?.plans?.[index]) {
                let value = params.newValue || null;
                // 時刻フォーマットの簡易バリデーション（HH:mm）
                if (value && !/^\d{1,2}:\d{2}$/.test(value)) {
                  // 数字だけの場合は自動でフォーマット（例：9 → 09:00）
                  if (/^\d{1,2}$/.test(value)) {
                    value = `${value.padStart(2, '0')}:00`;
                  }
                }
                params.data.plans[index].plannedTime = value;
                return true;
              }
              return false;
            },
            cellStyle: { 
              textAlign: 'center',
              cursor: isEditing ? 'pointer' : 'default'
            },
          },
        ],
      });
    });

    cols.push({
      headerName: '備考',
      field: 'note',
      width: 200,
      editable: isEditing,
      cellEditor: 'agTextCellEditor',
      cellEditorParams: {
        maxLength: 200,
      },
      cellStyle: { 
        cursor: isEditing ? 'pointer' : 'default'
      },
    });

    return cols;
  }, [isGridReady, isEditing, isSpecialDayMode, normalHeaders, specialHeaders, companies]);

  //---------------------------------------------------------------------------
  // 編集モード切り替え
  //---------------------------------------------------------------------------
  const toggleEditMode = () => {
    if (isEditing) {
      const hasChanges = JSON.stringify(agRowData) !== JSON.stringify(rowData);
      if (hasChanges) {
        const confirmDiscard = window.confirm(
          '変更内容を破棄して編集モードを解除しますか？'
        );
        if (confirmDiscard) {
          setAgRowData(JSON.parse(JSON.stringify(rowData)));
          setIsEditing(false);
        }
      } else {
        setIsEditing(false);
      }
    } else {
      setIsEditing(true);
    }
  };

  //---------------------------------------------------------------------------
  // 保存処理
  //---------------------------------------------------------------------------
  const handleSave = async () => {
    if (!gridRef.current) return;

    gridRef.current.api.stopEditing();

    const updatedRows: DailyPlan[] = [];
    gridRef.current.api.forEachNode((node) => {
      if (node.data) updatedRows.push(node.data);
    });

    try {
      // データを1レコード = 1セル形式に変換
      const flattenedData = updatedRows.flatMap((day) =>
        day.plans
          .filter((plan) => plan.companyId !== null || plan.vol !== null || plan.plannedTime !== null)
          .map((plan) => ({
            date: day.date,
            isSpecialDay: day.isSpecialDay,
            headerId: plan.headerId,
            wasteType: plan.wasteType,
            typeSequence: plan.typeSequence,
            companyId: plan.companyId,
            vol: plan.vol,
            plannedTime: plan.plannedTime,
            note: day.note,
            year: currentYear,
            month: currentIndexMonth + 1,
          }))
      );

      console.log('保存データ:', flattenedData);

      // TODO: API呼び出し
      // await wasteScheduleApi.savePlan(flattenedData);

      alert('保存が完了しました。');
      setRowData(updatedRows);
      setAgRowData(updatedRows);
      setIsEditing(false);
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました。');
    }
  };

  //---------------------------------------------------------------------------
  // 特殊日モード切り替え
  //---------------------------------------------------------------------------
  const toggleSpecialDayMode = () => {
    if (isEditing) {
      alert('編集モードを終了してから切り替えてください。');
      return;
    }
    setIsSpecialDayMode(!isSpecialDayMode);
  };

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      singleClickEdit: true, // シングルクリックで編集モードに
      suppressMenu: true,
    }),
    []
  );

  //---------------------------------------------------------------------------
  // 描画
  //---------------------------------------------------------------------------
  return (
    <div className="mx-5 flex h-full flex-col">
      <div className="flex w-full justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">廃棄物排出計画</h1>

          <button
            className="h-full w-24 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:bg-gray-300"
            onClick={handleSave}
            disabled={!isEditing}
          >
            保存
          </button>

          <button
            className={`h-full rounded-lg px-4 py-2 text-sm text-white ${
              isSpecialDayMode
                ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-gray-500 hover:bg-gray-600'
            }`}
            onClick={toggleSpecialDayMode}
          >
            {isSpecialDayMode ? '特殊日モード' : '通常日モード'}
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
          allowAllMonths={false}
        />
      </div>

      {/* ヘッダー情報表示 */}
      <div className="mb-4 rounded-lg bg-blue-50 p-4">
        <h3 className="mb-2 font-bold text-blue-900">
          {isSpecialDayMode ? '特殊日用ヘッダー' : '通常日用ヘッダー'}
        </h3>
        <div className="flex gap-2">
          {(isSpecialDayMode ? specialHeaders : normalHeaders).map((header) => (
            <span
              key={header.headerId}
              className="rounded bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow"
            >
              {header.displayName}
            </span>
          ))}
        </div>
        <div className="mt-3 space-y-1 text-xs text-blue-600">
          <p>※ 特殊日（黄色背景の日）には特殊日用ヘッダーが自動適用されます</p>
          {isEditing && (
            <p className="font-bold text-green-600">
              ✏️ 編集モード：セルをクリックして直接入力できます（会社はドロップダウンから選択）
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1">
        {isGridReady ? (
          <div className="ag-theme-alpine h-full min-h-0 w-full">
            <AgGridReact
              ref={gridRef}
              rowData={agRowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              suppressMovableColumns={true}
              stopEditingWhenCellsLoseFocus={true}
              enterNavigatesVertically={true}
              enterNavigatesVerticallyAfterEdit={true}
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="text-gray-600">データを読み込んでいます...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WasteSchedule;

