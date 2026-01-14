# 廃棄物排出計画スケジュールシステム 設計書

## 概要

種別ベースヘッダー方式による廃棄物排出計画管理システム。
ヘッダーは「廃プラ①」「汚泥①」「廃プラ②」のように種別名で表示し、月ごとに通常日用・特殊日用のヘッダー構成を管理します。

---

## 📋 要件

### 1. ヘッダー表示
- ✅ 種別ベース：「廃プラ①」「汚泥①」「廃プラ②」
- ✅ 月ごとに定義：通常日と特殊日で異なるヘッダー
- ✅ 柔軟な構成：種別の並び順や回数を自由に設定可能

### 2. 通常日と特殊日の切り替え
- ✅ 通常日モード：基本の排出パターン（例：廃プラ②、汚泥①、廃プラ②）
- ✅ 特殊日モード：3ヶ月に1度の特殊パターン（例：汚泥③、廃プラ②、汚泥③など）
- ✅ ボタンで切り替え：画面上部のモード切替ボタン
- ✅ 該当日表示：特殊日は黄色背景で表示

### 3. 実績との突合
- ✅ 紐付けロジック：`date + wasteType + typeSequence`（種別内の順序）
- ✅ 自動マッチング：実績を時刻順に並べて、種別内の順序を算出
- ✅ 遅延判定：計画通り/遅延/大幅遅延

---

## 🗄️ データベース設計

### テーブル構成

```
v2_t_header_definition     ヘッダー定義テーブル
    ├─ 通常日用ヘッダー (isSpecialDay = 0)
    └─ 特殊日用ヘッダー (isSpecialDay = 1)

v2_t_plan_data             計画データテーブル
    └─ headerId で v2_t_header_definition を参照

v2_t_actual_data           実績データテーブル
    └─ headerIdという概念はなし
```

### 1. v2_t_header_definition（ヘッダー定義テーブル）

| カラム | 型 | 説明 |
|-------|-----|------|
| headerId | INT (PK) | ヘッダーID |
| year | INT | 年 |
| month | INT | 月 |
| version | INT | バージョン（0=最新） |
| **isSpecialDay** | BIT | 0=通常日用、1=特殊日用 |
| **headerOrder** | INT | ヘッダーの表示順序（1,2,3...） |
| **wasteType** | NVARCHAR(50) | 種別（'廃プラ', '汚泥'） |
| **typeSequence** | INT | その種別の何回目か |
| **displayName** | NVARCHAR(100) | 表示名（'廃プラ①', '汚泥②'） |

#### サンプルデータ（2025年1月）

**通常日用ヘッダー**:
```sql
INSERT INTO v2_t_header_definition VALUES
    (2025, 1, 0, 0, 1, '廃プラ', 1, '廃プラ①'),
    (2025, 1, 0, 0, 2, '汚泥', 1, '汚泥①'),
    (2025, 1, 0, 0, 3, '廃プラ', 2, '廃プラ②');
```

**特殊日用ヘッダー**:
```sql
INSERT INTO v2_t_header_definition VALUES
    (2025, 1, 0, 1, 1, '汚泥', 1, '汚泥①'),
    (2025, 1, 0, 1, 2, '廃プラ', 1, '廃プラ①'),
    (2025, 1, 0, 1, 3, '汚泥', 2, '汚泥②'),
    (2025, 1, 0, 1, 4, '廃プラ', 2, '廃プラ②'),
    (2025, 1, 0, 1, 5, '汚泥', 3, '汚泥③');
```

### 2. v2_t_plan_data（計画データテーブル）

| カラム | 型 | 説明 |
|-------|-----|------|
| planId | INT (PK) | 計画ID |
| year | INT | 年 |
| month | INT | 月 |
| version | INT | バージョン |
| date | DATE | 日付 |
| **isSpecialDay** | BIT | その日が特殊日かどうか |
| **headerId** | INT | ヘッダーID（外部キー制約なし） |
| **wasteType** | NVARCHAR(50) | 種別 |
| **typeSequence** | INT | 種別内の順序 |
| companyId | INT | 会社ID |
| vol | DECIMAL | 量 |
| plannedTime | TIME | 予定時刻 |
| note | NVARCHAR | 備考 |

#### サンプルデータ（2025年1月1日：通常日）
```sql
INSERT INTO v2_t_plan_data VALUES
    (2025, 1, 0, '2025-01-01', 0, 1, '廃プラ', 1, 1, 100, '09:00', ''),
    (2025, 1, 0, '2025-01-01', 0, 2, '汚泥', 1, 2, 200, '13:00', ''),
    (2025, 1, 0, '2025-01-01', 0, 3, '廃プラ', 2, 1, 150, '17:00', '');
```

