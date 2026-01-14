-- ============================================================================
-- 柔軟な計画スケジュール用 DDL
-- ============================================================================
-- 
-- 【設計方針】
-- 1. 1セル = 1レコード方式で、日によって排出回数を柔軟に変更可能
-- 2. 横軸：時間順（1回目、2回目、3回目...）- 日によって異なる
-- 3. 縦軸：日付
-- 4. 実績との紐付け：date + time + wasteType で自動マッチング
-- 5. 外部キー制約なし：将来的なテーブル変更の柔軟性を確保
--    - データ整合性はアプリケーション層で管理
--    - テーブル変更時のロックやカスケード問題を回避
-- 
-- 【既存システムとの違い】
-- - 旧：固定的なヘッダー（contentTypeId 1,2,3,4）→ 柔軟性がない
-- - 新：動的なスケジュール（scheduleOrder 1,2,3...N）→ 日によって変更可能
-- 
-- 【参照関係】（外部キー制約なし、論理的な関連のみ）
-- - t_plan_schedule_v2.companyId → m_company.companyId (既存テーブル)
-- - t_plan_schedule_v2.wasteType → m_waste_type.wasteTypeName (マスタ参照)
-- - t_actual_result.companyId → m_company.companyId (既存テーブル)
-- - t_actual_result.wasteType → m_waste_type.wasteTypeName (マスタ参照)
-- ※ アプリケーション側で整合性をチェックすること
-- 
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 計画スケジュールテーブル（メインテーブル）
-- ----------------------------------------------------------------------------
-- 【外部キー制約】なし
-- 【参照関係】
--   - companyId は m_company.companyId を論理的に参照（外部キーなし）
--   - wasteType は m_waste_type.wasteTypeName を論理的に参照（外部キーなし）
-- 【理由】テーブル変更の柔軟性確保、アプリケーション層で整合性管理
-- ----------------------------------------------------------------------------
CREATE TABLE t_plan_schedule_v2 (
    scheduleId INT PRIMARY KEY IDENTITY(1,1),
    year INT NOT NULL,
    month INT NOT NULL,
    version INT NOT NULL DEFAULT 0,  -- 0=最新、1以降=過去のスナップショット
    date DATE NOT NULL,
    scheduleOrder INT NOT NULL,  -- その日の何回目の排出か（1,2,3...）
    wasteType NVARCHAR(50) NOT NULL,  -- 種別：'廃プラ', '汚泥' など
    companyId INT,  -- m_company.companyId を参照（外部キー制約なし）
    vol DECIMAL(10,2),
    plannedTime TIME,  -- 予定時刻
    note NVARCHAR(500),
    createdAt DATETIME DEFAULT GETDATE(),
    updatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_Schedule UNIQUE (year, month, version, date, scheduleOrder, wasteType)
);

-- インデックス作成
CREATE INDEX IX_Schedule_YearMonth ON t_plan_schedule_v2 (year, month, version);
CREATE INDEX IX_Schedule_Date ON t_plan_schedule_v2 (date);

COMMENT ON TABLE t_plan_schedule_v2 IS '柔軟な計画スケジュールテーブル。1レコード = 1回の排出計画。';
COMMENT ON COLUMN t_plan_schedule_v2.scheduleOrder IS 'その日の何回目の排出か（1,2,3...）。日によって異なる値を持つ。';
COMMENT ON COLUMN t_plan_schedule_v2.version IS 'バージョン管理。0=最新（編集可能）、1以降=過去のスナップショット（読取専用）。';

-- ----------------------------------------------------------------------------
-- 2. 実績テーブル（参考：既存システムに合わせる）
-- ----------------------------------------------------------------------------
-- 【外部キー制約】なし
-- 【参照関係】
--   - companyId は m_company.companyId を論理的に参照（外部キーなし）
--   - wasteType は m_waste_type.wasteTypeName を論理的に参照（外部キーなし）
-- 【理由】テーブル変更の柔軟性確保、アプリケーション層で整合性管理
-- ----------------------------------------------------------------------------
CREATE TABLE t_actual_result (
    resultId INT PRIMARY KEY IDENTITY(1,1),
    date DATE NOT NULL,
    actualTime TIME NOT NULL,
    wasteType NVARCHAR(50) NOT NULL,  -- 種別：'廃プラ', '汚泥' など
    companyId INT,  -- m_company.companyId を参照（外部キー制約なし）
    vol DECIMAL(10,2),
    note NVARCHAR(500),
    createdAt DATETIME DEFAULT GETDATE()
);

