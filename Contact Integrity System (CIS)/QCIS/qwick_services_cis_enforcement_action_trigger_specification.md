# Enforcement Action Trigger Specification

**System:** QwickServices Contact Integrity System (CIS)  
**Role:** Enforcement Action Trigger Model  
**Objective:** Define proportional, explainable, and reversible automated action triggers with mandatory human oversight for high‑impact decisions

---

## 1. Triggering Principles

- Actions are driven by **aggregated risk tiers**, not single events
- **Automation** handles routine, low‑risk scenarios
- **Human review** is required for high‑risk, ambiguous, or irreversible outcomes
- Every action must be **auditable**, **explainable**, and **reversible** where possible

---

## 2. Trigger Condition Definitions

### Risk Tiers (Input from Scoring Layer)
- **Tier 1 – Monitor:** Informational signals only
- **Tier 2 – Low Risk:** Accidental or ambiguous behavior
- **Tier 3 – Medium Risk:** Clear violation without strong harm
- **Tier 4 – High Risk:** Deliberate intent, evasion, or harm
- **Tier 5 – Critical:** Coordinated abuse or financial risk

> Enforcement triggers consume **risk tier + history + pattern flags**.

---

## 3. Automated Action Mappings

### A. First Violation — Warning (Automated)

**Trigger Conditions**
- Risk Tier: **Low → Medium**
- Prior violations: **None**
- No evasion, coordination, or financial‑harm flags

**Automated Actions**
- Issue **inline or notification‑based warning**
- Explain violated policy and expected behavior
- Log warning to user enforcement history
- No feature restrictions applied

**Reversibility**
- Fully reversible (warning removal possible)

---

### B. Repeated Behavior — Temporary Restriction (Automated)

**Trigger Conditions**
- Risk Tier: **Medium → High**
- Repeated violations within defined time window
- Prior warning acknowledged

**Automated Actions**
- Apply **temporary restriction or suspension**
- Duration: **24–72 hours** (configurable)
- Notify user with reason code and appeal option
- Increment escalation counter

**Reversibility**
- Time‑bound and reversible by admin

---

### C. High‑Risk Violations — Admin Escalation (Automated + Human)

**Trigger Conditions**
- Risk Tier: **High or Critical**
- Clear intent, evasion, coordination, or financial harm

**Automated Actions**
- Enter **safe‑mode** (block further risky actions)
- Create escalation case in Trust & Safety queue
- Attach:
  - Evidence references
  - Timeline of events
  - Risk score and contributing factors

**Human Requirement**
- **Mandatory human review** before irreversible actions

---

## 4. Escalation Thresholds

| Condition | Result |
|---------|--------|
| First low/medium violation | Warning |
| Second violation (same type) | Logged warning |
| Third violation | Temporary restriction |
| High‑risk + intent/evasion | Admin escalation |
| Coordinated or repeated abuse | Human‑approved suspension |

---

## 5. Human Override & Review Controls

### Override Capabilities
Admins may:
- Approve, modify, or reverse automated actions
- Escalate or de‑escalate enforcement level
- Add justification notes

### Safeguards
- All overrides logged with **admin ID and timestamp**
- Reversals trigger user notification when appropriate
- **No permanent ban without human confirmation**

---

## 6. Action Execution Flow

1. Detection signals received
2. Risk score and tier evaluated
3. Trigger conditions checked
4. Automated action applied **or** admin escalation created
5. Action logged to audit trail
6. User notified with reason and appeal path
7. Case remains reviewable and appealable

---

## 7. Audit & Logging Requirements

- Log trigger inputs (risk tier, history, flags)
- Log automated decisions and parameters
- Log admin overrides separately
- Maintain immutable enforcement timeline per user

---

## 8. Fallback & Failure Behavior

- **Scoring unavailable:** Default to monitor‑only state
- **Automation failure:** Do not enforce; escalate to human queue
- **Notification failure:** Retry with backoff; log incident

---

## 9. Non‑Negotiable Guardrails

- Automation must **never** permanently ban users
- High‑risk actions require human review
- Users receive clear, standardized reason codes
- Every trigger must be explainable post‑hoc

---

**Status:** Enforcement Trigger Logic Finalized  
**Next Step:** Decision tables / pseudo‑code integration

