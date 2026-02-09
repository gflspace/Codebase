# How Enforcement Works — CIS Reference

**System:** QwickServices Contact Integrity System (CIS)
**Last Updated:** 2026-02-08

---

## Overview

The Enforcement Layer executes **proportional, explainable, and reversible** actions based on risk tiers from the scoring layer. It never analyzes content or recalculates risk — it only acts on aggregated scores and tiers.

---

## Enforcement Flow

```
Risk Tier (from Scoring) → Trigger Conditions → Automated Action OR Admin Escalation → Audit Log → User Notification
```

1. Scoring layer provides risk tier + history + pattern flags
2. Trigger conditions evaluated against escalation thresholds
3. Automated action applied (low/medium risk) **OR** admin escalation created (high/critical)
4. Action logged to immutable audit trail
5. User notified with reason code and appeal path

---

## Escalation Thresholds

| Condition | Action | Human Required? |
|---|---|---|
| First low/medium violation | Soft warning | No |
| Second violation (same type) | Logged warning | No |
| Third violation | Temporary restriction (24-72h) | No |
| High-risk + intent/evasion | Admin escalation + safe mode | Yes |
| Coordinated/repeated abuse | Human-approved suspension | Yes |
| Permanent ban | Full legal review | Yes (mandatory) |

---

## Available Actions

| Action | Reversible | Automated |
|---|---|---|
| Soft Warning (notification) | Yes | Yes |
| Hard Warning (logged) | Yes | Yes |
| Temporary Restriction | Yes (time-bound) | Yes |
| Account Suspension | Yes (admin) | No — requires human |
| Permanent Ban | No | No — requires legal approval |

---

## Safeguards

- **No permanent bans without human confirmation**
- Confirmation required for all actions via admin dashboard
- Mandatory justification input for manual actions
- All admin overrides logged with ID and timestamp
- Reversals trigger user notification
- Users always receive clear reason codes

---

## Failure Behavior

| Failure | Response |
|---|---|
| Scoring unavailable | Default to monitor-only — no enforcement |
| Automation failure | Do not enforce; escalate to human queue |
| Notification failure | Retry with backoff; log incident |

---

## Key Principles

- Actions driven by **aggregated risk tiers**, not single events
- **Automation** handles routine, low-risk scenarios only
- **Human review** required for high-risk, ambiguous, or irreversible outcomes
- Every action must be **auditable, explainable, and reversible** where possible
- **Fail-safe:** When uncertainty exists, escalate rather than dismiss

---

**Source Documents:**
- `qwick_services_cis_enforcement_action_trigger_specification.md`
- `qwick_services_cis_trust_safety_enforcement_model.md`
- `qwick_services_cis_trust_safety_systems_architecture.md` (Section E)
