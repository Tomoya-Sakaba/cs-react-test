# 柔軟な計画スケジュールシステム

**新しい設計による、排出計画と実績の柔軟な管理システム**

---

## 📖 概要

このシステムは、廃プラや汚泥などの排出計画を柔軟に管理し、実績データと容易に突合できるように設計された新システムです。

従来の固定ヘッダー方式（`contentTypeId` 1,2,3,4）から、動的スケジュール方式（`scheduleOrder` 1,2,3...N）に変更することで、以下の課題を解決します:

- ✅ 日によって排出回数が異なる場合に対応（通常3回、特殊日5回など）
- ✅ 実績データとの紐付けが容易（`date + time + wasteType`で自動マッチング）
- ✅ 種別を柔軟に管理（マスタ化により拡張が容易）
- ✅ 直感的なUI（「1回目、2回目、3回目」という自然な命名）

---

## 🗂️ ドキュメント構成

| ファイル | 説明 |
|---------|------|
| **[FLEXIBLE_SCHEDULE_DESIGN.md](./FLEXIBLE_SCHEDULE_DESIGN.md)** | 📋 詳細な設計書（データベース、フロント、バックエンド） |
| **[COMPARISON.md](./COMPARISON.md)** | 🔄 従来システムとの比較 |
| **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** | 🚀 実装手順とトラブルシューティング |

---

## 🏗️ システム構成

### フロントエンド
- **React** + **TypeScript**
- **AG Grid** (データグリッド)
- **Axios** (API呼び出し)

