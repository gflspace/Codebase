# Planning Document History
## VIOE Change Log

**Document Type:** Planning (Audit Trail)
**Purpose:** Track all changes to planning documents
**Requirement:** Per PCE Section 10 - Failure → Learning Loop

---

## Change Log Format

Each entry must include:
- **Date:** ISO 8601 format (YYYY-MM-DD)
- **Document:** Which planning document changed
- **Change Type:** Created | Updated | Deprecated
- **Author:** Who made the change
- **Approver:** Who approved the change
- **Summary:** Brief description of change
- **Rationale:** Why the change was needed
- **Impact:** What downstream systems are affected

---

## 2026 Changes

### January 2026

#### 2026-01-31 | Frontend PCE Compliance Update

| Field | Value |
|-------|-------|
| **Documents** | prioritization.md (referenced) |
| **Change Type** | Updated |
| **Author** | Security Architecture |
| **Approver** | Security Architecture |
| **Summary** | Updated frontend components to reference planning documents instead of hardcoded thresholds |
| **Rationale** | PCE compliance requires execution layer to read from planning layer |
| **Impact** | Frontend now derives business rules from centralized planning configuration |

**Details:**
- Created `src/config/planningConfig.js` - Centralized planning configuration with thresholds from planning documents
- Updated `src/pages/Dashboard.jsx` - Now imports CONFIDENCE_THRESHOLDS and needsReview from planningConfig
- Updated `src/pages/Vulnerabilities.jsx` - Now imports CONFIDENCE_THRESHOLDS from planningConfig
- Updated `src/components/vulnerability/VulnerabilityCard.jsx` - Uses CONFIDENCE_THRESHOLDS for color coding
- Updated `src/components/vulnerability/OwnershipPanel.jsx` - Uses CONFIDENCE_THRESHOLDS for confidence level display
- Updated `src/config/index.js` - Re-exports planning configuration

**Thresholds Now Centralized:**
- HIGH confidence: 90% (from prioritization.md Section 2.1)
- MEDIUM confidence: 70% (from prioritization.md Section 2.1)
- LOW confidence: 50% (from prioritization.md Section 2.1)

**Migration Notes:**
- All hardcoded values (90, 70, 50) replaced with CONFIDENCE_THRESHOLDS constants
- Future threshold changes only require updating planningConfig.js (which references planning/prioritization.md)

---

#### 2026-01-31 | Initial Planning Layer Creation

| Field | Value |
|-------|-------|
| **Documents** | risk_model.md, prioritization.md, automation.md, compliance.md |
| **Change Type** | Created |
| **Author** | Security Architecture |
| **Approver** | Security Architecture (Initial Setup) |
| **Summary** | Created initial planning directory with all mandatory PCE documents |
| **Rationale** | Establish PCE-compliant planning layer as single source of truth |
| **Impact** | All downstream coordination and execution must now reference these documents |

**Details:**
- Created `planning/risk_model.md` - Defines CVSS mapping, exploitability weighting, business criticality
- Created `planning/prioritization.md` - Defines SLA thresholds, ownership rules, triage workflow
- Created `planning/automation.md` - Defines automation boundaries, approval levels, safeguards
- Created `planning/compliance.md` - Defines framework mappings (SOC 2, ISO 27001, GDPR, PCI DSS)

**Migration Notes:**
- Previous business rules were scattered across UI code and documentation
- Hardcoded thresholds (90%, 70%) in Dashboard.jsx and Vulnerabilities.jsx now have authoritative source
- All future changes to these rules must update planning documents first

---

## Template for Future Entries

```markdown
#### YYYY-MM-DD | Brief Title

| Field | Value |
|-------|-------|
| **Document** | [document name] |
| **Change Type** | Created | Updated | Deprecated |
| **Author** | [name] |
| **Approver** | [name] |
| **Summary** | [brief description] |
| **Rationale** | [why this change was needed] |
| **Impact** | [what systems/processes are affected] |

**Details:**
- [Detailed description of changes]

**Migration Notes:**
- [Any migration steps required]
```

---

## Pending Changes

*No pending changes at this time.*

---

## Deprecated Documents

*No deprecated documents at this time.*

---

## Review Schedule

| Review Type | Frequency | Next Review | Owner |
|-------------|-----------|-------------|-------|
| Risk Model | Quarterly | April 2026 | Security Architecture |
| Prioritization | Monthly | February 2026 | Security Operations |
| Automation | Quarterly | April 2026 | Security Architecture |
| Compliance | Semi-annually | July 2026 | Compliance Team |
| Full Planning Review | Annually | January 2027 | CISO |

---

*This history document is append-only. Entries may not be modified or deleted.*
