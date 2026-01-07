import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { AgGridReact as AgGridReactType } from 'ag-grid-react';
import YearMonthFilter from '../components/YearMonthFilter';
import { useYearMonthParams } from '../hooks/useYearMonthParams';
import Toggle from '../components/Toggle';

ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * 新しい柔軟な計画スケジュール設計
 * 
 * 【設計方針】
 * - 横軸：時間順（1回目、2回目、3回目...）- 日によって列数が異なる
 * - 縦軸：日付
 * - 各セル：種別（廃プラ/汚泥）+ 会社 + 量 + 時間を入力
 * - 実績との紐付け：date + time + wasteType で判定
 */

// 種別の型
export type WasteType = '廃プラ' | '汚泥';

// 1つの排出スケジュール（1セル = 1レコード）
export type ScheduleItem = {
  scheduleId?: number; // DB上のID（新規の場合はundefined）
  wasteType: WasteType | null; // 種別
  companyId: number | null; // 会社ID
  vol: number | null; // 量
  plannedTime: string | null; // 予定時刻（HH:mm形式）
};

// 1日分のデータ（複数の排出スケジュールを持つ）
export type DailySchedule = {
  date: string; // YYYY-MM-DD形式
  dayLabel: string; // 例: "1日(月)"
  isHoliday: boolean;
  isSaturday: boolean;
  schedules: ScheduleItem[]; // その日の排出スケジュール（配列）
  note: string; // 備考
};

// 会社マスタ
export type Company = {
  companyId: number;
  companyName: string;
  bgColor: string;
  type: number;
  defTime?: string | null;
};

// 種別マスタ
export type WasteTypeMaster = {
  wasteTypeId: number;
  wasteTypeName: WasteType;
  displayOrder: number;
  isActive: boolean;
};

