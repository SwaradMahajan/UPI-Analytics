-- ============================================================
-- 02_failure_by_bank_and_app.sql
-- Bank & App Breakdown
-- Insight: Which banks/apps are outliers, and is the problem
--          bank-side or app-side?
-- ============================================================

USE upi_analytics;

-- ----------------------------------------------------------
-- 1. Failure rate per remitter_bank (ranked)
-- ----------------------------------------------------------
WITH BankStats AS (
    SELECT
        remitter_bank,
        COUNT(*)                                           AS total_txns,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed_txns
    FROM Transactions
    GROUP BY remitter_bank
)
SELECT
    remitter_bank,
    total_txns,
    failed_txns,
    ROUND(failed_txns * 100.0 / total_txns, 2)  AS failure_rate_pct,
    RANK() OVER (ORDER BY failed_txns * 1.0 / total_txns DESC) AS failure_rank
FROM BankStats
ORDER BY failure_rate_pct DESC;


-- ----------------------------------------------------------
-- 2. Failure rate per psp_app
-- ----------------------------------------------------------
WITH AppStats AS (
    SELECT
        psp_app,
        COUNT(*)                                           AS total_txns,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed_txns
    FROM Transactions
    GROUP BY psp_app
)
SELECT
    psp_app,
    total_txns,
    failed_txns,
    ROUND(failed_txns * 100.0 / total_txns, 2)  AS failure_rate_pct,
    RANK() OVER (ORDER BY failed_txns * 1.0 / total_txns DESC) AS failure_rank
FROM AppStats
ORDER BY failure_rate_pct DESC;


-- ----------------------------------------------------------
-- 3. Bank x App matrix of failure rate
-- ----------------------------------------------------------
SELECT
    remitter_bank,
    psp_app,
    COUNT(*)                                            AS total_txns,
    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END)  AS failed_txns,
    ROUND(
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
        2
    )                                                    AS failure_rate_pct
FROM Transactions
GROUP BY remitter_bank, psp_app
ORDER BY failure_rate_pct DESC;


-- ----------------------------------------------------------
-- 4. Top failure code per bank
-- ----------------------------------------------------------
WITH BankCodeCounts AS (
    SELECT
        remitter_bank,
        failure_code,
        COUNT(*) AS cnt,
        RANK() OVER (PARTITION BY remitter_bank ORDER BY COUNT(*) DESC) AS rnk
    FROM Transactions
    WHERE status = 'FAILED'
    GROUP BY remitter_bank, failure_code
)
SELECT remitter_bank, failure_code, cnt
FROM BankCodeCounts
WHERE rnk = 1
ORDER BY remitter_bank;
