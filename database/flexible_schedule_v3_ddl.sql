-- ============================================================================
-- 柔軟な計画スケジュール用 DDL (バージョン3 - 種別ベースヘッダー方式)
-- ============================================================================
-- 
-- 【設計方針】
-- 1. ヘッダーは「廃プラ①」「汚泥①」「廃プラ②」のように種別ベースで表示
-- 2. 月ごとに「通常日用ヘッダー」と「特殊日用ヘッダー」を定義
-- 3. 特殊日モードボタンでヘッダーを切り替え可能
-- 4. 実績との紐付け：date + wasteType + typeSequence（種別内の順序）
-- 5. 外部キー制約なし：テーブル変更の柔軟性を確保
-- 
-- 【データ構造】
-- - ヘッダー定義テーブル：月ごとのヘッダー構成を管理
-- - 計画テーブル：日付、ヘッダーID、種別、種別内順序、会社、量、時間
-- - 実績テーブル：日付、時間、種別、会社、量
-- 
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ヘッダー定義テーブル
-- ----------------------------------------------------------------------------
-- 【用途】月ごとのヘッダー構成を定義
-- 【例】2025年1月の通常日：廃プラ①、汚泥①、廃プラ②
-- 【例】2025年1月の特殊日：汚泥①、廃プラ①、汚泥②、廃プラ②、汚泥③
-- ----------------------------------------------------------------------------
CREATE TABLE v2_t_header_definition (
    headerId INT PRIMARY KEY IDENTITY(1,1),
    year INT NOT NULL,
    month INT NOT NULL,
    version INT NOT NULL DEFAULT 0,  -- 0=最新、1以降=過去のスナップショット
    isSpecialDay BIT NOT NULL DEFAULT 0,  -- 0=通常日、1=特殊日
    headerOrder INT NOT NULL,  -- ヘッダーの表示順序（1,2,3...）
    wasteType NVARCHAR(50) NOT NULL,  -- 種別：'廃プラ', '汚泥'
    typeSequence INT NOT NULL,  -- その種別の何回目か（1,2,3...）
    displayName NVARCHAR(100),  -- 表示名（例：'廃プラ①', '汚泥②'）※自動生成も可
    createdAt DATETIME DEFAULT GETDATE(),
    updatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_HeaderDef UNIQUE (year, month, version, isSpecialDay, headerOrder)
);

-- インデックス作成
CREATE INDEX IX_HeaderDef_YearMonth ON v2_t_header_definition (year, month, version, isSpecialDay);

COMMENT ON TABLE v2_t_header_definition IS 'ヘッダー定義テーブル。月ごとに通常日と特殊日のヘッダー構成を管理。';
COMMENT ON COLUMN v2_t_header_definition.isSpecialDay IS '0=通常日用ヘッダー、1=特殊日用ヘッダー';
COMMENT ON COLUMN v2_t_header_definition.headerOrder IS 'ヘッダーの表示順序（左から右へ1,2,3...）';
COMMENT ON COLUMN v2_t_header_definition.typeSequence IS 'その種別の何回目か（廃プラ①なら1、廃プラ②なら2）';

-- ----------------------------------------------------------------------------
-- 2. 計画テーブル
-- ----------------------------------------------------------------------------
-- 【用途】日ごとの排出計画を管理
-- 【構造】1レコード = 1つのヘッダー位置のデータ
-- 【外部キー制約】なし（論理的に v2_t_header_definition を参照）
-- ----------------------------------------------------------------------------
CREATE TABLE v2_t_plan_data (
    planId INT PRIMARY KEY IDENTITY(1,1),
    year INT NOT NULL,
    month INT NOT NULL,
    version INT NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    isSpecialDay BIT NOT NULL DEFAULT 0,  -- その日が特殊日かどうか
    headerId INT NOT NULL,  -- t_header_definition.headerId を参照（外部キーなし）
    wasteType NVARCHAR(50) NOT NULL,  -- 種別（ヘッダー定義と同じ）
    typeSequence INT NOT NULL,  -- 種別内の順序（ヘッダー定義と同じ）
    companyId INT,  -- m_company.companyId を参照（外部キーなし）
    vol DECIMAL(10,2),
    plannedTime TIME,
    note NVARCHAR(500),
    createdAt DATETIME DEFAULT GETDATE(),
    updatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_PlanData UNIQUE (year, month, version, date, headerId)
);

