# How Appeals Work — CIS Reference

**System:** QwickServices Contact Integrity System (CIS)
**Last Updated:** 2026-02-08

---

## Overview

The Appeals system ensures that every enforcement action can be challenged, reviewed, and potentially reversed. It is a core component of CIS's commitment to **explainability, fairness, and user rights**.

---

## Appeal Flow

```
Enforcement Action → User Notification (with appeal option) → Appeal Submitted → Review Queue → Human Decision → Resolution → User Notified
```

1. **Enforcement action applied** — user notified with reason code and appeal eligibility
2. **Appeal submitted** — `appeal.submitted` event emitted
3. **Case created** — linked to original enforcement action, evidence, and risk signals
4. **Human review** — Trust & Safety or Legal/Compliance reviews the case
5. **Resolution** — action upheld, modified, or reversed
6. **User notified** — `appeal.resolved` event emitted, user receives outcome

---

## Appeal Eligibility

| Action Type | Appeal Eligible | Review By |
|---|---|---|
| Soft Warning | Yes | Trust & Safety |
| Hard Warning | Yes | Trust & Safety |
| Temporary Restriction | Yes | Trust & Safety |
| Account Suspension | Yes | Trust & Safety + Legal |
| Permanent Ban | Yes (mandatory review) | Legal / Compliance |

---

## Review Interface (Admin Dashboard)

**Appeals Module provides:**
- Full enforcement timeline per user
- Original detection signals and evidence references
- Risk score and contributing factors at time of action
- Previous warnings, restrictions, and outcomes
- Internal reviewer notes (timestamped, attributed)

**Reviewer Capabilities:**
- Uphold the enforcement action
- Modify (reduce or change) the enforcement action
- Reverse the enforcement action entirely
- Add justification notes (mandatory for all decisions)

---

## Audit Requirements

- Every appeal submission logged
- Every review action logged with reviewer ID and timestamp
- Reversals trigger corresponding `enforcement.action_reversed` event
- Complete appeal history maintained per user
- All evidence and decision rationale preserved for regulatory review

---

## Privacy & Compliance

- Sensitive fields redacted by default in appeal reviews
- Content access gated by role (Legal/Compliance can see redacted; Trust & Safety has limited access)
- GDPR right-of-access requests can reference appeal outcomes
- Exportable case files for regulators

---

## Feedback Loop

- Appeal outcomes feed back into detection tuning
- Successful appeals (reversals) contribute to false-positive reduction
- Appeal patterns tracked in trend dashboards (false-positive rates, resolution times)

---

## Key Principles

- Every enforcement action is **challengeable**
- Appeals are reviewed by **humans**, not automated systems
- Decisions must be **explainable** to the user
- The appeals process is **fully auditable**
- Outcomes improve the system via **feedback loops**

---

**Source Documents:**
- `qwick_services_cis_enforcement_action_trigger_specification.md` (Section 5)
- `qwick_services_cis_trust_safety_admin_dashboard_architecture_ui_design.md` (Modules B, C, D)
- `qwick_services_cis_trust_safety_systems_architecture.md` (Section F)
- `qwick_services_cis_observability_logging_compliance_framework.md` (Section 6)
