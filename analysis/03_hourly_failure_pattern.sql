-- ============================================================
-- 03_hourly_failure_pattern.sql
-- Time Pattern Analysis
-- Insight: Are failures load-driven (peak hours) or constant?
-- ============================================================

USE upi_analytics;

-- ----------------------------------------------------------
-- 1. Failure rate by hour of day
-- ----------------------------------------------------------
WITH HourStats AS (
    SELECT
        HOUR(transaction_time)                              AS txn_hour,
        COUNT(*)                                            AS total_txns,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END)  AS failed_txns
    FROM Transactions
    GROUP BY txn_hour
)
SELECT
    txn_hour,
    total_txns,
    failed_txns,
    ROUND(failed_txns * 100.0 / total_txns, 2)  AS failure_rate_pct,
    -- 3-hour moving average of failure rate
    ROUND(
        AVG(failed_txns * 100.0 / total_txns)
        OVER (ORDER BY txn_hour ROWS BETWEEN 2 PRECEDING AND CURRENT ROW),
        2
    )                                            AS moving_avg_3h
FROM HourStats
ORDER BY txn_hour;


-- ----------------------------------------------------------
-- 2. Weekday vs weekend comparison
-- ----------------------------------------------------------
WITH DayType AS (
    SELECT
        CASE WHEN DAYOFWEEK(transaction_time) IN (1, 7) THEN 'WEEKEND' ELSE 'WEEKDAY' END AS day_type,
        status
    FROM Transactions
)
SELECT
    day_type,
    COUNT(*)                                                        AS total_txns,
    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END)              AS failed_txns,
    ROUND(
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
        2
    )                                                               AS failure_rate_pct
FROM DayType
GROUP BY day_type
ORDER BY day_type;


-- ----------------------------------------------------------
-- 3. Peak vs off-peak failure comparison
-- ----------------------------------------------------------
WITH PeakStats AS (
    SELECT
        CASE
            WHEN HOUR(transaction_time) IN (9,10,11,19,20,21) THEN 'PEAK'
            ELSE 'OFF_PEAK'
        END                                                         AS period,
        status
    FROM Transactions
)
SELECT
    period,
    COUNT(*)                                                        AS total_txns,
    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END)              AS failed_txns,
    ROUND(
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
        2
    )                                                               AS failure_rate_pct
FROM PeakStats
GROUP BY period
ORDER BY failure_rate_pct DESC;


-- ----------------------------------------------------------
-- 4. Daily failure trend (for time-series chart)
-- ----------------------------------------------------------
SELECT
    DATE(transaction_time)                              AS txn_date,
    COUNT(*)                                            AS total_txns,
    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END)  AS failed_txns,
    ROUND(
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
        2
    )                                                    AS failure_rate_pct
FROM Transactions
GROUP BY txn_date
ORDER BY txn_date;
