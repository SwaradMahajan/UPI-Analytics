# ============================================================
# UPI Payment Failure & Recovery Analytics — Configuration
# Edit this file to change probabilities, bank list, app list
# ============================================================

# PSP Apps
PSP_APPS = ["APP_A", "APP_B", "APP_C", "APP_D"]

PSP_APP_FAILURE_MOD = {
    "APP_A": 0.90,
    "APP_B": 1.00,
    "APP_C": 1.15,
    "APP_D": 1.05,
}

# Banks (remitter-side)
BANKS = [
    "BANK_1", "BANK_2", "BANK_3", "BANK_4",
    "BANK_5", "BANK_6", "BANK_7", "BANK_8",
]

BANK_BASE_FAILURE_RATE = {
    "BANK_1": 0.035,
    "BANK_2": 0.040,
    "BANK_3": 0.055,
    "BANK_4": 0.070,
    "BANK_5": 0.090,
    "BANK_6": 0.100,
    "BANK_7": 0.045,
    "BANK_8": 0.060,
}

WEAK_BANKS = {"BANK_5", "BANK_6", "BANK_4"}

# Merchant categories & sizes
MERCHANT_CATEGORIES = [
    "GROCERY", "FOOD", "FUEL", "UTILITIES",
    "RETAIL", "P2P_TRANSFER", "TRAVEL",
]

MERCHANT_SIZES = ["SMALL", "MEDIUM", "LARGE"]
MERCHANT_SIZE_WEIGHTS = [0.50, 0.35, 0.15]

# Transaction amounts (INR)
AMOUNT_LOW_MEAN  = 250
AMOUNT_LOW_STD   = 200
AMOUNT_HIGH_MEAN = 12000
AMOUNT_HIGH_STD  = 5000
PROB_HIGH_AMOUNT = 0.15

# Failure codes and weights
FAILURE_CODES = [
    "INSUFFICIENT_FUNDS",
    "BANK_SERVER_DOWN",
    "TIMEOUT",
    "WRONG_PIN",
    "LIMIT_EXCEEDED",
    "TECHNICAL_DECLINE",
]
FAILURE_CODE_WEIGHTS = [0.30, 0.20, 0.18, 0.12, 0.10, 0.10]

LIMIT_EXCEEDED_HIGH_AMOUNT_BOOST     = 3.0
BANK_SERVER_DOWN_WEAK_BANK_BOOST     = 3.0
BANK_SERVER_DOWN_STRONG_BANK_DAMP    = 0.3

# Post-failure behaviour
POST_FAILURE_RETRY_PROB   = 0.40
POST_FAILURE_SWITCH_PROB  = 0.15
POST_FAILURE_ABANDON_PROB = 0.45

RETRY_SUCCESS_PROB = {
    "WRONG_PIN"         : 0.85,
    "TIMEOUT"           : 0.70,
    "BANK_SERVER_DOWN"  : 0.25,
    "INSUFFICIENT_FUNDS": 0.15,
    "LIMIT_EXCEEDED"    : 0.20,
    "TECHNICAL_DECLINE" : 0.50,
}

RETRY_DELAY_MIN_SEC  =  10
RETRY_DELAY_MAX_SEC  =  90
SWITCH_SUCCESS_PROB  = 0.75
SWITCH_DELAY_MIN_SEC =  30
SWITCH_DELAY_MAX_SEC = 300
ABANDON_MIN_GAP_MINUTES = 30

# Hourly load weights (index = hour 0-23)
HOUR_LOAD_WEIGHTS = [
    0.010, 0.005, 0.003, 0.003, 0.004, 0.008,
    0.020, 0.040, 0.060, 0.075, 0.080, 0.070,
    0.055, 0.050, 0.045, 0.040, 0.042, 0.050,
    0.065, 0.080, 0.075, 0.060, 0.040, 0.020,
]

PEAK_HOUR_FAILURE_MULTIPLIER = 1.5
PEAK_HOURS = {9, 10, 11, 19, 20, 21}

# Data volume
TARGET_USERS        = 1000
TARGET_MERCHANTS    = 300
TARGET_TRANSACTIONS = 20000

SIM_START_DATE = "2026-09-01"
SIM_DAYS       = 30

# Funding sources
FUNDING_SOURCES        = ["BANK_ACCOUNT", "CREDIT_LINE", "WALLET"]
FUNDING_SOURCE_WEIGHTS = [0.75, 0.15, 0.10]

# City tiers
CITY_TIERS        = [1, 2, 3]
CITY_TIER_WEIGHTS = [0.35, 0.40, 0.25]

# Account vintage buckets
VINTAGE_LOW_MAX = 90
VINTAGE_MID_MAX = 365

# MySQL connection
DB_CONFIG = {
    "host"    : "localhost",
    "port"    : 3306,
    "user"    : "root",
    "password": "",
    "database": "upi_analytics",
    "charset" : "utf8mb4",
}

BATCH_SIZE = 750
