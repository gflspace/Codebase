# VIOE Technical Assessment Report

**Document Type:** Technical Due Diligence Assessment
**Date:** February 1, 2026
**Classification:** Confidential - For M&A / Investment Review

---

## Executive Summary

This assessment evaluates the VIOE (Vulnerability Intelligence & Ownership Engine) codebase against its stated competitive differentiators. The analysis reveals a **functional frontend application with significant backend gaps** that would require substantial development to deliver on claimed capabilities.

### Overall Assessment: PARTIAL IMPLEMENTATION

| Strategic Pillar | Status | Evidence |
|-----------------|--------|----------|
| 1. Noise to Intelligence | **Partially** | UI exists; normalization engine missing |
| 2. Context-Aware Prioritization | **Partially** | Config exists; live scoring not implemented |
| 3. Ownership Enforcement | **Partially** | Assignment UI exists; resolution logic is placeholder |
| 4. Scanner-Agnostic Layer | **Missing** | No connector framework |
| 5. Executive Visibility | **Implemented** | Full dashboard; data is mock-generated |

### Acquisition Risk Assessment

| Risk Category | Level | Details |
|--------------|-------|---------|
| Frontend Completeness | Low | Full React UI with 16 pages |
| Backend Maturity | High | No production backend; Supabase schema exists but untested |
| Integration Readiness | Critical | All external integrations are mocked |
| Data Pipeline | Critical | No real ingestion, normalization, or correlation |
| Technical Debt | Medium | Clean code but placeholder implementations |

---

## 1. From "Noise" to "Intelligence"

### Claimed Capability
Reduce alert fatigue by normalizing, de-duplicating, and correlating vulnerability data from multiple sources into a single intelligence platform.

### Code Analysis

#### What EXISTS in the codebase:

**Suppression Rules** (`mockData.js:308-312`)
```javascript
export const mockSuppressionRules = [
  { id: "rule-1", name: "Non-Production Environment Filter",
    type: "environment", condition: "environment != 'production'",
    active: true, suppressed_count: 45 },
];
```
- Basic suppression rule definitions
- Rule types: environment, asset_pattern, severity_environment
- UI to view suppressed counts

**Scanner Source Field** (`mockData.js:28`)
```javascript
scanner_source: "Snyk" // Also: SonarQube, Qualys, Checkmarx, Manual Review
```
- Vulnerabilities track their source scanner
- 5 different scanner sources in mock data

**File Import** (`ImportVulnerabilities.jsx:42-78`)
- Accepts CSV, JSON, Excel, PDF formats
- Uses file extraction API
- Basic schema validation

#### What is MISSING:

| Component | Gap Description | Impact |
|-----------|-----------------|--------|
| **Normalization Engine** | No code transforms scanner-specific formats to canonical model | Scanner data cannot be unified |
| **De-duplication Logic** | No CVE-based or fingerprint-based merging | Duplicates will proliferate |
| **Correlation Engine** | Multiple findings from same vulnerability not linked | Alert fatigue not reduced |
| **Canonical Data Model** | Fields are inconsistent across mock data | No standardization |

**Evidence of Gap** (`mockClient.js:42-116`):
The entity handlers are generic CRUD operations with no transformation:
```javascript
async create(data) {
  await delay();
  const newItem = {
    ...data,  // Raw data passed through unchanged
    id: `${entityName.toLowerCase()}-${Date.now()}`,
    created_date: new Date().toISOString()
  };
  // No normalization, no de-duplication check
  dataStores[entityName].push(newItem);
  return newItem;
}
```

### Design Required: Normalization & Correlation Engine

