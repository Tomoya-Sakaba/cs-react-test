import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import type { ColDef, ColGroupDef } from 'ag-grid-community';

// AG Grid モジュール登録
ModuleRegistry.registerModules([AllCommunityModule]);

// ============================================================================
// 型定義
// ============================================================================
export type ContentType = {
  id: number;
  name: string;
  color: string;
  bgColor: string;
  group: 'Main' | 'Sub';
  defaultOccurrences: number; // デフォルトの回数
};

export type Company = {
  id: number;
  name: string;
  color: string;
};

export type PlanEntry = {
  time: string;
  companyId: number | null;
  vol: number;
};

export type DayPlan = {
  date: string;
  dayLabel: string;
  isWeekend: boolean;
  entries: {
    [contentTypeId: number]: {
      [occurrence: number]: PlanEntry | null;
    };
  };
};

type ViewMode = 'type' | 'timeline';

// ============================================================================
// マスターデータ
// ============================================================================
const CONTENT_TYPES: ContentType[] = [
  { id: 1, name: 'タイプ1', color: 'text-blue-700', bgColor: 'bg-blue-100', group: 'Main', defaultOccurrences: 2 },
  { id: 2, name: 'タイプ2', color: 'text-green-700', bgColor: 'bg-green-100', group: 'Main', defaultOccurrences: 2 },
  { id: 3, name: 'タイプ3', color: 'text-orange-700', bgColor: 'bg-orange-100', group: 'Sub', defaultOccurrences: 1 },
  { id: 4, name: 'タイプ4', color: 'text-purple-700', bgColor: 'bg-purple-100', group: 'Sub', defaultOccurrences: 1 },
];

const COMPANIES: Company[] = [
  { id: 1, name: 'A社', color: 'bg-blue-50 text-blue-800 border-blue-300' },
  { id: 2, name: 'B社', color: 'bg-green-50 text-green-800 border-green-300' },
  { id: 3, name: 'C社', color: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
  { id: 4, name: 'D社', color: 'bg-purple-50 text-purple-800 border-purple-300' },
  { id: 5, name: 'E社', color: 'bg-pink-50 text-pink-800 border-pink-300' },
];

// ============================================================================
// モックデータ生成
// ============================================================================
const generateMockData = (year: number, month: number): DayPlan[] => {
  const data: DayPlan[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= Math.min(daysInMonth, 15); day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = date.getDay();
    const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];
    
    const entries: DayPlan['entries'] = {};
    
    // 通常パターン: タイプ1が2回、タイプ2が1-2回
    entries[1] = {
      1: { time: '09:00', companyId: Math.floor(Math.random() * 5) + 1, vol: Math.floor(Math.random() * 100) + 50 },
      2: { time: '17:00', companyId: Math.floor(Math.random() * 5) + 1, vol: Math.floor(Math.random() * 100) + 50 },
    };
    
    entries[2] = {
      1: { time: '13:00', companyId: Math.floor(Math.random() * 5) + 1, vol: Math.floor(Math.random() * 150) + 100 },
    };
    
    // イレギュラー: 10%の確率でタイプ2が2回目
    if (Math.random() > 0.9) {
      entries[2][2] = { time: '10:00', companyId: Math.floor(Math.random() * 5) + 1, vol: Math.floor(Math.random() * 100) + 50 };
    }
    
    // たまにタイプ3
    if (Math.random() > 0.7) {
      entries[3] = {
        1: { time: '15:00', companyId: Math.floor(Math.random() * 5) + 1, vol: Math.floor(Math.random() * 80) + 30 },
      };
    }
    
    data.push({
      date: dateStr,
      dayLabel: `${day}日(${weekLabels[dayOfWeek]})`,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      entries,
    });
  }
  
  return data;
};

// ============================================================================
// セルレンダラー
// ============================================================================
const PlanCellRenderer = (props: any) => {
  const { value, colDef } = props;
  
  if (!value || !value.time) {
    return <div className="text-gray-400 text-center text-sm">-</div>;
  }
  
  const company = COMPANIES.find(c => c.id === value.companyId);
  const contentTypeId = colDef.cellRendererParams?.contentTypeId;
  const contentType = CONTENT_TYPES.find(ct => ct.id === contentTypeId);
  
  return (
    <div className="flex flex-col items-center justify-center h-full py-1 gap-0.5">
      <div className="text-xs font-semibold text-gray-700">{value.time}</div>
      {company && (
        <div className={`text-[10px] px-2 py-0.5 rounded border ${company.color} font-medium`}>
          {company.name}
        </div>
      )}
      <div className="text-sm font-bold text-gray-900">{value.vol}t</div>
      {contentType && colDef.cellRendererParams?.showType && (
        <div className={`text-[9px] px-1 rounded ${contentType.bgColor} ${contentType.color}`}>
          {contentType.name}
        </div>
      )}
    </div>
  );
};

