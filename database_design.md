# 上程機能のテーブル設計

## 命名規則について

本データベースでは、以下の命名規則に統一されています：

- **テーブル名**: PascalCase（複数形）
- **カラム名**: PascalCase（アンダースコアなし）
- **インデックス名**: `IX_` プレフィックス + テーブル名 + カラム名

詳細は `database_naming_convention.md` を参照してください。

## 1. Users テーブルの拡張

上程機能に必要な追加カラム：

```sql
-- Usersテーブルに追加するカラム
ALTER TABLE [dbo].[Users]
ADD [Email] nvarchar(255) NULL;        -- メールアドレス（上程通知などで使用）
ALTER TABLE [dbo].[Users]
ADD [Department] nvarchar(100) NULL;  -- 部署
ALTER TABLE [dbo].[Users]
ADD [Position] nvarchar(100) NULL;     -- 役職
```

## 2. 上程管理テーブル（Approvals）

上程フローにおいて 1 ユーザー（1 フロー）で 1 レコードを作成する設計：

```sql
CREATE TABLE [dbo].[Approvals] (
  [Id] int identity not null,
  [PageCode] int not null,            -- ページタイプコード（1: 複数レコード型, 2: 1レコード型）
  [ReportNo] nvarchar(50) null,       -- 報告書No（PageCode=2の場合は必須、PageCode=1の場合はnull可）
  [Year] int not null,                 -- 年
  [Month] int not null,               -- 月
  [UserName] nvarchar(100) not null,  -- 対象のユーザー名
  [FlowOrder] int not null,            -- フロー順序番号（0: 上程者, 1: 承認者1, 2: 承認者2, ...）
  [Status] int not null,               -- 状態番号（0: 上程済み, 1: 承認待ち, 2: 承認済み, 3: 差し戻し, 4: 取り戻し, 5: 完了, 6: 承認スキップ）
  [Comment] nvarchar(1000) null,        -- コメント
  [ActionDate] datetime null,          -- 上程or承認をした日付
  [CreatedAt] datetime default getdate() not null,
  [UpdatedAt] datetime default getdate() not null,
  primary key (Id)
);
```

### 既存テーブルの修正

既にテーブルが作成されている場合は、以下の SQL で修正してください：

```sql
-- UserNameカラムのサイズを変更
ALTER TABLE [dbo].[Approvals]
ALTER COLUMN [UserName] nvarchar(100) not null;

-- PageCodeカラムを追加（既存データはデフォルトで2を設定：1レコード型として扱う）
ALTER TABLE [dbo].[Approvals]
ADD [PageCode] int NOT NULL DEFAULT 2;

-- ReportNoカラムをNULL許可に変更（PageCode=1の場合はnull可）
ALTER TABLE [dbo].[Approvals]
ALTER COLUMN [ReportNo] nvarchar(50) NULL;
```

-- インデックス
CREATE INDEX [IX_Approvals_PageCode_Year_Month] ON [dbo].[Approvals]([PageCode], [Year], [Month]);
CREATE INDEX [IX_Approvals_PageCode_ReportNo_Year_Month] ON [dbo].[Approvals]([PageCode], [ReportNo], [Year], [Month]);
CREATE INDEX [IX_Approvals_UserName] ON [dbo].[Approvals]([UserName]);
CREATE INDEX [IX_Approvals_Status] ON [dbo].[Approvals]([Status]);

````

## 3. 報告書テーブル（Reports）

1レコードで完結する報告書データを管理するテーブル：

