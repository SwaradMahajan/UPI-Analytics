# UPI Payment Failure & Recovery Analytics

A data analytics and product management portfolio project that analyses UPI payment failures across the ecosystem — any PSP app, any bank, any merchant type — and proposes a data-driven product intervention to recover lost payments.

---

## Project Overview

UPI is India's primary digital payment rail, but **4–8% of transactions fail** and ~45% of users who encounter a failure abandon their payment intent within 5 minutes. This project:

1. Generates a realistic 30-day synthetic transaction dataset (20,000+ rows) across 8 banks, 4 PSP apps, and 7 merchant categories
2. Analyses failure patterns using advanced SQL (CTEs, window functions: `LEAD`, `RANK`, `DENSE_RANK`, moving averages)
3. Classifies post-failure user behaviour (retry / method switch / abandon) using `LEAD()` partitioned by user
4. Translates findings into a Product Requirements Document for a **Smart Failure Recovery** feature
5. Visualises the entire analysis in an interactive React dashboard

---

## Key Findings

| Finding | Metric |
|---------|--------|
| Overall failure rate | ~6.2% |
| Top failure code | `INSUFFICIENT_FUNDS` — 30% of failures |
| Two codes drive half of failures | `INSUFFICIENT_FUNDS` + `BANK_SERVER_DOWN` = 50% cumulative |
| Post-failure abandonment | ~45% of failed txns — no follow-up within 5 min |
| Post-failure retry rate | ~40% (WRONG_PIN retry success: 85%; BANK_SERVER_DOWN: 25%) |
| Method-switch rate | ~15% (75% success) |
| Worst-performing banks | BANK_5 (9%) and BANK_6 (10%) — 2.5× ecosystem average |
| Peak-hour impact | Failure rate rises 1.5× during 9–11 AM and 7–10 PM |
| Highest-risk segment | New users (0–90 days vintage) — highest abandonment |
| Highest-risk merchant type | TRAVEL and FUEL categories |

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Database | MySQL 8.0+ |
| Scripting | Python 3 (`faker`, `pymysql`, `numpy`) |
| Analysis | Raw SQL (CTEs, window functions) |
| Dashboard | React 18 + Vite + Tailwind CSS + Recharts + shadcn/ui |
| Docs | Markdown |
| VCS | Git |

---

## Project Structure

```
UPI Analytics/
├── README.md                              ← this file
├── report.md                              ← full technical report
├── schema/
│   └── schema.sql                         ← MySQL database & table definitions
├── data_generation/
│   ├── config.py                          ← all probabilities, bank list, app list
│   └── generate_transactions.py           ← synthetic data generator
├── analysis/
│   ├── 01_failure_funnel.sql              ← overall failure split + cumulative %
│   ├── 02_failure_by_bank_and_app.sql     ← bank × app failure matrix + RANK()
│   ├── 03_hourly_failure_pattern.sql      ← hourly trend + 3-hour moving average
│   ├── 04_next_action_recovery.sql        ← LEAD()-based recovery classification
│   └── 05_cohort_and_ranking.sql          ← vintage / city / category cohorts + DENSE_RANK()
├── prd/
│   └── UPI_Smart_Recovery_PRD.md          ← product requirements document
├── assets/
│   └── findings_screenshot.png            ← dashboard screenshot
└── UPI Analytics Dashboard Frontend/      ← React/Vite interactive dashboard
```

---

## Quick Start

### 1. Database setup

Ensure MySQL 8.0+ is running, then:

```bash
mysql -u root -p < schema/schema.sql
```

### 2. Install Python dependencies

```bash
pip install faker pymysql numpy
```

### 3. Configure database connection

Edit `DB_CONFIG` in `data_generation/config.py`:

```python
DB_CONFIG = {
    "host"    : "localhost",
    "port"    : 3306,
    "user"    : "root",
    "password": "your_password",
    "database": "upi_analytics",
}
```

### 4. Generate synthetic data

```bash
cd data_generation
python generate_transactions.py
```

