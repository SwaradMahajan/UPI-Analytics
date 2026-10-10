# AGENT BUILD PROMPT — UPI Payment Failure & Recovery Analytics (Universal)

You are an autonomous coding agent operating in a full project workspace with terminal, file system, and MySQL access. Build the complete project described below end-to-end — schema, synthetic data, SQL analysis, PRD, and GitHub-ready packaging — without stopping for confirmation unless a blocking error occurs. Verify each task's output before moving to the next, and leave the repo in a clean, submittable state.

---

## OBJECTIVE

Build a data analytics + product management portfolio project that analyzes **UPI payment failures across the ecosystem** (any PSP app, any bank, any merchant type) and answers:

1. Where and why do UPI transactions fail?
2. What do users do immediately after a failure — retry, switch method, or abandon?
3. Which product intervention (smart retry / fallback / bank routing) would recover the most lost payments?

The project is **not tied to any single company or app**. All entities (PSP apps, banks, merchant categories) are generic and configurable.

---

## TECH STACK (use exactly this — do not substitute)

- **Database:** MySQL 8.0+ (window functions required)
- **Scripting:** Python 3
- **Python libraries:** `faker`, `pymysql`, `numpy`
- **Analysis:** Raw SQL (aggregation, CTEs, window functions)
- **Docs:** Markdown (README.md, PRD, report.md)
- **VCS:** Git / GitHub

---

## TASK 1 — Create the project scaffold

Create this exact file tree:

```
UPI-Payment-Failure-Analytics/
├── README.md
├── report.md
├── schema/
│   └── schema.sql
├── data_generation/
│   ├── config.py                    # probabilities, bank list, app list
│   └── generate_transactions.py
├── analysis/
│   ├── 01_failure_funnel.sql
│   ├── 02_failure_by_bank_and_app.sql
│   ├── 03_hourly_failure_pattern.sql
│   ├── 04_next_action_recovery.sql
│   └── 05_cohort_and_ranking.sql
├── prd/
│   └── UPI_Smart_Recovery_PRD.md
└── assets/
    └── findings_screenshot.png      # placeholder ok
```

---

## TASK 2 — Database schema

In `schema/schema.sql`, create a database `upi_analytics` with these tables:

```sql
CREATE TABLE Users (
    user_id VARCHAR(50) PRIMARY KEY,
    account_vintage_days INT,
    primary_psp_app VARCHAR(30),        -- e.g. APP_A, APP_B, APP_C
    home_bank VARCHAR(30),
    city_tier TINYINT                   -- 1, 2, 3
);

CREATE TABLE Merchants (
    merchant_id VARCHAR(50) PRIMARY KEY,
    merchant_category VARCHAR(50),      -- GROCERY, FOOD, FUEL, UTILITIES, RETAIL, P2P_TRANSFER, TRAVEL
    merchant_size VARCHAR(10)           -- SMALL, MEDIUM, LARGE
);

CREATE TABLE Transactions (
    transaction_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    merchant_id VARCHAR(50),
    transaction_time TIMESTAMP,
    amount DECIMAL(10,2),
    txn_type VARCHAR(10),               -- P2P or P2M
    psp_app VARCHAR(30),
    remitter_bank VARCHAR(30),
    funding_source VARCHAR(20),         -- BANK_ACCOUNT, CREDIT_LINE, WALLET
    status VARCHAR(10),                 -- SUCCESS, FAILED
    failure_code VARCHAR(40),           -- NULL when SUCCESS
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (merchant_id) REFERENCES Merchants(merchant_id)
);

CREATE INDEX idx_txn_user_time ON Transactions(user_id, transaction_time);
CREATE INDEX idx_txn_status ON Transactions(status, failure_code);
```

Execute against local MySQL. Verify with `SHOW TABLES;`.

---

## TASK 3 — Synthetic data generation

In `data_generation/config.py`, define editable constants: list of ~8 generic banks (`BANK_1`…`BANK_8`) each with its own base failure rate, 3–4 generic PSP apps, merchant categories, and all probabilities below.

In `data_generation/generate_transactions.py`, using `Faker`, `numpy`, and `pymysql`:

