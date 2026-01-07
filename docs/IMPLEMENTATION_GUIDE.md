# 実装ガイド

新しい柔軟な計画スケジュールシステムの実装手順を説明します。

## 📋 前提条件

- SQL Server データベースが利用可能
- .NET Framework プロジェクトが構成済み
- React + TypeScript プロジェクトが構成済み
- AG Grid がインストール済み

---

## 🚀 実装手順

### Step 1: データベースのセットアップ

#### 1.1 DDLの実行

```bash
# SQLスクリプトを実行
sqlcmd -S localhost -d YourDatabase -i database/flexible_schedule_ddl.sql
```

または、SQL Server Management Studio で `database/flexible_schedule_ddl.sql` を開いて実行してください。

#### 1.2 テーブルの確認

```sql
-- テーブルが作成されたことを確認
SELECT * FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN (
    't_plan_schedule_v2',
    't_actual_result',
    'm_waste_type',
    't_monthly_schedule_config'
);

-- サンプルデータの確認
SELECT * FROM t_plan_schedule_v2;
SELECT * FROM m_waste_type;
```

---

### Step 2: バックエンドの実装

#### 2.1 モデルの追加

既に作成済み:
- `backend/Models/FlexibleSchedule.cs`

#### 2.2 リポジトリの追加

既に作成済み:
- `backend/Models/Repository/FlexibleScheduleRepository.cs`

#### 2.3 コントローラーの追加

既に作成済み:
- `backend/Controllers/FlexibleScheduleController.cs`

#### 2.4 接続文字列の確認

`Web.config` または `App.config` で接続文字列を確認:

```xml
<connectionStrings>
  <add name="DefaultConnection" 
       connectionString="Server=localhost;Database=YourDatabase;Trusted_Connection=True;" 
       providerName="System.Data.SqlClient" />
</connectionStrings>
```

#### 2.5 ビルドと動作確認

```bash
# プロジェクトをビルド
cd backend
dotnet build  # または msbuild

# APIが起動することを確認
# ブラウザで http://localhost:YOUR_PORT/api/flexible-schedule/waste-types にアクセス
```

---

### Step 3: フロントエンドの実装

#### 3.1 コンポーネントの追加

既に作成済み:
- `frontend/src/pages/FlexibleSchedule.tsx`
- `frontend/src/api/flexibleScheduleApi.ts`

#### 3.2 ルーティングの追加

`frontend/src/App.tsx` または該当するルーティングファイルに追加:

```typescript
import FlexibleSchedule from './pages/FlexibleSchedule';

// ルート定義に追加
<Route path="/flexible-schedule" element={<FlexibleSchedule />} />
```

#### 3.3 ナビゲーションメニューに追加

```typescript
// メニューコンポーネントに追加
<Link to="/flexible-schedule">柔軟な計画</Link>
```

#### 3.4 開発サーバーの起動

```bash
cd frontend
npm install  # 必要な場合
npm run dev
```

#### 3.5 動作確認

ブラウザで `http://localhost:YOUR_PORT/flexible-schedule` にアクセスして、画面が表示されることを確認してください。

---

### Step 4: API接続の調整

#### 4.1 モックデータから実際のAPIへ切り替え

`frontend/src/pages/FlexibleSchedule.tsx` の以下の部分を実際のAPI呼び出しに変更:

```typescript
// Before (モックデータ)
useEffect(() => {
  const fetchInitialData = async () => {
    // モックデータ
    setCompanies([...]);
    setWasteTypes([...]);
  };
  fetchInitialData();
}, []);

// After (実際のAPI)
useEffect(() => {
  const fetchInitialData = async () => {
    const companiesData = await flexibleScheduleApi.fetchCompanyList();
    setCompanies(companiesData);
    
    const wasteTypesData = await flexibleScheduleApi.fetchWasteTypes();
    setWasteTypes(wasteTypesData);
    
    const yearMonths = await flexibleScheduleApi.fetchAvailableYearMonths();
    setAvailableYearMonths(yearMonths);
    
    setLoadingYearMonths(false);
  };
  fetchInitialData();
}, []);
```

