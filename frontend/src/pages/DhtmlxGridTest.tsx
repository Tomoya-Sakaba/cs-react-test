import { useEffect, useRef } from 'react';

// DHTMLX Suiteのグローバル型定義
declare global {
  interface Window {
    dhx: any;
  }
}

export default function DhtmlxGridTest() {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!gridContainerRef.current) return;

    // DHXが読み込まれているか確認
    if (typeof window.dhx === 'undefined') {
      console.error('DHTMLX Suite is not loaded');
      return;
    }

    // Gridの初期化
    const grid = new window.dhx.Grid(gridContainerRef.current, {
      columns: [
        { id: 'id', header: [{ text: 'ID' }], width: 80 },
        { id: 'name', header: [{ text: '名前' }], width: 200 },
        { id: 'age', header: [{ text: '年齢' }], width: 100 },
        { id: 'department', header: [{ text: '部署' }], width: 200 },
        { id: 'email', header: [{ text: 'メール' }], width: 250 },
      ],
      autoWidth: true,
      selection: 'row',
      editable: true,
      resizable: false,
    });

    // サンプルデータ
    const data = [
      { id: 1, name: '田中太郎', age: 30, department: '営業部', email: 'tanaka@example.com' },
      { id: 2, name: '佐藤花子', age: 25, department: '開発部', email: 'sato@example.com' },
      { id: 3, name: '鈴木一郎', age: 35, department: '総務部', email: 'suzuki@example.com' },
      { id: 4, name: '高橋美咲', age: 28, department: '開発部', email: 'takahashi@example.com' },
      { id: 5, name: '伊藤健太', age: 32, department: '営業部', email: 'ito@example.com' },
      { id: 6, name: '渡辺真理', age: 29, department: '人事部', email: 'watanabe@example.com' },
      { id: 7, name: '山本太一', age: 41, department: '総務部', email: 'yamamoto@example.com' },
      { id: 8, name: '中村優子', age: 26, department: '開発部', email: 'nakamura@example.com' },
    ];

    grid.data.parse(data);

    // イベントリスナーの例
    grid.events.on('cellClick', (row: any, column: any) => {
      console.log('セルがクリックされました:', row, column);
    });

    gridInstanceRef.current = grid;

    // クリーンアップ
    return () => {
      if (gridInstanceRef.current) {
        gridInstanceRef.current.destructor();
      }
    };
  }, []);

  const handleAddRow = () => {
    if (gridInstanceRef.current) {
      const newId = gridInstanceRef.current.data.getLength() + 1;
      gridInstanceRef.current.data.add({
        id: newId,
        name: '新規ユーザー',
        age: 25,
        department: '未設定',
        email: 'new@example.com',
      });
    }
  };

  const handleRemoveSelected = () => {
    if (gridInstanceRef.current) {
      const selected = gridInstanceRef.current.selection.getCell();
      if (selected) {
        gridInstanceRef.current.data.remove(selected.row.id);
      }
    }
  };

  const handleExportCSV = () => {
    if (gridInstanceRef.current && window.dhx) {
      // CSVエクスポート機能（トライアル版で利用可能か確認してください）
      console.log('エクスポート機能をテスト中...');
      alert('CSVエクスポートはPro版の機能です');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">DHTMLX Grid テスト</h1>
        <p className="text-gray-600">
          DHTMLX Suite Gridの基本的な使い方をテストします
        </p>
      </div>

      {/* コントロールボタン */}
      <div className="mb-4 flex gap-3">
        <button
          onClick={handleAddRow}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          行を追加
        </button>
        <button
          onClick={handleRemoveSelected}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          選択行を削除
        </button>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
        >
          CSV出力（テスト）
        </button>
      </div>

      {/* Grid Container */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
        <div
          ref={gridContainerRef}
          style={{ width: '100%', height: '500px' }}
          className="dhtmlx-grid-container"
        />
      </div>

      {/* 使い方の説明 */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">使い方</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>行をクリックすると選択されます</li>
          <li>セルをダブルクリックすると編集できます（編集可能な場合）</li>
          <li>列の境界をドラッグするとリサイズできます</li>
          <li>「行を追加」ボタンで新しい行を追加できます</li>
          <li>行を選択して「選択行を削除」で削除できます</li>
        </ul>
      </div>
    </div>
  );
}