```
┌─────────────────────────────────────────────────────────────────┐
│                   INGESTION PIPELINE (MISSING)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌──────────────┐    ┌───────────────┐          │
│  │ Scanner │───>│ Connector    │───>│ Normalizer    │          │
│  │ Data    │    │ (per-source) │    │               │          │
│  └─────────┘    └──────────────┘    │ - Map fields  │          │
│                                     │ - Enrich CVE  │          │
│  ┌─────────┐    ┌──────────────┐    │ - Standardize │          │
│  │ Webhook │───>│ Adapter      │───>│   severity    │          │
│  │         │    │              │    └───────┬───────┘          │
│  └─────────┘    └──────────────┘            │                  │
│                                             ▼                  │
│                                    ┌───────────────┐           │
│                                    │ Correlator    │           │
│                                    │               │           │
│                                    │ - CVE match   │           │
│                                    │ - Fingerprint │           │
│                                    │ - Asset link  │           │
│                                    └───────┬───────┘           │
│                                            │                   │
│                                            ▼                   │
│                                    ┌───────────────┐           │
│                                    │ Canonical     │           │
│                                    │ Vulnerability │           │
│                                    │ Record        │           │
│                                    └───────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Context-Aware Prioritization

### Claimed Capability
Prioritize vulnerabilities based on business context, not just CVSS scores. Factor in asset criticality, environment, and data sensitivity.

### Code Analysis

#### What EXISTS:

**Planning Configuration** (`planningConfig.js:166-179`)
```javascript
export const RISK_MULTIPLIERS = {
  assetCriticality: {
    critical: 2.0, high: 1.5, medium: 1.0, low: 0.5,
  },
  environment: {
    production: 1.5, staging: 1.0, development: 0.5,
  },
};
```
- Defined multipliers for asset criticality
- Defined multipliers for environment
- EPSS thresholds defined

**Risk Calculation Function** (`planningConfig.js:339-353`)
```javascript
export function calculateRiskScore({
  criticalCount = 0, highCount = 0, mediumCount = 0, lowCount = 0,
  assetCriticality = 'medium', environment = 'staging'
}) {
  const baseScore = (criticalCount * 25) + (highCount * 15) +
                    (mediumCount * 5) + (lowCount * 1);
  const assetMultiplier = RISK_MULTIPLIERS.assetCriticality[assetCriticality] || 1.0;
  const envMultiplier = RISK_MULTIPLIERS.environment[environment] || 1.0;
  const score = baseScore * assetMultiplier * envMultiplier;
  return Math.min(100, Math.round(score));
}
```

#### What is MISSING:

| Component | Gap Description | Impact |
|-----------|-----------------|--------|
| **Live Risk Calculation** | `calculateRiskScore()` not called on vulnerabilities | Risk scores are static mock values |
| **Data Sensitivity Integration** | `data_classification` field exists but unused in scoring | No PII/PHI weighting |
| **Business Impact Factors** | No revenue, customer exposure, or regulatory factors | Pure technical scoring |
| **EPSS Integration** | Thresholds defined but not applied | No exploit prediction usage |
| **Real-time Updates** | No triggers recalculate on context change | Scores become stale |

**Evidence of Gap** (`mockData.js:231-238`):
Assets have static `risk_score` values, not computed:
```javascript
export const mockAssets = [
  { id: "asset-1", name: "auth-service", criticality: "critical",
    risk_score: 85 },  // Static value, not computed
  { id: "asset-2", name: "web-frontend", criticality: "high",
    risk_score: 72 },
];
```

### Design Required: Contextual Risk Engine

**Inputs:**
1. CVSS Base Score
2. EPSS Score (exploit probability)
3. Asset Criticality (from asset registry)
4. Environment (production/staging/dev)
5. Data Classification (PII, PHI, PCI)
6. Compliance Scope (SOC2, HIPAA controls affected)
7. Exposure (internet-facing, internal)

**Weighting Model:**
```
Contextual_Risk = Base_CVSS × (
  Asset_Criticality_Weight ×
  Environment_Weight ×
  Data_Sensitivity_Weight ×
  EPSS_Modifier
) × Compliance_Multiplier