// セルエディター（簡易版）
const PlanCellEditor = (props: any) => {
  const [time, setTime] = useState(props.value?.time || '09:00');
  const [companyId, setCompanyId] = useState(props.value?.companyId || null);
  const [vol, setVol] = useState(props.value?.vol || 0);
  
  const handleSave = () => {
    props.stopEditing();
    if (companyId && vol > 0) {
      props.setValue({ time, companyId, vol });
    }
  };
  
  return (
    <div className="bg-white border-2 border-blue-500 rounded-lg p-2 shadow-lg" style={{ minWidth: '150px' }}>
      <div className="space-y-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full px-2 py-1 text-xs border rounded"
          autoFocus
        />
        <select
          value={companyId || ''}
          onChange={(e) => setCompanyId(Number(e.target.value))}
          className="w-full px-2 py-1 text-xs border rounded"
        >
          <option value="">企業選択</option>
          {COMPANIES.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="number"
          value={vol}
          onChange={(e) => setVol(Number(e.target.value))}
          className="w-full px-2 py-1 text-xs border rounded"
          placeholder="量(t)"
          min="0"
        />
        <button
          onClick={handleSave}
          className="w-full px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          保存
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// カラム定義生成
// ============================================================================
const generateTypeViewColumns = (
  contentTypeOccurrences: Record<number, number>
): (ColDef | ColGroupDef)[] => {
  const columns: (ColDef | ColGroupDef)[] = [
    {
      headerName: '日付',
      field: 'dayLabel',
      pinned: 'left',
      width: 100,
      cellClass: (params) => params.data.isWeekend ? 'bg-red-50' : '',
      cellRenderer: (params: any) => {
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className={`text-sm font-bold ${params.data.isWeekend ? 'text-red-600' : 'text-gray-800'}`}>
              {params.value}
            </div>
          </div>
        );
      },
    },
  ];
  
  CONTENT_TYPES.forEach(contentType => {
    const occurrences = contentTypeOccurrences[contentType.id] || 0;
    if (occurrences === 0) return;
    
    const children: ColDef[] = [];
    
    for (let i = 1; i <= occurrences; i++) {
      children.push({
        headerName: `${i}回目`,
        field: `entries.${contentType.id}.${i}`,
        width: 120,
        cellRenderer: PlanCellRenderer,
        cellRendererParams: {
          contentTypeId: contentType.id,
          showType: false,
        },
        cellEditor: PlanCellEditor,
        editable: true,
        cellClass: 'cursor-pointer hover:bg-blue-50',
      });
    }
    
    columns.push({
      headerName: `${contentType.name} (${contentType.group})`,
      headerClass: `${contentType.bgColor} ${contentType.color} font-bold`,
      children,
    });
  });
  
  return columns;
};

const generateTimelineViewColumns = (maxEntries: number): ColDef[] => {
  const columns: ColDef[] = [
    {
      headerName: '日付',
      field: 'dayLabel',
      pinned: 'left',
      width: 100,
      cellClass: (params) => params.data.isWeekend ? 'bg-red-50' : '',
      cellRenderer: (params: any) => {
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className={`text-sm font-bold ${params.data.isWeekend ? 'text-red-600' : 'text-gray-800'}`}>
              {params.value}
            </div>
          </div>
        );
      },
    },
  ];
  
  for (let i = 1; i <= maxEntries; i++) {
    columns.push({
      headerName: `${i}番目`,
      field: `timeline.${i}`,
      width: 120,
      cellRenderer: PlanCellRenderer,
      cellRendererParams: {
        showType: true,
      },
      editable: false,
      cellClass: 'cursor-pointer',
    });
  }
  
  return columns;
};

// ============================================================================
// ヘッダー設定モーダル
// ============================================================================
const HeaderConfigModal: React.FC<{
  isOpen: boolean;
  contentTypeOccurrences: Record<number, number>;
  onClose: () => void;
  onSave: (occurrences: Record<number, number>) => void;
}> = ({ isOpen, contentTypeOccurrences, onClose, onSave }) => {
  const [config, setConfig] = useState(contentTypeOccurrences);
  
  if (!isOpen) return null;
  
  const handleSave = () => {
    onSave(config);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">ヘッダー設定</h3>
        
        <div className="space-y-4 mb-6">
          {CONTENT_TYPES.map(ct => (
            <div key={ct.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${ct.bgColor}`} />
                <span className="font-medium text-gray-700">{ct.name}</span>
                <span className="text-xs text-gray-500">({ct.group})</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">回数:</label>
                <select
                  value={config[ct.id] || 0}
                  onChange={(e) => setConfig({ ...config, [ct.id]: Number(e.target.value) })}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">非表示</option>
                  <option value="1">1回</option>
                  <option value="2">2回</option>
                  <option value="3">3回</option>
                  <option value="4">4回</option>
                  <option value="5">5回</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// メインコンポーネント
// ============================================================================
const NewPlan: React.FC = () => {
  const navigate = useNavigate();
  const gridRef = useRef<any>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>('type');
  const [rowData] = useState<DayPlan[]>(() => generateMockData(2025, 1));
  const [contentTypeOccurrences, setContentTypeOccurrences] = useState<Record<number, number>>({
    1: 2, // タイプ1: 2回
    2: 2, // タイプ2: 2回
    3: 1, // タイプ3: 1回
    4: 0, // タイプ4: 非表示
  });
  const [isHeaderConfigOpen, setIsHeaderConfigOpen] = useState(false);
  
  // タイムラインビュー用にデータを変換
  const timelineData = useMemo(() => {
    return rowData.map(day => {
      const allEntries: Array<{ time: string; contentTypeId: number; entry: PlanEntry }> = [];
      
      // 全エントリーを時間順に並べる
      Object.entries(day.entries).forEach(([ctId, occurrences]) => {
        Object.entries(occurrences).forEach(([, entry]) => {
          if (entry) {
            allEntries.push({
              time: entry.time,
              contentTypeId: Number(ctId),
              entry,
            });
          }
        });
      });
      
      // 時間順にソート
      allEntries.sort((a, b) => a.time.localeCompare(b.time));
      
      // timeline オブジェクトを作成
      const timeline: any = {};
      allEntries.forEach((item, index) => {
        timeline[index + 1] = {
          ...item.entry,
          contentTypeId: item.contentTypeId,
        };
      });
      
      return {
        ...day,
        timeline,
      };
    });
  }, [rowData]);
  
  // カラム定義
  const columnDefs = useMemo(() => {
    if (viewMode === 'type') {
      return generateTypeViewColumns(contentTypeOccurrences);
    } else {
      // 最大エントリー数を計算
      const maxEntries = Math.max(
        ...timelineData.map(day => Object.keys(day.timeline).length),
        5 // 最低5列
      );
      return generateTimelineViewColumns(maxEntries);
    }
  }, [viewMode, contentTypeOccurrences, timelineData]);
  
  // 統計情報
  const stats = useMemo(() => {
    let totalVol = 0;
    let totalCount = 0;
    
    rowData.forEach(day => {
      Object.values(day.entries).forEach(occurrences => {
        Object.values(occurrences).forEach(entry => {
          if (entry) {
            totalVol += entry.vol;
            totalCount++;
          }
        });
      });
    });
    
    return {
      totalVol,
      totalCount,
      avgPerDay: (totalVol / rowData.length).toFixed(1),
    };
  }, [rowData]);
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">月次計画管理</h1>
              <p className="text-sm text-gray-500 mt-1">2025年 1月 前半（1-15日）</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                戻る
              </button>
              <button
                onClick={() => setIsHeaderConfigOpen(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                ヘッダー設定
              </button>
              <button
                onClick={() => alert('CSV インポート機能')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                CSVインポート
              </button>
              <button
                onClick={() => alert('保存機能')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                保存
              </button>
            </div>
          </div>
          
          {/* 統計情報とビュー切り替え */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-semibold text-sm">
                合計: {stats.totalVol}t
              </div>
              <div className="px-3 py-1 bg-green-100 text-green-800 rounded-lg font-semibold text-sm">
                件数: {stats.totalCount}件
              </div>
              <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg font-semibold text-sm">
                平均: {stats.avgPerDay}t/日
              </div>
            </div>
            
            {/* ビュー切り替え */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('type')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'type'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                タイプ別表示
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                時系列表示
              </button>
            </div>
          </div>
          
          {/* ビューの説明 */}
          <div className="mt-3 text-xs text-gray-500">
            {viewMode === 'type' ? (
              <span>📊 タイプ別表示: タイプごとに縦列を揃えて表示（見やすさ重視）</span>
            ) : (
              <span>⏰ 時系列表示: 時間順に左から右へ表示（時間軸把握に最適）</span>
            )}
          </div>
        </div>
      </header>
      
      {/* AG Grid */}
      <main className="flex-1 overflow-hidden px-6 py-4">
        <div className="ag-theme-alpine h-full w-full">
          <AgGridReact
            ref={gridRef}
            rowData={viewMode === 'type' ? rowData : timelineData}
            columnDefs={columnDefs}
            defaultColDef={{
              resizable: true,
              sortable: false,
              filter: false,
            }}
            rowHeight={100}
            headerHeight={50}
            suppressMovableColumns={true}
            enableCellTextSelection={true}
          />
        </div>
      </main>
      
      {/* ヘッダー設定モーダル */}
      <HeaderConfigModal
        isOpen={isHeaderConfigOpen}
        contentTypeOccurrences={contentTypeOccurrences}
        onClose={() => setIsHeaderConfigOpen(false)}
        onSave={setContentTypeOccurrences}
      />
    </div>
  );
};

export default NewPlan;