-- インデックス作成
CREATE INDEX IX_PlanData_YearMonth ON v2_t_plan_data (year, month, version);
CREATE INDEX IX_PlanData_Date ON v2_t_plan_data (date);
CREATE INDEX IX_PlanData_WasteType ON v2_t_plan_data (wasteType, typeSequence);

COMMENT ON TABLE v2_t_plan_data IS '計画テーブル。1レコード = 1つのヘッダー位置のデータ。';
COMMENT ON COLUMN v2_t_plan_data.headerId IS 'v2_t_header_definition.headerId を参照（外部キー制約なし）';
COMMENT ON COLUMN v2_t_plan_data.typeSequence IS '種別内の順序。実績との突合に使用。';

-- ----------------------------------------------------------------------------
-- 3. 実績テーブル
-- ----------------------------------------------------------------------------
-- 【用途】実際の排出実績を記録
-- 【構造】headerIdという概念はなく、date + time + wasteType のみ
-- 【外部キー制約】なし
-- ----------------------------------------------------------------------------
CREATE TABLE v2_t_actual_data (
    actualId INT PRIMARY KEY IDENTITY(1,1),
    date DATE NOT NULL,
    actualTime TIME NOT NULL,
    wasteType NVARCHAR(50) NOT NULL,
    companyId INT,  -- m_company.companyId を参照（外部キーなし）
    vol DECIMAL(10,2),
    note NVARCHAR(500),
    createdAt DATETIME DEFAULT GETDATE()
);

-- インデックス作成
CREATE INDEX IX_ActualData_Date ON v2_t_actual_data (date);
CREATE INDEX IX_ActualData_WasteType ON v2_t_actual_data (wasteType);
CREATE INDEX IX_ActualData_DateTime ON v2_t_actual_data (date, actualTime);

COMMENT ON TABLE v2_t_actual_data IS '実績テーブル。headerIdなし。date + time + wasteType で計画と突合。';

-- ----------------------------------------------------------------------------
-- 4. 種別マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE v2_m_waste_type (
    wasteTypeId INT PRIMARY KEY IDENTITY(1,1),
    wasteTypeName NVARCHAR(50) NOT NULL UNIQUE,
    displayOrder INT,
    isActive BIT DEFAULT 1
);

-- 初期データ挿入
INSERT INTO v2_m_waste_type (wasteTypeName, displayOrder, isActive) VALUES ('廃プラ', 1, 1);
INSERT INTO v2_m_waste_type (wasteTypeName, displayOrder, isActive) VALUES ('汚泥', 2, 1);

-- ----------------------------------------------------------------------------
-- 5. サンプルデータ挿入（開発用）
-- ----------------------------------------------------------------------------

-- 【例1】2025年1月の通常日用ヘッダー定義（廃プラ①、汚泥①、廃プラ②）
INSERT INTO v2_t_header_definition (year, month, version, isSpecialDay, headerOrder, wasteType, typeSequence, displayName)
VALUES 
    (2025, 1, 0, 0, 1, '廃プラ', 1, '廃プラ①'),
    (2025, 1, 0, 0, 2, '汚泥', 1, '汚泥①'),
    (2025, 1, 0, 0, 3, '廃プラ', 2, '廃プラ②');

-- 【例2】2025年1月の特殊日用ヘッダー定義（汚泥①、廃プラ①、汚泥②、廃プラ②、汚泥③）
INSERT INTO v2_t_header_definition (year, month, version, isSpecialDay, headerOrder, wasteType, typeSequence, displayName)
VALUES 
    (2025, 1, 0, 1, 1, '汚泥', 1, '汚泥①'),
    (2025, 1, 0, 1, 2, '廃プラ', 1, '廃プラ①'),
    (2025, 1, 0, 1, 3, '汚泥', 2, '汚泥②'),
    (2025, 1, 0, 1, 4, '廃プラ', 2, '廃プラ②'),
    (2025, 1, 0, 1, 5, '汚泥', 3, '汚泥③');

