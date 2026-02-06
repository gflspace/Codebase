# VIOE Planning Layer
## PCE-Compliant Planning Documents

---

## Overview

This directory contains the **Planning Layer** for VIOE, as defined by the Planning-Coordination-Execution (PCE) framework.

**PCE Principle:**
> Planning is always the source of truth. No execution logic is allowed here.

---

## Directory Structure

```
planning/
├── README.md           # This file - explains the planning layer
├── risk_model.md       # Risk definitions, CVSS mapping, scoring
├── prioritization.md   # SLA thresholds, ownership rules, triage
├── automation.md       # Automation boundaries, approval levels
├── compliance.md       # Framework mappings (SOC 2, ISO, GDPR, PCI)
└── history.md          # Change log for all planning documents
```

---

## Document Purposes

### risk_model.md
**Defines:** How vulnerabilities are classified and scored

- CVSS to severity mapping
- Exploitability weighting (EPSS, KEV)
- Business criticality multipliers
- Environment multipliers
- Composite risk score calculation

**Consumers:** Coordination layer (AI triage), Reporting

### prioritization.md
**Defines:** What gets fixed first and when

- Ownership confidence thresholds
- SLA by severity
- Triage workflow
- Assignment rules
- Status transitions

**Consumers:** Coordination layer, UI components, Notifications

### automation.md
**Defines:** What can be automated vs. requires approval

- Automation levels (L0-L3)
- Auto-fix eligibility
- Pull request automation
- Incident response automation
- Safeguards and rate limits

**Consumers:** Execution layer, CI/CD integration

### compliance.md
**Defines:** How vulnerabilities map to compliance frameworks

- SOC 2 Type II mappings
- ISO 27001 Annex A mappings
- GDPR Article 32 mappings
- PCI DSS v4.0 mappings
- Evidence collection rules

**Consumers:** Compliance reporting, Audit support

---

## PCE Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│                     PLANNING LAYER                               │
│                     (This Directory)                             │
│                                                                  │
│  Defines: WHAT and WHY                                          │
│  - Risk definitions                                              │
│  - Business context                                              │
│  - Prioritization rules                                          │
│  - Automation boundaries                                         │
│  - Compliance constraints                                        │
│                                                                  │
│  Format: Markdown (.md)                                          │
│  Contains: NO execution logic                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Reads from planning
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   COORDINATION LAYER                             │
│                   (AI Functions in Base44)                       │
│                                                                  │
│  Decides: WHO and WHEN                                          │
│  - Interprets planning documents                                 │
│  - Correlates vulnerabilities with context                       │
│  - Determines prioritization order                               │
│  - Selects execution workflows                                   │
│  - Logs decisions and outcomes                                   │
│                                                                  │
│  Location: Backend functions (triageVulnerability, etc.)        │
│  Contains: Decision logic, but NO direct execution              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Instructs execution
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION LAYER                               │
│                    (Frontend + Backend Scripts)                  │
│                                                                  │
│  Performs: HOW                                                  │
│  - Ingests scanner data                                          │
│  - Normalizes vulnerability records                              │
│  - Creates tickets/actions                                       │
│  - Updates state                                                 │
│  - Sends notifications                                           │
│                                                                  │
│  Location: React components, API handlers                        │
│  Contains: Deterministic operations ONLY                        │
│  Does NOT: Make decisions or prioritize                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Usage Guidelines

### For Developers

1. **Never hardcode business rules in UI components**
   - Reference planning documents for thresholds
   - Example: Confidence threshold of 70% comes from `prioritization.md`

2. **Coordination functions must read planning**
   - AI triage functions should reference `risk_model.md` for severity mapping
   - SLA calculations should reference `prioritization.md`

3. **Execution is deterministic**
   - Frontend components display data; they don't decide priority
   - Backend scripts execute instructions; they don't make business decisions

### For Product/Security

1. **All policy changes go through planning documents**
   - Update the relevant `.md` file first
   - Document in `history.md`
   - Then update downstream systems

2. **Review planning documents regularly**
   - See review schedule in `history.md`
   - Changes require approval per document change control section

3. **Planning is the source of truth**
   - If code contradicts planning documents, planning is correct
   - Code must be updated to match planning

---

## Change Control Process

1. **Propose Change**
   - Write proposal with impact analysis
   - Identify affected downstream systems

2. **Get Approval**
   - Security Manager for risk_model, prioritization, automation
   - Compliance Officer for compliance mappings
   - CISO for cross-cutting changes

3. **Update Document**
   - Modify the relevant planning document
   - Add entry to `history.md`

4. **Notify Teams**
   - Announce change with effective date
   - Allow notice period per document requirements

5. **Update Downstream**
   - Update coordination functions if needed
   - Update execution layer if needed
   - Update documentation if needed

---

## Validation

To verify PCE compliance:

1. **Planning documents exist and are complete**
   - All four mandatory documents present
   - No TODO sections or incomplete mappings

2. **No business logic in execution**
   - UI components don't calculate priority
   - UI components don't determine SLAs
   - UI components reference configuration, not hardcode values

3. **Coordination reads from planning**
   - AI functions reference planning rules
   - Decisions are logged with rationale

4. **All changes logged**
   - `history.md` tracks all modifications
   - Approvals documented

---

## References

- **PCE Master Document:** `PCE_Vulnerability_Management_Master_System.md`
- **System Documentation:** `VIOE_Documentation/`
- **Source Code:** `extracted_app/src/`

---

*This planning layer is the authoritative source of business rules for VIOE.*
*Plan clearly. Coordinate intelligently. Execute reliably.*
