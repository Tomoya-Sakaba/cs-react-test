-- =============================================
-- データベーステーブル作成スクリプト（スネークケース統一版）
-- =============================================
-- 説明: 全てのテーブル名・カラム名をスネークケースに統一
-- 作成日: 2025-01-XX
-- =============================================

USE [test_mydb]; -- データベース名を指定してください
GO

-- =============================================
-- 1. t_users テーブル
-- =============================================
CREATE TABLE [dbo].[t_users] (
  [id] int identity not null,
  [name] nvarchar(100) not null,
  [email] nvarchar(255) null,
  [department] nvarchar(100) null,
  [position] nvarchar(100) null,
  [color] nvarchar(100) null,
  [password] nvarchar(255) not null,
  [created_at] datetime default getdate() not null,
  [updated_at] datetime default getdate() not null,
  primary key ([id])
);


-- =============================================
-- 2. content_type テーブル
-- =============================================
CREATE TABLE [dbo].[content_type] (
  [content_type_id] int identity not null,
  [content_name] varchar(50) not null,
  [display_order] int default 0 not null,
  [is_active] bit default 1 not null,
  [created_at] datetime default getdate() not null,
  [updated_at] datetime default getdate() not null,
  primary key ([content_type_id])
);


-- =============================================
-- 3. t_plans テーブル（旧 t_plan）
-- =============================================
CREATE TABLE [dbo].[t_plans] (
  [date] date not null,
  [content_type_id] int not null,
  [company] int null,
  [vol] decimal(10, 2) null,
  [time] time null,
  [version] int default 0 not null,
  [created_at] datetime default getdate() null,
  [created_user] varchar(50) null,
  [updated_at] datetime default getdate() null,
  [updated_user] varchar(50) null,
  primary key ([date], [content_type_id], [version])
);


-- =============================================
-- 4. t_notes テーブル
-- =============================================
CREATE TABLE [dbo].[t_notes] (
  [note_date] date not null,
  [note_text] varchar(500) null,
  [version] int default 0 not null,
  [created_at] datetime default getdate() not null,
  [created_user] varchar(50) null,
  [updated_at] datetime default getdate() not null,
  [updated_user] varchar(50) null,
  primary key ([note_date], [version])
);

-- =============================================
-- 5. t_reports テーブル
-- =============================================
CREATE TABLE [dbo].[t_reports] (
  [id] int identity not null,
  [report_no] nvarchar(50) not null,
  [title] nvarchar(200) not null,
  [content] nvarchar(max) null,
  [created_at] datetime default getdate() not null,
  [created_user] nvarchar(100) null,
  [updated_at] datetime default getdate() not null,
  [updated_user] nvarchar(100) null,
  primary key ([id])
);

-- インデックス
CREATE UNIQUE INDEX [IX_t_reports_report_no] ON [dbo].[t_reports]([report_no]);
CREATE INDEX [IX_t_reports_created_at] ON [dbo].[t_reports]([created_at]);

-- =============================================
-- 6. t_approvals テーブル
-- =============================================
CREATE TABLE [dbo].[t_approvals] (
    [approval_id] nvarchar(4) NOT NULL,
    [report_no] nvarchar(50) NOT NULL,
    [user_name] nvarchar(100) NOT NULL,
    [flow_order] int NOT NULL,
    [status] int NOT NULL,
    [comment] nvarchar(1000),
    [action_date] datetime,
    [created_at] datetime DEFAULT GETDATE() NOT NULL,
    [updated_at] datetime DEFAULT GETDATE() NOT NULL,
    PRIMARY KEY ([approval_id], [report_no], [flow_order])
);


-- =============================================
-- 7. t_plan_version_snapshots テーブル
-- =============================================
CREATE TABLE [dbo].[t_plan_version_snapshots] (
  [year] int not null,
  [month] int not null,
  [current_version] int not null,
  [created_at] datetime default getdate() not null,
  [created_user] nvarchar(100) not null,
  primary key ([year], [month])
);

-- =============================================
-- 8. posts テーブル
-- =============================================
CREATE TABLE [dbo].[t_posts] (
  [id] int identity not null,
  [user_id] int not null,
  [title] nvarchar(200) not null,
  [body] nvarchar(max) null,
  [created_at] datetime default getdate() not null,
  [updated_at] datetime default getdate() not null,
  primary key ([id])
);


-- =============================================
-- 9. m_content_type_default_vol テーブル
-- =============================================
CREATE TABLE [dbo].[m_content_type_default_vol] (
  [id] int identity not null,
  [content_type_id] int not null,
  [def_vol] decimal(18, 2) null,
  [created_at] datetime default getdate() not null,
  [updated_at] datetime default getdate() not null,
  primary key ([id])
);

-- =============================================
-- 10. m_content_type_default_time テーブル
-- =============================================
CREATE TABLE [dbo].[m_content_type_default_time] (
  [id] int identity not null,
  [content_type_id] int not null,
  [day_type] nvarchar(20) not null,
  [def_time] nvarchar(10) null,
  [created_at] datetime default getdate() not null,
  [updated_at] datetime default getdate() not null,
  primary key ([id])
);


-- =============================================
-- 11. m_company テーブル
-- =============================================
CREATE TABLE [dbo].[m_company] (
  [company_id] int identity not null,
  [company_name] nvarchar(100) not null,
  [bg_color] nvarchar(20) not null,
  [type] int not null,
  [created_at] datetime default getdate() not null,
  [updated_at] datetime default getdate() not null,
  primary key ([company_id])
);

-- =============================================
-- 完了
-- =============================================

