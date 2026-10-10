"""
generate_transactions.py
Generates synthetic UPI transaction data and inserts into MySQL.
Run: python generate_transactions.py
"""
import sys
import uuid
import random
from datetime import datetime, timedelta
from collections import defaultdict

import numpy as np
from faker import Faker
import pymysql

from config import (
    PSP_APPS, PSP_APP_FAILURE_MOD, BANKS, BANK_BASE_FAILURE_RATE, WEAK_BANKS,
    MERCHANT_CATEGORIES, MERCHANT_SIZES, MERCHANT_SIZE_WEIGHTS,
    AMOUNT_LOW_MEAN, AMOUNT_LOW_STD, AMOUNT_HIGH_MEAN, AMOUNT_HIGH_STD, PROB_HIGH_AMOUNT,
    FAILURE_CODES, FAILURE_CODE_WEIGHTS,
    LIMIT_EXCEEDED_HIGH_AMOUNT_BOOST, BANK_SERVER_DOWN_WEAK_BANK_BOOST, BANK_SERVER_DOWN_STRONG_BANK_DAMP,
    POST_FAILURE_RETRY_PROB, POST_FAILURE_SWITCH_PROB, POST_FAILURE_ABANDON_PROB,
    RETRY_SUCCESS_PROB, RETRY_DELAY_MIN_SEC, RETRY_DELAY_MAX_SEC,
    SWITCH_SUCCESS_PROB, SWITCH_DELAY_MIN_SEC, SWITCH_DELAY_MAX_SEC,
    ABANDON_MIN_GAP_MINUTES, HOUR_LOAD_WEIGHTS, PEAK_HOUR_FAILURE_MULTIPLIER, PEAK_HOURS,
    TARGET_USERS, TARGET_MERCHANTS, TARGET_TRANSACTIONS,
    SIM_START_DATE, SIM_DAYS,
    FUNDING_SOURCES, FUNDING_SOURCE_WEIGHTS, CITY_TIERS, CITY_TIER_WEIGHTS,
    DB_CONFIG, BATCH_SIZE,
)

fake = Faker("en_IN")
rng = np.random.default_rng(42)


# -------------------------------------------------------
# Helpers
# -------------------------------------------------------

def gen_amount(high: bool) -> float:
    if high:
        val = rng.normal(AMOUNT_HIGH_MEAN, AMOUNT_HIGH_STD)
        return max(10001.0, round(float(val), 2))
    else:
        val = abs(rng.normal(AMOUNT_LOW_MEAN, AMOUNT_LOW_STD))
        return max(1.0, round(float(val), 2))


def pick_failure_code(amount: float, bank: str) -> str:
    weights = FAILURE_CODE_WEIGHTS[:]
    idx_limit  = FAILURE_CODES.index("LIMIT_EXCEEDED")
    idx_server = FAILURE_CODES.index("BANK_SERVER_DOWN")

    # Boost LIMIT_EXCEEDED for high-value txns
    if amount > 10000:
        weights[idx_limit] *= LIMIT_EXCEEDED_HIGH_AMOUNT_BOOST

    # Concentrate BANK_SERVER_DOWN in weak banks
    if bank in WEAK_BANKS:
        weights[idx_server] *= BANK_SERVER_DOWN_WEAK_BANK_BOOST
    else:
        weights[idx_server] *= BANK_SERVER_DOWN_STRONG_BANK_DAMP

    total = sum(weights)
    probs = [w / total for w in weights]
    return rng.choice(FAILURE_CODES, p=probs)


def compute_failure_prob(bank: str, app: str, hour: int) -> float:
    base = BANK_BASE_FAILURE_RATE[bank] * PSP_APP_FAILURE_MOD[app]
    if hour in PEAK_HOURS:
        base *= PEAK_HOUR_FAILURE_MULTIPLIER
    return min(base, 0.40)