```typescript
// Before (モックデータ)
useEffect(() => {
  const fetchMonthlyData = async () => {
    const mockData = generateMockMonthlyData(currentYear, currentIndexMonth, 3);
    setRowData(mockData);
    // ...
  };
  fetchMonthlyData();
}, [currentYear, currentIndexMonth, companies, wasteTypes]);

// After (実際のAPI)
useEffect(() => {
  const fetchMonthlyData = async () => {
    const data = await flexibleScheduleApi.fetchMonthlySchedule(
      currentYear, 
      currentIndexMonth + 1
    );
    
    // データを画面表示用に変換
    const formattedData = data.map(item => ({
      date: item.date,
      dayLabel: formatDayLabel(item.date), // ユーティリティ関数で日付をフォーマット
      isHoliday: checkIfHoliday(item.date),
      isSaturday: checkIfSaturday(item.date),
      schedules: item.schedules,
      note: item.note,
    }));
    
    setRowData(formattedData);
    setAgRowData(JSON.parse(JSON.stringify(formattedData)));
    
    const config = await flexibleScheduleApi.fetchMonthlyConfig(
      currentYear,
      currentIndexMonth + 1
    );
    setMaxScheduleCount(config.maxScheduleCount);
    
    setIsGridReady(true);
  };
  
  if (companies.length > 0 && wasteTypes.length > 0) {
    fetchMonthlyData();
  }
}, [currentYear, currentIndexMonth, companies, wasteTypes]);
```

---

### Step 5: テストデータの投入

#### 5.1 初期データの作成

```sql
-- 2025年1月の設定
INSERT INTO t_monthly_schedule_config (year, month, maxScheduleCount, note) 
VALUES (2025, 1, 3, '通常月');

-- 2025年1月のサンプル計画（1日分）
INSERT INTO t_plan_schedule_v2 (year, month, version, date, scheduleOrder, wasteType, companyId, vol, plannedTime, note, createdAt, updatedAt)
VALUES 
    (2025, 1, 0, '2025-01-10', 1, '廃プラ', 1, 100.5, '09:00:00', '', GETDATE(), GETDATE()),
    (2025, 1, 0, '2025-01-10', 2, '汚泥', 2, 200.0, '13:00:00', '', GETDATE(), GETDATE()),
    (2025, 1, 0, '2025-01-10', 3, '廃プラ', 1, 150.0, '17:00:00', '', GETDATE(), GETDATE());

-- データの確認
SELECT * FROM t_plan_schedule_v2 WHERE year = 2025 AND month = 1;
```

#### 5.2 画面での動作確認

1. フロントエンドで「2025年1月」を選択
2. AG Gridに1月10日のデータが表示されることを確認
3. 編集モードをONにして、セルを編集できることを確認
4. 保存ボタンを押して、データが保存されることを確認

---

### Step 6: 上級機能の実装（オプション）

#### 6.1 バージョン管理機能

```typescript
// バージョンを切るボタンの実装
const handleCreateVersion = async () => {
  if (!window.confirm('バージョンを切りますか？')) return;
  
  try {
    const newVersion = await flexibleScheduleApi.createVersion(
      currentYear,
      currentIndexMonth + 1
    );
    
    alert(`バージョン${newVersion}を作成しました。`);
    
    // バージョン一覧を再取得
    const versions = await flexibleScheduleApi.fetchAvailableVersions(
      currentYear,
      currentIndexMonth + 1
    );
    setAvailableVersions(versions);
    setSelectedVersion(newVersion);
  } catch (error) {
    console.error('バージョン作成エラー:', error);
    alert('バージョンの作成に失敗しました。');
  }
};
```

#### 6.2 実績との突合機能

```typescript
// 突合ボタンの実装
const handleMatchWithActual = async () => {
  try {
    const matchedData = await flexibleScheduleApi.matchWithActual(
      currentYear,
      currentIndexMonth + 1
    );
    
    // 突合結果を表示（別画面またはモーダル）
    console.log('突合結果:', matchedData);
    // TODO: 突合結果表示コンポーネントを実装
  } catch (error) {
    console.error('突合エラー:', error);
    alert('突合に失敗しました。');
  }
};
```

