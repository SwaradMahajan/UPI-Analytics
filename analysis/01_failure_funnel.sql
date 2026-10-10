-- ============================================================
-- 01_failure_funnel.sql
-- Failure Funnel Analysis
-- Insight: Which 2 failure codes drive the majority, and
--          which are user-fixable vs. system-side?
-- ============================================================

USE upi_analytics;

-- ----------------------------------------------------------
-- 1. Overall success vs. failure volume & percentage
-- ----------------------------------------------------------
SELECT
    status,
    COUNT(*)                                           AS txn_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS pct_of_total
FROM Transactions
GROUP BY status
ORDER BY txn_count DESC;


-- ----------------------------------------------------------
-- 2. Failure volume & share by failure_code
--    + running cumulative % (window function)
-- ----------------------------------------------------------
WITH FailureCodes AS (
    SELECT
        failure_code,
        COUNT(*) AS failure_count
    FROM Transactions
    WHERE status = 'FAILED'
    GROUP BY failure_code
),
Ranked AS (
    SELECT
        failure_code,
        failure_count,
        ROUND(failure_count * 100.0 / SUM(failure_count) OVER (), 2) AS pct_of_failures,
        ROUND(
            SUM(failure_count) OVER (ORDER BY failure_count DESC
                                     ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
            * 100.0 / SUM(failure_count) OVER ()
        , 2)                                                           AS cumulative_pct
    FROM FailureCodes
)
SELECT
    failure_code,
    failure_count,
    pct_of_failures,
    cumulative_pct,
    CASE
        WHEN failure_code IN ('WRONG_PIN', 'INSUFFICIENT_FUNDS', 'LIMIT_EXCEEDED')
            THEN 'USER_FIXABLE'
        ELSE 'SYSTEM_SIDE'
    END AS failure_category
FROM Ranked
ORDER BY failure_count DESC;


-- ----------------------------------------------------------
-- 3. User-fixable vs. system-side summary
-- ----------------------------------------------------------
SELECT
    CASE
        WHEN failure_code IN ('WRONG_PIN', 'INSUFFICIENT_FUNDS', 'LIMIT_EXCEEDED')
            THEN 'USER_FIXABLE'
        ELSE 'SYSTEM_SIDE'
    END                                                AS failure_category,
    COUNT(*)                                           AS failure_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS pct_of_failures
FROM Transactions
WHERE status = 'FAILED'
GROUP BY failure_category
ORDER BY failure_count DESC;