def connect() -> pymysql.Connection:
    conn = pymysql.connect(**DB_CONFIG)
    print(f"  Connected to MySQL @ {DB_CONFIG['host']}:{DB_CONFIG['port']} / {DB_CONFIG['database']}")
    return conn


# -------------------------------------------------------
# Seed users
# -------------------------------------------------------

def generate_users() -> list[dict]:
    users = []
    for _ in range(TARGET_USERS):
        vintage = int(rng.integers(1, 1500))
        users.append({
            "user_id"             : str(uuid.uuid4()),
            "account_vintage_days": vintage,
            "primary_psp_app"     : rng.choice(PSP_APPS),
            "home_bank"           : rng.choice(BANKS),
            "city_tier"           : int(rng.choice(CITY_TIERS, p=CITY_TIER_WEIGHTS)),
        })
    return users


def insert_users(conn, users: list[dict]):
    sql = """
        INSERT INTO Users (user_id, account_vintage_days, primary_psp_app, home_bank, city_tier)
        VALUES (%s, %s, %s, %s, %s)
    """
    with conn.cursor() as cur:
        for i in range(0, len(users), BATCH_SIZE):
            batch = users[i : i + BATCH_SIZE]
            cur.executemany(sql, [(u["user_id"], u["account_vintage_days"],
                                   u["primary_psp_app"], u["home_bank"], u["city_tier"]) for u in batch])
            conn.commit()
    print(f"  Inserted {len(users)} users")


# -------------------------------------------------------
# Seed merchants
# -------------------------------------------------------

def generate_merchants() -> list[dict]:
    merchants = []
    for _ in range(TARGET_MERCHANTS):
        merchants.append({
            "merchant_id"      : str(uuid.uuid4()),
            "merchant_category": rng.choice(MERCHANT_CATEGORIES),
            "merchant_size"    : rng.choice(MERCHANT_SIZES, p=MERCHANT_SIZE_WEIGHTS),
        })
    return merchants


def insert_merchants(conn, merchants: list[dict]):
    sql = """
        INSERT INTO Merchants (merchant_id, merchant_category, merchant_size)
        VALUES (%s, %s, %s)
    """
    with conn.cursor() as cur:
        for i in range(0, len(merchants), BATCH_SIZE):
            batch = merchants[i : i + BATCH_SIZE]
            cur.executemany(sql, [(m["merchant_id"], m["merchant_category"],
                                   m["merchant_size"]) for m in batch])
            conn.commit()
    print(f"  Inserted {len(merchants)} merchants")


# -------------------------------------------------------
# Generate transactions
# -------------------------------------------------------

