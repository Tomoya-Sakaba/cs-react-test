# DHTMLX Grid 実装ガイド

## 概要

このプロジェクトでは、AG GridとDHTMLX Gridの2つのグリッドライブラリを使用しています。

## セットアップ完了内容

### 1. ファイル配置
- `frontend/public/dhtmlx/codebase/` - DHTMLX Suite のライブラリファイル

### 2. グローバル読み込み
- `frontend/index.html` - DHTMLX Suite のCSSとJSを読み込み

### 3. 実装ページ

#### 基本テストページ
- **パス**: `/dhtmlx-test`
- **ファイル**: `frontend/src/pages/DhtmlxGridTest.tsx`
- **内容**: DHTMLX Gridの基本的な使い方のデモ

#### AgTest互換ページ
- **パス**: `/dhtmlx-ag-test`
- **ファイル**: `frontend/src/pages/DhtmlxAgTest.tsx`
- **内容**: AgTest.tsxと同じ機能をDHTMLX Gridで実装

## 機能比較

### AgTest.tsx (AG Grid版)
- ✅ 年月フィルター
- ✅ バージョン管理
- ✅ 編集モード切り替え
- ✅ データ保存
- ✅ 新規作成モード
- ✅ デフォルト値設定
- ✅ ヘッダー設定（動的カラム）
- ✅ 上程機能（承認フロー）
- ✅ 会社マスタ連携
- ✅ 土日・祝日の色分け

### DhtmlxAgTest.tsx (DHTMLX Grid版)
- ✅ 年月フィルター
- ✅ バージョン管理
- ✅ 編集モード切り替え
- ✅ データ保存
- ✅ 新規作成モード
- ✅ デフォルト値設定
- ✅ ヘッダー設定（動的カラム）
- ✅ 上程機能（承認フロー）
- ✅ 会社マスタ連携
- ✅ 土日・祝日の色分け

## 主な違い

### AG Grid
```typescript
// カラム定義
const columnDefs = [
  { field: 'name', headerName: '名前', editable: true }
];

// Grid初期化
<AgGridReact
  ref={gridRef}
  rowData={rowData}
  columnDefs={columnDefs}
/>
```

### DHTMLX Grid
```typescript
// Grid初期化
const grid = new window.dhx.Grid(container, {
  columns: [
    { id: 'name', header: [{ text: '名前' }], editable: true }
  ]
});

// データセット
grid.data.parse(data);
```

## DHTMLX Grid の主要API

### 初期化
```typescript
const grid = new window.dhx.Grid(container, {
  columns: [...],
  autoWidth: false,
  selection: 'row',
  editable: true,
  resizable: true,
});
```

### データ操作
```typescript
// データをセット
grid.data.parse(data);

// データを取得
const allData = grid.data.serialize();

// 行を追加
grid.data.add({ id: 1, name: '新規' });

// 行を削除
grid.data.remove(rowId);

// データを更新
grid.data.update(rowId, { name: '更新後' });
```

### イベント処理
```typescript
// セルクリック
grid.events.on('cellClick', (row, column) => {
  console.log('クリック:', row, column);
});

// セル編集後
grid.events.on('afterEditEnd', (value, row, column) => {
  console.log('編集完了:', value);
});
```

### スタイリング
```typescript
// 行ごとにCSSクラスを適用
const grid = new window.dhx.Grid(container, {
  rowCss: (row) => {
    if (row.isHoliday) return 'holiday-row';
    return '';
  }
});
```

## 動的カラム生成の実装

DhtmlxAgTest.tsxでは、選択されたcontentTypeに応じて動的にカラムを生成しています：

```typescript
const generateColumns = useCallback(() => {
  const columns: any[] = [
    { id: 'dayLabel', header: [{ text: '日付' }], width: 120 },
    { id: 'note', header: [{ text: '備考' }], width: 200 },
  ];

  // contentTypeごとにカラムを追加
  selectedContentTypeIds.forEach((contentTypeId) => {
    const contentTypeName = getContentTypeName(contentTypeId);
    
    columns.push(
      {
        id: `content_${contentTypeId}_company`,
        header: [{ text: `${contentTypeName} - 会社` }],
        width: 150,
        editable: isEditing,
        type: 'select',
        options: companies.map(c => ({ id: c.companyId, value: c.companyName })),
      },
      {
        id: `content_${contentTypeId}_vol`,
        header: [{ text: `${contentTypeName} - 量` }],
        width: 100,
        editable: isEditing,
        type: 'number',
      }
    );
  });

  return columns;
}, [selectedContentTypeIds, companies, isEditing]);
```

## データ変換

### MapdePlan → DHTMLX Grid形式
```typescript
const convertToGridData = (data: MapdePlan[]) => {
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
};
```

### DHTMLX Grid形式 → MapdePlan
```typescript
const convertFromGridData = () => {
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
};
```

## 編集モードの実装

DHTMLX Gridでは、カラム定義を変更してからGridを再構築する必要があります：

```typescript
const toggleEditMode = () => {
  if (isEditing) {
    setIsEditing(false);
  } else {
    setIsEditing(true);
  }
  
  // Gridを再構築
  setIsGridReady(false);
  setTimeout(() => setIsGridReady(true), 0);
};
```

## 注意点

1. **Gridの再構築**
   - カラム定義や編集モードを変更する場合、Gridを再構築する必要があります
   - `setIsGridReady(false)` → `setIsGridReady(true)` で再レンダリング

2. **データの保持**
   - Grid内のデータは `_originalData` プロパティに元データを保持
   - 変換時に元データを参照して正確に復元

3. **型定義**
   - グローバルな `window.dhx` の型定義が必要
   - `declare global { interface Window { dhx: any; } }`

4. **クリーンアップ**
   - コンポーネントのアンマウント時に `grid.destructor()` を呼び出す

## トラブルシューティング

### Gridが表示されない
- `window.dhx` が読み込まれているか確認
- コンソールに "DHTMLX Suite is not loaded" エラーがないか確認
- `isGridReady` が `true` になっているか確認

### データが更新されない
- `grid.data.parse()` でデータをセットしているか確認
- `convertToGridData()` で正しく変換されているか確認

### 編集が反映されない
- `editable: true` がカラム定義に設定されているか確認
- `convertFromGridData()` で正しく取得しているか確認

## 参考リンク

- [DHTMLX Suite ドキュメント](https://docs.dhtmlx.com/suite/)
- [DHTMLX Grid API](https://docs.dhtmlx.com/suite/grid/)
- [AG Grid ドキュメント](https://www.ag-grid.com/react-data-grid/)

## 今後の拡張

- [ ] セルエディタのカスタマイズ
- [ ] コンテキストメニュー
- [ ] フィルター機能
- [ ] ソート機能
- [ ] ページネーション
- [ ] CSVエクスポート（Pro版）
- [ ] Excel出力（Pro版）

