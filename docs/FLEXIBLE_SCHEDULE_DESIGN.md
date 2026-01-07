# 柔軟な計画スケジュール システム設計書

## 目次
1. [背景と課題](#背景と課題)
2. [設計方針](#設計方針)
3. [データベース設計](#データベース設計)
4. [フロントエンド設計](#フロントエンド設計)
5. [バックエンド設計](#バックエンド設計)
6. [実績との突合ロジック](#実績との突合ロジック)
7. [移行計画](#移行計画)

---

## 背景と課題

### 現行システムの問題点

1. **固定的なヘッダー構造**
   - `contentTypeId`（1,2,3,4）が固定で、「廃プラ①」「汚泥①」「廃プラ②」のような命名
   - 日によって排出回数が異なる場合に対応できない（通常3回、特殊日5回など）

2. **実績データとの紐付け困難**
   - 実績データには`headerId`という概念がなく、`date + time + wasteType`のみ
   - 「廃プラ②」が何回目の廃プラなのかを時間で判断する必要があるが、現行設計では困難

3. **柔軟性の欠如**
   - 特殊な月（3ヶ月に1度、排出が5回ある日）に対応できない
   - 列の追加・削除が困難

### 要件

- **基本要件**
  - 種別は基本2種類（廃プラ、汚泥）
  - 通常は1日3回排出、特殊な日は5回排出
  - 計画では「横軸に時間順、縦軸に日付」を配置

- **実績との紐付け**
  - 実績は`date + time + wasteType`のみで記録される
  - 計画と実績を`date + wasteType + 時刻の近似`で突合する

---

## 設計方針

### コンセプト：「1セル = 1レコード」方式

従来の固定ヘッダー方式から、**動的スケジュール方式**に変更します。

#### 従来（AgTest.tsx）
```typescript
type MapedTestType = {
  date: string;
  contentA: testItem; // 固定
  contentB: testItem; // 固定
  contentC: testItem; // 固定
  contentD: testItem; // 固定
}
```

#### 新設計（FlexibleSchedule.tsx）
```typescript
type DailySchedule = {
  date: string;
  schedules: ScheduleItem[]; // 動的配列（1,2,3...N回）
}

type ScheduleItem = {
  wasteType: '廃プラ' | '汚泥'; // 種別
  companyId: number | null;
  vol: number | null;
  plannedTime: string | null; // 予定時刻
}
```

### メリット

1. ✅ 日によって排出回数を柔軟に変更可能
2. ✅ 種別を動的に追加可能
3. ✅ 実績との紐付けが容易（`date + time + wasteType`）
4. ✅ 将来的な拡張が容易（新しい種別の追加など）

---

## データベース設計

### テーブル構造

#### 1. t_plan_schedule_v2（計画スケジュールテーブル）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| scheduleId | INT (PK) | スケジュールID |
| year | INT | 年 |
| month | INT | 月 |
| version | INT | バージョン（0=最新、1以降=スナップショット） |
| date | DATE | 日付 |
| **scheduleOrder** | INT | その日の何回目か（1,2,3...） |
| **wasteType** | NVARCHAR(50) | 種別（'廃プラ', '汚泥'） |
| companyId | INT | 会社ID |
| vol | DECIMAL | 量 |
| plannedTime | TIME | 予定時刻 |
| note | NVARCHAR | 備考 |
| createdAt | DATETIME | 作成日時 |
| updatedAt | DATETIME | 更新日時 |

**UNIQUE制約**: `(year, month, version, date, scheduleOrder, wasteType)`

**ポイント**:
- `scheduleOrder`で「その日の何回目の排出か」を管理
- 同じ日に複数レコードを持つ（1レコード = 1回の排出）
- `wasteType`は文字列で柔軟に対応

#### 2. t_actual_result（実績テーブル）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| resultId | INT (PK) | 実績ID |
| date | DATE | 日付 |
| **actualTime** | TIME | 実際の時刻 |
| **wasteType** | NVARCHAR(50) | 種別 |
| companyId | INT | 会社ID |
| vol | DECIMAL | 量 |
| note | NVARCHAR | 備考 |

**ポイント**:
- `headerId`という概念はなし
- `date + actualTime + wasteType`で計画と紐付ける

#### 3. m_waste_type（種別マスタ）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| wasteTypeId | INT (PK) | 種別ID |
| wasteTypeName | NVARCHAR(50) | 種別名（'廃プラ', '汚泥'） |
| displayOrder | INT | 表示順 |
| isActive | BIT | 有効フラグ |

**初期データ**:
```sql
INSERT INTO m_waste_type VALUES ('廃プラ', 1, 1);
INSERT INTO m_waste_type VALUES ('汚泥', 2, 1);
```

#### 4. t_monthly_schedule_config（月次設定）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| configId | INT (PK) | 設定ID |
| year | INT | 年 |
| month | INT | 月 |
| maxScheduleCount | INT | その月の最大排出回数 |

**用途**: 画面の列数を決定するために使用

---

## フロントエンド設計

### コンポーネント: FlexibleSchedule.tsx

#### データ構造

```typescript
// 1日分のデータ
type DailySchedule = {
  date: string; // "2025-01-01"
  dayLabel: string; // "1日(月)"
  isHoliday: boolean;
  isSaturday: boolean;
  schedules: ScheduleItem[]; // 動的配列
  note: string;
}

// 1回の排出スケジュール
type ScheduleItem = {
  scheduleId?: number;
  wasteType: '廃プラ' | '汚泥' | null;
  companyId: number | null;
  vol: number | null;
  plannedTime: string | null; // "09:00"
}
```

#### AG Grid列定義（動的生成）

```typescript
const columnDefs = [
  { headerName: '日付', field: 'dayLabel' },
  // 動的に生成（maxScheduleCount分）
  { headerName: '1回目', children: [
    { headerName: '種別', field: 'schedules.0.wasteType' },
    { headerName: '会社', field: 'schedules.0.companyId' },
    { headerName: '量', field: 'schedules.0.vol' },
    { headerName: '時刻', field: 'schedules.0.plannedTime' },
  ]},
  { headerName: '2回目', children: [...] },
  { headerName: '3回目', children: [...] },
  // ... 必要な分だけ動的に追加
  { headerName: '備考', field: 'note' },
];
```

#### 保存処理（フラット化）

```typescript
// 2次元配列を1次元配列に変換
const flattenedData = updatedRows.flatMap(day => 
  day.schedules.map((schedule, index) => ({
    date: day.date,
    scheduleOrder: index + 1,
    wasteType: schedule.wasteType,
    companyId: schedule.companyId,
    vol: schedule.vol,
    plannedTime: schedule.plannedTime,
    year: currentYear,
    month: currentMonth,
  }))
).filter(item => item.wasteType !== null);
```

---

## バックエンド設計

### API エンドポイント

#### 1. 月次データ取得
```
GET /api/flexible-schedule/monthly/{year}/{month}?version=0
```

**レスポンス例**:
```json
[
  {
    "date": "2025-01-01",
    "schedules": [
      { "scheduleId": 1, "wasteType": "廃プラ", "companyId": 1, "vol": 100, "plannedTime": "09:00" },
      { "scheduleId": 2, "wasteType": "汚泥", "companyId": 2, "vol": 200, "plannedTime": "13:00" },
      { "scheduleId": 3, "wasteType": "廃プラ", "companyId": 1, "vol": 150, "plannedTime": "17:00" }
    ],
    "note": ""
  },
  {
    "date": "2025-01-02",
    "schedules": [...]
  }
]
```

#### 2. データ保存
```
POST /api/flexible-schedule/save
```

**リクエスト例**:
```json
[
  {
    "year": 2025,
    "month": 1,
    "date": "2025-01-01",
    "scheduleOrder": 1,
    "wasteType": "廃プラ",
    "companyId": 1,
    "vol": 100,
    "plannedTime": "09:00",
    "note": ""
  },
  ...
]
```

#### 3. バージョン作成
```
POST /api/flexible-schedule/create-version/{year}/{month}
```

---

## 実績との突合ロジック

### アルゴリズム

1. **基本マッチング**: `date + wasteType`で候補を抽出
2. **時刻マッチング**: 予定時刻に最も近い実績を選択
3. **遅延判定**: 時刻差によってステータスを判定

```sql
-- 計画と実績の突合ビュー
CREATE VIEW v_plan_actual_match AS
WITH RankedActual AS (
    SELECT 
        a.*,
        p.scheduleId,
        p.scheduleOrder,
        p.plannedTime,
        ABS(DATEDIFF(MINUTE, p.plannedTime, a.actualTime)) AS timeDiff,
        ROW_NUMBER() OVER (
            PARTITION BY p.scheduleId 
            ORDER BY ABS(DATEDIFF(MINUTE, p.plannedTime, a.actualTime))
        ) AS rn
    FROM t_plan_schedule_v2 p
    LEFT JOIN t_actual_result a ON 
        p.date = a.date AND 
        p.wasteType = a.wasteType
    WHERE p.version = 0
)
SELECT 
    scheduleId,
    date,
    scheduleOrder,
    wasteType,
    plannedTime,
    actualTime,
    timeDiff AS timeDifferenceMinutes,
    CASE 
        WHEN actualTime IS NULL THEN '未実施'
        WHEN timeDiff <= 10 THEN '計画通り'
        WHEN timeDiff <= 30 THEN '遅延（許容範囲）'
        ELSE '大幅遅延'
    END AS status
FROM RankedActual
WHERE rn = 1;
```

### 突合例

**計画データ**:
| date | scheduleOrder | wasteType | plannedTime |
|------|---------------|-----------|-------------|
| 2025-01-01 | 1 | 廃プラ | 09:00 |
| 2025-01-01 | 2 | 汚泥 | 13:00 |
| 2025-01-01 | 3 | 廃プラ | 17:00 |

**実績データ**:
| date | actualTime | wasteType |
|------|------------|-----------|
| 2025-01-01 | 09:10 | 廃プラ |
| 2025-01-01 | 13:05 | 汚泥 |
| 2025-01-01 | 17:15 | 廃プラ |

**突合結果**:
| scheduleOrder | wasteType | plannedTime | actualTime | status |
|---------------|-----------|-------------|------------|--------|
| 1 | 廃プラ | 09:00 | 09:10 | 計画通り |
| 2 | 汚泥 | 13:00 | 13:05 | 計画通り |
| 3 | 廃プラ | 17:00 | 17:15 | 遅延（許容範囲） |

---

## 移行計画

### フェーズ1: 並行稼働（推奨）

1. 新システム（FlexibleSchedule）を構築
2. 既存システム（AgTest）と並行して運用
3. データ整合性を確認

### フェーズ2: データ移行

既存データを新形式に変換するスクリプト:

```sql
-- 既存データ（AgTest形式）を新形式に変換
INSERT INTO t_plan_schedule_v2 (year, month, version, date, scheduleOrder, wasteType, companyId, vol, plannedTime)
SELECT 
    year,
    month,
    version,
    date,
    1 AS scheduleOrder,
    'contentTypeIdに応じた種別名' AS wasteType,
    company AS companyId,
    vol,
    time AS plannedTime
FROM t_plan -- 既存テーブル
WHERE contentTypeId = 1
UNION ALL
SELECT 
    year, month, version, date, 2, '種別名', company, vol, time
FROM t_plan
WHERE contentTypeId = 2
-- ... 他のcontentTypeIdも同様に変換
```

### フェーズ3: 切り替え

1. 新システムの安定稼働を確認
2. 旧システムを段階的に停止
3. ユーザートレーニング

---

## まとめ

### 新設計の利点

| 項目 | 従来 | 新設計 |
|------|------|--------|
| ヘッダー | 固定（contentTypeId 1,2,3,4） | 動的（scheduleOrder 1,2,3...N） |
| 排出回数 | 固定（日によらず同じ列数） | 柔軟（日ごとに異なる回数） |
| 種別管理 | ヘッダーに埋め込み（廃プラ①） | マスタ化（廃プラ、汚泥） |
| 実績突合 | 困難（headerIdの概念なし） | 容易（date+time+wasteType） |
| 拡張性 | 低い | 高い |

### 次のステップ

1. ✅ データベース作成（DDL実行）
2. ✅ バックエンドAPI実装
3. ✅ フロントエンド実装
4. ⬜ 単体テスト
5. ⬜ 結合テスト
6. ⬜ ユーザー受け入れテスト
7. ⬜ 本番移行

---

## ファイル一覧

### フロントエンド
- `frontend/src/pages/FlexibleSchedule.tsx` - メインコンポーネント
- `frontend/src/api/flexibleScheduleApi.ts` - API呼び出し

### バックエンド
- `backend/Controllers/FlexibleScheduleController.cs` - コントローラー
- `backend/Models/FlexibleSchedule.cs` - モデル
- `backend/Models/Repository/FlexibleScheduleRepository.cs` - リポジトリ

### データベース
- `database/flexible_schedule_ddl.sql` - テーブル定義

### ドキュメント
- `docs/FLEXIBLE_SCHEDULE_DESIGN.md` - 本設計書

