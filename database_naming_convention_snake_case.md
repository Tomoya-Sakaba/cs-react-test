# データベース命名規則（スネークケース統一版）

## 統一命名規則

全てのテーブル名・カラム名を**スネークケース（小文字 + アンダースコア）**に統一します。

## 命名規則のルール

### 1. テーブル名

- スネークケース（小文字 + アンダースコア）
- 複数形を使用（例: `users`, `plans`, `notes`）
- プレフィックス（`t_`など）は使用しない

### 2. カラム名

- スネークケース（小文字 + アンダースコア）
- 例: `created_at`, `updated_at`, `content_type_id`

### 3. インデックス名

- `IX_` プレフィックス + テーブル名 + カラム名
- 例: `IX_plans_date_content_type_id`

### 4. 主キー

- 通常は `id` を使用

### 5. 外部キー

- `FK_` プレフィックス + 子テーブル名 + 親テーブル名
- 例: `FK_plans_content_types`

## テーブル一覧

| テーブル名                   | 説明                                                            |
| ---------------------------- | --------------------------------------------------------------- |
| `users`                      | ユーザーマスタ                                                  |
| `content_types`              | コンテンツタイプマスタ                                          |
| `plans`                      | 計画データ（旧 `t_plan`）                                       |
| `notes`                      | 備考データ（旧 `note`）                                         |
| `reports`                    | 報告書データ                                                    |
| `approvals`                  | 上程・承認データ                                                |
| `plan_version_snapshots`     | 計画バージョンスナップショット（旧 `plan_version_snapshot`）    |
| `posts`                      | 投稿データ                                                      |
| `content_type_default_vols`  | コンテンツタイプ数量デフォルト値（旧 `ContentTypeDefaultVol`）  |
| `content_type_default_times` | コンテンツタイプ時間デフォルト値（旧 `ContentTypeDefaultTime`） |

## カラム名の統一例

| 旧カラム名      | 新カラム名        | 説明                |
| --------------- | ----------------- | ------------------- |
| `Id`            | `id`              | 主キー              |
| `Name`          | `name`            | 名前                |
| `Password`      | `password`        | パスワード          |
| `Created_At`    | `created_at`      | 作成日時            |
| `Updated_At`    | `updated_at`      | 更新日時            |
| `Created_User`  | `created_user`    | 作成者              |
| `Updated_User`  | `updated_user`    | 更新者              |
| `ReportNo`      | `report_no`       | 報告書番号          |
| `ContentTypeId` | `content_type_id` | コンテンツタイプ ID |
| `DayType`       | `day_type`        | 曜日タイプ          |
| `DefTime`       | `def_time`        | デフォルト時間      |
| `DefVol`        | `def_vol`         | デフォルト数量      |
| `FlowOrder`     | `flow_order`      | フロー順序          |
| `ActionDate`    | `action_date`     | アクション日時      |
| `PageCode`      | `page_code`       | ページコード        |
| `UserName`      | `user_name`       | ユーザー名          |
| `UserId`        | `user_id`         | ユーザー ID         |
| `Year`          | `year`            | 年                  |
| `Month`         | `month`           | 月                  |
| `Status`        | `status`          | ステータス          |
| `Comment`       | `comment`         | コメント            |
| `Title`         | `title`           | タイトル            |
| `Content`       | `content`         | 内容                |
| `Body`          | `body`            | 本文                |

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

### Entity クラス

- `backend/Models/Entities/UsersEntity.cs`
- `backend/Models/Entities/PlanEntity.cs`
- `backend/Models/Entities/ApprovalEntity.cs`
- `backend/Models/Entities/ReportEntity.cs`

### データベース設計ドキュメント

- `database_design.md` - テーブル定義の更新