Where:
- Asset_Criticality_Weight: 0.5 - 2.0
- Environment_Weight: 0.5 - 1.5
- Data_Sensitivity_Weight: 1.0 - 2.5
- EPSS_Modifier: 0.8 - 1.5
- Compliance_Multiplier: 1.0 - 1.5
```

---

## 3. Ownership & Accountability Enforcement

### Claimed Capability
Automatically assign vulnerabilities to the right teams with high confidence. Track SLAs and enforce accountability with Jira/ServiceNow integration.

### Code Analysis

#### What EXISTS:

**Triage Function** (`mockClient.js:145-155`)
```javascript
async triageVulnerability({ vulnerability_id }) {
  await delay(200);
  const vuln = dataStores.Vulnerability.find(v => v.id === vulnerability_id);
  if (vuln) {
    const teams = dataStores.Team;
    const randomTeam = teams[Math.floor(Math.random() * teams.length)];
    vuln.assigned_team = randomTeam.id;
    vuln.ownership_confidence = Math.floor(Math.random() * 30) + 70;
  }
  return { data: { success: true, assigned_team: vuln?.assigned_team } };
}
```

**Confidence Thresholds** (`planningConfig.js:23-35`)
```javascript
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 90,    // Auto-assign, no review
  MEDIUM: 70,  // Assign with review flag
  LOW: 50,     // Manual triage queue
  VERY_LOW: 50 // Reject auto-assignment
};
```

**SLA Definitions** (`planningConfig.js:88-119`)
```javascript
export const SLA_BY_SEVERITY = {
  critical: { targetDays: 7, warningHours: 48, gracePeriodHours: 0 },
  high: { targetDays: 30, warningHours: 72, gracePeriodHours: 24 },
  // ...
};
```

#### What is MISSING:

| Component | Gap Description | Impact |
|-----------|-----------------|--------|
| **Ownership Resolution Logic** | Assignment is RANDOM, not based on code paths | Incorrect assignments |
| **File Path to Team Mapping** | `owned_patterns` in schema, not used | No CODEOWNERS-style resolution |
| **Jira Integration** | `createJiraIssue()` returns fake data | No actual ticket creation |
| **SLA Enforcement** | No scheduled jobs check breaches | SLAs not enforced |
| **Escalation Workflow** | No automatic escalation on breach | No accountability |
| **Bidirectional Sync** | `syncJiraStatus()` is a stub | Status changes not reflected |

**Critical Evidence** (`mockClient.js:151`):
```javascript
const randomTeam = teams[Math.floor(Math.random() * teams.length)];
// THIS IS THE ENTIRE OWNERSHIP LOGIC - Random selection
```

### Design Required: Ownership Resolution Engine

```
┌─────────────────────────────────────────────────────────────────┐
│                OWNERSHIP RESOLUTION (MISSING)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────┐                                         │
│  │ Vulnerability     │                                         │
│  │ - file_path       │                                         │
│  │ - asset_id        │                                         │
│  │ - affected_comp   │                                         │
│  └─────────┬─────────┘                                         │
│            │                                                    │
│            ▼                                                    │
│  ┌───────────────────┐    ┌──────────────────┐                 │
│  │ Resolution Rules  │    │ Team Patterns    │                 │
│  │                   │◄───│                  │                 │
│  │ 1. File path      │    │ owned_patterns:  │                 │
│  │    matching       │    │ ["src/auth/*",   │                 │
│  │ 2. Asset owner    │    │  "*.security.*"] │                 │
│  │    lookup         │    │                  │                 │
│  │ 3. Tech stack     │    │ tech_stack:      │                 │
│  │    matching       │    │ ["python", "k8s"]│                 │
│  │ 4. Historical     │    └──────────────────┘                 │
│  │    assignment     │                                         │
│  └─────────┬─────────┘                                         │
│            │                                                    │
│            ▼                                                    │
│  ┌───────────────────┐                                         │
│  │ Confidence Score  │                                         │
│  │                   │                                         │
│  │ - Pattern match:  │                                         │
│  │   90-100%         │                                         │
│  │ - Asset owner:    │                                         │
│  │   80-89%          │                                         │
│  │ - Tech inference: │                                         │
│  │   60-79%          │                                         │
│  │ - Historical:     │                                         │
│  │   50-69%          │                                         │
│  └───────────────────┘                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Escalation Logic:**
```
SLA_WARNING_THRESHOLD = SLA_days - warning_hours

If current_time > SLA_WARNING_THRESHOLD:
  - Flag for review
  - Notify team lead via Slack

If current_time > SLA_DUE_DATE:
  - Mark SLA breached
  - Auto-escalate to management
  - Create escalation record
  - Trigger Jira status update
```

