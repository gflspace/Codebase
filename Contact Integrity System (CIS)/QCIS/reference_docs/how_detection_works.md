# How Detection Works — CIS Reference

**System:** QwickServices Contact Integrity System (CIS)
**Last Updated:** 2026-02-08

---

## Overview

The Detection Layer is CIS's first-line analysis engine. It consumes platform events, analyzes content and metadata, and produces structured **risk signals** — without ever enforcing or scoring.

---

## Detection Pipeline

```
Platform Event → Event Bus → Detection Orchestrator (Claude Code) → Risk Signal → Backend Storage
```

1. **Event ingestion** — Sidebase emits domain events (messages, transactions, account changes)
2. **Analysis** — Claude Code orchestrator performs content + behavioral analysis
3. **Signal generation** — Structured detection output with confidence scores
4. **Signal persistence** — Backend stores signals for scoring layer consumption

---

## What Detection Analyzes

### Message Content
- Phone numbers, email addresses, social handles
- External payment references (PayPal, Venmo, crypto, etc.)
- Intent phrases ("let's talk elsewhere", "pay me directly")
- Grooming language ("trust me", "later", "privately")

### Obfuscation & Evasion
- Spaced characters (`j o h n @ g m a i l`)
- Emoji substitution
- Leetspeak / phonetic spelling
- Progressive disclosure across multiple messages

### Behavioral Patterns
- Frequency and escalation over time
- Sender/receiver role dynamics
- Correlation with transaction timing (pre-payment, payment window, post-payment)
- Cross-session repetition

---

## Detection Techniques

| Layer | Method |
|---|---|
| Deterministic | Regex (phone, email, URL), keyword dictionaries |
| Contextual | NLP classifier, windowed context (+-2 messages), role-aware interpretation |
| Temporal | Pattern flags (REPEATED_SIGNALS, ESCALATION, CROSS_SESSION, ROLE_IMBALANCE) |

---

## Signal Output Format

```json
{
  "source_event_id": "uuid",
  "signal_type": "CONTACT_PHONE",
  "confidence": 0.87,
  "evidence": {
    "message_ids": ["uuid"],
    "timestamps": ["ISO8601"]
  },
  "obfuscation_flags": ["spaced_digits"],
  "pattern_flags": ["REPEATED_SIGNALS"]
}
```

---

## Hard Constraints

- Detection **NEVER** enforces actions
- Detection **NEVER** assigns risk tiers or final scores
- Detection **NEVER** modifies user state
- All output is **advisory and explainable**

---

## False-Positive Controls

- Contextual NLP overrides raw regex matches
- Whitelisting benign patterns (e.g., support emails)
- Feedback loop from appeals into detection tuning
- High confidence required before signals influence irreversible downstream actions

---

**Source Documents:**
- `qwick_services_cis_detection_risk_signal_engineering_specification.md`
- `qwick_services_cis_trust_safety_systems_architecture.md` (Section C)
- `qwick_services_cis_backend_detection_orchestration_design.md` (Section 3)
