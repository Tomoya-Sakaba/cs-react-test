# 行番号表示の問題と解決方法

## 問題

CSVファイルのエラーメッセージで、実際の行番号とずれが発生していました。

### 元のCSVファイル
```
1行目: ファイル名
2行目: (空行)
3行目: 日付,,コンテンツタイプ,量,企業ID,企業名
4行目: ああ,,1,100.50,1,株式会社サンプル
5行目: いいい,,2,200.75,2,"株式会社テスト,東京支社"
6行目: 2024-12-03,,1,150.00,3,サンプル企業
7行目: 2024-12-04,,3,300.25,,"企業名のみ"
8行目: 2024-12-05,,い,250.00,4,
```

### Before（修正前）
```
行 4: 「日付」列に不正な文字があります（値: いいい）...
行 7: 「コンテンツタイプ」列に不正な文字があります（値: い）...
```

**問題**: 5行目のエラーが「行 4」、8行目のエラーが「行 7」と表示されていた

---

## 原因

### 手動カウントの問題

```csharp
// Before（修正前）
csv.Read(); // 1行目
csv.Read(); // 2行目
csv.Read(); // 3行目
csv.ReadHeader();

int rowNumber = 4; // 固定値で開始

while (csv.Read()) {
    // ... 処理 ...
    rowNumber++; // 手動でインクリメント
}
```

**問題点**:
- `csv.ReadHeader()`の動作により、内部の行カウンタと手動カウンタがずれる
- 手動でカウントするとメンテナンスが困難

---

## 解決方法

### CsvHelperの行番号を直接取得

```csharp
// After（修正後）
csv.Read(); // 1行目
csv.Read(); // 2行目
csv.Read(); // 3行目
csv.ReadHeader();

while (csv.Read()) {
    // CsvHelperの現在の行番号を取得（CSVファイルの実際の行番号）
    int rowNumber = csv.Parser.Row;
    
    // ... 処理 ...
    // rowNumber++ は不要！
}
```

**利点**:
- ✅ CsvHelperが管理している実際の行番号を使用
- ✅ 手動でカウントする必要がない
- ✅ ずれが発生しない
- ✅ メンテナンスが楽

---

## csv.Parser.Row について

### プロパティの説明

```csharp
csv.Parser.Row
```

- **型**: `int`
- **値**: CSVファイルの現在の行番号（1始まり）
- **更新**: `csv.Read()`を呼ぶたびに自動的に増加

### 動作例

```csharp
csv.Read();  // 1行目を読む → csv.Parser.Row = 1
csv.Read();  // 2行目を読む → csv.Parser.Row = 2
csv.Read();  // 3行目を読む → csv.Parser.Row = 3
csv.ReadHeader(); // 3行目をヘッダーとして設定（csv.Parser.Row = 3のまま）

while (csv.Read()) {
    // 4行目を読む → csv.Parser.Row = 4
    // 5行目を読む → csv.Parser.Row = 5
    // ...
}
```

---

## 修正結果

### After（修正後）
```
行 4: 「日付」列に不正な文字があります（値: ああ）...
行 5: 「日付」列に不正な文字があります（値: いいい）...
行 8: 「コンテンツタイプ」列に不正な文字があります（値: い）...
```

**正しい行番号が表示されます！** ✅

---

## 適用箇所

3つすべてのインポートメソッドで修正しました：

### 1. ImportResultsCsv（通常INSERT）
```csharp
while (csv.Read()) {
    int rowNumber = csv.Parser.Row; // ← 追加
    // ...
}
```

### 2. ImportResultsCsvBulk（トランザクションバルク）
```csharp
while (csv.Read()) {
    int rowNumber = csv.Parser.Row; // ← 追加
    // ...
}
```

### 3. ImportResultsCsvBulkCopy（SqlBulkCopy）
```csharp
while (csv.Read()) {
    int rowNumber = csv.Parser.Row; // ← 追加
    // ...
}
```

---

## まとめ

| 項目 | Before | After |
|------|--------|-------|
| **行番号の取得方法** | 手動カウント | `csv.Parser.Row` |
| **精度** | ずれが発生 | 正確 |
| **メンテナンス性** | 低い | 高い |
| **コード量** | `int rowNumber = 4;`<br>`rowNumber++;` | `int rowNumber = csv.Parser.Row;` |

**結論**: `csv.Parser.Row`を使えば、常に正しい行番号が取得できます！

