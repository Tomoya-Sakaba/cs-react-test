-- =============================================
-- t_results テーブル作成スクリプト
-- =============================================
-- 説明: CSV取り込み用の結果テーブル
-- 作成日: 2025-12-13
-- =============================================

USE [test_mydb];
GO

-- =============================================
-- t_results テーブル
-- =============================================
CREATE TABLE [dbo].[t_results] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [date] DATE NOT NULL,
    [content_type_id] INT NOT NULL,
    [vol] DECIMAL(10, 2) NULL,
    [company_id] INT NULL,
    [company_name] NVARCHAR(255) NULL,
    [created_at] DATETIME DEFAULT GETDATE() NOT NULL,
    [created_user] NVARCHAR(100) NULL,
    PRIMARY KEY ([id])
);
GO

-- インデックス
CREATE INDEX [IX_t_results_date] ON [dbo].[t_results]([date]);
CREATE INDEX [IX_t_results_content_type_id] ON [dbo].[t_results]([content_type_id]);
CREATE INDEX [IX_t_results_company_id] ON [dbo].[t_results]([company_id]);
GO

PRINT 't_results テーブルを作成しました。';