---

## 4. Scanner-Agnostic Intelligence Layer

### Claimed Capability
Integrate with any vulnerability scanner without vendor lock-in. Support multiple sources through a unified connector framework.

### Code Analysis

#### What EXISTS:

**Scanner Source Field** (`schema.sql:115-117`)
```sql
scanner_source VARCHAR(100), -- 'snyk', 'sonarqube', 'dependabot', etc.
scanner_id VARCHAR(255),     -- ID in source system
raw_finding JSONB,           -- Original scanner output
```

**File Import** (`ImportVulnerabilities.jsx`)
- Accepts multiple file formats
- Basic field extraction

#### What is MISSING:

| Component | Gap Description | Impact |
|-----------|-----------------|--------|
| **Connector Framework** | No plugin/adapter architecture | Cannot add new scanners easily |
| **Webhook Receivers** | No inbound HTTP endpoints | No push integration |
| **API Connectors** | No pull-based scanner APIs | Cannot fetch from scanners |
| **Field Mappings** | No scanner-specific normalization | Data inconsistency |
| **Credential Management** | No secure storage for API keys | Cannot authenticate |

**Evidence**: No connector code exists anywhere in the codebase. Search for "connector", "webhook", "integration" returns only UI labels and mock stubs.

### Design Required: Plugin Connector Framework