1. Insert ~1,000 users and ~300 merchants.
2. Generate **~20,000 transactions** over a 30-day window with realistic patterns:
   - **Hourly load:** peaks at 9–11 AM and 7–10 PM; failure rate rises ~1.5x during peaks.
   - **Failure codes** (only on `FAILED`), weighted roughly:
     - `INSUFFICIENT_FUNDS` (30%)
     - `BANK_SERVER_DOWN` (20%, concentrated in 2–3 weaker banks)
     - `TIMEOUT` (18%)
     - `WRONG_PIN` (12%)
     - `LIMIT_EXCEEDED` (10%, more likely for amount > ₹10,000)
     - `TECHNICAL_DECLINE` (10%)
   - Overall failure rate target: **4–8%**, varying by bank, app, and hour.
3. **Behavior fork after every failure** (the key behavioral logic):
   - **40%** retry the same payment 10–90 seconds later (success probability depends on failure code: `WRONG_PIN` ~85%, `TIMEOUT` ~70%, `BANK_SERVER_DOWN` ~25%, `INSUFFICIENT_FUNDS` ~15%).
   - **15%** switch method (different `funding_source` or `psp_app`) within 5 minutes; success ~75%.
   - **45%** abandon — no further transaction from that user for at least 30 minutes.
4. Batch-insert (500–1000 rows per commit). Never single-row insert.
5. Print summary: total rows, failure rate, retries, method switches, abandonments, and a failure-code breakdown.

Verify `SELECT COUNT(*) FROM Transactions;` ≈ 20,000+.

---

## TASK 4 — Failure funnel (`01_failure_funnel.sql`)

Write queries that return:
- Overall success vs. failure volume and percentage.
- Failure volume and share by `failure_code`, ordered descending, with a running cumulative % (window function `SUM() OVER`).

Insight to extract: *which 2 failure codes drive the majority of failures, and which are user-fixable vs. system-side?*

---

## TASK 5 — Bank and app breakdown (`02_failure_by_bank_and_app.sql`)

- Failure rate per `remitter_bank` and per `psp_app` (volume, failures, failure %).
- Use `RANK() OVER (ORDER BY failure_rate DESC)` to rank banks.
- Add a bank × app matrix of failure rate to spot problem pairings.

Insight: *which banks/apps are outliers, and is the problem bank-side or app-side?*

---

## TASK 6 — Time pattern (`03_hourly_failure_pattern.sql`)

- Failure rate by hour of day.
- 3-hour **moving average** failure rate using `AVG() OVER (ORDER BY hour ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`.
- Weekday vs. weekend comparison.

Insight: *are failures load-driven (peak hours) or constant?*

---

## TASK 7 — Next-action recovery analysis (`04_next_action_recovery.sql`) — core technical deliverable

Use `LEAD()` partitioned by `user_id`, ordered by `transaction_time`, to classify what happens after each failed transaction:

```sql
WITH NextAction AS (
    SELECT
        user_id,
        transaction_time,
        status,
        failure_code,
        amount,
        psp_app,
        funding_source,
        LEAD(transaction_time) OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_time,
        LEAD(status)           OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_status,
        LEAD(psp_app)          OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_app,
        LEAD(funding_source)   OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_funding
    FROM Transactions
),
Classified AS (
    SELECT *,
        CASE
            WHEN next_time IS NULL
                 OR TIMESTAMPDIFF(MINUTE, transaction_time, next_time) > 5 THEN 'ABANDONED'
            WHEN next_app = psp_app AND next_funding = funding_source
                 AND next_status = 'SUCCESS' THEN 'RETRY_RECOVERED'
            WHEN next_app = psp_app AND next_funding = funding_source
                 AND next_status = 'FAILED' THEN 'RETRY_FAILED'
            ELSE 'SWITCHED_METHOD'
        END AS outcome
    FROM NextAction
    WHERE status = 'FAILED'
)
SELECT failure_code, outcome, COUNT(*) AS cnt,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY failure_code), 2) AS pct_within_code
FROM Classified
GROUP BY failure_code, outcome
ORDER BY failure_code, cnt DESC;
```

