-- 画像ファイル名 + コメント管理テーブル
-- SQL Server想定（dbo）

IF OBJECT_ID('dbo.t_photo_comment', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.t_photo_comment (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        file_name NVARCHAR(255) NOT NULL,
        comment NVARCHAR(MAX) NOT NULL CONSTRAINT DF_t_photo_comment_comment DEFAULT(N''),
        created_at DATETIME NOT NULL CONSTRAINT DF_t_photo_comment_created_at DEFAULT(GETDATE())
    );
END;