#### サンプルデータ（2025年1月5日：特殊日）
```sql
INSERT INTO v2_t_plan_data VALUES
    (2025, 1, 0, '2025-01-05', 1, 4, '汚泥', 1, 1, 100, '08:00', '特殊日'),
    (2025, 1, 0, '2025-01-05', 1, 5, '廃プラ', 1, 2, 150, '10:00', ''),
    (2025, 1, 0, '2025-01-05', 1, 6, '汚泥', 2, 1, 120, '13:00', ''),
    (2025, 1, 0, '2025-01-05', 1, 7, '廃プラ', 2, 2, 180, '15:00', ''),
    (2025, 1, 0, '2025-01-05', 1, 8, '汚泥', 3, 1, 200, '17:00', '');
```

### 3. v2_t_actual_data（実績データテーブル）

| カラム | 型 | 説明 |
|-------|-----|------|
| actualId | INT (PK) | 実績ID |
| date | DATE | 日付 |
| **actualTime** | TIME | 実際の時刻 |
| **wasteType** | NVARCHAR(50) | 種別 |
| companyId | INT | 会社ID |
| vol | DECIMAL | 量 |
| note | NVARCHAR | 備考 |

**ポイント**: `headerId`や`typeSequence`は持たない。時刻順に並べて自動算出。

---

## 🔗 実績との突合ロジック

### アルゴリズム

```sql
-- 1. 実績データに種別内の順序（typeSequence）を付与
WITH RankedActual AS (
    SELECT 
        date,
        wasteType,
        actualTime,
        ROW_NUMBER() OVER (
            PARTITION BY date, wasteType 
            ORDER BY actualTime
        ) AS typeSequence
    FROM v2_t_actual_data
)

-- 2. 計画データと結合（date + wasteType + typeSequence）
SELECT 
    p.date,
    p.wasteType,
    p.typeSequence,
    p.plannedTime,
    a.actualTime,
    CASE 
        WHEN a.actualTime IS NULL THEN '未実施'
        WHEN ABS(DATEDIFF(MINUTE, p.plannedTime, a.actualTime)) <= 10 THEN '計画通り'
        WHEN ABS(DATEDIFF(MINUTE, p.plannedTime, a.actualTime)) <= 30 THEN '遅延（許容範囲）'
        ELSE '大幅遅延'
    END AS status
FROM v2_t_plan_data p
LEFT JOIN RankedActual a ON 
    p.date = a.date AND 
    p.wasteType = a.wasteType AND 
    p.typeSequence = a.typeSequence
```

### 突合例

**計画データ（2025年1月1日）**:
| wasteType | typeSequence | plannedTime |
|-----------|--------------|-------------|
| 廃プラ    | 1            | 09:00       |
| 汚泥      | 1            | 13:00       |
| 廃プラ    | 2            | 17:00       |

**実績データ（2025年1月1日）**:
| wasteType | actualTime |
|-----------|------------|
| 廃プラ    | 09:10      |
| 廃プラ    | 17:15      |
| 汚泥      | 13:05      |

**実績に順序を付与**:
| wasteType | typeSequence | actualTime |
|-----------|--------------|------------|
| 廃プラ    | 1            | 09:10      |
| 廃プラ    | 2            | 17:15      |
| 汚泥      | 1            | 13:05      |

**突合結果**:
| wasteType | typeSequence | plannedTime | actualTime | status |
|-----------|--------------|-------------|------------|--------|
| 廃プラ    | 1            | 09:00       | 09:10      | 計画通り |
| 汚泥      | 1            | 13:00       | 13:05      | 計画通り |
| 廃プラ    | 2            | 17:00       | 17:15      | 遅延（許容範囲） |

---

## 🎨 フロントエンド設計

### コンポーネント: WasteSchedule.tsx

#### データ構造

```typescript
// ヘッダー定義
type HeaderDefinition = {
  headerId: number;
  headerOrder: number;
  wasteType: string;
  typeSequence: number;
  displayName: string; // '廃プラ①', '汚泥②'
};

// 1日分のデータ
type DailyPlan = {
  date: string;
  isSpecialDay: boolean;
  plans: PlanCell[]; // ヘッダー定義の順序に対応
  note: string;
};

// 1つのセル
type PlanCell = {
  headerId: number;
  wasteType: string;
  typeSequence: number;
  companyId: number | null;
  vol: number | null;
  plannedTime: string | null;
};
```

#### 画面レイアウト

```
┌─────────────────────────────────────────────┐
│ [保存] [通常日モード/特殊日モード]  編集モード │
├─────────────────────────────────────────────┤
│ 年月選択: [2025年] [1月]                    │
├─────────────────────────────────────────────┤
│ ヘッダー: [廃プラ①] [汚泥①] [廃プラ②]       │
├─────────────────────────────────────────────┤
│ AG Grid                                     │
│ ┌──────┬────────┬────────┬────────┐       │
│ │日付  │廃プラ① │汚泥①  │廃プラ② │       │
│ ├──────┼────────┼────────┼────────┤       │
│ │1日(月)│会社 量 時│会社 量 時│会社 量 時│       │
│ │2日(火)│会社 量 時│会社 量 時│会社 量 時│       │
│ │5日(金)│  特殊日表示（黄色背景）    │       │
│ └──────┴────────┴────────┴────────┘       │
└─────────────────────────────────────────────┘
```

#### モード切り替え