Also produce:
- Overall outcome split (recovered / switched / abandoned).
- **Lost-value estimate:** `SUM(amount)` of abandoned failed transactions.
- Abandonment rate by `failure_code` — identify the codes with the highest abandonment.

Headline insight: *"X% of failed UPI payments end in abandonment within 5 minutes, representing ₹Y in lost transaction value."*

---

## TASK 8 — Cohort and ranking (`05_cohort_and_ranking.sql`)

- Bucket users by `account_vintage_days` (0–90, 91–365, 365+) and compare failure rate and abandonment rate per bucket.
- Compare by `city_tier` and by `merchant_category`.
- Use `DENSE_RANK()` to find the top 3 failure-prone merchant categories per bank.

Insight: *which user/merchant segments are most at risk and most likely to churn after a failure?*

---

## TASK 9 — PRD (`prd/UPI_Smart_Recovery_PRD.md`)

Write a 1–2 page PRD in this exact structure:

- **Problem Statement** — UPI is high-volume, but failed payments often end in abandonment; users get generic error screens with no guidance.
- **Data Evidence** — actual numbers from Tasks 4–8 (failure rate, top failure codes, abandonment %, lost value, outlier banks).
- **Proposed Solution: Smart Failure Recovery** — failure-code-specific UX:
  - `WRONG_PIN` / `TIMEOUT` → one-tap "Retry now" with status check to prevent duplicate debits.
  - `BANK_SERVER_DOWN` → auto-suggest an alternate linked bank account.
  - `INSUFFICIENT_FUNDS` → suggest alternate funding source or partial-pay.
  - `LIMIT_EXCEEDED` → explain limit and offer split payment.
  - Real-time bank health indicator to pre-warn users on degraded banks.
- **Success Metrics** — recovery rate (retry + switch), reduction in 5-minute abandonment, fallback CTA adoption, change in overall payment success rate; guardrail: duplicate-debit/complaint rate.
- **Risks & Open Questions** — duplicate transaction risk, bank-side dependency, privacy of bank-health signals.

---

## TASK 10 — report.md

Summarize the project at the repo root: Tech Stack, Database, File Tree, Steps to Create, Execution Steps, Key Findings (real numbers), Future Scope.

---

## TASK 11 — Package for GitHub

1. Initialize git repo `UPI-Payment-Failure-Analytics`.
2. `README.md`: executive summary (2–3 sentences), embedded PRD, key findings table, and all SQL under a collapsible `<details><summary>Technical Implementation</summary>` block.
3. Commit: `Initial commit: UPI payment failure & recovery analytics + PRD`.
4. Output a 2–3 line resume bullet for a "UPI Payment Failure Recovery Analytics" project explicitly mentioning MySQL, window functions (LEAD, RANK, moving averages), and PRD drafting.

---

## VERIFICATION CHECKLIST

- [ ] `schema.sql` runs cleanly on a fresh MySQL 8 instance
- [ ] Generator inserts ~20,000 transactions without error
- [ ] Overall failure rate falls in the 4–8% range
- [ ] Failure code shares roughly match configured weights
- [ ] Recovery query outcome split roughly matches the 40/15/45 retry/switch/abandon design
- [ ] All five analysis files execute without error
- [ ] PRD contains all 5 sections with real numbers
- [ ] README renders correctly with collapsible SQL section
- [ ] File tree matches Task 1 exactly
- [ ] Git repo initialized and committed

---

## FUTURE SCOPE (include in report.md)

- Replace synthetic data with public NPCI aggregate statistics for calibration.
- Build a Streamlit/Metabase dashboard for live failure monitoring.
- Train a logistic regression / XGBoost model to predict abandonment probability per failure.
- Simulate A/B test of the smart recovery UI with power analysis for sample size.
- Add UPI Lite, UPI credit line, and international UPI as additional dimensions.
- Anomaly detection on hourly bank failure rates to auto-flag outages.

---

## OUTPUT FORMAT

When finished, report back with:
1. Completed checklist
2. Actual numeric results from Tasks 4–8
3. Final file tree as built
4. Any deviations from spec and why

Do not ask for permission mid-task unless there is a genuine blocker (e.g. MySQL not installed, missing credentials) — in that case, stop and report the blocker clearly.