```sql
CREATE TABLE [dbo].[Reports] (
  [Id] int identity not null,
  [ReportNo] nvarchar(50) not null unique,  -- 報告書No（ユニーク制約）
  [Title] nvarchar(200) not null,           -- タイトル
  [Content] nvarchar(max) null,              -- 内容
  [CreatedAt] datetime default getdate() not null,
  [CreatedUser] nvarchar(100) null,        -- 作成者
  [UpdatedAt] datetime default getdate() not null,
  [UpdatedUser] nvarchar(100) null,        -- 更新者
  primary key (Id)
);

-- インデックス
CREATE INDEX [IX_Reports_ReportNo] ON [dbo].[Reports]([ReportNo]);
CREATE INDEX [IX_Reports_CreatedAt] ON [dbo].[Reports]([CreatedAt]);
````

### 状態管理について

報告書の状態は上程管理テーブル（Approvals）から取得します。
Reports テーブルには状態を保持しません。

## 4. コンテンツタイプ時間デフォルト値マスターテーブル（ContentTypeDefaultTimes）

新規作成モード時にカラムに初期値を設定するためのマスターテーブル：

```sql
CREATE TABLE [dbo].[ContentTypeDefaultTimes] (
  [Id] int identity not null,
  [ContentTypeId] int not null,            -- コンテンツタイプID
  [DayType] nvarchar(20) not null,         -- 曜日タイプ（'月': 月曜, '平': 平日, '祭': 祝日, '土': 土曜, '日': 日曜）
  [DefTime] nvarchar(10) null,             -- デフォルト時間（例: '09:00', '14:30'）
  [CreatedAt] datetime default getdate() not null,
  [UpdatedAt] datetime default getdate() not null,
  primary key (Id)
);

-- インデックス
CREATE INDEX [IX_ContentTypeDefaultTimes_ContentTypeId] ON [dbo].[ContentTypeDefaultTimes]([ContentTypeId]);
CREATE INDEX [IX_ContentTypeDefaultTimes_DayType] ON [dbo].[ContentTypeDefaultTimes]([DayType]);
CREATE UNIQUE INDEX [IX_ContentTypeDefaultTimes_ContentTypeId_DayType] ON [dbo].[ContentTypeDefaultTimes]([ContentTypeId], [DayType]);
```

### DayType（曜日タイプ）について

- **'月'**: 月曜日
- **'平'**: 平日（火曜〜金曜）
- **'祭'**: 祝日
- **'土'**: 土曜日
- **'日'**: 日曜日

### 初期データの INSERT 文

```sql
-- コンテンツタイプ1のデフォルト時間設定例
INSERT INTO [dbo].[ContentTypeDefaultTimes] ([ContentTypeId], [DayType], [DefTime])
VALUES
  (1, '月', '09:00'),
  (1, '平', '09:00'),
  (1, '祭', NULL),
  (1, '土', '10:00'),
  (1, '日', NULL);

-- コンテンツタイプ2のデフォルト時間設定例
INSERT INTO [dbo].[ContentTypeDefaultTimes] ([ContentTypeId], [DayType], [DefTime])
VALUES
  (2, '月', '10:00'),
  (2, '平', '10:00'),
  (2, '祭', NULL),
  (2, '土', '11:00'),
  (2, '日', NULL);

-- コンテンツタイプ3のデフォルト時間設定例
INSERT INTO [dbo].[ContentTypeDefaultTimes] ([ContentTypeId], [DayType], [DefTime])
VALUES
  (3, '月', '14:00'),
  (3, '平', '14:00'),
  (3, '祭', NULL),
  (3, '土', '15:00'),
  (3, '日', NULL);

-- コンテンツタイプ4のデフォルト時間設定例
INSERT INTO [dbo].[ContentTypeDefaultTimes] ([ContentTypeId], [DayType], [DefTime])
VALUES
  (4, '月', '16:00'),
  (4, '平', '16:00'),
  (4, '祭', NULL),
  (4, '土', '17:00'),
  (4, '日', NULL);
```

注意: 上記の INSERT 文は例です。実際の`ContentTypes`テーブルに存在する`ContentTypeId`に合わせて調整してください。

## 5. コンテンツタイプ数量デフォルト値マスターテーブル（ContentTypeDefaultVols）

新規作成モード時にカラムに初期値を設定するためのマスターテーブル：

```sql
CREATE TABLE [dbo].[ContentTypeDefaultVols] (
  [Id] int identity not null,
  [ContentTypeId] int not null,            -- コンテンツタイプID
  [DefVol] decimal(18, 2) null,            -- デフォルト数量
  [CreatedAt] datetime default getdate() not null,
  [UpdatedAt] datetime default getdate() not null,
  primary key (Id)
);

