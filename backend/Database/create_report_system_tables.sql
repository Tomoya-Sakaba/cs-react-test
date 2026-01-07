-- ========================================
-- 報告書システム データベース定義
-- Excel動的生成型
-- ========================================

USE [test_mydb];
GO

-- ========================================
-- 1. テンプレート管理
-- ========================================

-- テンプレートマスター
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='t_report_templates' AND xtype='U')
BEGIN
    CREATE TABLE t_report_templates (
        template_id INT PRIMARY KEY IDENTITY(1,1),
        template_name NVARCHAR(200) NOT NULL,
        template_code NVARCHAR(50) UNIQUE NOT NULL,
        description NVARCHAR(500),
        file_name NVARCHAR(200) NOT NULL,
        file_path NVARCHAR(500) NOT NULL,
        file_hash NVARCHAR(64),
        parse_method NVARCHAR(50) DEFAULT 'placeholder',
        metadata_json NVARCHAR(MAX),
        last_parsed_at DATETIME,
        is_active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        created_user NVARCHAR(100),
        updated_at DATETIME,
        updated_user NVARCHAR(100)
    );
    PRINT 't_report_templates テーブルを作成しました';
END
ELSE
BEGIN
    PRINT 't_report_templates テーブルは既に存在します';
END
GO

-- テンプレートフィールド定義
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='t_template_fields' AND xtype='U')
BEGIN
    CREATE TABLE t_template_fields (
        field_id INT PRIMARY KEY IDENTITY(1,1),
        template_id INT NOT NULL,
        field_name NVARCHAR(100) NOT NULL,
        field_label NVARCHAR(200) NOT NULL,
        field_type NVARCHAR(50) NOT NULL,
        cell_address NVARCHAR(20),
        row_number INT,
        column_number INT,
        options NVARCHAR(MAX),
        is_required BIT DEFAULT 0,
        validation_rule NVARCHAR(500),
        default_value NVARCHAR(500),
        display_order INT,
        cell_style_json NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE()
        -- FOREIGN KEY (template_id) REFERENCES t_report_templates(template_id) ON DELETE CASCADE
        -- 開発中のため外部キー制約は無効化
    );
    PRINT 't_template_fields テーブルを作成しました';
END
ELSE
BEGIN
    PRINT 't_template_fields テーブルは既に存在します';
END
GO

-- ========================================
-- 2. 報告書データ
-- ========================================

-- 報告書マスター
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='t_reports' AND xtype='U')
BEGIN
    CREATE TABLE t_reports (
        report_id INT PRIMARY KEY IDENTITY(1,1),
        template_id INT NOT NULL,
        report_no NVARCHAR(50) UNIQUE NOT NULL,
        report_data NVARCHAR(MAX) NOT NULL,
        status NVARCHAR(20) DEFAULT 'draft',
        generated_pdf_path NVARCHAR(500),
        generated_excel_path NVARCHAR(500),
        submitted_at DATETIME,
        approved_at DATETIME,
        approved_by NVARCHAR(100),
        created_at DATETIME DEFAULT GETDATE(),
        created_user NVARCHAR(100) NOT NULL,
        updated_at DATETIME,
        updated_user NVARCHAR(100)
        -- FOREIGN KEY (template_id) REFERENCES t_report_templates(template_id)
        -- 開発中のため外部キー制約は無効化
    );
    PRINT 't_reports テーブルを作成しました';
END
ELSE
BEGIN
    PRINT 't_reports テーブルは既に存在します';
END
GO

-- 報告書添付画像
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='t_report_images' AND xtype='U')
BEGIN
    CREATE TABLE t_report_images (
        image_id INT PRIMARY KEY IDENTITY(1,1),
        report_id INT NOT NULL,
        file_name NVARCHAR(200) NOT NULL,
        file_path NVARCHAR(500) NOT NULL,
        file_size BIGINT,
        mime_type NVARCHAR(100),
        display_order INT,
        caption NVARCHAR(500),
        uploaded_at DATETIME DEFAULT GETDATE()
        -- FOREIGN KEY (report_id) REFERENCES t_reports(report_id) ON DELETE CASCADE
        -- 開発中のため外部キー制約は無効化
    );
    PRINT 't_report_images テーブルを作成しました';
END
ELSE
BEGIN
    PRINT 't_report_images テーブルは既に存在します';
END
GO

-- 画像注釈データ
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='t_image_annotations' AND xtype='U')
BEGIN
    CREATE TABLE t_image_annotations (
        annotation_id INT PRIMARY KEY IDENTITY(1,1),
        image_id INT NOT NULL,
        annotation_type NVARCHAR(50) NOT NULL,
        annotation_data NVARCHAR(MAX) NOT NULL,
        created_at DATETIME DEFAULT GETDATE()
        -- FOREIGN KEY (image_id) REFERENCES t_report_images(image_id) ON DELETE CASCADE
        -- 開発中のため外部キー制約は無効化
    );
    PRINT 't_image_annotations テーブルを作成しました';
END
ELSE
BEGIN
    PRINT 't_image_annotations テーブルは既に存在します';
END
GO

-- ========================================
-- 3. インデックス作成
-- ========================================

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_reports_created_user')
BEGIN
    CREATE INDEX idx_reports_created_user ON t_reports(created_user);
    PRINT 'インデックス idx_reports_created_user を作成しました';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_reports_created_at')
BEGIN
    CREATE INDEX idx_reports_created_at ON t_reports(created_at DESC);
    PRINT 'インデックス idx_reports_created_at を作成しました';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_reports_status')
BEGIN
    CREATE INDEX idx_reports_status ON t_reports(status);
    PRINT 'インデックス idx_reports_status を作成しました';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='idx_template_fields_template_id')
BEGIN
    CREATE INDEX idx_template_fields_template_id ON t_template_fields(template_id);
    PRINT 'インデックス idx_template_fields_template_id を作成しました';
END
GO

PRINT '========================================';
PRINT '報告書システム データベース構築完了';
PRINT '========================================';

