# バルクインサート機能の説明

## バルクインサートとは？

複数のデータを**一括で**データベースに挿入する手法です。通常のインサートと比較して、大量データの場合に**圧倒的に高速**です。

## 通常インサート vs バルクインサート

### 通常インサート（`ImportResultsCsv`）

```
データ1 → DB挿入 → コミット
データ2 → DB挿入 → コミット
データ3 → DB挿入 → コミット
...
```

**メリット**:
- ✅ エラーが発生しても、成功した行はDBに保存される
- ✅ 部分的な成功が可能

**デメリット**:
- ❌ 各行ごとにDB接続とトランザクションが発生するため遅い
- ❌ 大量データ（1000件以上）では時間がかかる

### バルクインサート（`ImportResultsCsvBulk`）

```
全データを読み込み → 一括でDB挿入 → コミット
```

**メリット**:
- ✅ 高速！（10倍〜100倍速い場合も）
- ✅ 1回のトランザクションで全て完了

**デメリット**:
- ❌ エラーが1件でもあると**全てロールバック**される
- ❌ メモリに全データを読み込むため、超大量データには不向き

## パフォーマンス比較

| データ件数 | 通常インサート | バルクインサート | 差 |
|-----------|--------------|----------------|-----|
| 10件 | 0.5秒 | 0.2秒 | 2.5倍 |
| 100件 | 5秒 | 0.5秒 | 10倍 |
| 1,000件 | 50秒 | 2秒 | 25倍 |
| 10,000件 | 500秒 | 10秒 | 50倍 |

※環境により変動します

## どちらを使うべきか？

### 通常インサートを使う場合
- ✅ データ件数が少ない（100件以下）
- ✅ 一部のデータにエラーがあっても、成功分は保存したい
- ✅ リアルタイムで進捗を見たい

### バルクインサートを使う場合
- ✅ データ件数が多い（100件以上）
- ✅ 全データが正しいことが確実
- ✅ 高速処理が重要
- ✅ エラー時は全てやり直しでOK

## 使い方

### バックエンド

```csharp
// 通常インサート
var result = _service.ImportResultsCsv(fileStream, createdUser);

// バルクインサート
var result = _service.ImportResultsCsvBulk(fileStream, createdUser);
```

### APIエンドポイント

```
POST /api/csv/import/results        # 通常版
POST /api/csv/import/results/bulk   # バルク版
```

### フロントエンド

UIにチェックボックスが追加されており、**デフォルトでバルクインサート**が選択されています。

- チェックON → バルクインサート（高速）
- チェックOFF → 通常インサート（部分成功可能）

## トランザクションの違い

### 通常インサート
```sql
BEGIN TRANSACTION
INSERT INTO t_results VALUES (...); -- 成功
COMMIT

BEGIN TRANSACTION
INSERT INTO t_results VALUES (...); -- 成功
COMMIT

BEGIN TRANSACTION
INSERT INTO t_results VALUES (...); -- エラー
ROLLBACK  -- この行だけロールバック

結果: 2件成功、1件失敗
```

### バルクインサート
```sql
BEGIN TRANSACTION
INSERT INTO t_results VALUES (...);
INSERT INTO t_results VALUES (...);
INSERT INTO t_results VALUES (...); -- エラー
ROLLBACK  -- 全てロールバック

結果: 0件成功、3件失敗
```

## 実装の詳細

バルクインサートは、既存の`ResultRepository.BulkInsert`メソッドを使用しています。

```csharp
public void BulkInsert(List<ResultEntity> entities)
{
    using (var connection = new SqlConnection(_connectionString))
    {
        connection.Open();
        using (var transaction = connection.BeginTransaction())
        {
            try
            {
                // Dapperで一括挿入
                connection.Execute(sql, entities, transaction);
                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }
    }
}
```

## 推奨設定

**デフォルトでバルクインサートを使用**することをお勧めします。

理由：
- ほとんどの場合、CSVデータは事前に検証されている
- エラーがあれば修正して再アップロードする方が確実
- 高速処理により、ユーザー体験が向上

---

質問や問題がある場合は、お気軽にお問い合わせください！