-- インデックス（ContentTypeIdにユニーク制約）
CREATE UNIQUE INDEX [IX_ContentTypeDefaultVols_ContentTypeId] ON [dbo].[ContentTypeDefaultVols]([ContentTypeId]);
```

### 初期データの INSERT 文

```sql
-- コンテンツタイプ1のデフォルト数量設定例
INSERT INTO [dbo].[ContentTypeDefaultVols] ([ContentTypeId], [DefVol])
VALUES (1, 100.00);

-- コンテンツタイプ2のデフォルト数量設定例
INSERT INTO [dbo].[ContentTypeDefaultVols] ([ContentTypeId], [DefVol])
VALUES (2, 200.00);

-- コンテンツタイプ3のデフォルト数量設定例
INSERT INTO [dbo].[ContentTypeDefaultVols] ([ContentTypeId], [DefVol])
VALUES (3, 300.00);

-- コンテンツタイプ4のデフォルト数量設定例
INSERT INTO [dbo].[ContentTypeDefaultVols] ([ContentTypeId], [DefVol])
VALUES (4, 400.00);
```

注意: 上記の INSERT 文は例です。実際の`ContentTypes`テーブルに存在する`ContentTypeId`に合わせて調整してください。

## 6. テーブル設計の説明

### ReportNo（報告書 No）について

- 報告書を識別するための番号
- 同じ報告書に対する上程フローは同じ ReportNo を使用
- Reports テーブルでユニーク制約

### FlowOrder（フロー順序）について

- 0: 上程者
- 1: 承認者 1
- 2: 承認者 2
- 3: 承認者 3
- ... の順序

### PageCode（ページタイプコード）について

- **1**: 複数レコード型ページ（例：計画書ページ）
  - `ReportNo`は`null`または空文字列で登録可能
  - 上程状態の取得は`PageCode`、`Year`、`Month`のみで行う
- **2**: 1 レコード型ページ（例：報告書ページ）
  - `ReportNo`は必須（そのページのテーブルの`ReportNo`を使用）
  - 上程状態の取得は`PageCode`、`ReportNo`、`Year`、`Month`で行う

### Status（状態番号）について

- 0: 上程済み（上程者が上程ボタンを押した状態）
- 1: 承認待ち（前の承認者が承認済みで、次の承認者の承認待ち）
- 2: 承認済み
- 3: 差し戻し
- 4: 取り戻し（上程者が取り戻した状態）
- 5: 完了（すべての承認が完了した状態）
- 6: 承認スキップ（後続の承認者が承認または差し戻ししたため、スキップされた状態）
- 7: 差し戻し対象（差し戻しされた上程者が再上程待ちの状態）

### データ例

```

報告書 No: RPT-2025-001
年: 2025
月: 10
上程者: ユーザー A
承認者: ユーザー B（1 番目）、ユーザー C（2 番目）

レコード 1: ReportNo='RPT-2025-001', Year=2025, Month=10, UserId=A, FlowOrder=0, Status=0, ActionDate=上程日時
レコード 2: ReportNo='RPT-2025-001', Year=2025, Month=10, UserId=B, FlowOrder=1, Status=1, ActionDate=NULL
レコード 3: ReportNo='RPT-2025-001', Year=2025, Month=10, UserId=C, FlowOrder=2, Status=1, ActionDate=NULL

```

承認者 B が承認した場合:

```

レコード 2: Status=2, ActionDate=承認日時
レコード 3: Status=1（次の承認者の承認待ち）

```

承認者 B が差し戻しした場合:

```

レコード 2: Status=3, Comment='差し戻し理由', ActionDate=差し戻し日時
レコード 3: Status=1（差し戻しにより保留）

```

上程者 A が取り戻した場合:

```

レコード 1: Status=4, ActionDate=取り戻し日時
レコード 2: Status=4
レコード 3: Status=4

```

## 6. 承認者追加時の処理

上程者が承認者を追加する場合:

- 同じ ReportNo で、新しい FlowOrder のレコードを追加
- 既存の承認フローが完了していない場合は、新しい承認者を最後に追加
- 既存の承認フローが完了している場合は、新しい承認フローとして追加
