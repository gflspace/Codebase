# How Payments Work — CIS Reference

**System:** QwickServices Contact Integrity System (CIS)
**Last Updated:** 2026-02-08

---

## Overview

QwickServices processes all marketplace transactions through its **platform-native payment system** (Stripe integration). CIS monitors payment flows to detect circumvention — attempts to redirect payments off-platform to avoid fees or accountability.

---

## Payment Flow (Normal)

1. **Service agreement** established between buyer and seller on-platform
2. **Escrow initiated** — buyer's payment held by platform
3. **Service delivered** — seller completes work
4. **Escrow released** — platform releases funds to seller (minus platform fee)
5. **Transaction completed** — event logged, both parties notified

---

## Events Monitored by CIS

| Event | CIS Interest |
|---|---|
| `transaction.initiated` | Normal — baseline tracking |
| `transaction.completed` | Normal — confirms on-platform completion |
| `transaction.failed` | Risk signal — may precede off-platform redirect |
| `transaction.cancelled` | Risk signal — pattern analysis for repeated cancellations |

---

## Circumvention Patterns CIS Detects

| Pattern | Signals |
|---|---|
| **Payment redirect** | Messages suggesting PayPal, CashApp, Zelle, Venmo, crypto |
| **Fee avoidance language** | "avoid platform fees", "pay me directly" |
| **Escrow avoidance** | Buyer and seller agree to skip escrow |
| **Post-failure redirect** | Contact sharing after transaction failure |
| **Payment timing alignment** | Off-platform cues during active payment window |

---

## CIS Response (Not Enforcement)

- Detection layer generates `PAYMENT_EXTERNAL`, `TX_REDIRECT_ATTEMPT`, `TX_FAILURE_CORRELATED` signals
- Scoring layer aggregates with behavioral and operational data
- Enforcement layer acts only when risk tier thresholds are met
- CIS **never blocks payments directly** — it flags risk for scoring and review

---

## Key Principle

> CIS observes payment behavior to detect circumvention intent. It does not interfere with legitimate payment processing.

---

**Source Documents:**
- `qwick_services_cis_detection_risk_signal_engineering_specification.md`
- `qwick_services_cis_backend_detection_orchestration_design.md`
- `QwickServices_CIS_Layered_Defense_KB.md` (Layer 1: Operational Integrity)