#### 6.3 PDF出力機能

既存の`usePdfPreview`フックを活用して実装してください。

---

## 🧪 テスト

### 単体テスト（バックエンド）

```csharp
// FlexibleScheduleRepositoryTest.cs
[TestClass]
public class FlexibleScheduleRepositoryTest
{
    [TestMethod]
    public void GetMonthlySchedule_Should_Return_Data()
    {
        var repo = new FlexibleScheduleRepository();
        var result = repo.GetMonthlySchedule(2025, 1, 0);
        
        Assert.IsNotNull(result);
        Assert.IsTrue(result.Count > 0);
    }
}
```

### 統合テスト（E2E）

```typescript
// flexibleSchedule.spec.ts
describe('FlexibleSchedule', () => {
  it('should display monthly schedule', () => {
    cy.visit('/flexible-schedule');
    cy.contains('柔軟な計画スケジュール');
    
    // 年月選択
    cy.get('select[name="year"]').select('2025');
    cy.get('select[name="month"]').select('1');
    
    // データが表示されることを確認
    cy.get('.ag-grid-react').should('be.visible');
  });
  
  it('should save schedule data', () => {
    cy.visit('/flexible-schedule');
    
    // 編集モードON
    cy.get('button').contains('編集モード').click();
    
    // セルを編集
    cy.get('.ag-cell').first().dblclick();
    cy.get('input').type('廃プラ');
    
    // 保存
    cy.get('button').contains('保存').click();
    cy.contains('保存が完了しました');
  });
});
```

---

## 📊 パフォーマンス最適化

### データ取得の最適化

```sql
-- インデックスの追加（DDLに含まれていますが、念のため確認）
CREATE INDEX IX_Schedule_YearMonth ON t_plan_schedule_v2 (year, month, version);
CREATE INDEX IX_Schedule_Date ON t_plan_schedule_v2 (date);
CREATE INDEX IX_Actual_Date ON t_actual_result (date);
```

### フロントエンドの最適化

```typescript
// AG Gridのパフォーマンス設定
<AgGridReact
  ref={gridRef}
  rowData={agRowData}
  columnDefs={columnDefs}
  defaultColDef={defaultColDef}
  suppressMovableColumns={true}
  // パフォーマンス最適化
  suppressColumnVirtualisation={false}
  enableCellChangeFlash={true}
  animateRows={true}
/>
```

---

## 🐛 トラブルシューティング

### 問題1: API呼び出しでCORSエラーが発生する

**解決策**: バックエンドでCORSを許可する

```csharp
// WebApiConfig.cs
public static void Register(HttpConfiguration config)
{
    config.EnableCors(new EnableCorsAttribute("*", "*", "*"));
}
```

### 問題2: AG Gridの列が表示されない

**解決策**: `isGridReady`が`true`になっているか確認

```typescript
console.log('isGridReady:', isGridReady);
console.log('columnDefs:', columnDefs);
```

### 問題3: データ保存時にエラーが発生する

**解決策**: リクエストデータの形式を確認

```typescript
console.log('保存データ:', flattenedData);
```

---

## 📚 参考資料

- [AG Grid Documentation](https://www.ag-grid.com/react-data-grid/)
- [Dapper Documentation](https://github.com/DapperLib/Dapper)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

## ✅ チェックリスト

実装が完了したら、以下をチェックしてください:

- [ ] データベーステーブルが作成されている
- [ ] サンプルデータが投入されている
- [ ] バックエンドAPIが正常に動作する
- [ ] フロントエンドで画面が表示される
- [ ] データの取得が正常に動作する
- [ ] データの保存が正常に動作する
- [ ] 編集モードの切り替えが動作する
- [ ] 列の追加機能が動作する
- [ ] バージョン管理機能が動作する（オプション）
- [ ] 実績との突合機能が動作する（オプション）
- [ ] 単体テストが通る
- [ ] 統合テストが通る

---

## 🎉 完了

すべてのチェックが完了したら、本番環境への移行を検討してください。

ご質問やサポートが必要な場合は、開発チームにお問い合わせください。