const FlexibleSchedule = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNewMode = searchParams.get('mode') === 'new';

  // 年月関連
  const [availableYearMonths, setAvailableYearMonths] = useState<
    { year: number; month: number }[]
  >([]);
  const [loadingYearMonths, setLoadingYearMonths] = useState(true);
  const { currentYear, currentIndexMonth } = useYearMonthParams(
    isNewMode ? undefined : availableYearMonths
  );

  // データ関連
  const [rowData, setRowData] = useState<DailySchedule[]>([]);
  const [agRowData, setAgRowData] = useState<DailySchedule[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isGridReady, setIsGridReady] = useState(false);
  
  // マスタデータ
  const [companies, setCompanies] = useState<Company[]>([]);
  const [wasteTypes, setWasteTypes] = useState<WasteTypeMaster[]>([]);
  
  // その月の最大排出回数（動的に決定）
  const [maxScheduleCount, setMaxScheduleCount] = useState(3); // デフォルト3回
  
  const gridRef = useRef<AgGridReactType<DailySchedule>>(null);

  //---------------------------------------------------------------------------
  // 初期データ取得
  //---------------------------------------------------------------------------
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // TODO: 実際のAPI呼び出しに置き換える
        
        // 1. 利用可能な年月を取得
        // const yearMonths = await scheduleApi.fetchAvailableYearMonths();
        // setAvailableYearMonths(yearMonths);
        
        // 2. 会社マスタを取得
        // const companiesData = await scheduleApi.fetchCompanyList();
        // setCompanies(companiesData);
        
        // 3. 種別マスタを取得
        // const wasteTypesData = await scheduleApi.fetchWasteTypes();
        // setWasteTypes(wasteTypesData);
        
        // モックデータ（開発用）
        setCompanies([
          { companyId: 1, companyName: '会社A', bgColor: '#FFE5E5', type: 1, defTime: '09:00:00' },
          { companyId: 2, companyName: '会社B', bgColor: '#E5F3FF', type: 1, defTime: '10:00:00' },
          { companyId: 3, companyName: '会社C', bgColor: '#E5FFE5', type: 1, defTime: '11:00:00' },
        ]);
        
        setWasteTypes([
          { wasteTypeId: 1, wasteTypeName: '廃プラ', displayOrder: 1, isActive: true },
          { wasteTypeId: 2, wasteTypeName: '汚泥', displayOrder: 2, isActive: true },
        ]);
        
        setLoadingYearMonths(false);
      } catch (error) {
        console.error('初期データの取得に失敗:', error);
      }
    };
    
    fetchInitialData();
  }, []);

  //---------------------------------------------------------------------------
  // 月次データ取得
  //---------------------------------------------------------------------------
  useEffect(() => {
    const fetchMonthlyData = async () => {
      setIsGridReady(false);
      
      try {
        // TODO: APIから月次計画データを取得
        // const data = await scheduleApi.fetchMonthlySchedule(currentYear, currentIndexMonth + 1);
        
        // その月の最大排出回数を取得（または自動判定）
        // const config = await scheduleApi.fetchMonthlyConfig(currentYear, currentIndexMonth + 1);
        // setMaxScheduleCount(config.maxScheduleCount);
        
        // モックデータ（開発用）
        const mockData = generateMockMonthlyData(currentYear, currentIndexMonth, 3);
        setRowData(mockData);
        setAgRowData(JSON.parse(JSON.stringify(mockData)));
        setMaxScheduleCount(3);
        
        setIsGridReady(true);
      } catch (error) {
        console.error('月次データの取得に失敗:', error);
        setIsGridReady(true);
      }
    };
    
    if (companies.length > 0 && wasteTypes.length > 0) {
      fetchMonthlyData();
    }
  }, [currentYear, currentIndexMonth, companies, wasteTypes]);

  //---------------------------------------------------------------------------
  // モックデータ生成（開発用）
  //---------------------------------------------------------------------------
  const generateMockMonthlyData = (
    year: number,
    monthIndex: number,
    scheduleCount: number
  ): DailySchedule[] => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const data: DailySchedule[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = date.getDay();
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      
      // その日の排出回数を決定（例：5日は特殊日で5回排出）
      const dailyScheduleCount = day === 5 ? 5 : scheduleCount;
      
      const schedules: ScheduleItem[] = [];
      for (let i = 0; i < dailyScheduleCount; i++) {
        schedules.push({
          wasteType: null,
          companyId: null,
          vol: null,
          plannedTime: null,
        });
      }
      
      data.push({
        date: dateStr,
        dayLabel: `${day}日(${dayNames[dayOfWeek]})`,
        isHoliday: dayOfWeek === 0,
        isSaturday: dayOfWeek === 6,
        schedules: schedules,
        note: '',
      });
    }
    
    return data;
  };

  //---------------------------------------------------------------------------
  // 列定義を動的に生成
  //---------------------------------------------------------------------------
  const columnDefs = useMemo(() => {
    if (!isGridReady || companies.length === 0 || wasteTypes.length === 0) {
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
          return {};
        },
      },
    ];

    // 動的に排出回数分の列を生成
    // 各行のschedulesの最大数を取得
    const maxCount = Math.max(
      maxScheduleCount,
      ...agRowData.map(row => row.schedules.length)
    );

    for (let i = 0; i < maxCount; i++) {
      cols.push({
        headerName: `${i + 1}回目`,
        children: [
          {
            headerName: '種別',
            field: `schedules.${i}.wasteType`,
            width: 90,
            editable: isEditing,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
              values: ['', ...wasteTypes.map(wt => wt.wasteTypeName)],
            },
            valueGetter: (params: any) => {
              return params.data?.schedules?.[i]?.wasteType || '';
            },
            valueSetter: (params: any) => {
              if (params.data?.schedules?.[i]) {
                params.data.schedules[i].wasteType = params.newValue || null;
                return true;
              }
              return false;
            },
          },
          {
            headerName: '会社',
            field: `schedules.${i}.companyId`,
            width: 100,
            editable: isEditing,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
              values: ['', ...companies.map(c => c.companyId)],
            },
            valueGetter: (params: any) => {
              const companyId = params.data?.schedules?.[i]?.companyId;
              if (!companyId) return '';
              const company = companies.find(c => c.companyId === companyId);
              return company?.companyName || '';
            },
            valueSetter: (params: any) => {
              if (params.data?.schedules?.[i]) {
                const value = params.newValue === '' ? null : Number(params.newValue);
                params.data.schedules[i].companyId = value;
                return true;
              }
              return false;
            },
            cellStyle: (params: any) => {
              const companyId = params.data?.schedules?.[i]?.companyId;
              if (companyId) {
                const company = companies.find(c => c.companyId === companyId);
                return { backgroundColor: company?.bgColor || 'white' };
              }
              return {};
            },
          },
          {
            headerName: '量',
            field: `schedules.${i}.vol`,
            width: 80,
            editable: isEditing,
            valueGetter: (params: any) => {
              return params.data?.schedules?.[i]?.vol ?? '';
            },
            valueSetter: (params: any) => {
              if (params.data?.schedules?.[i]) {
                params.data.schedules[i].vol = params.newValue === '' ? null : Number(params.newValue);
                return true;
              }
              return false;
            },
          },
          {
            headerName: '時刻',
            field: `schedules.${i}.plannedTime`,
            width: 80,
            editable: isEditing,
            valueGetter: (params: any) => {
              return params.data?.schedules?.[i]?.plannedTime || '';
            },
            valueSetter: (params: any) => {
              if (params.data?.schedules?.[i]) {
                params.data.schedules[i].plannedTime = params.newValue || null;
                return true;
              }
              return false;
            },
          },
        ],
      });
    }

    cols.push({
      headerName: '備考',
      field: 'note',
      width: 150,
      editable: isEditing,
    });

    return cols;
  }, [isGridReady, isEditing, maxScheduleCount, agRowData, companies, wasteTypes]);

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

    const updatedRows: DailySchedule[] = [];
    gridRef.current.api.forEachNode((node) => {
      if (node.data) updatedRows.push(node.data);
    });

    try {
      // TODO: API呼び出し
      // データを1レコード = 1セル形式に変換してから送信
      const flattenedData = updatedRows.flatMap(day => 
        day.schedules.map((schedule, index) => ({
          date: day.date,
          scheduleOrder: index + 1,
          wasteType: schedule.wasteType,
          companyId: schedule.companyId,
          vol: schedule.vol,
          plannedTime: schedule.plannedTime,
          note: day.note,
          year: currentYear,
          month: currentIndexMonth + 1,
        }))
      ).filter(item => item.wasteType !== null); // 種別が未入力のものは除外

      console.log('保存データ:', flattenedData);
      
      // await scheduleApi.saveSchedule(flattenedData);
      
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
  // 排出回数を追加
  //---------------------------------------------------------------------------
  const handleAddScheduleColumn = () => {
    const newMaxCount = maxScheduleCount + 1;
    setMaxScheduleCount(newMaxCount);
    
    // 全ての日に新しいスケジュール枠を追加
    const updatedData = agRowData.map(day => ({
      ...day,
      schedules: [
        ...day.schedules,
        {
          wasteType: null,
          companyId: null,
          vol: null,
          plannedTime: null,
        }
      ]
    }));
    
    setAgRowData(updatedData);
  };

  //---------------------------------------------------------------------------
  // 特定の日だけ排出回数を追加
  //---------------------------------------------------------------------------
  const handleAddScheduleForDay = (date: string) => {
    const updatedData = agRowData.map(day => {
      if (day.date === date) {
        return {
          ...day,
          schedules: [
            ...day.schedules,
            {
              wasteType: null,
              companyId: null,
              vol: null,
              plannedTime: null,
            }
          ]
        };
      }
      return day;
    });
    
    setAgRowData(updatedData);
  };

  const defaultColDef = useMemo(() => ({
    resizable: true,
  }), []);

  //---------------------------------------------------------------------------
  // 描画
  //---------------------------------------------------------------------------
  return (
    <div className="mx-5 flex h-full flex-col">
      <div className="flex w-full justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">柔軟な計画スケジュール</h1>
          
          <button
            className="h-full w-24 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
            onClick={handleSave}
            disabled={!isEditing}
          >
            保存
          </button>
          
          <button
            className="h-full w-32 rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600"
            onClick={handleAddScheduleColumn}
          >
            列を追加（全日）
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
      </div>

      <div className="mb-4 rounded-lg bg-blue-50 p-4">
        <h3 className="mb-2 font-bold text-blue-900">設計方針</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
          <li>横軸：時間順（1回目、2回目、3回目...）- 日によって列数が変更可能</li>
          <li>縦軸：日付</li>
          <li>各セル：種別（廃プラ/汚泥）+ 会社 + 量 + 時間</li>
          <li>実績との紐付け：日付 + 時刻 + 種別 で自動マッチング</li>
          <li>特殊な日（5回排出など）も柔軟に対応可能</li>
        </ul>
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

export default FlexibleSchedule;