-- 【例3】2025年1月1日（通常日）の計画データ
-- headerId 1: 廃プラ①
-- headerId 2: 汚泥①
-- headerId 3: 廃プラ②
INSERT INTO v2_t_plan_data (year, month, version, date, isSpecialDay, headerId, wasteType, typeSequence, companyId, vol, plannedTime, note)
VALUES 
    (2025, 1, 0, '2025-01-01', 0, 1, '廃プラ', 1, 1, 100.0, '09:00:00', ''),
    (2025, 1, 0, '2025-01-01', 0, 2, '汚泥', 1, 2, 200.0, '13:00:00', ''),
    (2025, 1, 0, '2025-01-01', 0, 3, '廃プラ', 2, 1, 150.0, '17:00:00', '');

-- 【例4】2025年1月5日（特殊日）の計画データ
-- headerId 4: 汚泥①
-- headerId 5: 廃プラ①
-- headerId 6: 汚泥②
-- headerId 7: 廃プラ②
-- headerId 8: 汚泥③
INSERT INTO v2_t_plan_data (year, month, version, date, isSpecialDay, headerId, wasteType, typeSequence, companyId, vol, plannedTime, note)
VALUES 
    (2025, 1, 0, '2025-01-05', 1, 4, '汚泥', 1, 1, 100.0, '08:00:00', '特殊日'),
    (2025, 1, 0, '2025-01-05', 1, 5, '廃プラ', 1, 2, 150.0, '10:00:00', ''),
    (2025, 1, 0, '2025-01-05', 1, 6, '汚泥', 2, 1, 120.0, '13:00:00', ''),
    (2025, 1, 0, '2025-01-05', 1, 7, '廃プラ', 2, 2, 180.0, '15:00:00', ''),
    (2025, 1, 0, '2025-01-05', 1, 8, '汚泥', 3, 1, 200.0, '17:00:00', '');

-- 【例5】サンプル実績データ（2025年1月1日）
INSERT INTO v2_t_actual_data (date, actualTime, wasteType, companyId, vol, note)
VALUES 
    ('2025-01-01', '09:10:00', '廃プラ', 1, 98.5, '10分遅れ'),
    ('2025-01-01', '13:05:00', '汚泥', 2, 195.0, ''),
    ('2025-01-01', '17:15:00', '廃プラ', 1, 155.0, '');

-- ----------------------------------------------------------------------------
-- 6. 便利なビュー：計画と実績の突合
-- ----------------------------------------------------------------------------
-- 【ロジック】
-- 1. 同じ日付・種別の実績を時刻順に並べる
-- 2. ROW_NUMBER()でその種別の何回目かを算出
-- 3. typeSequenceと照合
-- ----------------------------------------------------------------------------
CREATE VIEW v2_v_plan_actual_match AS
WITH RankedActual AS (
    SELECT 
        date,
        wasteType,
        actualTime,
        companyId,
        vol,
        ROW_NUMBER() OVER (
            PARTITION BY date, wasteType 
            ORDER BY actualTime
        ) AS typeSequence,
        note
    FROM v2_t_actual_data
)
SELECT 
    p.date,
    p.wasteType,
    p.typeSequence,
    h.displayName AS headerName,
    p.companyId AS planCompanyId,
    p.vol AS planVol,
    p.plannedTime,
    a.actualTime,
    a.companyId AS actualCompanyId,
    a.vol AS actualVol,
    CASE 
        WHEN a.actualTime IS NULL THEN '未実施'
        WHEN ABS(DATEDIFF(MINUTE, p.plannedTime, a.actualTime)) <= 10 THEN '計画通り'
        WHEN ABS(DATEDIFF(MINUTE, p.plannedTime, a.actualTime)) <= 30 THEN '遅延（許容範囲）'
        ELSE '大幅遅延'
    END AS status,
    ABS(DATEDIFF(MINUTE, p.plannedTime, a.actualTime)) AS timeDiffMinutes
FROM v2_t_plan_data p
LEFT JOIN v2_t_header_definition h ON p.headerId = h.headerId
LEFT JOIN RankedActual a ON 
    p.date = a.date AND 
    p.wasteType = a.wasteType AND 
    p.typeSequence = a.typeSequence
WHERE p.version = 0;

