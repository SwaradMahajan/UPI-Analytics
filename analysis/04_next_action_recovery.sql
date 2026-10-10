-- ============================================================
-- 04_next_action_recovery.sql
-- Next-Action Recovery Analysis (core technical deliverable)
-- Uses LEAD() window function to classify post-failure actions
-- Insight: What % of failed payments end in abandonment, and
--          how much value is lost?
-- ============================================================

USE upi_analytics;

-- ----------------------------------------------------------
-- 1. Core recovery classification
-- ----------------------------------------------------------
WITH NextAction AS (
    SELECT
        user_id,
        transaction_id,
        transaction_time,
        status,
        failure_code,
        amount,
        psp_app,
        funding_source,
        LEAD(transaction_time)  OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_time,
        LEAD(status)            OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_status,
        LEAD(psp_app)           OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_app,
        LEAD(funding_source)    OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_funding
    FROM Transactions
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
        END AS outcome
    FROM NextAction
    WHERE status = 'FAILED'
)
SELECT
    failure_code,
    outcome,
    COUNT(*)                                                                           AS cnt,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY failure_code), 2)       AS pct_within_code
FROM Classified
GROUP BY failure_code, outcome
ORDER BY failure_code, cnt DESC;


-- ----------------------------------------------------------
-- 2. Overall outcome split (recovered / switched / abandoned)
-- ----------------------------------------------------------
WITH NextAction AS (
    SELECT
        user_id,
        transaction_time,
        status,
        failure_code,
        amount,
        psp_app,
        funding_source,
        LEAD(transaction_time)  OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_time,
        LEAD(status)            OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_status,
        LEAD(psp_app)           OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_app,
        LEAD(funding_source)    OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_funding
    FROM Transactions
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
        END AS outcome
    FROM NextAction
    WHERE status = 'FAILED'
)
SELECT
    outcome,
    COUNT(*)                                                           AS cnt,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2)                AS pct_of_all_failures,
    ROUND(SUM(amount), 2)                                              AS total_amount_at_risk
FROM Classified
GROUP BY outcome
ORDER BY cnt DESC;


-- ----------------------------------------------------------
-- 3. Lost-value estimate (abandoned failed transactions)
-- ----------------------------------------------------------
WITH NextAction AS (
    SELECT
        user_id,
        transaction_time,
        status,
        failure_code,
        amount,
        psp_app,
        funding_source,
        LEAD(transaction_time)  OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_time,
        LEAD(status)            OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_status,
        LEAD(psp_app)           OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_app,
        LEAD(funding_source)    OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_funding
    FROM Transactions
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
        END AS outcome
    FROM NextAction
    WHERE status = 'FAILED'
)
SELECT
    COUNT(*)           AS abandoned_transactions,
    ROUND(SUM(amount), 2) AS lost_value_inr,
    ROUND(AVG(amount), 2) AS avg_abandoned_amount
FROM Classified
WHERE outcome = 'ABANDONED';


-- ----------------------------------------------------------
-- 4. Abandonment rate by failure_code
-- ----------------------------------------------------------
WITH NextAction AS (
    SELECT
        user_id,
        transaction_time,
        status,
        failure_code,
        amount,
        psp_app,
        funding_source,
        LEAD(transaction_time)  OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_time,
        LEAD(status)            OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_status,
        LEAD(psp_app)           OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_app,
        LEAD(funding_source)    OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_funding
    FROM Transactions
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
        END AS outcome
    FROM NextAction
    WHERE status = 'FAILED'
)
SELECT
    failure_code,
    COUNT(*)                                                                     AS total_failures,
    SUM(CASE WHEN outcome = 'ABANDONED' THEN 1 ELSE 0 END)                       AS abandoned_count,
    ROUND(SUM(CASE WHEN outcome = 'ABANDONED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS abandonment_rate_pct,
    ROUND(SUM(CASE WHEN outcome = 'ABANDONED' THEN amount ELSE 0 END), 2)        AS lost_value_inr
FROM Classified
GROUP BY failure_code
ORDER BY abandonment_rate_pct DESC;
