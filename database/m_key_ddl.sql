-- ============================================================================
-- 汎用キー・バリューマスタ（Web.config 相当のパス等をDB管理）
-- ============================================================================
--
-- 【目的】
-- - 環境ごとのパス設定（テンプレ配置先、画像ベースパス等）をDBで管理する
-- - アプリ側は m_key を優先して参照し、無ければ Web.config の appSettings をフォールバックする運用
--
-- 【設計方針】
-- - 値は文字列（NVARCHAR）で保持
-- - created_at / updated_at を保持
--
-- ============================================================================

CREATE TABLE [dbo].[m_key] (
  [k] NVARCHAR(200) NOT NULL,
  [v] NVARCHAR(2000) NULL,
  [created_at] DATETIME NOT NULL CONSTRAINT [DF_m_key_created_at] DEFAULT (GETDATE()),
  [updated_at] DATETIME NOT NULL CONSTRAINT [DF_m_key_updated_at] DEFAULT (GETDATE()),
  CONSTRAINT [PK_m_key] PRIMARY KEY CLUSTERED ([k])
);

-- 例:
-- INSERT INTO dbo.m_key (k, v) VALUES
-- (N'BReportTemplateBasePath', N'~/App_Data/b-templates'),
-- (N'GemBoxPictureBasePath', N'C:\app_data\picuture');

