-- ============================================================
-- 05_cohort_and_ranking.sql
-- Cohort & Ranking Analysis
-- Insight: Which user/merchant segments are most at risk and
--          most likely to churn after a failure?
-- ============================================================

USE upi_analytics;

-- ----------------------------------------------------------
-- 1. User vintage cohorts — failure rate & abandonment rate
-- ----------------------------------------------------------
WITH NextAction AS (
    SELECT
        t.user_id,
        t.transaction_time,
        t.status,
        t.failure_code,
        t.amount,
        t.psp_app,
        t.funding_source,
        u.account_vintage_days,
        LEAD(t.transaction_time)  OVER (PARTITION BY t.user_id ORDER BY t.transaction_time) AS next_time,
        LEAD(t.status)            OVER (PARTITION BY t.user_id ORDER BY t.transaction_time) AS next_status,
        LEAD(t.psp_app)           OVER (PARTITION BY t.user_id ORDER BY t.transaction_time) AS next_app,
        LEAD(t.funding_source)    OVER (PARTITION BY t.user_id ORDER BY t.transaction_time) AS next_funding
    FROM Transactions t
    JOIN Users u ON t.user_id = u.user_id
),
Classified AS (
    SELECT *,
        CASE
            WHEN next_time IS NULL
                 OR TIMESTAMPDIFF(MINUTE, transaction_time, next_time) > 5 THEN 'ABANDONED'
            WHEN next_app = psp_app AND next_funding = funding_source
                 AND next_status = 'SUCCESS'                             THEN 'RETRY_RECOVERED'
            WHEN next_app = psp_app AND next_funding = funding_source
                 AND next_status = 'FAILED'                              THEN 'RETRY_FAILED'
            ELSE 'SWITCHED_METHOD'
        END AS outcome,
        CASE
            WHEN account_vintage_days BETWEEN 0   AND 90  THEN '0-90 days (New)'
            WHEN account_vintage_days BETWEEN 91  AND 365 THEN '91-365 days (Maturing)'
            ELSE '365+ days (Established)'
        END AS vintage_bucket
    FROM NextAction
    WHERE status = 'FAILED'
)
SELECT
    vintage_bucket,
    COUNT(*)                                                                              AS total_failures,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2)                                   AS pct_of_failures,
    ROUND(SUM(CASE WHEN outcome = 'ABANDONED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)  AS abandonment_rate_pct
FROM Classified
GROUP BY vintage_bucket
ORDER BY abandonment_rate_pct DESC;


-- ----------------------------------------------------------
-- 2. Failure & abandonment rate by city_tier
-- ----------------------------------------------------------
SELECT
    u.city_tier,
    COUNT(t.transaction_id)                                              AS total_txns,
    SUM(CASE WHEN t.status = 'FAILED' THEN 1 ELSE 0 END)                AS failed_txns,
    ROUND(
        SUM(CASE WHEN t.status = 'FAILED' THEN 1 ELSE 0 END) * 100.0 / COUNT(t.transaction_id),
        2
    )                                                                    AS failure_rate_pct
FROM Transactions t
JOIN Users u ON t.user_id = u.user_id
GROUP BY u.city_tier
ORDER BY failure_rate_pct DESC;


-- ----------------------------------------------------------
-- 3. Failure & abandonment rate by merchant_category
-- ----------------------------------------------------------
WITH NextAction AS (
    SELECT
        t.user_id,
        t.transaction_time,
        t.status,
        t.amount,
        t.psp_app,
        t.funding_source,
        m.merchant_category,
        LEAD(t.transaction_time)  OVER (PARTITION BY t.user_id ORDER BY t.transaction_time) AS next_time,
        LEAD(t.status)            OVER (PARTITION BY t.user_id ORDER BY t.transaction_time) AS next_status,
        LEAD(t.psp_app)           OVER (PARTITION BY t.user_id ORDER BY t.transaction_time) AS next_app,
        LEAD(t.funding_source)    OVER (PARTITION BY t.user_id ORDER BY t.transaction_time) AS next_funding
    FROM Transactions t
    JOIN Merchants m ON t.merchant_id = m.merchant_id
),
Classified AS (
    SELECT *,
        CASE
            WHEN next_time IS NULL
                 OR TIMESTAMPDIFF(MINUTE, transaction_time, next_time) > 5 THEN 'ABANDONED'
            ELSE 'ENGAGED'
        END AS outcome
    FROM NextAction
    WHERE status = 'FAILED'
)
SELECT
    merchant_category,
    COUNT(*)                                                                              AS total_failures,
    ROUND(SUM(CASE WHEN outcome = 'ABANDONED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)  AS abandonment_rate_pct,
    ROUND(SUM(CASE WHEN outcome = 'ABANDONED' THEN amount ELSE 0 END), 2)                 AS lost_value_inr
FROM Classified
GROUP BY merchant_category
ORDER BY abandonment_rate_pct DESC;


-- ----------------------------------------------------------
-- 4. Top 3 failure-prone merchant categories per bank
--    (using DENSE_RANK)
-- ----------------------------------------------------------
WITH BankCategoryStats AS (
    SELECT
        t.remitter_bank,
        m.merchant_category,
        COUNT(*)                                            AS total_txns,
        SUM(CASE WHEN t.status = 'FAILED' THEN 1 ELSE 0 END) AS failed_txns,
        ROUND(
            SUM(CASE WHEN t.status = 'FAILED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
            2
        )                                                   AS failure_rate_pct
    FROM Transactions t
    JOIN Merchants m ON t.merchant_id = m.merchant_id
    GROUP BY t.remitter_bank, m.merchant_category
),
Ranked AS (
    SELECT *,
        DENSE_RANK() OVER (PARTITION BY remitter_bank ORDER BY failure_rate_pct DESC) AS dr
    FROM BankCategoryStats
)
SELECT remitter_bank, merchant_category, total_txns, failed_txns, failure_rate_pct, dr
FROM Ranked
WHERE dr <= 3
ORDER BY remitter_bank, dr;
