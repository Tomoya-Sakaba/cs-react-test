# CSV取り込み機能 - セットアップガイド

## 概要
CSVファイルをアップロードして、データベース（`t_results`テーブル）に取り込む機能です。

## セットアップ手順

### 1. データベーステーブルの作成

SQL Server Management Studioまたはコマンドラインで以下のSQLを実行してください：

```sql
-- backend/Database/create_t_results_table.sql を実行
```

または、直接以下のSQLを実行：

```sql
USE [test_mydb];
GO

CREATE TABLE [dbo].[t_results] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [date] DATE NOT NULL,
    [content_type_id] INT NOT NULL,
    [vol] DECIMAL(10, 2) NULL,
    [company_id] INT NULL,
    [company_name] NVARCHAR(255) NULL,
    [created_at] DATETIME DEFAULT GETDATE() NOT NULL,
    [created_user] NVARCHAR(100) NULL,
    PRIMARY KEY ([id])
);
GO

CREATE INDEX [IX_t_results_date] ON [dbo].[t_results]([date]);
CREATE INDEX [IX_t_results_content_type_id] ON [dbo].[t_results]([content_type_id]);
CREATE INDEX [IX_t_results_company_id] ON [dbo].[t_results]([company_id]);
GO
```

### 2. バックエンド（C#）の確認

以下のファイルが作成されています：

- ✅ `backend/Controllers/CsvImportController.cs` - APIエンドポイント
- ✅ `backend/Services/CsvImportService.cs` - CSV処理ロジック
- ✅ `backend/Models/Repository/ResultRepository.cs` - DB操作
- ✅ `backend/Models/Entities/ResultEntity.cs` - エンティティ
- ✅ `backend/Models/DTOs/CsvImportDto.cs` - DTO

**重要**: CsvHelperがインストールされている必要があります。
```powershell
Install-Package CsvHelper
```

### 3. フロントエンド（React）の確認

以下のファイルが作成されています：

- ✅ `frontend/src/api/csvApi.ts` - API呼び出し（axiosベース）
- ✅ `frontend/src/pages/CsvImport.tsx` - UIコンポーネント

**重要**: プロジェクトで既に使用されている`axios`を使用しています。

### 4. ルーティング設定（必要な場合）

フロントエンドのルーティングファイルに以下を追加してください：

```typescript
import CsvImport from './pages/CsvImport';

// ルート定義に追加
{
  path: '/csv-import',
  element: <CsvImport />
}
```

## CSVフォーマット

### 文字コード
- **ANSI（Shift-JIS）形式**を想定しています
- Excelで「名前を付けて保存」→「CSV（コンマ区切り）」で保存すると自動的にANSI形式になります

### ヘッダー行

**特殊なフォーマット**:
- **1行目**: ファイルヘッダー（例: `ファイルヘッダー`）
- **2行目**: 空行
- **3行目**: データヘッダー（実際の列名）
- **4行目以降**: データ行

```
ファイルヘッダー

日付,,コンテンツタイプ,量,企業ID,企業名
```

**注意**: 2列目は空カラムです（`,,`で表示）

### データ例
```csv
ファイルヘッダー

日付,,コンテンツタイプ,量,企業ID,企業名
2024-12-01,,1,100.50,1,株式会社サンプル
2024-12-02,,2,200.75,2,"株式会社テスト,東京支社"
2024-12-03,,1,150.00,3,サンプル企業
2024-12-04,,3,300.25,,"企業名のみ"
2024-12-05,,2,250.00,4,
```

### フィールド仕様

| 列番号 | CSV列名 | DB列名 | 型 | 必須 | 説明 |
|-------|---------|--------|-----|------|------|
| 1 | 日付 | date | DATE | ❌ | 日付（YYYY-MM-DD形式）※空の場合は現在日付 |
| 2 | （空） | - | - | - | 空カラム（読み飛ばす） |
| 3 | コンテンツタイプ | content_type_id | INT | ❌ | コンテンツタイプID ※空の場合は0 |
| 4 | 量 | vol | DECIMAL | ❌ | 数量（小数可） |
| 5 | 企業ID | company_id | INT | ❌ | 企業ID |
| 6 | 企業名 | company_name | NVARCHAR | ❌ | 企業名 |

### 注意事項

- ✅ **特殊なCSVフォーマット**に対応しています
  - 1行目: ファイルヘッダー
  - 2行目: 空行
  - 3行目: データヘッダー
  - 4行目以降: データ
