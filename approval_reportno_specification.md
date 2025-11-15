# 上程機能の ReportNo 管理仕様

## 概要

上程機能において、`ReportNo`の扱いをページタイプに応じて柔軟に対応できるようにする仕様。

## ページタイプの分類

### 1. 複数レコード型ページ（例：計画書ページ）

- **テーブル構造**: 年月で抽出するタイプ（複数レコードで管理）

  - 例: `t_plan`テーブル
  - 主キー: `(date, content_type_id, version)`
  - 1 レコードで完結しないデータ構造

- **ReportNo の扱い**:

  - `ReportNo`は**不要**（空文字列または`null`で登録可能）
  - 上程状態の取得は**年月のみ**で行う

- **上程データの識別**:
  - `Year`（年）
  - `Month`（月）
  - `ReportNo`は空文字列または`null`

### 2. 1 レコード型ページ（例：報告書ページ）

- **テーブル構造**: 1 レコードでデータがすべて入っている

  - テーブルのカラムの一つに`ReportNo`が存在
  - 1 レコード = 1 報告書

- **ReportNo の扱い**:

  - そのページのテーブルの`ReportNo`カラムの値を上程の`ReportNo`に使用
  - 上程状態の取得は**ReportNo と年月**で行う

- **上程データの識別**:
  - `ReportNo`（必須）
  - `Year`（年）
  - `Month`（月）

## ページタイプの判定方法

### 判定カラム: `PageId`（仮称）

- `Approvals`テーブルに`PageId`カラムを追加（または既存のカラムを使用）
- この`PageId`でページタイプを区別する

### 判定ロジック

```
IF PageId = 'plan' THEN
  // 複数レコード型ページ
  - ReportNo = null または空文字列で登録可能
  - 取得時は Year, Month のみで検索
ELSE IF PageId = 'report' THEN
  // 1レコード型ページ
  - ReportNo = そのページのテーブルのReportNoカラムの値
  - 取得時は ReportNo, Year, Month で検索
END IF
```

## API 仕様の変更

### 1. 上程データ作成 API (`POST /api/approval`)

- **変更前**: `ReportNo`が必須
- **変更後**: `ReportNo`をオプショナルにする
  - 複数レコード型ページ: `ReportNo`は空文字列または`null`で送信可能
  - 1 レコード型ページ: `ReportNo`は必須（そのページのテーブルの`ReportNo`を送信）

### 2. 上程データ取得 API (`GET /api/approval`)

- **変更前**: `reportNo`, `year`, `month`で取得
- **変更後**: ページタイプに応じて取得方法を変更
  - 複数レコード型ページ: `year`, `month`のみで取得（`reportNo`は無視または空文字列）
  - 1 レコード型ページ: `reportNo`, `year`, `month`で取得

### 3. リクエストパラメータ

```typescript
// 複数レコード型ページの場合
{
  reportNo: "", // または null
  year: 2024,
  month: 10,
  pageId: "plan", // ページタイプを識別するID
  // ... その他のパラメータ
}

// 1レコード型ページの場合
{
  reportNo: "RPT-2024-10-001", // そのページのテーブルのReportNo
  year: 2024,
  month: 10,
  pageId: "report", // ページタイプを識別するID
  // ... その他のパラメータ
}
```

## データベーススキーマの変更

### `Approvals`テーブルへの追加

```sql
-- PageIdカラムを追加（ページタイプを識別）
ALTER TABLE [dbo].[Approvals]
ADD [PageId] VARCHAR(50) NULL;

-- インデックスの追加（検索性能向上のため）
CREATE INDEX IX_Approvals_PageId_Year_Month
ON [dbo].[Approvals] ([PageId], [Year], [Month]);

CREATE INDEX IX_Approvals_ReportNo_Year_Month
ON [dbo].[Approvals] ([ReportNo], [Year], [Month]);
```

### データ取得クエリの変更

```sql
-- 複数レコード型ページの場合（PageId='plan'）
SELECT * FROM [dbo].[Approvals]
WHERE [PageId] = 'plan'
  AND [Year] = @Year
  AND [Month] = @Month
  AND ([ReportNo] IS NULL OR [ReportNo] = '');

-- 1レコード型ページの場合（PageId='report'）
SELECT * FROM [dbo].[Approvals]
WHERE [PageId] = 'report'
  AND [ReportNo] = @ReportNo
  AND [Year] = @Year
  AND [Month] = @Month;
```

## フロントエンドの変更

### `useApproval`フック

```typescript
type UseApprovalOptions = {
  year: number;
  month: number;
  reportNo?: string; // オプショナル（複数レコード型ページでは空文字列またはnull）
  pageId: string; // ページタイプを識別するID（必須）
  autoFetch?: boolean;
};
```

### `ApprovalDrawer`コンポーネント

```typescript
type ApprovalDrawerProps = {
  onClose: () => void;
  year: number;
  month: number;
  reportNo?: string; // オプショナル
  pageId: string; // ページタイプを識別するID（必須）
  onApprovalChange?: () => void;
};
```

## バリデーション

### 複数レコード型ページ（`PageId = 'plan'`）

- `ReportNo`は空文字列または`null`で登録可能
- `Year`と`Month`は必須

### 1 レコード型ページ（`PageId = 'report'`）

- `ReportNo`は必須（空文字列や`null`は不可）
- `Year`と`Month`は必須

## 実装時の注意点

1. **後方互換性**: 既存のデータに対して`PageId`が`NULL`の場合は、デフォルトで 1 レコード型として扱う（既存の動作を維持）

2. **エラーハンドリング**:

   - 複数レコード型ページで`ReportNo`が指定された場合は警告を出す（または無視）
   - 1 レコード型ページで`ReportNo`が指定されていない場合はエラー

3. **検索クエリの最適化**:

   - `PageId`と`Year`、`Month`の組み合わせでインデックスを作成
   - `ReportNo`が`NULL`の場合はインデックスを使用しない

4. **データ移行**:
   - 既存の`Approvals`テーブルのデータに対して`PageId`を設定する必要がある
   - 既存データの`ReportNo`が空の場合は`PageId = 'plan'`、値がある場合は`PageId = 'report'`と推測

## まとめ

- **複数レコード型ページ**: `ReportNo`不要、年月のみで管理
- **1 レコード型ページ**: `ReportNo`必須、そのページのテーブルの`ReportNo`を使用
- **ページタイプの判定**: `PageId`カラムで区別
- **API**: `ReportNo`をオプショナルにし、`PageId`を追加
- **データベース**: `PageId`カラムを追加し、適切なインデックスを作成
