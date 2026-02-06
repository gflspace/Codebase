# Risk Model Definition
## VIOE Planning Document

**Document Type:** Planning (Source of Truth)
**Version:** 1.0
**Last Updated:** January 2026
**Status:** Active

---

## 1. PURPOSE

This document defines the authoritative risk model for VIOE. All downstream systems (Coordination and Execution) MUST read from this document to determine how vulnerabilities are classified, scored, and prioritized.

**PCE Principle:** Planning defines intent. This document is the single source of truth for risk classification.

---

## 2. CVSS TO SEVERITY MAPPING

All vulnerabilities with CVSS scores are mapped to severity levels using the following thresholds:

| CVSS Score Range | Severity Level | Display Color | Priority Order |
|------------------|----------------|---------------|----------------|
| 9.0 - 10.0       | Critical       | Red (#EF4444) | 1 (Highest)    |
| 7.0 - 8.9        | High           | Orange (#F97316) | 2            |
| 4.0 - 6.9        | Medium         | Yellow (#EAB308) | 3            |
| 0.1 - 3.9        | Low            | Blue (#3B82F6) | 4             |
| 0.0              | Info           | Gray (#6B7280) | 5 (Lowest)    |

### 2.1 Severity Override Rules

The following conditions OVERRIDE the CVSS-based severity:

| Condition | Override Behavior |
|-----------|-------------------|
| EPSS Score > 0.9 | Escalate severity by one level (max Critical) |
| Present in CISA KEV | Treat as Critical regardless of CVSS |
| Public Exploit Available | Minimum severity = High |
| Active Exploitation Detected | Immediate escalation to Critical |

---

## 3. EXPLOITABILITY WEIGHTING

### 3.1 EPSS (Exploit Prediction Scoring System)

EPSS scores predict the probability of exploitation within 30 days.

| EPSS Range | Risk Modifier | Action |
|------------|---------------|--------|
| 0.9 - 1.0  | +2 priority levels | Immediate triage required |
| 0.7 - 0.89 | +1 priority level | Expedited remediation |
| 0.4 - 0.69 | No modifier | Standard prioritization |
| 0.0 - 0.39 | -1 priority level (min: Low) | May deprioritize if resource-constrained |

### 3.2 CISA Known Exploited Vulnerabilities (KEV)

Any vulnerability present in the CISA KEV catalog:
- **Severity Override:** Treat as Critical
- **SLA Override:** Apply Critical SLA (7 days)
- **Notification:** Immediate alert to Security Manager
- **Suppression:** Cannot be suppressed under any circumstances

### 3.3 Proof-of-Concept Availability

| PoC Status | Impact |
|------------|--------|
| Public PoC (e.g., GitHub, ExploitDB) | +1 priority level |
| Weaponized Exploit in Metasploit/Nuclei | +2 priority levels |
| No Known PoC | No modifier |

---

## 4. BUSINESS CRITICALITY MAPPING

### 4.1 Asset Criticality Levels

Assets are classified into criticality levels based on business impact:

| Criticality | Definition | Examples |
|-------------|------------|----------|
| **Critical** | Core revenue/operations; outage = business stoppage | Payment systems, core databases, authentication |
| **High** | Significant business impact; outage = degraded operations | Customer-facing APIs, reporting systems |
| **Medium** | Moderate impact; workarounds available | Internal tools, secondary services |
| **Low** | Minimal impact; non-essential systems | Development tools, archived systems |

### 4.2 Risk Score Multipliers (Asset Criticality)

| Asset Criticality | Risk Score Multiplier |
|-------------------|----------------------|
| Critical          | 2.0x                 |
| High              | 1.5x                 |
| Medium            | 1.0x (baseline)      |
| Low               | 0.5x                 |

---

## 5. ENVIRONMENT CLASSIFICATION

### 5.1 Environment Definitions

| Environment | Definition | Data Sensitivity |
|-------------|------------|------------------|
| **Production** | Live systems serving customers/users | Contains real customer data |
| **Staging** | Pre-production validation environment | May contain production-like data |
| **Development** | Developer workstations/sandboxes | Should not contain real data |

### 5.2 Risk Score Multipliers (Environment)

| Environment | Risk Score Multiplier | Suppression Allowed |
|-------------|----------------------|---------------------|
| Production  | 1.5x                 | Never (for Critical/High) |
| Staging     | 1.0x (baseline)      | With approval |
| Development | 0.5x                 | Yes (except Critical) |

---

## 6. COMPOSITE RISK SCORE CALCULATION

### 6.1 Formula

```
Risk Score = Base Score × Asset Multiplier × Environment Multiplier

Where:
  Base Score = (Critical × 25) + (High × 15) + (Medium × 5) + (Low × 1)
  Asset Multiplier = From Section 4.2
  Environment Multiplier = From Section 5.2

Maximum Score: 100 (capped)
```

### 6.2 Risk Score Interpretation

| Score Range | Risk Level | Dashboard Color | Action Required |
|-------------|------------|-----------------|-----------------|
| 76 - 100    | Critical   | Red             | Immediate attention |
| 51 - 75     | High       | Orange          | Prioritize this sprint |
| 26 - 50     | Medium     | Yellow          | Plan for resolution |
| 0 - 25      | Low        | Green           | Address in backlog |

---

## 7. DATA FRESHNESS RULES

### 7.1 Scan Data Age

| Data Age | Treatment |
|----------|-----------|
| < 24 hours | Current; use as-is |
| 24 - 72 hours | Valid; rescan if critical decision pending |
| 72 hours - 7 days | Stale; flag for rescan |
| > 7 days | Expired; mandatory rescan before action |

### 7.2 Threat Intelligence Freshness

| Source | Update Frequency | Staleness Threshold |
|--------|------------------|---------------------|
| CISA KEV | Daily | 24 hours |
| EPSS | Daily | 48 hours |
| NVD/CVE | Continuous | 24 hours |
| Vendor Advisories | As published | 72 hours |

---

## 8. EXCEPTIONS AND OVERRIDES

### 8.1 Risk Acceptance

Risk may only be accepted under the following conditions:

| Condition | Approval Required | Documentation |
|-----------|-------------------|---------------|
| Low severity, Development only | Team Lead | Ticket reference |
| Medium severity, any environment | Security Manager | Risk acceptance form |
| High severity, any environment | CISO | Formal exception with expiry |
| Critical severity | Not permitted | N/A |

### 8.2 Override Audit

All risk overrides MUST be logged with:
- Override requestor
- Approving authority
- Justification
- Expiration date
- Review schedule

---

## 9. CHANGE CONTROL

Changes to this risk model require:
1. Written proposal with impact analysis
2. Security Manager approval
3. 30-day notice before enforcement
4. Entry in `planning/history.md`

---

## DOCUMENT CONTROL

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Security Architecture | Initial release |

---

*This document is the authoritative source for risk classification in VIOE.*
*No execution logic may override these definitions.*
