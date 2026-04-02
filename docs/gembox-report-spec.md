# GemBox 帳票（Excelテンプレ→PDF）仕様

## 目的

- **Reactで帳票レイアウトを組まない**（`@react-pdf/renderer` 等は不使用）
- **Excelテンプレート（.xlsx）を雛形**として、サーバ側で値を差し込み、**PDFを返す**
- 保守担当が **Excelを編集するだけ**で帳票レイアウトを変更できる（コード変更なし）

## 方式（全体像）

- **フロント**: 機器詳細画面の「印刷（PDF/GemBox）」ボタン → API呼び出し → PDFをダウンロード/表示
- **バックエンド**: 
  - `m_equipment` から機器情報を取得
  - テンプレExcelをコピーしてプレースホルダを置換
  - PDFに変換してストリームで返却

## 処理の流れ（呼び出し順 / 関数単位）

### 1) フロント: ボタンクリック → API呼び出し
- **画面**: `frontend/src/pages/equipment/EquipmentDetail.tsx`
  - 「印刷（PDF/GemBox）」クリック
  - `printApi.generatePdfByPageGemBox(...)` を呼ぶ（equipmentId を渡す）

- **APIクライアント**: `frontend/src/api/printApi.ts`
  - `generatePdfByPageGemBox(fileName, equipmentId)`
  - `GET /api/print-gembox/equipment/{equipmentId}/pdf` を `responseType: "blob"` で取得
  - 受け取ったPDF（Blob）を画面側でダウンロード/プレビューに回す

### 2) バックエンド: ルーティング → コントローラ処理
- **エンドポイント**: `GET /api/print-gembox/equipment/{equipmentId}/pdf`
- **コントローラ**: `backend/Controllers/PrintGemBoxController.cs`
  - `GenerateEquipmentPdf(int equipmentId)` が入口

`GenerateEquipmentPdf` 内の流れ:
- テンプレパス解決
  - `BReportTemplateBasePath` を読み、`equipment_master.xlsx` を結合して `templatePath` を作る
  - テンプレが無い場合は `404`
- 機器情報の取得
  - `EquipmentRepository.GetById(equipmentId)`（参照テーブルは `m_equipment`）
  - 機器が無い場合は `404`
- テンプレ埋め込み用データ生成
  - `BuildEquipmentPrintData(equipment)` で `Dictionary<string, object>` を組み立て
  - 単票キー（例: `equipment_code`）と、明細キー（例: `history`）を用意する
- PDF生成（タイムアウト付き）
  - `Task.Run(() => _pdfService.GeneratePdf(templatePath, data))`
  - `Task.WhenAny(..., Task.Delay(timeout))` で `GemBoxPdfTimeoutSeconds` を超えたら `504`