-- インデックス作成
CREATE INDEX IX_Actual_Date ON t_actual_result (date);
CREATE INDEX IX_Actual_Type ON t_actual_result (wasteType);

COMMENT ON TABLE t_actual_result IS '実績データ。headerIdという概念はなく、date + time + wasteType で計画と紐付ける。';

-- ----------------------------------------------------------------------------
-- 3. 種別マスタ
-- ----------------------------------------------------------------------------
CREATE TABLE m_waste_type (
    wasteTypeId INT PRIMARY KEY IDENTITY(1,1),
    wasteTypeName NVARCHAR(50) NOT NULL UNIQUE,  -- '廃プラ', '汚泥'
    displayOrder INT,
    isActive BIT DEFAULT 1
);

-- 初期データ挿入
INSERT INTO m_waste_type (wasteTypeName, displayOrder, isActive) VALUES ('廃プラ', 1, 1);
INSERT INTO m_waste_type (wasteTypeName, displayOrder, isActive) VALUES ('汚泥', 2, 1);

COMMENT ON TABLE m_waste_type IS '種別マスタ。基本は「廃プラ」「汚泥」の2種類。';

-- ----------------------------------------------------------------------------
-- 4. 月次排出回数設定テーブル
-- ----------------------------------------------------------------------------
CREATE TABLE t_monthly_schedule_config (
    configId INT PRIMARY KEY IDENTITY(1,1),
    year INT NOT NULL,
    month INT NOT NULL,
    maxScheduleCount INT DEFAULT 3,  -- その月の最大排出回数（基本3、特殊月は5など）
    note NVARCHAR(500),
    CONSTRAINT UQ_MonthConfig UNIQUE (year, month)
);

COMMENT ON TABLE t_monthly_schedule_config IS '月次設定。その月の基本排出回数を管理（通常3回、特殊月は5回など）。';
COMMENT ON COLUMN t_monthly_schedule_config.maxScheduleCount IS '月内の最大排出回数。画面の列数を決定するために使用。';

-- ----------------------------------------------------------------------------
-- 5. サンプルデータ挿入（開発用）
-- ----------------------------------------------------------------------------

-- 2025年1月の設定（基本3回排出）
INSERT INTO t_monthly_schedule_config (year, month, maxScheduleCount, note) 
VALUES (2025, 1, 3, '通常月');

-- 2025年2月の設定（特殊月：5回排出）
INSERT INTO t_monthly_schedule_config (year, month, maxScheduleCount, note) 
VALUES (2025, 2, 5, '特殊月：3ヶ月に1度の5回排出月');

-- サンプル計画データ（2025年1月1日）
INSERT INTO t_plan_schedule_v2 (year, month, version, date, scheduleOrder, wasteType, companyId, vol, plannedTime, note)
VALUES 
    (2025, 1, 0, '2025-01-01', 1, '廃プラ', 1, 100.5, '09:00:00', ''),
    (2025, 1, 0, '2025-01-01', 2, '汚泥', 2, 200.0, '13:00:00', ''),
    (2025, 1, 0, '2025-01-01', 3, '廃プラ', 1, 150.0, '17:00:00', '');

-- サンプル計画データ（2025年2月5日：特殊日 - 5回排出）
INSERT INTO t_plan_schedule_v2 (year, month, version, date, scheduleOrder, wasteType, companyId, vol, plannedTime, note)
VALUES 
    (2025, 2, 0, '2025-02-05', 1, '汚泥', 1, 100.0, '08:00:00', '特殊日'),
    (2025, 2, 0, '2025-02-05', 2, '廃プラ', 2, 150.0, '10:00:00', ''),
    (2025, 2, 0, '2025-02-05', 3, '汚泥', 1, 120.0, '13:00:00', ''),
    (2025, 2, 0, '2025-02-05', 4, '廃プラ', 2, 180.0, '15:00:00', ''),
    (2025, 2, 0, '2025-02-05', 5, '汚泥', 1, 200.0, '17:00:00', '');

-- サンプル実績データ
INSERT INTO t_actual_result (date, actualTime, wasteType, companyId, vol, note)
VALUES 
    ('2025-01-01', '09:10:00', '廃プラ', 1, 98.5, '10分遅れ'),
    ('2025-01-01', '13:05:00', '汚泥', 2, 195.0, ''),
    ('2025-01-01', '17:15:00', '廃プラ', 1, 155.0, '');

