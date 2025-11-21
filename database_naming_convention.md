# データベース命名規則の統一案（スネークケース版）

## 統一命名規則

全てのテーブル名・カラム名を**スネークケース（小文字 + アンダースコア）**に統一します。

### テーブル名の統一

すべてのテーブル名をスネークケース（複数形）に統一：

| 現在の名前               | 新しい名前                   | 説明                       |
| ------------------------ | ---------------------------- | -------------------------- |
| `Users`                  | `users`                      | スネークケース、複数形     |
| `Approvals`              | `approvals`                  | スネークケース、複数形     |
| `Reports`                | `reports`                    | スネークケース、複数形     |
| `ContentTypeDefaultTime` | `content_type_default_times` | スネークケース、複数形     |
| `ContentTypeDefaultVol`  | `content_type_default_vols`  | スネークケース、複数形     |
| `t_plan`                 | `plans`                      | プレフィックス削除、複数形 |
| `note`                   | `notes`                      | 複数形に統一               |
| `content_type`           | `content_types`              | 複数形に統一               |
| `plan_version_snapshot`  | `plan_version_snapshots`     | 複数形に統一               |
| `Posts`                  | `posts`                      | スネークケース、複数形     |

### カラム名の統一

すべてのカラム名をスネークケースに統一：

| 現在の名前      | 新しい名前        | 説明                 |
| --------------- | ----------------- | -------------------- |
| `Id`            | `id`              | 小文字に統一         |
| `Name`          | `name`            | 小文字に統一         |
| `Password`      | `password`        | 小文字に統一         |
| `Created_At`    | `created_at`      | 小文字に統一         |
| `Updated_At`    | `updated_at`      | 小文字に統一         |
| `Created_User`  | `created_user`    | 小文字に統一         |
| `Updated_User`  | `updated_user`    | 小文字に統一         |
| `ReportNo`      | `report_no`       | スネークケースに変換 |
| `ContentTypeId` | `content_type_id` | スネークケースに変換 |
| `DayType`       | `day_type`        | スネークケースに変換 |
| `DefTime`       | `def_time`        | スネークケースに変換 |
| `DefVol`        | `def_vol`         | スネークケースに変換 |
| `FlowOrder`     | `flow_order`      | スネークケースに変換 |
| `ActionDate`    | `action_date`     | スネークケースに変換 |
| `PageCode`      | `page_code`       | スネークケースに変換 |
| `UserName`      | `user_name`       | スネークケースに変換 |
| `UserId`        | `user_id`         | スネークケースに変換 |
| `Year`          | `year`            | 小文字に統一         |
| `Month`         | `month`           | 小文字に統一         |
| `Status`        | `status`          | 小文字に統一         |
| `Comment`       | `comment`         | 小文字に統一         |
| `Title`         | `title`           | 小文字に統一         |
| `Content`       | `content`         | 小文字に統一         |
| `Body`          | `body`            | 小文字に統一         |

### 命名規則のルール

1. **テーブル名:**

   - スネークケース（小文字 + アンダースコア）
   - 複数形を使用（例: `users`, `plans`, `notes`）
   - プレフィックス（`t_`など）は使用しない

2. **カラム名:**

   - スネークケース（小文字 + アンダースコア）
   - 例: `created_at`, `updated_at`, `content_type_id`

3. **インデックス名:**

   - `IX_` プレフィックス + テーブル名 + カラム名
   - 例: `IX_plans_date_content_type_id`

4. **外部キー名:**

   - `FK_` プレフィックス + 子テーブル名 + 親テーブル名
   - 例: `FK_plans_content_types`

5. **主キー:**
   - 通常は `id` を使用

## 移行手順

1. **バックアップの作成**

   - データベースの完全バックアップを取得

2. **SQL スクリプトの実行**

   - `create_tables_snake_case.sql` を実行して新しいテーブルを作成
   - 既存データを移行（必要に応じて）

3. **アプリケーションコードの更新**

   - Repository クラスの SQL クエリを更新
   - Entity クラスのプロパティ名を更新（必要に応じて）

4. **テスト**
   - すべての機能が正常に動作することを確認

## 影響範囲

### バックエンドコード

- `backend/Models/Repository/PlanRepository.cs` - 多数の SQL クエリ
- `backend/Models/Repository/UsersRepository.cs` - SQL クエリ
- `backend/Models/Repository/ApprovalRepository.cs` - SQL クエリ
- `backend/Models/Repository/ReportRepository.cs` - SQL クエリ

### データベース設計ドキュメント

- `database_design.md` - テーブル定義の更新

### SQL スクリプト

- `create_content_type_default_time_table.sql`
- `create_content_type_default_vol_table.sql`