- ✅ **2列目は空カラム**（`,,`）で、自動的に読み飛ばされます
- ✅ **必須チェックなし**: すべてのフィールドは任意です
  - 日付が空の場合 → 現在日付を使用
  - コンテンツタイプIDが空の場合 → 0を使用
  - その他は空の場合 → NULLを設定
- ✅ **文字コードはANSI（Shift-JIS）形式**で保存してください
- ✅ Excelで保存する場合は「CSV（コンマ区切り）」を選択してください
- ✅ ダブルクォートで囲まれたフィールド内のカンマは区切り文字として扱われません
- ✅ 空白は自動的にトリミングされます

## API仕様

### 1. CSV取り込み

**エンドポイント**: `POST /api/csv/import/results`

**リクエスト**:
- Content-Type: `multipart/form-data`
- Body: CSVファイル

**レスポンス**:
```json
{
  "successCount": 5,
  "failureCount": 0,
  "errors": [],
  "message": "CSV取り込みが完了しました。（成功: 5件）"
}
```

**エラーがある場合**:
```json
{
  "successCount": 3,
  "failureCount": 2,
  "errors": [
    "行 3: 日付の形式が不正です: 2024-13-01",
    "行 5: コンテンツタイプIDが数値ではありません: abc"
  ],
  "message": "CSV取り込みが完了しました。（成功: 3件、失敗: 2件）"
}
```

### 2. データ一覧取得

**エンドポイント**: `GET /api/csv/results`

**レスポンス**:
```json
[
  {
    "id": 1,
    "date": "2024-12-01T00:00:00",
    "contentTypeId": 1,
    "vol": 100.50,
    "companyId": 1,
    "companyName": "株式会社サンプル",
    "createdAt": "2024-12-13T10:30:00",
    "createdUser": "System"
  }
]
```

### 3. 全データ削除（テスト用）

**エンドポイント**: `DELETE /api/csv/results`

**レスポンス**:
```json
{
  "message": "全ての結果データを削除しました。"
}
```

## テスト方法

### 1. サンプルCSVを使用

`backend/SampleData/sample_results.csv` を使用してテストできます。

**注意**: サンプルCSVはANSI（Shift-JIS）形式で保存してください。
- Excelで開いて「名前を付けて保存」→「CSV（コンマ区切り）」を選択すると自動的にANSI形式になります
- メモ帳で開いて「名前を付けて保存」→エンコードで「ANSI」を選択してください

### 2. Postmanでテスト

```
POST http://localhost:5000/api/csv/import/results
Content-Type: multipart/form-data

file: [CSVファイルを選択]
```

### 3. フロントエンドからテスト

1. バックエンドを起動
2. フロントエンドを起動
3. ブラウザで `/csv-import` にアクセス
4. CSVファイルを選択してアップロード

## トラブルシューティング

### エラー: "CSVファイルが送信されていません"
→ ファイルが正しく選択されているか確認してください

### エラー: "日付の形式が不正です"
→ 日付は `YYYY-MM-DD` または `YYYY/MM/DD` 形式で入力してください

### エラー: "コンテンツタイプIDは必須です"
→ 2列目（コンテンツタイプ）が空白になっていないか確認してください

### エラー: "列数が一致しません"
→ CSVの列数が5列であることを確認してください

### エラー: "文字化けしている"
→ CSVファイルがANSI（Shift-JIS）形式で保存されているか確認してください
→ Excelで「CSV（コンマ区切り）」形式で保存すれば自動的にANSI形式になります

### UTF-8で保存されたCSVを使いたい場合
→ 現在の実装はANSI（Shift-JIS）専用です
→ UTF-8対応が必要な場合は、バックエンドの`CsvImportService.cs`の`Encoding.GetEncoding(932)`を`Encoding.UTF8`に変更してください

### Web.configのファイルサイズ制限

大きなCSVファイルをアップロードする場合、`Web.config` に以下を追加してください：

```xml
<system.web>
  <httpRuntime maxRequestLength="10240" /> <!-- 10MB -->
</system.web>
```

## 拡張方法

### 他のテーブルに対応したい場合

1. 新しいエンティティクラスを作成
2. 新しいRepositoryを作成
3. CsvImportServiceに新しいメソッドを追加
4. CsvImportControllerに新しいエンドポイントを追加

## ライセンス

このプロジェクトの一部です。