### バックエンド
- **.NET Framework** (C#)
- **Web API**
- **Dapper** (ORM)

### データベース
- **SQL Server**
- 正規化されたテーブル設計

---

## 📁 ファイル一覧

### フロントエンド
```
frontend/src/
├── pages/
│   └── FlexibleSchedule.tsx          # メイン画面コンポーネント
└── api/
    └── flexibleScheduleApi.ts        # API呼び出し関数
```

### バックエンド
```
backend/
├── Controllers/
│   └── FlexibleScheduleController.cs # APIコントローラー
└── Models/
    ├── FlexibleSchedule.cs           # モデル定義
    └── Repository/
        └── FlexibleScheduleRepository.cs # データアクセス層
```

### データベース
```
database/
└── flexible_schedule_ddl.sql         # テーブル定義・初期データ
```

### ドキュメント
```
docs/
├── FLEXIBLE_SCHEDULE_README.md       # このファイル
├── FLEXIBLE_SCHEDULE_DESIGN.md       # 詳細設計書
├── COMPARISON.md                     # 従来システムとの比較
└── IMPLEMENTATION_GUIDE.md           # 実装ガイド
```

---

## 🎯 主要機能

### 1. 柔軟な計画管理
- 日ごとに排出回数を変更可能（1回～N回）
- 各セルで種別（廃プラ/汚泥）を選択
- 会社、量、時刻を入力

### 2. バージョン管理
- 計画のスナップショットを作成
- 過去のバージョンを参照可能

### 3. 実績との突合
- 計画と実績を自動マッチング
- 遅延状況を判定（計画通り/遅延/大幅遅延）

### 4. 直感的なUI
- AG Gridによる高速なデータ編集
- 編集モードの切り替え
- 列の動的追加

---

## 🚀 クイックスタート

### 1. データベースのセットアップ

```sql
-- DDLを実行
sqlcmd -S localhost -d YourDatabase -i database/flexible_schedule_ddl.sql
```

### 2. バックエンドの起動

```bash
cd backend
dotnet build
dotnet run
```

### 3. フロントエンドの起動

```bash
cd frontend
npm install
npm run dev
```

### 4. ブラウザでアクセス

```
http://localhost:YOUR_PORT/flexible-schedule
```

詳細な手順は [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) を参照してください。

---

## 📊 データ構造

### 計画データ（1レコード = 1回の排出）

```sql
CREATE TABLE t_plan_schedule_v2 (
    scheduleId INT PRIMARY KEY,
    date DATE,
    scheduleOrder INT,        -- その日の何回目か
    wasteType NVARCHAR(50),   -- 種別（廃プラ/汚泥）
    companyId INT,
    vol DECIMAL,
    plannedTime TIME,
    ...
);
```

### 実績データ

```sql
CREATE TABLE t_actual_result (
    resultId INT PRIMARY KEY,
    date DATE,
    actualTime TIME,
    wasteType NVARCHAR(50),
    companyId INT,
    vol DECIMAL,
    ...
);
```

### 突合ロジック

計画と実績を `date + wasteType` でフィルタし、`plannedTime` に最も近い `actualTime` を選択することで自動マッチングします。

詳細は [FLEXIBLE_SCHEDULE_DESIGN.md#実績との突合ロジック](./FLEXIBLE_SCHEDULE_DESIGN.md#実績との突合ロジック) を参照してください。

---

## 🎨 画面イメージ

```
日付      | 1回目          | 2回目          | 3回目          | 4回目 | 5回目
------------------------------------------------------------------------
        | 種別|会社|量|時刻| 種別|会社|量|時刻| 種別|会社|量|時刻| ...
------------------------------------------------------------------------
1日(月)  | 廃プラ|A|100|09:00| 汚泥|B|200|13:00| 廃プラ|A|150|17:00|
2日(火)  | 汚泥|B|120|10:00| 廃プラ|A|180|14:00|
5日(金)  | 汚泥|A|100|08:00| 廃プラ|B|150|10:00| 汚泥|A|120|13:00| 廃プラ|B|180|15:00| 汚泥|A|200|17:00|
        （特殊日：5回排出）
```

---

## 💡 従来システムとの主な違い

| 項目 | 従来（AgTest） | 新設計（FlexibleSchedule） |
|------|----------------|---------------------------|
| ヘッダー | 固定（廃プラ①、汚泥①、廃プラ②） | 動的（1回目、2回目、3回目...） |
| 排出回数 | 固定（全日同じ列数） | 柔軟（日ごとに変更可能） |
| 種別管理 | ヘッダーに埋め込み | マスタ化（各セルで選択） |
| 実績突合 | 困難（headerIdなし） | 容易（date+time+wasteType） |
| 拡張性 | 低い | 高い |

詳細な比較は [COMPARISON.md](./COMPARISON.md) を参照してください。

---

## 🧪 テスト

### 単体テスト

```bash
# バックエンド
cd backend
dotnet test

# フロントエンド
cd frontend
npm run test
```

### E2Eテスト

```bash
cd frontend
npm run test:e2e
```

---

## 🔧 トラブルシューティング

よくある問題と解決策は [IMPLEMENTATION_GUIDE.md#トラブルシューティング](./IMPLEMENTATION_GUIDE.md#トラブルシューティング) を参照してください。

---

## 📈 今後の拡張予定

- [ ] PDF出力機能の実装
- [ ] 承認ワークフローの統合
- [ ] 実績データの自動取り込み
- [ ] ダッシュボード機能
- [ ] モバイル対応

---

## 👥 貢献者

- 開発チーム
- 設計レビュー担当者

---

## 📝 ライセンス

社内システムのため、非公開

---

## 📞 サポート

質問やサポートが必要な場合は、開発チームにお問い合わせください。

---

## 🎉 まとめ

この新システムは、以下の利点を提供します:

1. **柔軟性**: 日によって排出回数を自由に変更可能
2. **正確性**: 実績との突合が自動化され、ミスが減少
3. **保守性**: マスタ化により、種別の追加が容易
4. **直感性**: 「1回目、2回目」という自然な表現で理解しやすい
5. **拡張性**: 将来的な機能追加が容易

**ぜひ新システムへの移行をご検討ください！**

