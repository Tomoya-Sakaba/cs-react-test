/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DHTMLX Grid + DataView サンプルページ
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 【重要】スクロール位置を保持する実装方法:
 * 
 * 1. データにIDを明示的に設定（date + contentType で一意）
 *    → grid.data.update(id, data) が正しく動作する
 *    → DB上でも date + contentType で一意になっている
 * 
 * 2. カスタムセル選択時は grid.data.update() を直接呼ぶ
 *    → Grid全体を再構築せず、該当行のみ更新
 *    → スクロール位置が保持される
 * 
 * 3. useEffectを2つに分離
 *    ① Grid初期化: タブ切り替え・編集モード切り替え時のみ
 *    ② データ更新: grid.data.update() で個別更新
 * 
 * 4. タブはemissionType（'pla' / 'mud'）で切り替え
 *    contentTypeは数値（1,2,3,4）でヘッダーIDとして使用
 *    - contentType 1, 2 → emissionType 'pla'
 *    - contentType 3, 4 → emissionType 'mud'
 * 
 * 参考: https://snippet.dhtmlx.com/7b2vb9mu?text=grid&mode=wide
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useBlocker } from 'react-router-dom';
import YearMonthFilter from '../components/YearMonthFilter';
import { useYearMonthParams } from '../hooks/useYearMonthParams';
import Toggle from '../components/Toggle';
import type { testType } from '../types/dhtmlxTest';
import { format, getDaysInMonth, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import './DhtmlxGridDataView.css';

// DHTMLX Suiteのグローバル型定義
declare global {
  interface Window {
    dhx: any;
  }
}

type timeOptionType = {
    timeId: string;
    time: string;
    vol: number;
}

// 時間と量の選択肢（モックデータ）
const timeOptions: timeOptionType[] = [
  { timeId: '1', time: '10:00', vol: 10 },
  { timeId: '2', time: '14:00', vol: 20 },
];

const DhtmlxGridDataView = () => {
  const [searchParams] = useSearchParams();
  const isNewMode = searchParams.get('mode') === 'new';

  // DHTMLX Grid/DataView用のref
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const dataViewContainerRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<any>(null);
  const dataViewInstanceRef = useRef<any>(null);
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  // 状態管理
  const [availableYearMonths] = useState<{ year: number; month: number }[]>([
    { year: 2025, month: 1 },
    { year: 2025, month: 2 },
  ]);
  const [loadingYearMonths] = useState(false);

  const { currentYear, currentIndexMonth } = useYearMonthParams(
    isNewMode ? undefined : availableYearMonths
  );
  const [isEditing, setIsEditing] = useState(false);
  const [rowData, setRowData] = useState<testType[]>([]);
  const [isGridReady, setIsGridReady] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'pla' | 'mud'>('pla');

  // フィルター状態
  const [dateFilterStart, setDateFilterStart] = useState<string>('');
  const [dateFilterEnd, setDateFilterEnd] = useState<string>('');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  // DataView表示制御
  const [dataViewVisible, setDataViewVisible] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<testType | null>(null);
  const [dataViewPosition, setDataViewPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Gridポップアップ表示制御（outsaide用）
  const [gridPopupVisible, setGridPopupVisible] = useState(false);
  const [selectedRowDataForGrid, setSelectedRowDataForGrid] = useState<testType | null>(null);
  const [gridPopupPosition, setGridPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const popupGridContainerRef = useRef<HTMLDivElement>(null);
  const popupGridInstanceRef = useRef<any>(null);

  //---------------------------------------------------------------------------
  // モックデータ生成（日付マッピング付き）
  //---------------------------------------------------------------------------
  const generateMockData = useCallback((year: number, month: number): testType[] => {
    const daysInMonth = getDaysInMonth(new Date(year, month));
    const mockData: testType[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = getDay(date);
      const isHoliday = dayOfWeek === 0; // 日曜日
      const isSaturday = dayOfWeek === 6; // 土曜日
      
      const dayLabel = format(date, 'd日(E)', { locale: ja });
      const dateStr = format(date, 'yyyy-MM-dd');

      // contentType 1 (emissionType: pla)
      const ct1TimeOption = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      const ct1ResultOption = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      const ct1OutsaideOption = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      mockData.push({
        date: dateStr,
        dayLabel,
        isHoliday,
        isSturday: isSaturday,
        contentType: 1,
        emissionType: 'pla',
        company: Math.floor(Math.random() * 3) + 1,
        conmanyName: ['A社', 'B社', 'C社'][Math.floor(Math.random() * 3)],
        companyBgColor: ['#ff6b6b', '#4ecdc4', '#45b7d1'][Math.floor(Math.random() * 3)],
        planVol: ct1TimeOption.vol,
        planTime: ct1TimeOption.time,
        resultId: ct1ResultOption.timeId,
        resultVol: ct1ResultOption.vol,
        resultTime: ct1ResultOption.time,
        outsaideResultId: ct1OutsaideOption.timeId,
        outsaideResultVol: ct1OutsaideOption.vol,
        outsaideResultTime: ct1OutsaideOption.time,
      });

      // contentType 2 (emissionType: pla)
      const ct2TimeOption = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      const ct2ResultOption = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      const ct2OutsaideOption = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      mockData.push({
        date: dateStr,
        dayLabel,
        isHoliday,
        isSturday: isSaturday,
        contentType: 2,
        emissionType: 'pla',
        company: Math.floor(Math.random() * 3) + 1,
        conmanyName: ['D社', 'E社', 'F社'][Math.floor(Math.random() * 3)],
        companyBgColor: ['#feca57', '#ff9ff3', '#54a0ff'][Math.floor(Math.random() * 3)],
        planVol: ct2TimeOption.vol,
        planTime: ct2TimeOption.time,
        resultId: ct2ResultOption.timeId,
        resultVol: ct2ResultOption.vol,
        resultTime: ct2ResultOption.time,
        outsaideResultId: ct2OutsaideOption.timeId,
        outsaideResultVol: ct2OutsaideOption.vol,
        outsaideResultTime: ct2OutsaideOption.time,
      });

      // contentType 3 (emissionType: mud)
      const ct3TimeOption = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      const ct3ResultOption = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      const ct3OutsaideOption = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      mockData.push({
        date: dateStr,
        dayLabel,
        isHoliday,
        isSturday: isSaturday,
        contentType: 3,
        emissionType: 'mud',
        company: Math.floor(Math.random() * 3) + 1,
        conmanyName: ['X社', 'Y社', 'Z社'][Math.floor(Math.random() * 3)],
        companyBgColor: ['#95e1d3', '#f38181', '#aa96da'][Math.floor(Math.random() * 3)],
        planVol: ct3TimeOption.vol,
        planTime: ct3TimeOption.time,
        resultId: ct3ResultOption.timeId,
        resultVol: ct3ResultOption.vol,
        resultTime: ct3ResultOption.time,
        outsaideResultId: ct3OutsaideOption.timeId,
        outsaideResultVol: ct3OutsaideOption.vol,
        outsaideResultTime: ct3OutsaideOption.time,
      });

      // contentType 4 (emissionType: mud)
      const ct4TimeOption = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      const ct4ResultOption = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      const ct4OutsaideOption = timeOptions[Math.floor(Math.random() * timeOptions.length)];
      mockData.push({
        date: dateStr,
        dayLabel,
        isHoliday,
        isSturday: isSaturday,
        contentType: 4,
        emissionType: 'mud',
        company: Math.floor(Math.random() * 3) + 1,
        conmanyName: ['P社', 'Q社', 'R社'][Math.floor(Math.random() * 3)],
        companyBgColor: ['#48dbfb', '#ff6348', '#1dd1a1'][Math.floor(Math.random() * 3)],
        planVol: ct4TimeOption.vol,
        planTime: ct4TimeOption.time,
        resultId: ct4ResultOption.timeId,
        resultVol: ct4ResultOption.vol,
        resultTime: ct4ResultOption.time,
        outsaideResultId: ct4OutsaideOption.timeId,
        outsaideResultVol: ct4OutsaideOption.vol,
        outsaideResultTime: ct4OutsaideOption.time,
      });
    }

    return mockData;
  }, []);

  //---------------------------------------------------------------------------
  // データ取得
  //---------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setIsGridReady(false);
    
    // モックデータ生成
    const mockData = generateMockData(currentYear, currentIndexMonth);
    console.log('mockData', mockData);
    
    setRowData(mockData);
    setIsGridReady(true);
  }, [currentYear, currentIndexMonth, generateMockData]);

  //---------------------------------------------------------------------------
  // 初回レンダリング処理
  //---------------------------------------------------------------------------
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  //---------------------------------------------------------------------------
  // 企業ドロップダウン外クリックで閉じる
  //---------------------------------------------------------------------------
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    };

    if (isCompanyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCompanyDropdownOpen]);

  //---------------------------------------------------------------------------
  // ユニークな企業リストを取得
  //---------------------------------------------------------------------------
  const uniqueCompanies = useMemo(() => {
    const companySet = new Set<string>();
    rowData.forEach((row) => {
      if (row.conmanyName) {
        companySet.add(row.conmanyName);
      }
    });
    return Array.from(companySet).sort();
  }, [rowData]);

  //---------------------------------------------------------------------------
  // フィルタリング済みデータ
  //---------------------------------------------------------------------------
  const filteredRowData = useMemo(() => {
    let filtered = rowData;

    // 日付範囲でフィルタリング
    if (dateFilterStart && !dateFilterEnd) {
      // 開始日のみ指定 → その日付のみを表示
      filtered = filtered.filter((row) => row.date === dateFilterStart);
    } else if (dateFilterStart && dateFilterEnd) {
      // 開始日と終了日両方指定 → その範囲でフィルター
      filtered = filtered.filter((row) => row.date >= dateFilterStart && row.date <= dateFilterEnd);
    } else if (!dateFilterStart && dateFilterEnd) {
      // 終了日のみ指定 → 終了日以前
      filtered = filtered.filter((row) => row.date <= dateFilterEnd);
    }

    // 企業でフィルタリング
    if (selectedCompanies.length > 0) {
      filtered = filtered.filter((row) => 
        selectedCompanies.includes(row.conmanyName)
      );
    }

    return filtered;
  }, [rowData, dateFilterStart, dateFilterEnd, selectedCompanies]);

  //---------------------------------------------------------------------------
  // 編集モード時のページ遷移・ブラウザ閉じる警告
  //---------------------------------------------------------------------------
  // 1. ブラウザを閉じる・リロード時の警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing) {
        // ブラウザによって異なるメッセージが表示される
        e.preventDefault();
        e.returnValue = ''; // Chrome等では空文字でも警告が出る
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isEditing]);

  // 2. React Router内でのページ遷移をブロック
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isEditing && currentLocation.pathname !== nextLocation.pathname
  );

  // ブロック時の確認ダイアログ処理
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const shouldLeave = window.confirm(
        '編集中のデータがあります。このページを離れますか？\n変更内容は保存されません。'
      );
      if (shouldLeave) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  //---------------------------------------------------------------------------
  // DHTMLX Grid初期化・更新
  //---------------------------------------------------------------------------
  useEffect(() => {
    if (!gridContainerRef.current || !isGridReady) return;
    if (typeof window.dhx === 'undefined') {
      console.error('DHTMLX Suite is not loaded');
      return;
    }

    // ✅ スクロール位置を保存（フィルター変更やデータ更新の前に）
    let savedScrollState = { x: 0, y: 0 };
    if (gridInstanceRef.current) {
      savedScrollState = gridInstanceRef.current.getScrollState();
      gridInstanceRef.current.destructor();
    }

    // ✅ 【重要】データにIDを明示的に設定
    // 理由: grid.data.update(id, data) でデータを更新するため、
    //       各行にIDが必要。これがないとupdateが動作しない。
    //       公式サンプルでも必ずIDを設定している。
    // DB上では date + contentType で一意になるため、IDも同様に設定
    const filteredData = filteredRowData
      .filter((row) => row.emissionType === selectedTab)
      .map((row) => ({ ...row, id: `${row.date}_${row.contentType}` })); // date + contentType を ID として使用

    // カラム定義
    const allColumns = [
      {
        id: 'dayLabel',
        header: [{ text: '日付', rowSpan: 2 }],
        width: 100,
        editable: false,
        htmlEnable: true,
        template: (text: string, row: any) => {
          if (row.isHoliday) {
            return `<span style="color: #dc2626; font-weight: 600;">${text}</span>`;
          }
          if (row.isSturday) {
            return `<span style="color: #2563eb; font-weight: 600;">${text}</span>`;
          }
          return text;
        },
      },
      {
        id: 'planTime',
        header: [{ text: '計画 - 時間', colspan: 3 }],
        width: 80,
        editable: isEditing,
      },
      {
        id: 'conmanyName',
        header: [{ text: '会社' }],
        width: 120,
        editable: false,
        htmlEnable: true,
        template: (text: string, row: any) => {
          const bgColor = row.companyBgColor || '#ffffff';
          const hex = bgColor.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const textColor = luminance > 0.5 ? '#000000' : '#ffffff';
          
          return `<div style="background-color: ${bgColor}; color: ${textColor}; padding: 4px 8px; border-radius: 4px; text-align: center; font-weight: 500;">${text}</div>`;
        },
      },
      {
        id: 'planVol',
        header: [{ text: '量' }],
        width: 80,
        editable: isEditing,
      },
      {
        id: 'resultTime',
        header: [{ text: '結果 - 時間', colspan: 2 }],
        width: 80,
        editable: false,
        htmlEnable: true,
        template: (text: string) => {
          if (isEditing) {
            // ✅ テキストの有無に関わらず、▼を右端に固定配置
            return `
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; height: 100%; padding-right: 4px;">
                <span>${text || ''}</span>
                <span style="color: #6b7280; font-size: 12px;">▼</span>
              </div>
            `;
          }
          return text;
        },
      },
      {
        id: 'resultVol',
        // ✅ 編集モードの時は独立したヘッダーを表示、それ以外は空（colspanで統合されるため）
        header: [{ text: isEditing ? '結果 - 量' : '量' }],
        width: 80,
        editable: false,
      },
      {
        id: 'outsaideResultTime',
        header: [{ text: '外作 - 時間', colspan: 2 }],
        width: 80,
        editable: false,
        htmlEnable: true,
        template: (text: string) => {
          if (isEditing) {
            // ✅ テキストの有無に関わらず、▼を右端に固定配置
            return `
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; height: 100%; padding-right: 4px;">
                <span>${text || ''}</span>
                <span style="color: #6b7280; font-size: 12px;">▼</span>
              </div>
            `;
          }
          return text;
        },
      },
      {
        id: 'outsaideResultVol',
        // ✅ 編集モードの時は独立したヘッダーを表示、それ以外は空（colspanで統合されるため）
        header: [{ text: isEditing ? '外作 - 量' : '量' }],
        width: 80,
        editable: false,
      },
    ];

    // ✅ 編集モードがオンの時は「結果 - 時間」と「外作 - 時間」を非表示
    const columns = isEditing 
      ? allColumns.filter((col) => col.id !== 'resultTime' && col.id !== 'outsaideResultTime')
      : allColumns;

    // Gridの初期化
    const grid = new window.dhx.Grid(gridContainerRef.current, {
      columns,
      autoWidth: false,
      selection: 'row',
      editable: isEditing,
      resizable: true,
    });

    grid.data.parse(filteredData);

    // ✅ データパース後に日付ごとに太い罫線を追加
    // データを配列として取得し、日付境界を判定
    const allRows = filteredData;
    allRows.forEach((row, index) => {
      const nextRow = allRows[index + 1];
      // 次の行が存在し、日付が異なる場合に太い境界線を追加
      if (nextRow && nextRow.date !== row.date) {
        grid.addRowCss(row.id, 'date-boundary');
      }
    });

    // ✅ スクロール位置を復元（データパース後）
    setTimeout(() => {
      if (gridInstanceRef.current) {
        gridInstanceRef.current.scrollTo(savedScrollState.x, savedScrollState.y);
      }
    }, 0);

    // resultTimeクリックイベント（DataView表示）
    grid.events.on('cellClick', (row: any, column: any, event: MouseEvent) => {
      if (column.id === 'resultTime') {
        // 編集モードかどうかをGridの設定から確認
        if (!grid.config.editable) return;
        
        const foundRow = grid.data.getItem(row.id);
        if (foundRow) {
          // セルの位置を取得
          const target = event.target as HTMLElement;
          const cell = target.closest('.dhx_grid-cell');
          if (cell) {
            const rect = cell.getBoundingClientRect();
            
            // DataViewのサイズ
            const dataViewHeight = 200; // 最大高さ
            const dataViewWidth = 480;
            
            // 画面サイズ
            const windowHeight = window.innerHeight;
            const windowWidth = window.innerWidth;
            
            // 下にスペースがあるかチェック
            const spaceBelow = windowHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            // Y座標の決定（下にスペースがなければ上に表示）
            let yPos: number;
            if (spaceBelow >= dataViewHeight) {
              // 下に表示
              yPos = rect.bottom + 5;
            } else if (spaceAbove >= dataViewHeight) {
              // 上に表示（セルの真上に配置）
              yPos = rect.top - dataViewHeight;
            } else {
              // どちらも足りない場合は、画面中央に表示
              yPos = Math.max(10, (windowHeight - dataViewHeight) / 2);
            }
            
            // X座標の調整（右端に切れないように）
            let xPos = rect.left;
            if (xPos + dataViewWidth > windowWidth) {
              xPos = windowWidth - dataViewWidth - 10;
            }
            if (xPos < 10) {
              xPos = 10;
            }
            
            setDataViewPosition({
              x: xPos,
              y: yPos,
            });
          }
          
          setSelectedRowData(foundRow);
          setDataViewVisible(true);
        }
      }
      
      // outsaideResultTimeクリックイベント（Grid表示）
      if (column.id === 'outsaideResultTime') {
        // 編集モードかどうかをGridの設定から確認
        if (!grid.config.editable) return;
        
        const foundRow = grid.data.getItem(row.id);
        if (foundRow) {
          // セルの位置を取得
          const target = event.target as HTMLElement;
          const cell = target.closest('.dhx_grid-cell');
          if (cell) {
            const rect = cell.getBoundingClientRect();
            
            // Gridポップアップのサイズ
            const popupHeight = 250;
            const popupWidth = 200;
            
            // 画面サイズ
            const windowHeight = window.innerHeight;
            const windowWidth = window.innerWidth;
            
            // 下にスペースがあるかチェック
            const spaceBelow = windowHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            // Y座標の決定
            let yPos: number;
            if (spaceBelow >= popupHeight) {
              yPos = rect.bottom + 5;
            } else if (spaceAbove >= popupHeight) {
              yPos = rect.top - popupHeight;
            } else {
              yPos = Math.max(10, (windowHeight - popupHeight) / 2);
            }
            
            // X座標の調整
            let xPos = rect.left;
            if (xPos + popupWidth > windowWidth) {
              xPos = windowWidth - popupWidth - 10;
            }
            if (xPos < 10) {
              xPos = 10;
            }
            
            setGridPopupPosition({
              x: xPos,
              y: yPos,
            });
          }
          
          setSelectedRowDataForGrid(foundRow);
          setGridPopupVisible(true);
        }
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
  }, [isGridReady, selectedTab, isEditing, filteredRowData]); 
  // ✅ 依存配列: タブ切り替え、編集モード切り替え、データ変更、フィルタリング時に再構築
  // 注: スクロール位置の保存/復元を実装しているため、Grid再初期化時もスクロール位置は保持される

  //---------------------------------------------------------------------------
  // DHTMLX DataView初期化
  //---------------------------------------------------------------------------
  useEffect(() => {
    if (!dataViewContainerRef.current || !dataViewVisible) return;

    if (typeof window.dhx === 'undefined') return;

    // 既存のDataViewがあれば破棄
    if (dataViewInstanceRef.current) {
      dataViewInstanceRef.current.destructor();
    }

    // DataViewの初期化
    const dataView = new window.dhx.DataView(dataViewContainerRef.current, {
      template: (item: any) => {
        const isSelected = 
          selectedRowData &&
          item.id === selectedRowData.resultId;
        
        return `
          <div style="
            padding: 12px 16px;
            border: 2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'};
            border-radius: 8px;
            background-color: ${isSelected ? '#eff6ff' : '#ffffff'};
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: ${isSelected ? '0 4px 6px -1px rgba(59, 130, 246, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'};
          "
          onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.1)';"
          onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='${isSelected ? '0 4px 6px -1px rgba(59, 130, 246, 0.3)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'}';"
          >
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
              <div style="flex: 1;">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">時間</div>
                <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${item.time}</div>
              </div>
              <div style="width: 1px; height: 30px; background-color: #d1d5db;"></div>
              <div style="flex: 1;">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">量</div>
                <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${item.volume}t</div>
              </div>
              ${isSelected ? '<div style="color: #3b82f6; font-size: 18px; margin-left: 8px;">✓</div>' : ''}
            </div>
          </div>
        `;
      },
      itemsInRow: 2,
      gap: 8,
      height: 'auto',
    });

    // DataView用のデータ生成（timeOptionsをそのまま使用）
    const dataViewData = timeOptions.map((option) => ({
      id: option.timeId,
      time: option.time,
      volume: option.vol,
    }));

    dataView.data.parse(dataViewData);

    // DataViewアイテムクリックイベント
    dataView.events.on('click', (id: string) => {
      const item = dataView.data.getItem(id);
      
      if (selectedRowData && gridInstanceRef.current) {
        // ✅ 【重要】スクロール位置を保持する方法
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 1. grid.data.update() を直接呼ぶ
        //    → 該当行のみが更新される（Grid全体は再構築されない）
        //    → スクロール位置が保持される
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // DB上では date + contentType で一意なので、IDも同様に設定
        const rowId = `${selectedRowData.date}_${selectedRowData.contentType}`;
        const updatedRow = {
          ...selectedRowData,
          resultId: item.id,
          resultTime: item.time,
          resultVol: item.volume,
          id: rowId, // IDを明示的に設定（重要）
        };
        gridInstanceRef.current.data.update(rowId, updatedRow);
        
        // 2. React stateも更新（データの一貫性を保つため）
        //    注: この更新で別のuseEffectが発火するが、
        //    grid.data.update()を使っているのでスクロール位置は保持される
        setRowData((prev) =>
          prev.map((row) =>
            row.date === selectedRowData.date && row.contentType === selectedRowData.contentType
              ? { ...row, resultId: item.id, resultTime: item.time, resultVol: item.volume }
              : row
          )
        );
        
        // DataViewを閉じる
        setDataViewVisible(false);
        setSelectedRowData(null);
      }
    });

    dataViewInstanceRef.current = dataView;

    return () => {
      if (dataViewInstanceRef.current) {
        dataViewInstanceRef.current.destructor();
        dataViewInstanceRef.current = null;
      }
    };
  }, [dataViewVisible, selectedRowData, selectedTab]);

  //---------------------------------------------------------------------------
  // ポップアップGrid初期化（outsaide用）
  //---------------------------------------------------------------------------
  useEffect(() => {
    if (!popupGridContainerRef.current || !gridPopupVisible) return;

    if (typeof window.dhx === 'undefined') return;

    // 既存のポップアップGridがあれば破棄
    if (popupGridInstanceRef.current) {
      popupGridInstanceRef.current.destructor();
    }

    // ポップアップGridの初期化
    const popupGrid = new window.dhx.Grid(popupGridContainerRef.current, {
      columns: [
        {
          id: 'time',
          header: [{ text: '時間' }],
          width: 80,
        },
        {
          id: 'volume',
          header: [{ text: '量' }],
          width: 80,
        },
      ],
      autoWidth: false,
      selection: 'row',
      editable: false,
      rowHeight: 35,
    });

    // データをセット
    const popupGridData = timeOptions.map((option) => ({
      id: option.timeId,
      time: option.time,
      volume: `${option.vol}t`,
    }));
    
    popupGrid.data.parse(popupGridData);

    // 選択中の行をハイライト
    if (selectedRowDataForGrid) {
      popupGrid.selection.setCell(selectedRowDataForGrid.outsaideResultId);
    }

    // 行クリックイベント
    popupGrid.events.on('cellClick', (row: any) => {
      if (selectedRowDataForGrid && gridInstanceRef.current) {
        // ✅ 【重要】スクロール位置を保持する方法（resultTimeと同じ）
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 1. grid.data.update() を直接呼ぶ
        //    → 該当行のみが更新される → スクロール位置が保持される
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // DB上では date + contentType で一意なので、IDも同様に設定
        const rowId = `${selectedRowDataForGrid.date}_${selectedRowDataForGrid.contentType}`;
        const updatedRow = {
          ...selectedRowDataForGrid,
          outsaideResultId: row.id,
          outsaideResultTime: row.time,
          outsaideResultVol: parseInt(row.volume.replace('t', ''), 10),
          id: rowId, // IDを明示的に設定（重要）
        };
        gridInstanceRef.current.data.update(rowId, updatedRow);
        
        // 2. React stateも更新（データの一貫性を保つため）
        setRowData((prev) =>
          prev.map((r) =>
            r.date === selectedRowDataForGrid.date && r.contentType === selectedRowDataForGrid.contentType
              ? { 
                  ...r, 
                  outsaideResultId: row.id, 
                  outsaideResultTime: row.time, 
                  outsaideResultVol: parseInt(row.volume.replace('t', ''), 10) 
                }
              : r
          )
        );
        
        // ポップアップGridを閉じる
        setGridPopupVisible(false);
        setSelectedRowDataForGrid(null);
      }
    });

    popupGridInstanceRef.current = popupGrid;

    return () => {
      if (popupGridInstanceRef.current) {
        popupGridInstanceRef.current.destructor();
        popupGridInstanceRef.current = null;
      }
    };
  }, [gridPopupVisible, selectedRowDataForGrid, selectedTab]);

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
        // useEffectでGridが再構築される（カラム定義が変わるため）
      }
    } else {
      setIsEditing(true);
      // useEffectでGridが再構築される（カラム定義が変わるため）
    }
  };

  //---------------------------------------------------------------------------
  // タブ切り替え
  //---------------------------------------------------------------------------
  const handleTabChange = (tab: 'pla' | 'mud') => {
    setSelectedTab(tab);
    // useEffectでGridが再構築される（データが変わるため）
  };

  //---------------------------------------------------------------------------
  // 保存処理
  //---------------------------------------------------------------------------
  const handleSave = async () => {
    console.log('保存データ:', rowData);
    alert('保存しました（モックデータのため実際の保存は行われません）');
  };

  return (
    <div className="mx-5 flex h-full flex-col">
        <div className="flex w-full justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
              Grid + DataView
            </div>
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
          <YearMonthFilter
            availableYearMonths={availableYearMonths}
            loading={loadingYearMonths}
            allowAllMonths={isNewMode}
          />
        </div>

        {/* タブ */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => handleTabChange('pla')}
            className={`rounded-lg px-6 py-2 font-semibold transition-colors ${
              selectedTab === 'pla'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            PLA
          </button>
          <button
            onClick={() => handleTabChange('mud')}
            className={`rounded-lg px-6 py-2 font-semibold transition-colors ${
              selectedTab === 'mud'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            MUD
          </button>
        </div>

        {/* フィルター */}
        <div className="mb-4 rounded-lg border border-gray-300 bg-gray-50 p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* 日付範囲フィルター */}
            <div className="flex gap-2 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日
                </label>
                <input
                  type="date"
                  value={dateFilterStart}
                  onChange={(e) => setDateFilterStart(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <span className="text-gray-500 pb-2">〜</span>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了日
                </label>
                <input
                  type="date"
                  value={dateFilterEnd}
                  onChange={(e) => setDateFilterEnd(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 企業フィルター（マルチセレクトドロップダウン） */}
            <div className="flex-1 min-w-[300px] relative" ref={companyDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                企業
              </label>
              <div
                onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                className="w-full min-h-[38px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-left text-sm focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                {selectedCompanies.length === 0 ? (
                  <span className="text-gray-400">すべて</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {selectedCompanies.map((company) => (
                      <span
                        key={company}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {company}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCompanies((prev) =>
                              prev.filter((c) => c !== company)
                            );
                          }}
                          className="hover:text-blue-900"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* ドロップダウンメニュー */}
              {isCompanyDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg max-h-60 overflow-auto">
                  {/* すべて選択/解除 */}
                  <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCompanies.length === uniqueCompanies.length) {
                          setSelectedCompanies([]);
                        } else {
                          setSelectedCompanies([...uniqueCompanies]);
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {selectedCompanies.length === uniqueCompanies.length
                        ? 'すべて解除'
                        : 'すべて選択'}
                    </button>
                  </div>
                  
                  {/* 企業リスト */}
                  {uniqueCompanies.map((company) => (
                    <label
                      key={company}
                      className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCompanies.includes(company)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCompanies((prev) => [...prev, company]);
                          } else {
                            setSelectedCompanies((prev) =>
                              prev.filter((c) => c !== company)
                            );
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{company}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* フィルタークリアボタン */}
            {(dateFilterStart || dateFilterEnd || selectedCompanies.length > 0) && (
              <button
                onClick={() => {
                  setDateFilterStart('');
                  setDateFilterEnd('');
                  setSelectedCompanies([]);
                  setIsCompanyDropdownOpen(false);
                }}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                フィルタークリア
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex flex-1 flex-col">
          {isGridReady ? (
            <div
              ref={gridContainerRef}
              style={{ width: '100%', height: '100%' }}
              className="rounded-lg border border-gray-300 bg-white shadow mb-4"
            />
          ) : (
            <div className="flex h-60 w-full items-center justify-center">
              <div className="text-center">
                <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                <p className="text-gray-600">データを読み込んでいます...</p>
              </div>
            </div>
          )}

          {/* ポップアップGrid（outsaide用） */}
          {gridPopupVisible && (
            <>
              {/* 背景オーバーレイ（クリックで閉じる） */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => {
                  setGridPopupVisible(false);
                  setSelectedRowDataForGrid(null);
                }}
              />
              {/* Grid本体（シンプル表示） */}
              <div
                className="fixed z-50 bg-white shadow-lg"
                style={{
                  left: `${gridPopupPosition.x}px`,
                  top: `${gridPopupPosition.y}px`,
                  width: '165px', // 列幅の合計(80+80) + スクロールバー等の余裕
                  height: '115px', // ヘッダー(約40px) + 行2つ(35px×2) + 余裕
                  border: '1px solid #d1d5db',
                }}
              >
                <div
                  ref={popupGridContainerRef}
                  style={{ 
                    width: '100%', 
                    height: '100%',
                  }}
                />
              </div>
            </>
          )}

          {/* DataView（セル直下に表示） */}
          {dataViewVisible && (
            <>
              {/* 背景オーバーレイ */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => {
                  setDataViewVisible(false);
                  setSelectedRowData(null);
                }}
              />
              {/* DataView本体 */}
              <div
                className="fixed z-50 rounded-lg border-2 border-blue-500 bg-white shadow-2xl"
                style={{
                  left: `${dataViewPosition.x}px`,
                  top: `${dataViewPosition.y}px`,
                  width: '480px',
                  maxHeight: `${Math.min(450, window.innerHeight - 20)}px`,
                }}
              >
                <div className="bg-blue-500 px-3 py-2 text-white text-sm font-semibold rounded-t-lg flex items-center justify-between">
                  <span>結果を選択 - {selectedRowData?.dayLabel}</span>
                  <button
                    onClick={() => {
                      setDataViewVisible(false);
                      setSelectedRowData(null);
                    }}
                    className="text-white hover:text-gray-200 font-bold text-lg"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-3">
                  <div
                    ref={dataViewContainerRef}
                    style={{ 
                      width: '100%', 
                      maxHeight: `${Math.min(370, window.innerHeight - 80)}px`,
                      overflowY: 'auto',
                    }}
                  />
                </div>
              </div>
            </>
        )}
      </div>
    </div>
  );
};

export default DhtmlxGridDataView;