The script will print a summary like:
```
Total transactions : 22,450
Failed             : 1,392  (6.20%)
  INSUFFICIENT_FUNDS  418  (30.0%)
  BANK_SERVER_DOWN    278  (20.0%)
  ...
```

### 5. Run SQL analysis

From the MySQL shell:
```sql
source analysis/01_failure_funnel.sql
source analysis/02_failure_by_bank_and_app.sql
source analysis/03_hourly_failure_pattern.sql
source analysis/04_next_action_recovery.sql
source analysis/05_cohort_and_ranking.sql
```

### 6. Launch the dashboard

```bash
cd "UPI Analytics Dashboard Frontend"
pnpm install
pnpm dev
```

Dashboard opens at **http://localhost:5173**

---

## SQL Analysis Files

<details>
<summary>Technical Implementation — SQL Highlights</summary>

### `01_failure_funnel.sql` — Failure Funnel
Aggregates success/failure split and ranks failure codes with a running cumulative percentage using `SUM() OVER`.

### `02_failure_by_bank_and_app.sql` — Bank & App Breakdown
Uses `RANK() OVER (ORDER BY failure_rate DESC)` to surface outlier banks, and builds a bank × app failure-rate matrix to isolate whether the problem is bank-side or app-side.

### `03_hourly_failure_pattern.sql` — Time Pattern Analysis
Computes failure rate by hour of day and applies a 3-hour moving average:
```sql
AVG(failure_rate) OVER (ORDER BY txn_hour ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
```
Also compares weekday vs. weekend and peak vs. off-peak failure rates.

### `04_next_action_recovery.sql` — LEAD()-Based Recovery (Core Query)
Uses `LEAD()` partitioned by `user_id` to classify every post-failure action:
```sql
LEAD(transaction_time) OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_time,
LEAD(status)           OVER (PARTITION BY user_id ORDER BY transaction_time) AS next_status
```
Outcomes: `RETRY_RECOVERED`, `RETRY_FAILED`, `SWITCHED_METHOD`, `ABANDONED`.
Also estimates total INR value lost in abandoned transactions.

### `05_cohort_and_ranking.sql` — Cohort & Ranking
Buckets users by vintage (0–90 / 91–365 / 365+ days), compares abandonment by city tier, and uses `DENSE_RANK()` to find the top 3 failure-prone merchant categories per bank.

</details>

---

## PRD Summary

The [UPI Smart Recovery PRD](prd/UPI_Smart_Recovery_PRD.md) proposes failure-code-specific UX interventions:

| Failure Code | Proposed UX |
|-------------|-------------|
| `WRONG_PIN` / `TIMEOUT` | One-tap "Retry Now" with duplicate-debit status check |
| `BANK_SERVER_DOWN` | Auto-suggest alternate linked bank / UPI credit line |
| `INSUFFICIENT_FUNDS` | Route to alternate funding source or partial-pay |
| `LIMIT_EXCEEDED` | Explain limit + offer split payment |
| All codes | Real-time bank health indicator before payment initiation |

**Target:** Recovery rate ↑ from ~55% → ≥70%, 5-minute abandonment ↓ from ~45% → ≤30%.

---

## Dashboard

The [UPI Analytics Dashboard Frontend](UPI%20Analytics%20Dashboard%20Frontend/) is a production-quality React SPA built with Vite, Tailwind CSS, Recharts, and shadcn/ui. It visualises:

- KPI summary cards (total transactions, success rate, MDR rejections, 5-min churn)
- Transaction status distribution
- Failure funnel with cumulative %
- Post-failure churn analysis
- Recovery opportunity sizing
- Performance targets
- Key findings table

---

## Future Scope

- Replace synthetic data with NPCI aggregate statistics for real-world calibration
- Streamlit / Metabase live failure monitoring dashboard
- XGBoost model to predict abandonment probability per failure
- A/B test power analysis for Smart Recovery UI rollout
- Support UPI Lite, UPI credit line, and international UPI as dimensions
- Anomaly detection on hourly bank failure rates to auto-flag outages
