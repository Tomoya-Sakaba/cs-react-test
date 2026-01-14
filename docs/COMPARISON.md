# 従来システムと新システムの比較

## 画面イメージの比較

### 従来システム（AgTest）

```
固定ヘッダー方式

日付      | 廃プラ① | 汚泥① | 廃プラ② | 廃プラ③
-----------------------------------------------------
1日(月)   | 会社A   | 会社B  | 会社A   | (空)
         | 100kg   | 200kg  | 150kg   |
         | 09:00   | 13:00  | 17:00   |
-----------------------------------------------------
2日(火)   | 会社B   | 会社A  | (空)    | (空)
         | 120kg   | 180kg  |         |
         | 10:00   | 14:00  |         |
```

**問題点**:
- ヘッダーが固定で「廃プラ②」「廃プラ③」などの命名が不自然
- 特殊な日（5回排出）に対応できない
- 空列が多く表示される
- 実績との紐付けが困難（「廃プラ②」が何回目かを時間で判断）

---

### 新システム（FlexibleSchedule）

```
動的ヘッダー方式

日付      | 1回目          | 2回目          | 3回目          | 4回目 | 5回目
------------------------------------------------------------------------
        | 種別|会社|量|時刻| 種別|会社|量|時刻| 種別|会社|量|時刻| ...
------------------------------------------------------------------------
1日(月)  | 廃プラ|A|100|09:00| 汚泥|B|200|13:00| 廃プラ|A|150|17:00|
2日(火)  | 汚泥|B|120|10:00| 廃プラ|A|180|14:00|
5日(金)  | 汚泥|A|100|08:00| 廃プラ|B|150|10:00| 汚泥|A|120|13:00| 廃プラ|B|180|15:00| 汚泥|A|200|17:00|
        （特殊日：5回排出）
```

**改善点**:
- ✅ 「1回目、2回目、3回目」と自然な命名
- ✅ 日によって排出回数を柔軟に変更可能
- ✅ 種別を各セルで選択可能（廃プラ/汚泥）
- ✅ 実績との紐付けが容易（時刻順で自動マッチング）

---

## データ構造の比較

### 従来システム（AgTest）

#### データベース
```sql
-- 1行 = 1日分のデータ（固定列）
CREATE TABLE t_plan (
    planId INT PRIMARY KEY,
    date DATE,
    contentTypeId1_company INT,
    contentTypeId1_vol DECIMAL,
    contentTypeId1_time TIME,
    contentTypeId2_company INT,
    contentTypeId2_vol DECIMAL,
    contentTypeId2_time TIME,
    contentTypeId3_company INT,
    contentTypeId3_vol DECIMAL,
    contentTypeId3_time TIME,
    contentTypeId4_company INT,
    contentTypeId4_vol DECIMAL,
    contentTypeId4_time TIME,
    ...
);
```

#### TypeScript
```typescript
type MapedTestType = {
  date: string;
  contentA: testItem; // 固定
  contentB: testItem; // 固定
  contentC: testItem; // 固定
  contentD: testItem; // 固定
}
```

**問題点**:
- ❌ 列数が固定で柔軟性がない
- ❌ NULL列が多く発生（空欄が多い）
- ❌ contentTypeIdと実際の種別の対応が不明確
- ❌ テーブル構造の変更が困難

---

### 新システム（FlexibleSchedule）

#### データベース
```sql
-- 1行 = 1回の排出（正規化）
CREATE TABLE t_plan_schedule_v2 (
    scheduleId INT PRIMARY KEY,
    date DATE,
    scheduleOrder INT,  -- 何回目か
    wasteType NVARCHAR(50),  -- 種別
    companyId INT,
    vol DECIMAL,
    plannedTime TIME,
    UNIQUE (date, scheduleOrder, wasteType)
);

-- サンプルデータ
INSERT INTO t_plan_schedule_v2 VALUES
    ('2025-01-01', 1, '廃プラ', 1, 100, '09:00'),
    ('2025-01-01', 2, '汚泥', 2, 200, '13:00'),
    ('2025-01-01', 3, '廃プラ', 1, 150, '17:00');
```

#### TypeScript
```typescript
type DailySchedule = {
  date: string;
  schedules: ScheduleItem[]; // 動的配列
}

type ScheduleItem = {
  wasteType: '廃プラ' | '汚泥';
  companyId: number;
  vol: number;
  plannedTime: string;
}
```

**改善点**:
- ✅ 正規化されたテーブル構造
- ✅ 動的に排出回数を変更可能
- ✅ NULL列が発生しない
- ✅ 種別をマスタ化（拡張が容易）
- ✅ テーブル構造の変更が不要

---

## 実績との突合の比較

### シナリオ
**計画**: 1月1日に廃プラを2回、汚泥を1回排出予定
**実績**: 実際に廃プラを2回、汚泥を1回排出（時刻が多少ずれている）

---

### 従来システム（AgTest）

#### 計画データ
```
date       | contentTypeId | company | vol | time
-------------------------------------------------
2025-01-01 | 2 (廃プラ①)   | 1       | 100 | 09:00
2025-01-01 | 4 (廃プラ②)   | 1       | 150 | 17:00
2025-01-01 | 1 (汚泥①)     | 2       | 200 | 13:00
```

#### 実績データ
```
date       | wasteType | actualTime
------------------------------------
2025-01-01 | 廃プラ    | 09:10
2025-01-01 | 廃プラ    | 17:15
2025-01-01 | 汚泥      | 13:05
```