COMMENT ON VIEW v2_v_plan_actual_match IS '計画と実績の突合ビュー。date + wasteType + typeSequence（種別内の順序）で紐付け。';

-- ----------------------------------------------------------------------------
-- 7. ストアドプロシージャ：バージョン作成
-- ----------------------------------------------------------------------------
CREATE PROCEDURE v2_sp_CreatePlanVersion
    @Year INT,
    @Month INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @NewVersion INT;
    
    -- 最新バージョンを取得
    SELECT @NewVersion = ISNULL(MAX(version), 0) + 1
    FROM v2_t_plan_data
    WHERE year = @Year AND month = @Month;
    
    -- ヘッダー定義をコピー
    INSERT INTO v2_t_header_definition 
        (year, month, version, isSpecialDay, headerOrder, wasteType, typeSequence, displayName, createdAt, updatedAt)
    SELECT 
        year, month, @NewVersion, isSpecialDay, headerOrder, wasteType, typeSequence, displayName, GETDATE(), GETDATE()
    FROM v2_t_header_definition
    WHERE year = @Year AND month = @Month AND version = 0;
    
    -- 計画データをコピー
    INSERT INTO v2_t_plan_data 
        (year, month, version, date, isSpecialDay, headerId, wasteType, typeSequence, companyId, vol, plannedTime, note, createdAt, updatedAt)
    SELECT 
        year, month, @NewVersion, date, isSpecialDay, headerId, wasteType, typeSequence, companyId, vol, plannedTime, note, GETDATE(), GETDATE()
    FROM v2_t_plan_data
    WHERE year = @Year AND month = @Month AND version = 0;
    
    SELECT @NewVersion AS NewVersion;
END;

-- ----------------------------------------------------------------------------
-- 8. ユーティリティ関数：ヘッダー定義の取得
-- ----------------------------------------------------------------------------
CREATE FUNCTION v2_fn_GetHeaderDefinition(@Year INT, @Month INT, @IsSpecialDay BIT)
RETURNS TABLE
AS
RETURN (
    SELECT 
        headerId,
        headerOrder,
        wasteType,
        typeSequence,
        displayName
    FROM v2_t_header_definition
    WHERE year = @Year 
        AND month = @Month 
        AND version = 0
        AND isSpecialDay = @IsSpecialDay
);

-- ============================================================================
-- 使用例
-- ============================================================================

-- 1. 通常日のヘッダー定義を取得
/*
SELECT * FROM v2_fn_GetHeaderDefinition(2025, 1, 0)
ORDER BY headerOrder;
-- 結果: 廃プラ①、汚泥①、廃プラ②
*/

-- 2. 特殊日のヘッダー定義を取得
/*
SELECT * FROM v2_fn_GetHeaderDefinition(2025, 1, 1)
ORDER BY headerOrder;
-- 結果: 汚泥①、廃プラ①、汚泥②、廃プラ②、汚泥③
*/

-- 3. 月次計画データを取得（通常日）
/*
SELECT 
    p.date,
    h.displayName,
    p.companyId,
    p.vol,
    p.plannedTime
FROM v2_t_plan_data p
JOIN v2_t_header_definition h ON p.headerId = h.headerId
WHERE p.year = 2025 
    AND p.month = 1 
    AND p.version = 0
    AND p.isSpecialDay = 0
ORDER BY p.date, h.headerOrder;
*/

-- 4. 計画と実績の突合
/*
SELECT * FROM v2_v_plan_actual_match
WHERE date BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY date, wasteType, typeSequence;
*/

-- 5. バージョン作成
/*
EXEC v2_sp_CreatePlanVersion @Year = 2025, @Month = 1;
*/

-- 6. ヘッダー定義を追加（新しい月）
/*
-- 2025年2月の通常日用ヘッダー
INSERT INTO v2_t_header_definition (year, month, version, isSpecialDay, headerOrder, wasteType, typeSequence, displayName)
VALUES 
    (2025, 2, 0, 0, 1, '廃プラ', 1, '廃プラ①'),
    (2025, 2, 0, 0, 2, '汚泥', 1, '汚泥①'),
    (2025, 2, 0, 0, 3, '廃プラ', 2, '廃プラ②');
*/

