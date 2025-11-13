# 上程機能のテーブル設計

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
  [ReportNo] nvarchar(50) not null,  -- 報告書No
  [Year] int not null,                 -- 年
  [Month] int not null,               -- 月
  [UserName] nvarchar(100) not null,  -- 対象のユーザー名
  [FlowOrder] int not null,            -- フロー順序番号（0: 上程者, 1: 承認者1, 2: 承認者2, ...）
  [Status] int not null,               -- 状態番号（0: 上程済み, 1: 承認待ち, 2: 承認済み, 3: 差し戻し, 4: 取り戻し）
  [Comment] nvarchar(1000) null,        -- コメント
  [ActionDate] datetime null,          -- 上程or承認をした日付
  [Created_At] datetime default getdate() not null,
  [Updated_At] datetime default getdate() not null,
  primary key (Id)
);
```

### 既存テーブルの修正（UserName カラムのサイズを変更）

既にテーブルが作成されている場合は、以下の SQL で修正してください：

```sql
-- UserNameカラムのサイズを変更
ALTER TABLE [dbo].[Approvals]
ALTER COLUMN [UserName] nvarchar(100) not null;
```

-- インデックス
CREATE INDEX [IX_Approvals_ReportNo] ON [dbo].[Approvals]([ReportNo]);
CREATE INDEX [IX_Approvals_YearMonth] ON [dbo].[Approvals]([Year], [Month]);
CREATE INDEX [IX_Approvals_UserName] ON [dbo].[Approvals]([UserName]);
CREATE INDEX [IX_Approvals_Status] ON [dbo].[Approvals]([Status]);

```

## 3. テーブル設計の説明

### ReportNo（報告書 No）について

- 報告書を識別するための番号
- 同じ報告書に対する上程フローは同じ ReportNo を使用

### FlowOrder（フロー順序）について

- 0: 上程者
- 1: 承認者 1
- 2: 承認者 2
- 3: 承認者 3
- ... の順序

### Status（状態番号）について

- 0: 上程済み（上程者が上程ボタンを押した状態）
- 1: 承認待ち（前の承認者が承認済みで、次の承認者の承認待ち）
- 2: 承認済み
- 3: 差し戻し
- 4: 取り戻し（上程者が取り戻した状態）
- 5: 完了（すべての承認が完了した状態）
- 6: 承認スキップ（後続の承認者が承認または差し戻ししたため、スキップされた状態）

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

## 4. 承認者追加時の処理

上程者が承認者を追加する場合:

- 同じ ReportNo で、新しい FlowOrder のレコードを追加
- 既存の承認フローが完了していない場合は、新しい承認者を最後に追加
- 既存の承認フローが完了している場合は、新しい承認フローとして追加
```