```
┌─────────────────────────────────────────────────────────────────┐
│               CONNECTOR FRAMEWORK (MISSING)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Snyk         │  │ SonarQube    │  │ Qualys       │          │
│  │ Connector    │  │ Connector    │  │ Connector    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              Connector Interface                     │       │
│  │                                                     │       │
│  │  interface IScanner {                               │       │
│  │    connect(credentials): Promise<void>              │       │
│  │    fetchFindings(since?: Date): Promise<Finding[]>  │       │
│  │    normalize(raw: any): CanonicalVulnerability      │       │
│  │    getFieldMapping(): FieldMap                      │       │
│  │  }                                                  │       │
│  └─────────────────────────────────────────────────────┘       │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              Connector Registry                      │       │
│  │                                                     │       │
│  │  registerConnector(name, connector)                 │       │
│  │  getConnector(name): IScanner                       │       │
│  │  listConnectors(): string[]                         │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Executive Visibility & Strategic Trust

### Claimed Capability
Provide C-level dashboards that tell a risk story, not just metrics. Enable strategic decision-making with trend analysis and recommendations.

### Code Analysis

#### What EXISTS:

**Dashboard** (`Dashboard.jsx`) - IMPLEMENTED
- Security Overview with metrics
- Open vulnerabilities count
- Critical & High breakdown
- AI auto-assigned percentage
- Noise reduction stats
- Trend analysis with period selection

**Advanced Dashboard** (`AdvancedDashboard.jsx`) - IMPLEMENTED
- Executive Summary (AI-generated text)
- Resolution Rate metric
- Risk Reduction percentage
- Trend Timeline chart
- Severity-Criticality Heatmap
- Attack Vector analysis
- Strategic Recommendations list

**Insights Generation** (`mockClient.js:228-283`)
```javascript
async generateDashboardInsights() {
  return {
    data: {
      success: true,
      insights: {
        executive_summary: 'Your security posture has improved 15% this month...',
        risk_reduction_metrics: { improvement_percentage: 15, ... },
        strategic_recommendations: [ ... ],
      },
      raw_data: { resolution_rate: 78, ... }
    }
  };
}
```

#### Limitations:

| Aspect | Current State | Needed |
|--------|--------------|--------|
| Data Source | All mock/generated | Real historical data |
| Snapshots | `VulnerabilitySnapshot` entity empty | Scheduled snapshot jobs |
| Recommendations | Hardcoded strings | Dynamic AI analysis |
| Trend Calculation | Random generation | Statistical analysis |
| Export | Not implemented | PDF/Excel export |

### Assessment: MOSTLY COMPLETE

This is the strongest pillar. The UI and data structures exist. Gaps are in data population, not architecture.

---

## Competitive Moat Validation

### Four-Pillar Assessment

| Pillar | Status | Evidence | Buyer Impact |
|--------|--------|----------|--------------|
| **Context** | ⚠️ Partial | `calculateRiskScore()` exists but not invoked; multipliers defined but unused | Claims overstated |
| **Prioritization Accuracy** | ⚠️ Partial | Thresholds defined; no real-time scoring; EPSS unused | Just CVSS relabeling |
| **Ownership Clarity** | ⚠️ Partial | Triage functions exist; logic is `Math.random()` | Assignments meaningless |
| **Automation Depth** | ❌ Missing | All integrations mocked; no webhook receivers; no scheduled jobs | No operational value |

### Evidence Summary

**Context** - `planningConfig.js:166-179` defines multipliers but `mockClient.js:151` ignores them.

**Prioritization** - `CONFIDENCE_THRESHOLDS` at line 23 but triage at line 152 generates random confidence.

**Ownership** - Schema has `owned_patterns` (`schema.sql:52`) but no code uses it for resolution.

**Automation** - `createJiraIssue()` returns hardcoded fake URL (`mockClient.js:174`).

---

## Acquisition-Readiness Summary

### What a Buyer Acquires TODAY

| Asset | Value | Notes |
|-------|-------|-------|
| **React Frontend** | High | Professional UI, 16 pages, shadcn components |
| **Database Schema** | Medium | Well-designed PostgreSQL schema with PCE model |
| **Planning Framework** | Medium | Business rules documented in config |
| **Brand/Position** | Low | No production deployments, no customers |
| **Backend Logic** | Very Low | All mock implementations |
| **Integrations** | None | Zero working integrations |
| **IP/Algorithms** | None | No proprietary logic implemented |

### Post-Enhancement Moat

If the missing components are built:

1. **Normalization Engine** → True multi-scanner consolidation
2. **Ownership Resolution** → Provable CODEOWNERS-style assignment
3. **Connector Framework** → Vendor-agnostic positioning
4. **SLA Enforcement** → Accountability differentiation

### Key Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| No backend logic | Critical | 3-6 month development effort |
| Mock integrations | Critical | Requires Jira/scanner API development |
| No production validation | High | Schema untested at scale |
| Single-tenant design | Medium | Multi-tenancy refactor needed |
| No authentication | Medium | Supabase Auth not configured |

---

## Recommendations

### For Acquisition

1. **Price for potential, not current capability** - The frontend is polished but backend is essentially empty
2. **Budget 6-12 months of development** to reach production readiness
3. **Validate customer demand** before investing in backend build-out
4. **Retain design assets** - The UI/UX is the primary value

### For Internal Development

1. **Priority 1**: Build Ownership Resolution Engine (highest differentiation)
2. **Priority 2**: Implement Jira bidirectional sync (customer requirement)
3. **Priority 3**: Create connector framework (enables multi-scanner)
4. **Priority 4**: Add SLA enforcement with scheduled jobs

---

## Appendix: File References

| File | Purpose | Assessment |
|------|---------|------------|
| `mockClient.js` | API mock layer | All business logic is placeholder |
| `supabaseAdapter.js` | Production adapter | Copies mock logic, no real backend calls |
| `planningConfig.js` | Business rules | Well-documented but not enforced |
| `schema.sql` | Database schema | Comprehensive, untested |
| `ImportVulnerabilities.jsx` | Data import UI | UI complete, no normalization |
| `Dashboard.jsx` | Main dashboard | Complete, good UX |
| `AdvancedDashboard.jsx` | Analytics | Complete, data is mock |

---

**Document End**

*Assessment conducted: February 1, 2026*
*Codebase version: commit a34a8fa*
