# VIOE Master Document

**Vulnerability Intelligence & Ownership Engine**
**Version:** 2.0 (Post-Assessment)
**Last Updated:** February 1, 2026
**Status:** Development / Pre-Production

---

## Document Purpose

This document serves as the authoritative source of truth for VIOE's:
- Current implementation state (verified against codebase)
- Identified gaps between claims and reality
- Enhancement roadmap with architectural designs
- Technical specifications for missing components

**Audience:** Engineering leads, Product managers, Technical due diligence, Investors

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture](#2-architecture)
3. [Feature Assessment](#3-feature-assessment)
4. [Gap Analysis](#4-gap-analysis)
5. [Enhancement Specifications](#5-enhancement-specifications)
6. [Roadmap](#6-roadmap)
7. [Technical Debt](#7-technical-debt)

---

## 1. Product Overview

### 1.1 Vision

VIOE transforms vulnerability management from reactive firefighting to proactive intelligence by:
- Consolidating multi-scanner data into unified intelligence
- Assigning ownership with AI-assisted confidence scoring
- Prioritizing based on business context, not just CVSS
- Enforcing accountability through SLA tracking and integrations

### 1.2 Current State vs. Target State

| Capability | Current State | Target State |
|------------|--------------|--------------|
| **Data Ingestion** | File upload only | Multi-source connectors + webhooks |
| **Normalization** | None (passthrough) | Canonical transformation engine |
| **De-duplication** | None | CVE + fingerprint correlation |
| **Ownership** | Random assignment | Code path + pattern resolution |
| **Risk Scoring** | Static mock values | Dynamic contextual calculation |
| **SLA Tracking** | Display only | Enforcement + escalation |
| **Integrations** | Mocked stubs | Bidirectional Jira/Slack |
| **Backend** | Mock client | Production Supabase |

### 1.3 Technology Stack

**Verified Implementation:**

| Layer | Technology | Status |
|-------|------------|--------|
| Frontend | React 18.2 + Vite 6.1 | Implemented |
| UI Components | Radix UI + shadcn/ui | Implemented |
| Styling | Tailwind CSS 3.4 | Implemented |
| State Management | TanStack Query 5.x | Implemented |
| Charts | Recharts 2.x | Implemented |
| Backend | Supabase (PostgreSQL) | Schema Only |
| Authentication | Mock / Supabase Auth | Mock Only |
| Edge Functions | Supabase Functions | Not Deployed |

---

## 2. Architecture

### 2.1 PCE Framework

VIOE follows the Planning-Coordination-Execution (PCE) framework:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLANNING LAYER                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ planningConfig.js                                          │ │
│  │ - CONFIDENCE_THRESHOLDS: { HIGH: 90, MEDIUM: 70, LOW: 50 } │ │
│  │ - SLA_BY_SEVERITY: { critical: 7d, high: 30d, ... }        │ │
│  │ - RISK_MULTIPLIERS: { assetCriticality, environment }      │ │
│  │ - AUTOMATION_LEVELS: { L0, L1, L2, L3 }                    │ │
│  └────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                   COORDINATION LAYER                             │
│  ┌────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Supabase DB    │  │ Edge Functions  │  │ External APIs   │  │
│  │ (schema.sql)   │  │ (NOT DEPLOYED)  │  │ (MOCKED)        │  │
│  │ ✅ Defined     │  │ ❌ Missing      │  │ ❌ Missing      │  │
│  └────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    EXECUTION LAYER                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ React Frontend                                    ✅       │ │
│  │ - 16 Pages (Dashboard, Vulnerabilities, Teams, etc.)       │ │
│  │ - Component Library (analytics, remediation, hunting)      │ │
│  │ - TanStack Query for data fetching                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Model

**Verified Schema** (`supabase/schema.sql`):

```
┌─────────────────┐     ┌─────────────────┐
│ vulnerabilities │────>│ teams           │
│ - id            │     │ - id            │
│ - cve_id        │     │ - name          │
│ - severity      │     │ - owned_patterns│ (NOT USED)
│ - status        │     │ - tech_stack    │ (NOT USED)
│ - assigned_team │     └─────────────────┘
│ - confidence    │
│ - sla_due_date  │     ┌─────────────────┐
│ - risk_score    │     │ assets          │
└────────┬────────┘────>│ - id            │
         │              │ - criticality   │
         │              │ - environment   │
         │              │ - data_class    │ (NOT USED)
         ▼              └─────────────────┘
┌─────────────────┐
│ remediation_    │
│ tasks           │
│ - jira_key      │ (MOCKED)
│ - github_pr_url │ (MOCKED)
│ - auto_fix_*    │ (MOCKED)
└─────────────────┘
```

### 2.3 API Layer

**Current Implementation:**

```javascript
// base44Client.js - Mode Selection
const API_MODE = import.meta.env.VITE_API_MODE || 'mock';

function getAdapter() {
  switch (API_MODE) {
    case 'supabase':
      if (!isSupabaseConfigured()) {
        return mockBase44;  // Falls back to mock
      }
      return supabaseAdapter;
    case 'mock':
    default:
      return mockBase44;
  }
}
```

**Reality:** Both `mockBase44` and `supabaseAdapter` contain identical mock logic. The Supabase adapter does not call real Edge Functions because they are not deployed.

---

## 3. Feature Assessment

### 3.1 Implemented Features

| Feature | Page | Implementation Quality |
|---------|------|----------------------|
| Security Dashboard | `/Dashboard` | Full UI, mock data |
| Advanced Analytics | `/AdvancedDashboard` | Full UI, generated insights |
| Vulnerability List | `/Vulnerabilities` | Full CRUD, filtering |
| Vulnerability Detail | `/VulnerabilityDetail` | View/edit, triage actions |
| Team Management | `/Teams` | List/view, performance mocked |
| Remediation Tasks | `/RemediationTasks` | List/filter, Jira sync mocked |
| Asset Management | `/Assets` | Full CRUD |
| Incident Response | `/IncidentResponse` | Timeline UI, playbooks mocked |
| Compliance Reports | `/ComplianceReports` | Framework selection, scores mocked |
| Threat Hunting | `/ThreatHunting` | Alerts/sessions, findings mocked |
| Threat Modeling | `/ThreatModeling` | UI only |
| Predictive Analysis | `/PredictiveAnalysis` | UI, forecasts mocked |
| Codebase Analysis | `/CodebaseAnalysis` | UI only |
| Settings | `/Settings` | Basic preferences |
| Import | `/ImportVulnerabilities` | File upload, AI assignment mocked |
| Login | `/Login` | Mock auth, demo credentials |

### 3.2 Feature-by-Feature Evidence

#### Dashboard (`Dashboard.jsx`)

**Implemented:**
- Metric cards (Open, Critical/High, Auto-Assigned, Noise Reduced)
- Trend charts with period selection
- Ownership confidence distribution
- Priority vulnerabilities list
- Needs review queue

**Mock Evidence:**
```javascript
// Line 44-50: Trend data from mock function
const { data: trendData } = useQuery({
  queryKey: ['trends', trendPeriod],
  queryFn: async () => {
    const result = await base44.functions.invoke('analyzeTrends', { period: trendPeriod });
    return result.data;  // Returns mockFunctions.analyzeTrends() - random data
  },
});
```

#### Ownership Assignment (`mockClient.js:145-155`)

**Critical Finding - Random Assignment:**
```javascript
async triageVulnerability({ vulnerability_id }) {
  const vuln = dataStores.Vulnerability.find(v => v.id === vulnerability_id);
  if (vuln) {
    const teams = dataStores.Team;
    // THIS IS THE ENTIRE LOGIC:
    const randomTeam = teams[Math.floor(Math.random() * teams.length)];
    vuln.assigned_team = randomTeam.id;
    vuln.ownership_confidence = Math.floor(Math.random() * 30) + 70;
  }
  return { data: { success: true, assigned_team: vuln?.assigned_team } };
}
```

**Assessment:** The claimed "AI-powered ownership resolution" is a random team selector with random confidence between 70-100%.

#### Risk Scoring (`planningConfig.js:339-353`)

**Defined but Unused:**
```javascript
export function calculateRiskScore({
  criticalCount = 0, highCount = 0, mediumCount = 0, lowCount = 0,
  assetCriticality = 'medium', environment = 'staging'
}) {
  const baseScore = (criticalCount * 25) + (highCount * 15) +
                    (mediumCount * 5) + (lowCount * 1);
  const assetMultiplier = RISK_MULTIPLIERS.assetCriticality[assetCriticality];
  const envMultiplier = RISK_MULTIPLIERS.environment[environment];
  return Math.min(100, Math.round(baseScore * assetMultiplier * envMultiplier));
}
```

**Evidence of Non-Use:**
- `mockData.js:231`: Assets have hardcoded `risk_score: 85, 72, 78, ...`
- No component imports or calls `calculateRiskScore()`
- Search across codebase: Zero invocations

---

## 4. Gap Analysis

### 4.1 Critical Gaps (Blocks Production)

| Gap ID | Component | Description | Impact |
|--------|-----------|-------------|--------|
| GAP-001 | Normalization Engine | No scanner data transformation | Cannot unify multi-source data |
| GAP-002 | Ownership Resolution | Random assignment, no pattern matching | Assignments meaningless |
| GAP-003 | Jira Integration | Returns fake URLs/keys | No ticket creation |
| GAP-004 | SLA Enforcement | No scheduled jobs | SLAs not enforced |
| GAP-005 | Authentication | Mock only | No real user management |

### 4.2 High-Priority Gaps (Blocks Go-to-Market)

| Gap ID | Component | Description | Impact |
|--------|-----------|-------------|--------|
| GAP-006 | Connector Framework | No scanner adapters | Cannot pull from Snyk/SonarQube |
| GAP-007 | Webhook Receivers | No inbound endpoints | Cannot receive push data |
| GAP-008 | De-duplication | No CVE/fingerprint matching | Duplicates proliferate |
| GAP-009 | Risk Calculation | Function exists, never called | Scores are static |
| GAP-010 | Edge Functions | Schema references, not deployed | Backend logic missing |

### 4.3 Medium-Priority Gaps (Polish)

| Gap ID | Component | Description | Impact |
|--------|-----------|-------------|--------|
| GAP-011 | Data Classification | Field exists, unused in scoring | PII/PHI not weighted |
| GAP-012 | Historical Snapshots | Table exists, never populated | No real trend data |
| GAP-013 | Export Functionality | Not implemented | Cannot export reports |
| GAP-014 | Multi-tenancy | Single tenant design | Enterprise blocker |
| GAP-015 | RBAC | Basic roles defined, not enforced | Permissions bypass |

---

## 5. Enhancement Specifications

### 5.1 Normalization Engine (GAP-001)

**Purpose:** Transform scanner-specific data into canonical vulnerability format.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    NORMALIZATION ENGINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Input: Scanner Finding (Snyk, SonarQube, Qualys, etc.)        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Field Mapper                          │   │
│  │                                                         │   │
│  │  snyk.issueId        → scanner_id                       │   │
│  │  snyk.severity       → severity (normalized)            │   │
│  │  snyk.cvssScore      → cvss_score                       │   │
│  │  snyk.identifiers.CVE[0] → cve_id                       │   │
│  │  snyk.packageName    → affected_component               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Severity Normalizer                     │   │
│  │                                                         │   │
│  │  Input: "HIGH", "high", "H", 3, "Major"                 │   │
│  │  Output: "high" (enum: critical|high|medium|low|info)   │   │
│  │                                                         │   │
│  │  CVSS Fallback:                                         │   │
│  │  9.0-10.0 → critical                                    │   │
│  │  7.0-8.9  → high                                        │   │
│  │  4.0-6.9  → medium                                      │   │
│  │  0.1-3.9  → low                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   CVE Enricher                           │   │
│  │                                                         │   │
│  │  - Lookup NVD for additional context                    │   │
│  │  - Fetch EPSS score                                     │   │
│  │  - Get CWE classification                               │   │
│  │  - Retrieve references/patches                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  Output: Canonical Vulnerability Record                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation Location:** `src/services/normalization/`

**Files to Create:**
- `normalizer.js` - Main orchestrator
- `mappers/snykMapper.js` - Snyk field mapping
- `mappers/sonarqubeMapper.js` - SonarQube mapping
- `enrichers/cveEnricher.js` - NVD/EPSS lookup
- `validators/schemaValidator.js` - Output validation

### 5.2 Ownership Resolution Engine (GAP-002)

**Purpose:** Deterministically assign vulnerabilities to teams based on code ownership.

**Resolution Algorithm:**

```
FUNCTION resolveOwnership(vulnerability):

  candidates = []

  // Step 1: File Path Pattern Matching (Highest Confidence)
  IF vulnerability.file_path:
    FOR team IN teams:
      FOR pattern IN team.owned_patterns:
        IF matches(vulnerability.file_path, pattern):
          candidates.push({
            team_id: team.id,
            confidence: 95,
            reason: "File path matches owned pattern: " + pattern
          })

  // Step 2: Asset Owner Lookup
  IF vulnerability.asset_id:
    asset = getAsset(vulnerability.asset_id)
    IF asset.owner_team_id:
      candidates.push({
        team_id: asset.owner_team_id,
        confidence: 85,
        reason: "Asset owner: " + asset.name
      })

  // Step 3: Technology Stack Inference
  tech = inferTechnology(vulnerability.affected_component)
  FOR team IN teams:
    IF tech IN team.tech_stack:
      candidates.push({
        team_id: team.id,
        confidence: 70,
        reason: "Technology match: " + tech
      })

  // Step 4: Historical Assignment
  similar = findSimilarVulnerabilities(vulnerability)
  IF similar.length > 0:
    most_common_team = mode(similar.map(v => v.assigned_team_id))
    candidates.push({
      team_id: most_common_team,
      confidence: 60,
      reason: "Historical pattern"
    })

  // Select best candidate
  IF candidates.length > 0:
    best = maxBy(candidates, 'confidence')
    RETURN {
      assigned_team_id: best.team_id,
      ownership_confidence: best.confidence,
      assignment_reason: best.reason,
      needs_review: best.confidence < CONFIDENCE_THRESHOLDS.HIGH
    }
  ELSE:
    RETURN {
      assigned_team_id: null,
      ownership_confidence: 0,
      assignment_reason: "No ownership pattern matched",
      needs_review: true
    }
```

**Database Changes:**
```sql
-- Add to teams table (already in schema but unused)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS owned_patterns JSONB DEFAULT '[]';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS tech_stack JSONB DEFAULT '[]';

-- Example data:
UPDATE teams SET
  owned_patterns = '["src/auth/**", "*.security.*", "**/login/**"]',
  tech_stack = '["python", "postgres", "redis"]'
WHERE name = 'Security Team';
```

### 5.3 Jira Integration (GAP-003)

**Purpose:** Bidirectional sync between VIOE tasks and Jira issues.

**Implementation:**

```javascript
// src/integrations/jira/jiraClient.js

import JiraApi from 'jira-client';

class JiraIntegration {
  constructor(config) {
    this.client = new JiraApi({
      protocol: 'https',
      host: config.host,
      username: config.email,
      password: config.apiToken,
      apiVersion: '3',
    });
  }

  async createIssue(vulnerability, task) {
    const issue = await this.client.addNewIssue({
      fields: {
        project: { key: config.projectKey },
        summary: `[SEC] ${vulnerability.title}`,
        description: this.formatDescription(vulnerability),
        issuetype: { name: 'Bug' },
        priority: { name: this.mapPriority(vulnerability.severity) },
        labels: ['security', 'vulnerability', vulnerability.severity],
        customfield_10001: vulnerability.cve_id,  // CVE custom field
      }
    });

    return {
      jira_key: issue.key,
      jira_url: `https://${config.host}/browse/${issue.key}`,
    };
  }

  async syncStatus(taskId, jiraKey) {
    const issue = await this.client.getIssue(jiraKey);
    const jiraStatus = issue.fields.status.name;

    const statusMap = {
      'To Do': 'pending',
      'In Progress': 'in_progress',
      'In Review': 'review',
      'Done': 'completed',
      'Blocked': 'blocked',
    };

    return statusMap[jiraStatus] || 'pending';
  }

  async addComment(jiraKey, comment) {
    await this.client.addComment(jiraKey, comment);
  }
}
```

### 5.4 SLA Enforcement (GAP-004)

**Purpose:** Automatically track SLA compliance and escalate breaches.

**Scheduled Job (Supabase Edge Function):**

```typescript
// supabase/functions/check-slas/index.ts

import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get vulnerabilities approaching or past SLA
  const { data: vulnerabilities } = await supabase
    .from('vulnerabilities')
    .select('*, teams(*)')
    .eq('status', 'open')
    .not('sla_due_date', 'is', null);

  const now = new Date();
  const notifications = [];

  for (const vuln of vulnerabilities) {
    const slaDate = new Date(vuln.sla_due_date);
    const hoursRemaining = (slaDate - now) / (1000 * 60 * 60);

    if (hoursRemaining < 0 && !vuln.sla_breached) {
      // SLA Breached - Mark and escalate
      await supabase
        .from('vulnerabilities')
        .update({ sla_breached: true })
        .eq('id', vuln.id);

      notifications.push({
        type: 'sla_breach',
        vuln_id: vuln.id,
        team: vuln.teams?.name,
        message: `SLA BREACHED: ${vuln.title}`,
      });

    } else if (hoursRemaining > 0 && hoursRemaining < 48) {
      // Approaching SLA - Warning
      notifications.push({
        type: 'sla_warning',
        vuln_id: vuln.id,
        team: vuln.teams?.name,
        message: `SLA Warning: ${vuln.title} due in ${Math.round(hoursRemaining)} hours`,
      });
    }
  }

  // Send notifications via Slack
  for (const notif of notifications) {
    await sendSlackNotification(notif);
  }

  return new Response(JSON.stringify({ processed: vulnerabilities.length }));
});
```

**Cron Schedule (pg_cron):**
```sql
SELECT cron.schedule(
  'check-slas',
  '0 * * * *',  -- Every hour
  $$SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/check-slas',
    headers:='{"Authorization": "Bearer service_role_key"}'
  )$$
);
```

---

## 6. Roadmap

### Phase 1: Foundation (Weeks 1-4)

| Week | Deliverable | Dependencies |
|------|-------------|--------------|
| 1 | Deploy Supabase Edge Functions shell | Supabase project |
| 1 | Implement real authentication flow | Edge Functions |
| 2 | Build Ownership Resolution Engine | Teams with patterns |
| 2 | Replace random triage with algorithm | Resolution Engine |
| 3 | Implement Jira OAuth + API client | Jira developer account |
| 3 | Create real Jira issue creation | Jira client |
| 4 | Deploy SLA check scheduled job | pg_cron |
| 4 | Implement Slack notifications | Slack app |

### Phase 2: Intelligence (Weeks 5-8)

| Week | Deliverable | Dependencies |
|------|-------------|--------------|
| 5 | Build Normalization Engine | Scanner test data |
| 5 | Implement Snyk connector | Snyk API key |
| 6 | Add SonarQube connector | SonarQube instance |
| 6 | Build de-duplication logic | Normalization |
| 7 | Implement dynamic risk scoring | Asset data |
| 7 | Add EPSS integration | FIRST EPSS API |
| 8 | Create vulnerability snapshot jobs | Database triggers |
| 8 | Build real trend analysis | Snapshot data |

### Phase 3: Scale (Weeks 9-12)

| Week | Deliverable | Dependencies |
|------|-------------|--------------|
| 9 | Add webhook receiver endpoints | API gateway |
| 9 | Implement connector framework | Normalization |
| 10 | Add Qualys connector | Qualys API |
| 10 | Implement multi-tenancy | Schema changes |
| 11 | Build RBAC enforcement | Auth system |
| 11 | Add export functionality | PDF library |
| 12 | Performance optimization | Load testing |
| 12 | Security hardening | Pentest |

### Milestone Summary

| Milestone | Target | Success Criteria |
|-----------|--------|------------------|
| **M1: Production Auth** | Week 1 | Users can sign up and log in |
| **M2: Real Ownership** | Week 2 | Assignments match CODEOWNERS patterns |
| **M3: Jira Sync** | Week 4 | Bidirectional status sync working |
| **M4: Scanner Import** | Week 6 | Snyk data normalized correctly |
| **M5: Risk Scoring** | Week 7 | Scores reflect business context |
| **M6: Enterprise Ready** | Week 12 | Multi-tenant, RBAC, export |

---

## 7. Technical Debt

### 7.1 Current Debt Items

| ID | Description | Severity | Effort |
|----|-------------|----------|--------|
| TD-001 | All API functions return mock data | Critical | High |
| TD-002 | `supabaseAdapter.js` duplicates mock logic | High | Medium |
| TD-003 | No error boundaries on async operations | Medium | Low |
| TD-004 | Hardcoded demo credentials in AuthContext | Medium | Low |
| TD-005 | No input validation on forms | Medium | Medium |
| TD-006 | `createPageUrl()` utility has inconsistent casing | Low | Low |
| TD-007 | Some components import from `@/api/` directly | Low | Medium |

### 7.2 Debt Remediation Plan

**Sprint 1:**
- TD-001: Deploy real Edge Functions
- TD-004: Move to env variables
- TD-006: Standardize URL generation

**Sprint 2:**
- TD-002: Refactor adapter to call real functions
- TD-005: Add Zod validation to all forms

**Sprint 3:**
- TD-003: Implement global error boundary
- TD-007: Create unified API hook layer

---

## Appendix A: Configuration Reference

### Environment Variables

```env
# Required for Production
VITE_API_MODE=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional Integrations
VITE_JIRA_BASE_URL=https://company.atlassian.net
VITE_JIRA_PROJECT_KEY=SEC
VITE_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Feature Flags
VITE_AI_FEATURES_ENABLED=true
VITE_JIRA_INTEGRATION_ENABLED=false
VITE_SLACK_INTEGRATION_ENABLED=false
```

### Planning Configuration

All thresholds are defined in `src/config/planningConfig.js`:

```javascript
CONFIDENCE_THRESHOLDS = { HIGH: 90, MEDIUM: 70, LOW: 50 }
SLA_BY_SEVERITY = { critical: 7d, high: 30d, medium: 60d, low: 90d }
RISK_MULTIPLIERS = { assetCriticality: {...}, environment: {...} }
```

---

## Appendix B: Database Schema Summary

**Core Tables:**
- `vulnerabilities` - Main vulnerability records
- `teams` - Team definitions with ownership patterns
- `assets` - Inventory with criticality/environment
- `remediation_tasks` - Work items linked to vulns
- `ownership_logs` - Assignment audit trail

**Support Tables:**
- `pce_configuration` - Runtime business rules
- `suppression_rules` - Alert filtering
- `compliance_reports` - Framework assessments
- `vulnerability_snapshots` - Historical trends

**Views:**
- `dashboard_summary` - Aggregate metrics
- `team_workload` - Per-team statistics
- `sla_compliance` - SLA performance

---

## Appendix C: API Contracts

### Entity Operations

All entities support:
```javascript
entity.list(orderBy?, limit?) → Entity[]
entity.get(id) → Entity | null
entity.create(data) → Entity
entity.update(id, data) → Entity
entity.delete(id) → boolean
entity.filter(filters) → Entity[]
```

### Function Invocations

```javascript
// Triage
functions.invoke('triageVulnerability', { vulnerability_id })
functions.invoke('bulkTriageVulnerabilities', {})

// Analysis
functions.invoke('analyzeTrends', { period })
functions.invoke('generateDashboardInsights', {})
functions.invoke('analyzeTeamPerformance', { team_id })

// Integrations
functions.invoke('createJiraIssue', { vulnerability_id, project_key })
functions.invoke('syncJiraStatus', { task_id })

// Automation
functions.invoke('generateAutoFix', { vulnerability_id })
functions.invoke('applyAutoFix', { vulnerability_id, approved })
```

---

**Document End**

*Last verified against codebase: February 1, 2026*
*Commit: a34a8fa*
