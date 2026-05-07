-- 工事予算計画
-- - t_kouji: 工事マスタ（工事名 / 周期）
-- - t_kouji_monthly: 年月ごとの予算 / 実績

CREATE TABLE [dbo].[t_kouji] (
  [kouji_id] INT IDENTITY(1,1) NOT NULL,
  [kouji_name] NVARCHAR(200) NOT NULL,

  -- 工事周期（「〇年に〇回」）
  [cycle_years] INT NOT NULL,
  [cycle_times] INT NOT NULL,

  [is_active] BIT NOT NULL CONSTRAINT [DF_t_kouji_is_active] DEFAULT (1),
  [created_at] DATETIME NOT NULL CONSTRAINT [DF_t_kouji_created_at] DEFAULT (GETDATE()),
  [updated_at] DATETIME NOT NULL CONSTRAINT [DF_t_kouji_updated_at] DEFAULT (GETDATE()),

  CONSTRAINT [PK_t_kouji] PRIMARY KEY CLUSTERED ([kouji_id]),
  CONSTRAINT [CK_t_kouji_cycle_years] CHECK ([cycle_years] > 0),
  CONSTRAINT [CK_t_kouji_cycle_times] CHECK ([cycle_times] > 0)
);
GO

CREATE TABLE [dbo].[t_kouji_monthly] (
  [kouji_monthly_id] INT IDENTITY(1,1) NOT NULL,
  [kouji_id] INT NOT NULL,

  -- 年月（例: 202604）
  [yyyymm] INT NOT NULL,

  [amount] DECIMAL(18,2) NOT NULL,

  -- type: 0=予算, 1=実績
  [type] TINYINT NOT NULL,

  [created_at] DATETIME NOT NULL CONSTRAINT [DF_t_kouji_monthly_created_at] DEFAULT (GETDATE()),
  [updated_at] DATETIME NOT NULL CONSTRAINT [DF_t_kouji_monthly_updated_at] DEFAULT (GETDATE()),

  CONSTRAINT [PK_t_kouji_monthly] PRIMARY KEY CLUSTERED ([kouji_monthly_id]),
  CONSTRAINT [CK_t_kouji_monthly_yyyymm] CHECK ([yyyymm] BETWEEN 190001 AND 299912),
  CONSTRAINT [CK_t_kouji_monthly_type] CHECK ([type] IN (0, 1))
);
GO

CREATE UNIQUE INDEX [UX_t_kouji_monthly_kouji_yyyymm_type]
ON [dbo].[t_kouji_monthly]([kouji_id], [yyyymm], [type]);

GO

