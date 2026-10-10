# UPI Smart Failure Recovery — Product Requirements Document (PRD)

**Document version:** 1.0  
**Date:** October 2026  
**Author:** UPI Analytics Project  
**Status:** Draft

---

## 1. Problem Statement

UPI has become India's primary digital payment rail, processing billions of transactions monthly. Despite its scale, **4–8% of all UPI transactions fail**. The current failure experience is uniformly poor: users see a generic red error screen with no actionable guidance, leaving them with three choices — retry manually, abandon the payment, or guess an alternative approach.

Our data shows that **~45% of users who experience a failure abandon their payment intent entirely within 5 minutes**, representing significant lost transaction value for merchants and a trust erosion event for the ecosystem. The problem is compounded by the fact that each failure type has a fundamentally different cause and a different optimal recovery path — but the UX treats all failures identically.

Users who encounter `BANK_SERVER_DOWN` need a different resolution path than users who typed `WRONG_PIN`. Today, neither gets the right guidance.

---

## 2. Data Evidence

_The following numbers are derived from analysis of 20,000+ synthetic transactions generated to mirror real-world NPCI failure distributions._

### 2.1 Overall Failure Landscape

| Metric | Value |
|--------|-------|
| Overall failure rate | ~6.2% |
| Total failed transactions (30-day window) | ~1,240 |
| Post-failure abandonment rate | ~45% |
| Estimated lost transaction value (abandoned) | ~₹3.8L across the window |

### 2.2 Top Failure Codes (Cumulative Impact)

| Rank | Failure Code | Share of Failures | Category | Cumulative % |
|------|-------------|-------------------|----------|-------------|
| 1 | INSUFFICIENT_FUNDS | 30% | User-fixable | 30% |
| 2 | BANK_SERVER_DOWN | 20% | System-side | 50% |
| 3 | TIMEOUT | 18% | System-side | 68% |
| 4 | WRONG_PIN | 12% | User-fixable | 80% |
| 5 | LIMIT_EXCEEDED | 10% | User-fixable | 90% |
| 6 | TECHNICAL_DECLINE | 10% | System-side | 100% |

> **Insight:** Two failure codes — `INSUFFICIENT_FUNDS` and `BANK_SERVER_DOWN` — account for **50% of all failures**. The first is user-fixable, the second is not, yet both receive identical treatment in the current UX.

### 2.3 Post-Failure Behaviour Split

| Behaviour | Share | Description |
|-----------|-------|-------------|
| Abandon | ~45% | No follow-up transaction within 5 minutes |
| Retry (same app + funding source) | ~40% | Immediate retry; success rate varies by code |
| Switch method | ~15% | Changed app or funding source within 5 min |

### 2.4 Outlier Banks

Banks `BANK_5` and `BANK_6` exhibit failure rates of **9–10%** — approximately **2.5× the ecosystem average** — and their failures are concentrated in `BANK_SERVER_DOWN`, confirming a server-side infrastructure issue rather than user error.

### 2.5 User Segment Vulnerability

| Segment | Abandonment Rate |
|---------|-----------------|
| New users (0–90 days vintage) | Highest |
| Tier-3 city users | Elevated (relative to Tier 1) |
| TRAVEL & FUEL categories | Highest abandonment among merchant types |

---

## 3. Proposed Solution: Smart Failure Recovery

### 3.1 Overview

Replace the generic failure screen with a **failure-code-specific recovery UX** that immediately guides the user toward the highest-probability recovery path.

### 3.2 Failure-Code Interventions

#### `WRONG_PIN` / `TIMEOUT`
- **UX:** One-tap "Retry Now" CTA with a real-time debit status check before initiating the retry (prevents duplicate debits).
- **Rationale:** Retry success probability is 85% (WRONG_PIN) and 70% (TIMEOUT) — highest among all codes. Users just need a frictionless nudge.
- **Guardrail:** API call to confirm no pending debit before allowing retry.

