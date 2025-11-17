-- =============================================
-- コンテンツタイプ数量デフォルト値マスターテーブル作成
-- =============================================
-- 説明: 新規作成モード時にカラムに初期値を設定するためのマスターテーブル
-- 作成日: 2025-01-XX
-- =============================================

-- テーブル作成
CREATE TABLE [dbo].[ContentTypeDefaultVol] (
  [Id] int identity not null,
  [ContentTypeId] int not null,            -- コンテンツタイプID
  [DefVol] decimal(18, 2) null,            -- デフォルト数量
  [Created_At] datetime default getdate() not null,
  [Updated_At] datetime default getdate() not null,
  primary key (Id)
);

-- インデックス作成（ContentTypeIdにユニーク制約）
CREATE UNIQUE INDEX [IX_ContentTypeDefaultVol_ContentTypeId] ON [dbo].[ContentTypeDefaultVol]([ContentTypeId]);

-- =============================================
-- 初期データのINSERT文
-- =============================================
-- 注意: 実際のcontent_typeテーブルに存在するcontent_type_idに合わせて調整してください
-- =============================================

-- コンテンツタイプ1のデフォルト数量設定例
INSERT INTO [dbo].[ContentTypeDefaultVol] ([ContentTypeId], [DefVol])
VALUES (1, 100.00);

-- コンテンツタイプ2のデフォルト数量設定例
INSERT INTO [dbo].[ContentTypeDefaultVol] ([ContentTypeId], [DefVol])
VALUES (2, 200.00);

-- コンテンツタイプ3のデフォルト数量設定例
INSERT INTO [dbo].[ContentTypeDefaultVol] ([ContentTypeId], [DefVol])
VALUES (3, 300.00);

-- コンテンツタイプ4のデフォルト数量設定例
INSERT INTO [dbo].[ContentTypeDefaultVol] ([ContentTypeId], [DefVol])
VALUES (4, 400.00);

-- =============================================
-- 既存のcontent_typeテーブルのIDを確認してから実行する場合の例
-- =============================================
-- 以下のクエリで既存のcontent_type_idを確認できます:
-- SELECT content_type_id, content_name FROM [dbo].[content_type] ORDER BY content_type_id;
-- =============================================

