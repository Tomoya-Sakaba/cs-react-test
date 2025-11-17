-- =============================================
-- コンテンツタイプ時間デフォルト値マスターテーブル作成
-- =============================================
-- 説明: 新規作成モード時にカラムに初期値を設定するためのマスターテーブル
-- 作成日: 2025-01-XX
-- =============================================

-- テーブル作成
CREATE TABLE [dbo].[ContentTypeDefaultTime] (
  [Id] int identity not null,
  [ContentTypeId] int not null,            -- コンテンツタイプID
  [DayType] nvarchar(20) not null,         -- 曜日タイプ（'月': 月曜, '平': 平日, '祭': 祝日, '土': 土曜, '日': 日曜）
  [DefTime] nvarchar(10) null,             -- デフォルト時間（例: '09:00', '14:30'）
  [Created_At] datetime default getdate() not null,
  [Updated_At] datetime default getdate() not null,
  primary key (Id)
);

-- インデックス作成
CREATE INDEX [IX_ContentTypeDefaultTime_ContentTypeId] ON [dbo].[ContentTypeDefaultTime]([ContentTypeId]);
CREATE INDEX [IX_ContentTypeDefaultTime_DayType] ON [dbo].[ContentTypeDefaultTime]([DayType]);
CREATE UNIQUE INDEX [IX_ContentTypeDefaultTime_ContentTypeId_DayType] ON [dbo].[ContentTypeDefaultTime]([ContentTypeId], [DayType]);

-- =============================================
-- 初期データのINSERT文
-- =============================================
-- 注意: 実際のcontent_typeテーブルに存在するcontent_type_idに合わせて調整してください
-- =============================================

-- コンテンツタイプ1のデフォルト時間設定例
INSERT INTO [dbo].[ContentTypeDefaultTime] ([ContentTypeId], [DayType], [DefTime])
VALUES 
  (1, '月', '09:00'),
  (1, '平', '09:00'),
  (1, '祭', NULL),
  (1, '土', '10:00'),
  (1, '日', NULL);

-- コンテンツタイプ2のデフォルト時間設定例
INSERT INTO [dbo].[ContentTypeDefaultTime] ([ContentTypeId], [DayType], [DefTime])
VALUES 
  (2, '月', '10:00'),
  (2, '平', '10:00'),
  (2, '祭', NULL),
  (2, '土', '11:00'),
  (2, '日', NULL);

-- コンテンツタイプ3のデフォルト時間設定例
INSERT INTO [dbo].[ContentTypeDefaultTime] ([ContentTypeId], [DayType], [DefTime])
VALUES 
  (3, '月', '14:00'),
  (3, '平', '14:00'),
  (3, '祭', NULL),
  (3, '土', '15:00'),
  (3, '日', NULL);

-- コンテンツタイプ4のデフォルト時間設定例
INSERT INTO [dbo].[ContentTypeDefaultTime] ([ContentTypeId], [DayType], [DefTime])
VALUES 
  (4, '月', '16:00'),
  (4, '平', '16:00'),
  (4, '祭', NULL),
  (4, '土', '17:00'),
  (4, '日', NULL);

-- =============================================
-- 既存のcontent_typeテーブルのIDを確認してから実行する場合の例
-- =============================================
-- 以下のクエリで既存のcontent_type_idを確認できます:
-- SELECT content_type_id, content_name FROM [dbo].[content_type] ORDER BY content_type_id;
-- =============================================

