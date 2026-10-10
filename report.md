# UPI Payment Failure & Recovery Analytics — Technical Report

## Tech Stack

| Layer | Tool |
|-------|------|
| Database | MySQL 8.0+ (window functions: LEAD, RANK, DENSE_RANK, moving AVG) |
| Scripting | Python 3.13 |
| Python Libraries | `faker`, `pymysql`, `numpy` |
| Analysis | Raw SQL (CTEs, aggregation, window functions) |
| Docs | Markdown |
| VCS | Git |
| Dashboard | React 18 + Vite + Tailwind CSS + Recharts + shadcn/ui |

---

## Database

**Database:** `upi_analytics` (MySQL 8.0+)

**Tables:**
- `Users` — 1,000 synthetic users with vintage, PSP app preference, home bank, city tier
- `Merchants` — 300 merchants across 7 categories and 3 size tiers
- `Transactions` — 20,000+ rows covering a 30-day window with realistic failure patterns

**Indexes:**
- `idx_txn_user_time` on `(user_id, transaction_time)` — used by LEAD() window queries
- `idx_txn_status` on `(status, failure_code)` — used by failure funnel aggregations

---

## File Tree

```
UPI Analytics/
├── README.md
├── report.md
├── schema/
│   └── schema.sql
├── data_generation/
│   ├── config.py
│   └── generate_transactions.py
├── analysis/
│   ├── 01_failure_funnel.sql
│   ├── 02_failure_by_bank_and_app.sql
│   ├── 03_hourly_failure_pattern.sql
│   ├── 04_next_action_recovery.sql
│   └── 05_cohort_and_ranking.sql
├── prd/
│   └── UPI_Smart_Recovery_PRD.md
├── assets/
│   └── findings_screenshot.png
└── UPI Analytics Dashboard Frontend/
    └── (React/Vite dashboard — see below)
```

---

## Steps to Create

1. **Schema** — `schema/schema.sql` creates the `upi_analytics` database and three tables
2. **Config** — `data_generation/config.py` centralises all probabilities and constants
3. **Data generation** — `generate_transactions.py` produces ~20,000 transactions with realistic hourly load, bank-specific failure rates, post-failure behaviour forks (retry / switch / abandon)
4. **Failure funnel** — `01_failure_funnel.sql` aggregates overall success/failure split and ranks failure codes with cumulative %
5. **Bank/app analysis** — `02_failure_by_bank_and_app.sql` surfaces outlier banks/apps and builds a bank × app failure matrix
6. **Time patterns** — `03_hourly_failure_pattern.sql` uses a 3-hour moving average to detect load-driven vs constant failures
7. **Recovery analysis** — `04_next_action_recovery.sql` uses `LEAD()` to classify every post-failure action into RETRY_RECOVERED / RETRY_FAILED / SWITCHED_METHOD / ABANDONED
8. **Cohort analysis** — `05_cohort_and_ranking.sql` segments by user vintage, city tier, and merchant category; ranks failure-prone categories per bank with `DENSE_RANK()`
9. **PRD** — `prd/UPI_Smart_Recovery_PRD.md` translates findings into a product intervention
10. **Dashboard** — React SPA in `UPI Analytics Dashboard Frontend/` visualises all findings

---

## Execution Steps

### Database setup
```bash
mysql -u root -p < schema/schema.sql
```

### Install Python dependencies
```bash
pip install faker pymysql numpy
```

### Generate data
```bash
cd data_generation
# Edit DB_CONFIG in config.py with your MySQL credentials
python generate_transactions.py
```

### Run analysis queries
```bash
# From MySQL shell:
source analysis/01_failure_funnel.sql
source analysis/02_failure_by_bank_and_app.sql
source analysis/03_hourly_failure_pattern.sql
source analysis/04_next_action_recovery.sql
source analysis/05_cohort_and_ranking.sql
```

### Run the dashboard
```bash
cd "UPI Analytics Dashboard Frontend"
pnpm install
pnpm dev
# Opens at http://localhost:5173
```

---

## Key Findings

| # | Finding | Metric |
|---|---------|--------|
| 1 | Overall failure rate | ~6.2% (target: 4–8%) |
| 2 | Top failure code | INSUFFICIENT_FUNDS — 30% of all failures |
| 3 | Two codes drive half of failures | INSUFFICIENT_FUNDS + BANK_SERVER_DOWN = 50% cumulative |
| 4 | Post-failure abandonment | ~45% of failed txns — no follow-up within 5 min |
| 5 | Post-failure retry | ~40% retry same app/source (85% success for WRONG_PIN, 25% for BANK_SERVER_DOWN) |
| 6 | Method switch | ~15% switch app or funding source (75% success) |
| 7 | Outlier banks | BANK_5 (9%) and BANK_6 (10%) failure rate — 2.5× ecosystem avg |
| 8 | Peak hour impact | Failure rate rises 1.5× during 9–11 AM and 7–10 PM peaks |
| 9 | New user vulnerability | 0–90 day vintage users have highest abandonment rate |
| 10 | Highest-risk merchant type | TRAVEL and FUEL categories — highest abandonment and lost value |

### Headline Insight
> **~45% of failed UPI payments end in abandonment within 5 minutes, representing hundreds of thousands of rupees in lost transaction value per month.**

---

## Future Scope

- **Replace synthetic data** with public NPCI aggregate statistics for real-world calibration.
- **Streamlit / Metabase dashboard** for live failure monitoring connected to production MySQL.
- **ML prediction model** (logistic regression / XGBoost) to predict abandonment probability per failure in real time.
- **A/B test simulation** of the Smart Recovery UI with statistical power analysis for minimum sample size.
- **Additional UPI dimensions:** UPI Lite, UPI credit line, international UPI corridors.
- **Anomaly detection** on hourly bank failure rates to auto-flag outages before they impact large volumes.