def generate_transactions(users: list[dict], merchants: list[dict]) -> list[dict]:
    start_dt = datetime.strptime(SIM_START_DATE, "%Y-%m-%d")

    # Pre-compute hour-of-day probabilities
    hour_probs = np.array(HOUR_LOAD_WEIGHTS, dtype=float)
    hour_probs /= hour_probs.sum()

    # Spread TARGET_TRANSACTIONS over days proportionally
    day_txn_count = []
    for _ in range(SIM_DAYS):
        # small random day-level variation ±15%
        cnt = int(TARGET_TRANSACTIONS / SIM_DAYS * rng.uniform(0.85, 1.15))
        day_txn_count.append(max(cnt, 1))

    total_planned = sum(day_txn_count)
    transactions = []

    # Track last-transaction-time per user for abandonment logic
    user_last_txn: dict[str, datetime] = {}

    # Counters
    stat_retries   = 0
    stat_switches  = 0
    stat_abandons  = 0

    merchant_ids = [m["merchant_id"] for m in merchants]

    for day_idx, n_txns in enumerate(day_txn_count):
        day_date = start_dt + timedelta(days=day_idx)

        # Assign hours
        hours = rng.choice(24, size=n_txns, p=hour_probs)
        minutes = rng.integers(0, 60, size=n_txns)
        seconds = rng.integers(0, 60, size=n_txns)

        for i in range(n_txns):
            user  = users[int(rng.integers(0, len(users)))]
            uid   = user["user_id"]
            bank  = user["home_bank"]
            app   = user["primary_psp_app"]

            txn_time = day_date.replace(
                hour=int(hours[i]),
                minute=int(minutes[i]),
                second=int(seconds[i]),
            )

            # Respect abandonment gap
            last_time = user_last_txn.get(uid)
            if last_time and (txn_time - last_time).total_seconds() < ABANDON_MIN_GAP_MINUTES * 60:
                txn_time = last_time + timedelta(minutes=ABANDON_MIN_GAP_MINUTES,
                                                  seconds=int(rng.integers(0, 120)))

            # Amount
            is_high = bool(rng.random() < PROB_HIGH_AMOUNT)
            amount = gen_amount(is_high)

            # TXN type
            txn_type = "P2P" if rng.random() < 0.25 else "P2M"

            # Funding source
            funding_source = rng.choice(FUNDING_SOURCES, p=FUNDING_SOURCE_WEIGHTS)

            # Merchant (P2P has a dummy merchant)
            merchant_id = rng.choice(merchant_ids)

            # Failure?
            fail_prob = compute_failure_prob(bank, app, txn_time.hour)
            is_failure = rng.random() < fail_prob
            failure_code = pick_failure_code(amount, bank) if is_failure else None
            status = "FAILED" if is_failure else "SUCCESS"

            txn = {
                "transaction_id"  : str(uuid.uuid4()),
                "user_id"         : uid,
                "merchant_id"     : merchant_id,
                "transaction_time": txn_time,
                "amount"          : amount,
                "txn_type"        : txn_type,
                "psp_app"         : app,
                "remitter_bank"   : bank,
                "funding_source"  : funding_source,
                "status"          : status,
                "failure_code"    : failure_code,
            }
            transactions.append(txn)
            user_last_txn[uid] = txn_time

            # Post-failure behaviour
            if is_failure:
                roll = rng.random()
                if roll < POST_FAILURE_RETRY_PROB:
                    # Retry
                    retry_success = rng.random() < RETRY_SUCCESS_PROB.get(failure_code, 0.5)
                    delay_sec = int(rng.integers(RETRY_DELAY_MIN_SEC, RETRY_DELAY_MAX_SEC))
                    retry_time = txn_time + timedelta(seconds=delay_sec)
                    retry_txn = {
                        "transaction_id"  : str(uuid.uuid4()),
                        "user_id"         : uid,
                        "merchant_id"     : merchant_id,
                        "transaction_time": retry_time,
                        "amount"          : amount,
                        "txn_type"        : txn_type,
                        "psp_app"         : app,
                        "remitter_bank"   : bank,
                        "funding_source"  : funding_source,
                        "status"          : "SUCCESS" if retry_success else "FAILED",
                        "failure_code"    : None if retry_success else pick_failure_code(amount, bank),
                    }
                    transactions.append(retry_txn)
                    user_last_txn[uid] = retry_time
                    stat_retries += 1

                elif roll < POST_FAILURE_RETRY_PROB + POST_FAILURE_SWITCH_PROB:
                    # Switch method
                    switch_success = rng.random() < SWITCH_SUCCESS_PROB
                    delay_sec = int(rng.integers(SWITCH_DELAY_MIN_SEC, SWITCH_DELAY_MAX_SEC))
                    switch_time = txn_time + timedelta(seconds=delay_sec)

                    other_sources = [s for s in FUNDING_SOURCES if s != funding_source]
                    new_funding = rng.choice(other_sources) if other_sources else funding_source
                    other_apps  = [a for a in PSP_APPS if a != app]
                    new_app     = rng.choice(other_apps) if other_apps else app

                    switch_txn = {
                        "transaction_id"  : str(uuid.uuid4()),
                        "user_id"         : uid,
                        "merchant_id"     : merchant_id,
                        "transaction_time": switch_time,
                        "amount"          : amount,
                        "txn_type"        : txn_type,
                        "psp_app"         : str(new_app),
                        "remitter_bank"   : bank,
                        "funding_source"  : str(new_funding),
                        "status"          : "SUCCESS" if switch_success else "FAILED",
                        "failure_code"    : None if switch_success else pick_failure_code(amount, bank),
                    }
                    transactions.append(switch_txn)
                    user_last_txn[uid] = switch_time
                    stat_switches += 1

                else:
                    # Abandon
                    stat_abandons += 1

    print(f"\n  Planned base transactions : {total_planned}")
    print(f"  Total transactions (incl retries/switches): {len(transactions)}")
    print(f"  Retries     : {stat_retries}")
    print(f"  Switches    : {stat_switches}")
    print(f"  Abandonments: {stat_abandons}")
    return transactions


