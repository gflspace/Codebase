# Prioritization Policy
## VIOE Planning Document

**Document Type:** Planning (Source of Truth)
**Version:** 1.0
**Last Updated:** January 2026
**Status:** Active

---

## 1. PURPOSE

This document defines the authoritative prioritization policy for VIOE. All downstream systems (Coordination and Execution) MUST read from this document to determine:
- What gets fixed first
- SLA thresholds and enforcement
- Ownership assignment rules
- Escalation triggers

**PCE Principle:** Planning defines intent. This document is the single source of truth for prioritization.

---

## 2. OWNERSHIP CONFIDENCE THRESHOLDS

### 2.1 AI Assignment Confidence Levels

The Coordination layer assigns vulnerabilities to teams using AI. Confidence determines the action taken:

| Confidence Level | Range | UI Indicator | Action |
|------------------|-------|--------------|--------|
| **High** | >= 90% | Green badge | Auto-assign to team; no review required |
| **Medium** | 70% - 89% | Yellow badge | Assign with "Needs Review" flag |
| **Low** | 50% - 69% | Orange badge | Queue for manual triage |
| **Very Low** | < 50% | Red badge | Reject auto-assignment; manual required |
| **Unassigned** | N/A | Gray badge | Immediate triage queue |

### 2.2 Confidence Threshold Configuration

| Setting | Default Value | Configurable Range |
|---------|---------------|-------------------|
| Auto-assign threshold | 70% | 50% - 90% |
| Review flag threshold | 90% | 70% - 100% |
| Reject threshold | 50% | 0% - 70% |

### 2.3 Confidence Source Weighting

When multiple data sources provide ownership signals:

| Source | Weight | Notes |
|--------|--------|-------|
| CODEOWNERS file | 40% | Explicit ownership declaration |
| Git commit history (last 90 days) | 35% | Recent code modifications |
| Directory integration (Okta/AD) | 15% | Organizational mapping |
| Historical assignment patterns | 10% | Learning from manual corrections |

---

## 3. PRIORITIZATION ORDER

### 3.1 Global Priority Ranking

Vulnerabilities are prioritized in the following order (1 = highest priority):

| Priority | Criteria | Rationale |
|----------|----------|-----------|
| 1 | Critical severity + Production environment | Maximum business impact |
| 2 | Critical severity + High/Critical asset criticality | Core system protection |
| 3 | Present in CISA KEV (any severity) | Known active exploitation |
| 4 | High severity + Production environment | Significant production risk |
| 5 | EPSS > 0.7 (any severity) | High exploitation probability |
| 6 | High severity + High asset criticality | Important system risk |
| 7 | Critical severity + Staging environment | Pre-production protection |
| 8 | Medium severity + Production + Critical asset | Moderate but impactful |
| 9 | All other by CVSS score descending | Standard risk ordering |

### 3.2 Tiebreaker Rules

When two vulnerabilities have equal priority:
1. Higher CVSS score first
2. Older vulnerability first (longer exposure)
3. More affected assets first
4. Alphabetical by CVE ID (deterministic)

---

## 4. SERVICE LEVEL AGREEMENTS (SLA)

### 4.1 Remediation SLA by Severity

| Severity | Target Resolution | Warning Alert | Breach Alert | Grace Period |
|----------|------------------|---------------|--------------|--------------|
| Critical | 7 calendar days | 48 hours prior | At breach | None |
| High | 30 calendar days | 72 hours prior | At breach | 24 hours |
| Medium | 60 calendar days | 7 days prior | At breach | 48 hours |
| Low | 90 calendar days | 14 days prior | At breach | 7 days |
| Info | No SLA | N/A | N/A | N/A |

### 4.2 SLA Calculation Rules

| Rule | Definition |
|------|------------|
| SLA Start | Timestamp of first import (created_date) |
| SLA Pause | Status = "False Positive" OR Status = "Blocked" (with documented reason) |
| SLA Resume | Status returns to "Open" or "In Progress" |
| SLA Stop | Status = "Resolved" |

### 4.3 SLA Escalation Path

| Condition | Notification Recipients |
|-----------|------------------------|
| 50% SLA elapsed | Assigned team (Slack/email) |
| Warning threshold reached | Team Lead + Assigned team |
| SLA breach imminent (24h) | Security Manager + Team Lead |
| SLA breached | Security Manager + Director |

### 4.4 SLA Override Authority

| Override Type | Approval Required | Max Extension |
|---------------|-------------------|---------------|
| 24-hour extension | Team Lead | Once per vulnerability |
| 7-day extension | Security Manager | Once per vulnerability |
| 30-day extension | CISO | With documented justification |
| Indefinite | Not permitted | N/A |

---

## 5. TRIAGE WORKFLOW

### 5.1 Triage Status Definitions

| Status | Definition | Next Actions |
|--------|------------|--------------|
| **Pending** | Newly imported; not yet reviewed | Triage or auto-assign |
| **Triaged** | AI assignment applied | Verify or reassign |
| **Validated** | Human confirmed assignment | Begin remediation |