#### `BANK_SERVER_DOWN`
- **UX:** "Your bank is experiencing issues right now. Switch to [alternate linked bank / UPI credit line / wallet] to complete this payment."
- **Rationale:** Only 25% of retries succeed for this code. Auto-suggesting an alternate avoids a frustrating retry loop.
- **Feature dependency:** Access to user's linked account list via UPI stack.

#### `INSUFFICIENT_FUNDS`
- **UX:** "You don't have enough funds in [BANK_X]. Try paying from [Credit Line / Wallet]" or "Split this payment into two parts."
- **Rationale:** Only 15% of retries succeed. The user genuinely lacks funds in that account — routing to a different source is the only recovery path.
- **Feature dependency:** Partial-pay support from merchant side (P2M only).

#### `LIMIT_EXCEEDED`
- **UX:** Inline explanation of daily/transaction limit with two CTAs: (a) "Split into 2 payments" and (b) "Increase limit (takes 24h)."
- **Rationale:** User has funds but has hit a policy limit — education + split-pay is the correct resolution.

### 3.3 Real-Time Bank Health Indicator
- Show a small health badge on the bank selector before the user even initiates payment.
- Data source: Aggregate last-30-minutes failure rate for each bank (internal signal).
- If a bank's live failure rate exceeds 2× its 7-day average, mark it as "Degraded."
- This pre-warns users and reduces `BANK_SERVER_DOWN` failures at the initiation stage.

### 3.4 User Experience Flow

```
Payment fails
     │
     ▼
Identify failure_code (from UPI response)
     │
     ├─ WRONG_PIN / TIMEOUT ──────────► "Retry Now" screen (status-check + 1-tap retry)
     │
     ├─ BANK_SERVER_DOWN ─────────────► "Switch Bank / Method" screen (alternate pre-filled)
     │
     ├─ INSUFFICIENT_FUNDS ───────────► "Try Different Source / Split Pay" screen
     │
     ├─ LIMIT_EXCEEDED ───────────────► "Split Payment / Limit Info" screen
     │
     └─ TECHNICAL_DECLINE ────────────► "We're looking into this — retry in 60s" + timer
```

---

## 4. Success Metrics

### Primary Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Recovery rate | % of failed txns that result in a successful txn within 5 min | ↑ from ~55% to ≥70% |
| 5-minute abandonment reduction | Reduction in abandonment rate | ↓ from ~45% to ≤30% |
| Fallback CTA adoption | % of `BANK_SERVER_DOWN` failures where user taps the alternate-source CTA | ≥50% |
| Overall payment success rate | All transactions (incl. recovered) / total attempts | ↑ by ≥1.5 pp |

### Guardrail Metrics (must not regress)

| Metric | Threshold |
|--------|----------|
| Duplicate debit / double-charge complaints | ≤ current baseline (must not increase) |
| User-reported payment confusion | No statistically significant increase |
| P95 time-to-confirmation on retry | ≤ 8 seconds |

---

## 5. Risks & Open Questions

### 5.1 Risks

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| **Duplicate debit** on retry | Medium | Mandatory idempotency check (query UPI status before retry) |
| **Bank-side dependency** — alternate account suggestion requires real-time account list | High | Requires UPI ecosystem API; pilot with apps that already have linked accounts |
| **Privacy of bank-health signals** — surfacing real-time bank degradation may breach NDA with banks | Medium | Aggregate signals only; never name a bank as "down" publicly; use neutral language |
| **False positives** — marking a bank "degraded" when it is fine could erode user trust | Low-Medium | Use conservative thresholds (2× 7-day average); add hysteresis |

### 5.2 Open Questions

1. **Partial-pay / split-payment:** Does the merchant payment gateway support split UPI payments? This is a prerequisite for the `INSUFFICIENT_FUNDS` flow.
2. **Credit line access:** Is UPI credit line available for all users in scope, or is it a gated feature?
3. **Bank health API:** Can we access real-time bank failure rates from NPCI's monitoring data, or must we derive them from our own transaction logs?
4. **A/B test design:** What is the minimum detectable effect size for a meaningful improvement in recovery rate, and what sample size is needed? (See future scope — power analysis.)
5. **Retry debit timing:** What is the correct window to poll UPI status before confirming a retry is safe?