def print_summary(transactions: list[dict]):
    total = len(transactions)
    failed = [t for t in transactions if t["status"] == "FAILED"]
    n_fail = len(failed)
    fail_rate = n_fail / total * 100 if total else 0

    code_counts: dict[str, int] = defaultdict(int)
    for t in failed:
        code_counts[t["failure_code"]] += 1

    print(f"\n{'='*55}")
    print(f"  SUMMARY")
    print(f"{'='*55}")
    print(f"  Total transactions : {total:,}")
    print(f"  Failed             : {n_fail:,}  ({fail_rate:.2f}%)")
    print(f"  Success            : {total - n_fail:,}  ({100 - fail_rate:.2f}%)")
    print(f"\n  Failure code breakdown:")
    for code, cnt in sorted(code_counts.items(), key=lambda x: -x[1]):
        print(f"    {code:<25} {cnt:>5}  ({cnt/n_fail*100:.1f}%)")
    print(f"{'='*55}\n")


def insert_transactions(conn, transactions: list[dict]):
    sql = """
        INSERT INTO Transactions
            (transaction_id, user_id, merchant_id, transaction_time,
             amount, txn_type, psp_app, remitter_bank, funding_source,
             status, failure_code)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    with conn.cursor() as cur:
        for i in range(0, len(transactions), BATCH_SIZE):
            batch = transactions[i : i + BATCH_SIZE]
            rows = [
                (
                    t["transaction_id"], t["user_id"], t["merchant_id"],
                    t["transaction_time"].strftime("%Y-%m-%d %H:%M:%S"),
                    t["amount"], t["txn_type"], t["psp_app"],
                    t["remitter_bank"], t["funding_source"],
                    t["status"], t["failure_code"],
                )
                for t in batch
            ]
            cur.executemany(sql, rows)
            conn.commit()
            print(f"    Committed rows {i} – {i + len(batch)}", end="\r")
    print(f"\n  Inserted {len(transactions):,} transactions")


# -------------------------------------------------------
# Main
# -------------------------------------------------------

def main():
    print("UPI Payment Failure & Recovery Analytics — Data Generator")
    print("="*55)

    print("\n[1/5] Generating users …")
    users = generate_users()

    print("[2/5] Generating merchants …")
    merchants = generate_merchants()

    print("[3/5] Generating transactions …")
    transactions = generate_transactions(users, merchants)

    print_summary(transactions)

    print("[4/5] Connecting to MySQL …")
    try:
        conn = connect()
    except Exception as e:
        print(f"\n  ERROR: Could not connect to MySQL: {e}")
        print("  Update DB_CONFIG in config.py and retry.")
        sys.exit(1)

    print("[5/5] Inserting data …")
    insert_users(conn, users)
    insert_merchants(conn, merchants)
    insert_transactions(conn, transactions)

    # Verify
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM Transactions;")
        count = cur.fetchone()[0]
        print(f"\n  Verification — SELECT COUNT(*) FROM Transactions: {count:,}")
    conn.close()
    print("\nDone. Database is ready for analysis.")


if __name__ == "__main__":
    main()