#### 突合ロジック（困難）
```
問題: 実績の「廃プラ 09:10」が「廃プラ①」なのか「廃プラ②」なのかを
     どうやって判断するか？

→ contentTypeIdの概念が実績にないため、時刻で推測するしかない
→ エラーが発生しやすい（時刻が大幅にずれた場合）
```

---

### 新システム（FlexibleSchedule）

#### 計画データ
```
date       | scheduleOrder | wasteType | plannedTime
-----------------------------------------------------
2025-01-01 | 1             | 廃プラ    | 09:00
2025-01-01 | 2             | 汚泥      | 13:00
2025-01-01 | 3             | 廃プラ    | 17:00
```

#### 実績データ
```
date       | wasteType | actualTime
------------------------------------
2025-01-01 | 廃プラ    | 09:10
2025-01-01 | 汚泥      | 13:05
2025-01-01 | 廃プラ    | 17:15
```

#### 突合ロジック（容易）
```sql
-- 1. date + wasteType でフィルタ
-- 2. plannedTime に最も近い actualTime を選択

WITH RankedActual AS (
    SELECT 
        p.*,
        a.actualTime,
        ABS(DATEDIFF(MINUTE, p.plannedTime, a.actualTime)) AS timeDiff,
        ROW_NUMBER() OVER (
            PARTITION BY p.scheduleId 
            ORDER BY ABS(DATEDIFF(MINUTE, p.plannedTime, a.actualTime))
        ) AS rn
    FROM t_plan_schedule_v2 p
    LEFT JOIN t_actual_result a ON 
        p.date = a.date AND 
        p.wasteType = a.wasteType
)
SELECT * FROM RankedActual WHERE rn = 1;
```

#### 突合結果
```
scheduleOrder | wasteType | plannedTime | actualTime | timeDiff | status
---------------------------------------------------------------------------
1             | 廃プラ    | 09:00       | 09:10      | 10分     | 計画通り
2             | 汚泥      | 13:00       | 13:05      | 5分      | 計画通り
3             | 廃プラ    | 17:00       | 17:15      | 15分     | 遅延（許容範囲）
```

**改善点**:
- ✅ アルゴリズムが明確で理解しやすい
- ✅ 時刻のずれに強い（最も近い実績を自動選択）
- ✅ SQLで簡潔に記述可能

---

## 具体的な使用例

### ケース1: 通常の月（3回排出）

**従来**:
- 廃プラ①、汚泥①、廃プラ② の3列を表示
- 廃プラ③、廃プラ④ は空列として表示される

**新システム**:
- 1回目、2回目、3回目 の3列を表示
- 各セルで種別を選択（廃プラ/汚泥）

---

### ケース2: 特殊な月（5回排出の日がある）

**従来**:
- 対応不可（列数が固定のため）
- または、すべての日に廃プラ④、廃プラ⑤を表示（空列が増える）

**新システム**:
- 特殊な日だけ4回目、5回目の列を追加
- 通常の日は3列のみ表示

---

### ケース3: 新しい種別の追加（例: 「産廃」）

**従来**:
- テーブル構造を変更する必要がある
- contentTypeId5, contentTypeId6 を追加
- フロントエンドのコードも大幅に変更

**新システム**:
- m_waste_type に新しい種別を追加するだけ
```sql
INSERT INTO m_waste_type VALUES ('産廃', 3, 1);
```
- フロントエンドはマスタから自動取得（コード変更不要）

---

## パフォーマンスの比較

### データサイズ

**従来システム**（1ヶ月 = 30日の場合）:
```
レコード数: 30行（1日 = 1行）
列数: 固定（contentTypeId × 3フィールド = 12列程度）
NULL値: 多い（使われない列が多い）
```

**新システム**（1ヶ月 = 30日、1日平均3回排出の場合）:
```
レコード数: 90行（1回の排出 = 1行）
列数: 少ない（scheduleOrder, wasteType, companyId, vol, plannedTime = 5列）
NULL値: 少ない（実際に排出がある場合のみレコードが存在）
```

### インデックス効率

**従来システム**:
- date にインデックス
- contentTypeId は列名の一部なのでインデックス作成不可

**新システム**:
- date, wasteType, scheduleOrder にインデックス作成可能
- 実績との突合クエリが高速化

---

## データベース制約の比較

### 外部キー制約

**従来システム**:
- 外部キー制約あり（可能性）
- テーブル変更時にカスケード削除などの考慮が必要
- データ整合性はDB層で保証

**新システム**:
- **外部キー制約なし**
- テーブル変更が容易
- データ整合性はアプリケーション層で管理

**メリット**:
```sql
-- 従来：外部キー制約があると、マスタ削除時にエラー
DELETE FROM m_company WHERE companyId = 1;
-- ERROR: 外部キー制約違反

-- 新システム：外部キー制約がないため、柔軟に操作可能
-- ただし、アプリケーション側で論理削除を推奨
UPDATE m_company SET isActive = 0 WHERE companyId = 1;
```

---

## 結論

| 項目 | 従来システム | 新システム | 改善度 |
|------|-------------|-----------|--------|
| 柔軟性 | ★☆☆☆☆ | ★★★★★ | ⬆️⬆️⬆️⬆️ |
| 実績突合 | ★☆☆☆☆ | ★★★★★ | ⬆️⬆️⬆️⬆️ |
| 保守性 | ★★☆☆☆ | ★★★★★ | ⬆️⬆️⬆️⬆️ |
| 理解しやすさ | ★★☆☆☆ | ★★★★★ | ⬆️⬆️⬆️ |
| 拡張性 | ★☆☆☆☆ | ★★★★★ | ⬆️⬆️⬆️⬆️ |

**新システムへの移行を強く推奨します。**