-- ----------------------------------------------------------------------------
-- 6. 便利なビュー
-- ----------------------------------------------------------------------------

-- 計画と実績の突合ビュー（最も近い時刻の実績とマッチング）
CREATE VIEW v_plan_actual_match AS
WITH RankedActual AS (
    SELECT 
        a.*,
        p.scheduleId,
        p.scheduleOrder,
        p.plannedTime,
        ABS(DATEDIFF(MINUTE, p.plannedTime, a.actualTime)) AS timeDiff,
        ROW_NUMBER() OVER (
            PARTITION BY p.scheduleId 
            ORDER BY ABS(DATEDIFF(MINUTE, p.plannedTime, a.actualTime))
        ) AS rn
    FROM t_plan_schedule_v2 p
    LEFT JOIN t_actual_result a ON 
        p.date = a.date AND 
        p.wasteType = a.wasteType
    WHERE p.version = 0  -- 最新バージョンのみ
)
SELECT 
    scheduleId,
    date,
    scheduleOrder,
    wasteType,
    plannedTime,
    actualTime,
    timeDiff AS timeDifferenceMinutes,
    CASE 
        WHEN actualTime IS NULL THEN '未実施'
        WHEN timeDiff <= 10 THEN '計画通り'
        WHEN timeDiff <= 30 THEN '遅延（許容範囲）'
        ELSE '大幅遅延'
    END AS status
FROM RankedActual
WHERE rn = 1 OR rn IS NULL;

COMMENT ON VIEW v_plan_actual_match IS '計画と実績の突合ビュー。最も時刻が近い実績とマッチングし、遅延状況を判定。';

-- ----------------------------------------------------------------------------
-- 7. ストアドプロシージャ（バージョン作成）
-- ----------------------------------------------------------------------------
CREATE PROCEDURE sp_CreateScheduleVersion
    @Year INT,
    @Month INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @NewVersion INT;
    
    -- 最新バージョンを取得
    SELECT @NewVersion = ISNULL(MAX(version), 0) + 1
    FROM t_plan_schedule_v2
    WHERE year = @Year AND month = @Month;
    
    -- バージョン0のデータを新バージョンにコピー
    INSERT INTO t_plan_schedule_v2 
        (year, month, version, date, scheduleOrder, wasteType, companyId, vol, plannedTime, note, createdAt, updatedAt)
    SELECT 
        year, month, @NewVersion, date, scheduleOrder, wasteType, companyId, vol, plannedTime, note, GETDATE(), GETDATE()
    FROM t_plan_schedule_v2
    WHERE year = @Year AND month = @Month AND version = 0;
    
    SELECT @NewVersion AS NewVersion;
END;

-- ----------------------------------------------------------------------------
-- 8. データ整合性チェック用関数
-- ----------------------------------------------------------------------------

-- その月のデータが存在するかチェック
CREATE FUNCTION fn_HasScheduleData(@Year INT, @Month INT)
RETURNS BIT
AS
BEGIN
    DECLARE @Result BIT;
    
    IF EXISTS (
        SELECT 1 
        FROM t_plan_schedule_v2 
        WHERE year = @Year AND month = @Month AND version = 0
    )
        SET @Result = 1;
    ELSE
        SET @Result = 0;
    
    RETURN @Result;
END;

-- ============================================================================
-- 使用例
-- ============================================================================

-- 1. 月次計画データを取得
/*
SELECT * 
FROM t_plan_schedule_v2 
WHERE year = 2025 AND month = 1 AND version = 0
ORDER BY date, scheduleOrder;
*/

-- 2. 特定日の計画を取得（横軸：時間順、縦軸：種別）
/*
SELECT 
    date,
    scheduleOrder AS '回目',
    wasteType AS '種別',
    companyId AS '会社',
    vol AS '量',
    plannedTime AS '時刻'
FROM t_plan_schedule_v2 
WHERE year = 2025 AND month = 2 AND date = '2025-02-05' AND version = 0
ORDER BY scheduleOrder;
*/

-- 3. 計画と実績の突合
/*
SELECT * FROM v_plan_actual_match
WHERE date BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY date, scheduleOrder;
*/

-- 4. バージョン作成
/*
EXEC sp_CreateScheduleVersion @Year = 2025, @Month = 1;
*/

-- 5. 月次統計（排出回数の分布）
/*
SELECT 
    date,
    COUNT(*) AS scheduleCount
FROM t_plan_schedule_v2
WHERE year = 2025 AND month = 1 AND version = 0
GROUP BY date
ORDER BY date;
*/