### 5.2 Triage Priority Queue

Unassigned vulnerabilities enter the triage queue in this order:
1. Critical severity first
2. Production environment second
3. High asset criticality third
4. Oldest first within each tier

### 5.3 Bulk Triage Rules

| Constraint | Value |
|------------|-------|
| Maximum items per bulk operation | 100 |
| Processing order | Priority queue order (Section 5.2) |
| Low confidence handling | Flag for manual review; do not skip |
| Failure handling | Log and continue; retry failed items |

---

## 6. ASSIGNMENT RULES

### 6.1 One Owner Rule

**Every vulnerability MUST have exactly one owning team at any time.**

| Scenario | Resolution |
|----------|------------|
| No team identified | Assign to "Security Triage" team |
| Multiple teams identified | Select highest-confidence match |
| Team no longer exists | Reassign to "Security Triage" team |

### 6.2 Reassignment Rules

| Action | Permission Required | Audit Log |
|--------|---------------------|-----------|
| Accept AI assignment | Any role with vulnerability access | Yes |
| Reassign to different team | Analyst or higher | Yes |
| Reassign to self (claim) | Team member | Yes |
| Reassign from another team | Manager or higher | Yes |

### 6.3 Escalation Triggers

Auto-escalate to Security Manager when:
- Critical vulnerability unassigned > 2 hours
- Any vulnerability unassigned > 24 hours
- Low confidence assignment not reviewed > 4 hours
- SLA approaching (per Section 4.3)

---

## 7. NEEDS REVIEW CRITERIA

### 7.1 Automatic Review Flag Triggers

A vulnerability is flagged for review when:

| Trigger | Flag Type |
|---------|-----------|
| Ownership confidence < 90% | Low Confidence Review |
| No team assigned | Unassigned Review |
| Manual reassignment within 24h of import | Assignment Dispute Review |
| Severity changed by scanner update | Severity Change Review |
| Asset criticality >= High AND severity >= Medium | Critical Asset Review |

### 7.2 Review Queue Ordering

| Priority | Criteria |
|----------|----------|
| 1 | Unassigned + Critical severity |
| 2 | Unassigned + Production |
| 3 | Low confidence + Critical severity |
| 4 | Low confidence + High severity |
| 5 | All others by created_date ascending |

---

## 8. SUPPRESSION POLICY

### 8.1 Allowed Suppression Conditions

Suppression is permitted ONLY for:

| Condition | Approval Required | Documentation |
|-----------|-------------------|---------------|
| Non-production environment + Low severity | Automatic | Rule name logged |
| Non-production environment + Medium severity | Team Lead | Approval ticket |
| Asset tagged "decommissioning" (any severity except Critical) | Security Manager | Decommission ticket |
| Known false positive with evidence | Analyst | Evidence attached |
| Duplicate finding (same CVE + Asset) | Automatic | Original vulnerability linked |

### 8.2 Suppression Prohibitions

The following may NEVER be suppressed:

| Category | Reason |
|----------|--------|
| Critical severity in Production | Unacceptable risk |
| Any severity in CISA KEV | Active exploitation |
| High severity in Production with EPSS > 0.5 | High exploit probability |
| Vulnerabilities with active incidents | Under investigation |

### 8.3 Suppression Audit

All suppressions are logged with:
- Rule that triggered suppression
- Timestamp
- Original vulnerability data
- Approver (if manual)

Monthly review required for all active suppression rules.

---

## 9. STATUS TRANSITIONS

### 9.1 Valid Status Transitions

```
                    +-----------------+
                    |      Open       |
                    +--------+--------+
                             |
           +-----------------+-----------------+
           |                                   |
           v                                   v
    +------+------+                    +-------+-------+
    | In Progress |                    | False Positive|
    +------+------+                    +---------------+
           |                                   |
           v                                   v
    +------+------+                    (Can reopen to Open)
    |  In Review  |
    +------+------+
           |
           v
    +------+------+
    |  Resolved   |
    +------+------+
           |
           v
    (Can reopen to Open if vulnerability recurs)
```

### 9.2 Status Rules

| Transition | Condition Required |
|------------|-------------------|
| Open → In Progress | Task created OR manual status change |
| In Progress → In Review | Fix submitted (PR created) |
| In Review → Resolved | Fix verified (tests pass) |
| Any → False Positive | Evidence provided; analyst+ role |
| Resolved → Open | Rescan detects same vulnerability |
| Any → Blocked | Documented blocker; adds to SLA pause |

---

## 10. CHANGE CONTROL

Changes to this prioritization policy require:
1. Written proposal with impact analysis
2. Security Manager approval
3. 14-day notice before enforcement (7-day for security improvements)
4. Entry in `planning/history.md`

---

## DOCUMENT CONTROL

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Security Architecture | Initial release |

---

*This document is the authoritative source for prioritization in VIOE.*
*No execution logic may override these definitions.*