- **通常日モード**: 通常日用ヘッダーで全データを表示
- **特殊日モード**: 特殊日用ヘッダーで全データを表示
- 各日の`isSpecialDay`フラグに関わらず、選択したモードのヘッダーが適用される
- 実際の保存時は各日の`isSpecialDay`に基づいて正しいheaderIdが設定される

---

## ⚙️ バックエンド設計

### API エンドポイント

#### 1. ヘッダー定義取得
```
GET /api/waste-schedule/header-definition/{year}/{month}?isSpecialDay=0
```

**レスポンス**:
```json
[
  { "headerId": 1, "headerOrder": 1, "wasteType": "廃プラ", "typeSequence": 1, "displayName": "廃プラ①" },
  { "headerId": 2, "headerOrder": 2, "wasteType": "汚泥", "typeSequence": 1, "displayName": "汚泥①" },
  { "headerId": 3, "headerOrder": 3, "wasteType": "廃プラ", "typeSequence": 2, "displayName": "廃プラ②" }
]
```

#### 2. 月次計画データ取得
```
GET /api/waste-schedule/monthly/{year}/{month}?version=0
```

**レスポンス**:
```json
[
  {
    "date": "2025-01-01",
    "isSpecialDay": false,
    "plans": [
      { "planId": 1, "headerId": 1, "wasteType": "廃プラ", "typeSequence": 1, "companyId": 1, "vol": 100, "plannedTime": "09:00" },
      { "planId": 2, "headerId": 2, "wasteType": "汚泥", "typeSequence": 1, "companyId": 2, "vol": 200, "plannedTime": "13:00" },
      { "planId": 3, "headerId": 3, "wasteType": "廃プラ", "typeSequence": 2, "companyId": 1, "vol": 150, "plannedTime": "17:00" }
    ],
    "note": ""
  }
]
```

#### 3. データ保存
```
POST /api/waste-schedule/save
```

**リクエスト**:
```json
[
  {
    "year": 2025,
    "month": 1,
    "date": "2025-01-01",
    "isSpecialDay": false,
    "headerId": 1,
    "wasteType": "廃プラ",
    "typeSequence": 1,
    "companyId": 1,
    "vol": 100,
    "plannedTime": "09:00",
    "note": ""
  }
]
```

---

## 📊 画面遷移

### 通常フロー

```
1. 年月選択
   ↓
2. ヘッダー定義を取得（通常日用・特殊日用の両方）
   ↓
3. 月次計画データを取得
   ↓
4. 通常日モードで表示（デフォルト）
   ↓
5. 必要に応じて特殊日モードに切り替え
   ↓
6. 編集モードON → データ入力
   ↓
7. 保存
```

### 特殊日の扱い

- **データ保存時**: 各日の`isSpecialDay`フラグを確認し、適切な`headerId`を設定
- **画面表示時**: モード切り替えボタンでヘッダーを変更（全日に適用）
- **実績突合時**: `typeSequence`に基づいて自動マッチング

---

## 🚀 実装手順

### 1. データベース
```bash
# v2_ プレフィックス付きテーブルを作成
sqlcmd -S localhost -d YourDatabase -i database/flexible_schedule_v3_ddl.sql
```

### 2. バックエンド
- ✅ `backend/Models/WasteSchedule.cs`
- ✅ `backend/Models/Repository/WasteScheduleRepository.cs`
- ✅ `backend/Controllers/WasteScheduleController.cs`

### 3. フロントエンド
- ✅ `frontend/src/pages/WasteSchedule.tsx`
- ✅ `frontend/src/api/wasteScheduleApi.ts`
- ✅ `frontend/src/routes/Router.tsx` にルート追加

### 4. 動作確認
```
http://localhost:YOUR_PORT/waste-schedule
```

---

## 💡 今後の拡張

- [ ] ヘッダー定義の画面上での編集機能
- [ ] 特殊日の自動判定（日付指定など）
- [ ] 実績データの自動取り込み
- [ ] 突合結果のビジュアル表示
- [ ] PDF出力機能

---

## 📝 まとめ

### メリット

1. **種別ベースの直感的なヘッダー**: 「廃プラ①」「汚泥①」のように分かりやすい
2. **柔軟なヘッダー構成**: 月ごとに通常日・特殊日のヘッダーを自由に定義
3. **モード切り替え**: ボタン1つで通常日⇔特殊日のヘッダーを切り替え
4. **実績との突合が容易**: `date + wasteType + typeSequence`で自動マッチング
5. **拡張性**: 新しい種別や回数の追加が容易

### 従来システムとの違い

| 項目 | 従来 | 新システム |
|------|------|-----------|
| ヘッダー | 固定（1回目、2回目） | 種別ベース（廃プラ①、汚泥①） |
| 特殊日対応 | なし | モード切り替えで対応 |
| ヘッダー管理 | コード内で固定 | DBで月ごとに定義 |
| 実績突合 | 困難 | 自動マッチング |

---

## 📞 サポート

ご質問やサポートが必要な場合は、開発チームにお問い合わせください。

