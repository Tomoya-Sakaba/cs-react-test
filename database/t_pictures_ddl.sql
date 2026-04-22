-- ============================================================================
-- 機器写真テーブル DDL（外部キー制約なし）
-- ============================================================================
--
-- 【目的】
-- - m_equipment.equipment_id を論理的に参照し、機器に紐づく写真（パス/コメント）を管理する
--
-- 【設計方針】
-- - 主キーは (equipment_id, picture_tab, picture_no) の複合キー
-- - 外部キー制約は付けない（整合性はアプリケーション層で管理）
-- - created_at / updated_at はデフォルト GETDATE()
--
-- ============================================================================

CREATE TABLE [dbo].[t_pictures] (
  [equipment_id]     INT NOT NULL,

  [picture_tab]      INT NOT NULL,
  [picture_no]       INT NOT NULL,

  [picture_path]     NVARCHAR(1024) NOT NULL,
  [picture_comments] NVARCHAR(1000) NULL,

  [created_at]       DATETIME NOT NULL CONSTRAINT [DF_t_pictures_created_at] DEFAULT (GETDATE()),
  [updated_at]       DATETIME NOT NULL CONSTRAINT [DF_t_pictures_updated_at] DEFAULT (GETDATE()),

  CONSTRAINT [PK_t_pictures] PRIMARY KEY CLUSTERED ([equipment_id], [picture_tab], [picture_no])
);