- PDF返却
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment`（ファイル名は `equipment_{code}_gembox.pdf`）

### 3) バックエンド: Excel埋め込み → PDF変換（GemBox）
- **サービス**: `backend/Services/GemBoxPdfGenerationService.cs`
  - `GeneratePdf(string templatePath, Dictionary<string, object> data)`

`GeneratePdf` 内の流れ:
- テンプレExcelを作業用にコピー
  - `File.Copy(templatePath, tempExcelPath, true)`
- 置換処理
  - `EmbedData(tempExcelPath, data)`
- PDF変換
  - `ConvertExcelToPdf(tempExcelPath, tempPdfPath)`
  - `ExcelFile.Load(...).Save(pdfPath)` でPDFを生成
- 戻り値
  - PDFを `MemoryStream` で返す（コントローラがそのままレスポンスへ）
- 後始末
  - 作業用の `.xlsx` と `.pdf` を削除

`EmbedData` 内の流れ:
- Excelロード
  - `ExcelFile.Load(excelPath)`
- 明細（テーブル）展開
  - `ExpandTableRegions(ws, data)`
  - テンプレ行内の `{{table:history}}` を起点に行を複製し、`FillTableRow(...)` で `{{history.xxx}}` を置換
- 単票プレースホルダ置換
  - `ws.GetUsedCellRange(true)` の範囲だけを走査（全セル走査は遅いため）
  - `{{...}}` を `data` のキーで置換（見つからないキーは空文字）
- Excel保存
  - `workbook.Save(excelPath)`

### 4) テンプレ側（Excel）の書き方 → サーバ側 `data` との対応
- **単票**: `{{equipment_code}}` のように、`BuildEquipmentPrintData` が作るキーと一致させる
- **明細**:
  - 行に `{{table:history}}`
  - 同じ行に `{{history.date}}` / `{{history.note}}` のように書く
  - サーバ側は `data["history"] = IEnumerable<Dictionary<string, object>>` を渡す

## テンプレ配置

- テンプレは **サーバのフォルダ**に配置する（DBへ保存しない）
- 参照パスは `Web.config` の `BReportTemplateBasePath` で指定
- 機器台帳テンプレは固定名:
  - `**equipment_master.xlsx`**

例:

- `BReportTemplateBasePath = C:\app_data\b-templates`
- `C:\app_data\b-templates\equipment_master.xlsx`

## プレースホルダ仕様（単票）

Excelセルに `{{キー}}` を埋め込む。

例（機器台帳）:

- `{{print_date}}`
- `{{equipment_id}}`
- `{{equipment_code}}`
- `{{equipment_name}}`
- `{{category}}`
- `{{manufacturer}}`
- `{{model}}`
- `{{location}}`
- `{{note}}`
- `{{updated_at}}`

### 置換ルール

- セル文字列内の `{{...}}` を置換する（セル値が文字列のときのみ）
- 対応するキーが `data` に無い場合は **空文字**にする
- 日付などの表示形式はサーバ側で整形する（例: `yyyy/MM/dd`）

## プレースホルダ仕様（テーブル / 明細）

### テーブル開始マーカー

行のどこかのセルに以下を置く:

- `{{table:history}}`

この **行が「行テンプレ」** になる。

### 明細セルの書式

同じ行（行テンプレ）に、以下のような形で埋め込む:

- `{{history.date}}`
- `{{history.action}}`
- `{{history.note}}`

### 展開ルール

- サーバ側 `data["history"]` を `IEnumerable<Dictionary<string, object>>` として扱う
- 明細行数が2以上なら、行テンプレを複製して必要行数ぶん行を増やす
- 明細が0件のときは、行テンプレ内の `{{history.xxx}}` を空文字にする

## API 仕様

### エンドポイント

- `GET /api/print-gembox/equipment/{equipmentId}/pdf`

### レスポンス

- `200 OK`
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="equipment_{equipment_code}_gembox.pdf"`

### エラー

- `404 NotFound`
  - テンプレ未配置、または機器が見つからない
- `504 Gateway Timeout`
  - サーバ側処理が `GemBoxPdfTimeoutSeconds` を超過
- `500 Internal Server Error`
  - それ以外の例外

## 設定（Web.config）

- `BReportTemplateBasePath`
  - テンプレフォルダ
- `GemBoxSpreadsheetLicenseKey`
  - GemBoxライセンスキー（未設定時は `FREE-LIMITED-KEY`）
- `GemBoxLogFilePath`
  - （現在はログ呼び出しをコメントアウトしているが）ログ出力先
- `GemBoxPdfTimeoutSeconds`
  - APIタイムアウト秒（デフォルト60）

## 実装箇所

- フロント
  - `frontend/src/pages/equipment/EquipmentDetail.tsx`（ボタン）
  - `frontend/src/api/printApi.ts`（GemBox API 呼び出し）
- バックエンド
  - `backend/Controllers/PrintGemBoxController.cs`（API / データ組み立て / タイムアウト）
  - `backend/Services/GemBoxPdfGenerationService.cs`（テンプレ置換 / テーブル展開 / PDF化）

## 既存（Spire系）との関係

- GemBox系は **別API/別サービス**で実装し、既存Spire系（DB設定ベース）は温存する

