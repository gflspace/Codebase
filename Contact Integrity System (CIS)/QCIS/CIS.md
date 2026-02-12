# QwickServices Contact Integrity System (CIS) — Complete System Reconstruction

> **Status:** Authoritative Living System Document
> **Generated:** 2026-02-12
> **Method:** Full codebase audit — 30 architecture documents + 40+ source files cross-referenced
> **Scope:** End-to-end system reconstruction from documentation and implemented code

---

## 1. Executive Summary

The QwickServices Contact Integrity System (CIS) is a **trust and safety intelligence platform** designed to detect, score, and enforce against off-platform circumvention behavior in the QwickServices marketplace. It protects marketplace revenue integrity by identifying users who attempt to move transactions, payments, or communications off-platform to avoid fees or accountability.

**Core Philosophy:** Trust is dynamic, contextual, and adversarial. CIS operates as a layered defense system where Detection ≠ Scoring ≠ Enforcement — each layer is independent, auditable, and explainable.

**System Maturity:** Late Implementation / Pre-Alpha. The backend pipeline (detection → scoring → enforcement) is fully functional with synthetic data. The admin dashboard is substantially implemented with real API integration across all 10 modules. The system awaits live Sidebase integration and shadow-mode validation before production activation.

**Architecture Summary:**
- **Backend:** Node.js + Express + TypeScript + PostgreSQL + Redis (optional)
- **Dashboard:** Next.js 14 + React 18 + Tailwind CSS + Recharts
- **Infrastructure:** Hostinger VPS (Ubuntu 22.04 LTS), Nginx, PM2, Docker
- **Pipeline:** Event-driven (Detection → Scoring → Enforcement) with in-process event bus and optional Redis-backed durable queue
- **Security:** JWT + HMAC dual auth, RBAC with 27 permissions across 10 roles, Row-Level Security in PostgreSQL

---

## 2. Source File Inventory

### 2.1 Architecture & Design Documents (19 files in QCIS root)

| File | Purpose |
|------|---------|
| `architecture.md` | Synthesized system architecture; pipeline diagrams, schema tables, infrastructure specs |
| `master_claude.md` | Software factory orchestrator config; multi-agent model, PSB phase mapping |
| `claude_system_prompt_master_software_factory_orchestrator.md` | Master Claude behavioral contract; authority hierarchy, operating loop |
| `qwick_services_cis_trust_safety_systems_architecture.md` | Core architecture spec; event-driven pipeline, layer constraints, failure handling |
| `qwick_services_cis_backend_detection_orchestration_design.md` | Backend + orchestrator design; database schemas, event model, API contracts |
| `qwick_services_cis_behavioral_risk_trust_model.md` | Behavioral risk analysis; pattern dimensions, severity classification |
| `qwick_services_cis_trust_safety_enforcement_model.md` | Enforcement logic; violation categories (A-E), severity matrix |
| `qwick_services_cis_enforcement_decision_output.md` | Enforcement decision record template; risk assessment, appeal paths |
| `qwick_services_cis_platform_governance_compliance_framework.md` | Governance framework; admin roles, dashboard requirements, GDPR constraints |
| `qwick_services_cis_risk_detection_enforcement_data_inputs.md` | Data input framework; 4 data source categories, consent/privacy constraints |
| `qwick_services_cis_trust_safety_policy_risk_action_framework_draft.md` | Draft policy framework; platform rules, action matrix with trust/tenure modifiers |
| `qwick_services_cis_hostinger_secure_infrastructure_setup_plan.md` | Infrastructure plan; VPS provisioning, PostgreSQL setup, CI/CD, security hardening |
| `qwick_services_cis_observability_logging_compliance_framework.md` | Observability framework; event taxonomy, 4 log streams, monitoring, privacy controls |
| `qwick_services_cis_trust_safety_admin_dashboard_architecture_ui_design.md` | Dashboard architecture; 7 navigation modules, RBAC matrix, UI component specs |
| `qwick_services_cis_detection_risk_signal_engineering_specification.md` | Detection engineering spec; signal taxonomy, NLP techniques, obfuscation patterns |
| `qwick_services_cis_enforcement_action_trigger_specification.md` | Enforcement triggers; 5 risk tiers, escalation thresholds, human override controls |
| `qwick_services_cis_trust_safety_simulation_evaluation_report_pre_production.md` | Pre-production simulation; 6 scenario classes, accuracy metrics |
| `qwick_services_cis_deployment_feedback_plan_shadow_→_active.md` | Deployment plan; Shadow Mode → Active Enforcement, metrics collection |
| `QwickServices_CIS_Layered_Defense_KB.md` | Knowledge base; layered trust principle, 3 defense layers, business rules |

### 2.2 Reference Documents (4 files)

| File | Purpose |
|------|---------|
| `reference_docs/how_payments_work.md` | Payment flow (escrow model), circumvention patterns CIS detects |
| `reference_docs/how_detection_works.md` | Detection pipeline reference, signal output format, hard constraints |
| `reference_docs/how_enforcement_works.md` | Enforcement flow, escalation thresholds, available actions, safeguards |
| `reference_docs/how_appeals_work.md` | Appeal flow, eligibility matrix, review interface, feedback loop |

### 2.3 Intelligence & Vision Documents (3 files)

| File | Purpose |
|------|---------|
| `cis_intelligence_extraction_from_market_trust_paper.md` | MarketTrust research paper extraction; multi-dimensional trust model, adversary taxonomy |
| `qwick_services_cis_enhanced_dashboard_prompt_v_2.md` | Enhanced dashboard requirements; ML capabilities, new entities, zone/category scoring |
| `unified_cis_super_intelligence_framework.md` | Vision document; CIS as Intelligence OS, multi-LLM architecture, learning loop |

### 2.4 Parent Directory Documents (4 files)

| File | Purpose |
|------|---------|
| `QwickServices Contact Integrity System (QCIS).md` | Canonical system memory; core invariants, signal handling rules, AI guardrails |
| `Claude Sub-Agent Memory.md` | Sub-agent definitions: Detection, Risk, and Enforcement agents |
| `MASTER PROMPT-Phase1.md` | Phase 1 initialization prompt; role definition, execution modes |
| `PHASE 2 — ORDER OF OPERATIONS.md` | Phase 2 template; 17 execution steps (unfilled) |

### 2.5 Source Code (40+ TypeScript files + 12 SQL migrations)

```
src/backend/
├── src/
│   ├── index.ts                         # Express app entry, graceful shutdown
│   ├── config.ts                        # 22 env vars, validation
│   ├── database/
│   │   ├── connection.ts                # PostgreSQL pool (20 conn, SSL)
│   │   ├── migrate.ts                   # Transactional migration runner
│   │   └── migrations/ (001-012)        # 12 SQL migrations
│   ├── events/
│   │   ├── types.ts                     # 12 EventType enum values, DomainEvent interface
│   │   ├── bus.ts                       # Event bus factory (memory | redis)
│   │   ├── durable-bus.ts              # Redis-backed bus with DLQ + crash recovery
│   │   ├── redis.ts                     # Redis connection manager
│   │   ├── emitter.ts                   # Mock event generator (synthetic data)
│   │   └── emit.ts                      # Event emission helpers
│   ├── detection/
│   │   ├── index.ts                     # Detection orchestrator (analyzeEvent)
│   │   ├── regex.ts                     # Phone, email, URL, social patterns
│   │   ├── obfuscation.ts             # Evasion detection + normalization
│   │   ├── keywords.ts                 # 105 keywords across 4 categories
│   │   ├── context.ts                  # Message window + transaction proximity
│   │   └── signals.ts                  # Signal generation with confidence scoring
│   ├── scoring/
│   │   ├── index.ts                     # Scoring orchestrator (computeRiskScore)
│   │   ├── trust-score.ts             # Three-layer weighted formula
│   │   ├── tiers.ts                    # Tier assignment + trend detection
│   │   └── aggregator.ts              # Signal aggregation + 14-day time decay
│   ├── enforcement/
│   │   ├── index.ts                     # Enforcement orchestrator (processEnforcement)
│   │   ├── triggers.ts                 # Tier × history → action decision tree
│   │   ├── actions.ts                  # Kill switch, shadow mode, execution
│   │   └── notifications.ts           # User messages, admin alerts, escalation
│   ├── api/
│   │   ├── middleware/
│   │   │   ├── auth.ts                  # JWT + HMAC (5-min replay window)
│   │   │   ├── permissions.ts          # RBAC permission resolution
│   │   │   ├── validation.ts           # Zod schema validation
│   │   │   ├── rateLimit.ts            # 3-tier rate limiting
│   │   │   └── errorHandler.ts         # Global error handling
│   │   ├── routes/ (23 files)          # 50+ API endpoints
│   │   └── schemas/                    # Zod validation schemas
│   ├── services/
│   │   └── openai.ts                   # AI risk summaries, PII redaction
│   └── shared/
│       └── utils.ts                    # ID generation, date helpers
├── tests/
│   ├── unit/ (7 test files)            # 120 tests total
│   ├── integration/ (1 test file)
│   └── fixtures/
├── Dockerfile                           # Multi-stage build, non-root
├── package.json
└── tsconfig.json

src/dashboard/
├── src/
│   ├── app/ (page.tsx, layout.tsx)
│   ├── components/
│   │   ├── Dashboard.tsx               # Main shell with RBAC
│   │   ├── LoginPage.tsx              # Auth + force password change
│   │   ├── ErrorBoundary.tsx          # React error boundary
│   │   ├── modules/ (10 components)   # All with real API integration
│   │   └── intelligence/ (5 components) # KPIs, timeline, filters
│   ├── contexts/ (auth, filters)
│   └── lib/ (api.ts — 25+ endpoints)
├── tests/e2e/
├── package.json
└── tailwind.config.js
```

---

## 3. End-to-End System Flow

### 3.1 Detection → Scoring → Enforcement Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│ PLATFORM EVENT SOURCE (Sidebase / Mock Emitter)                     │
│ ─── message.created, message.edited, transaction.*, user.*  ──────  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │      EVENT BUS        │
                    │  (memory or Redis)    │
                    │  Deduplication (DB)   │
                    │  Audit logging        │
                    │  Dead letter queue    │
                    └──┬───────┬────────┬──┘
                       │       │        │
              ┌────────▼──┐ ┌──▼─────┐ ┌▼──────────┐
              │ DETECTION  │ │SCORING │ │ENFORCEMENT │
              │ (0ms delay)│ │(500ms) │ │(1500ms)    │
              └────────┬──┘ └──┬─────┘ └┬──────────┘
                       │       │        │
                       ▼       ▼        ▼
              ┌──────────┐ ┌──────┐ ┌──────────┐
              │risk_      │ │risk_ │ │enforce-  │
              │signals    │ │scores│ │ment_     │
              │(DB)       │ │(DB)  │ │actions   │
              └──────────┘ └──────┘ │(DB)      │
                                    └──────────┘
                                         │
                        ┌────────────────┼────────────────┐
                        ▼                ▼                ▼
                  ┌──────────┐   ┌───────────┐   ┌───────────┐
                  │ User     │   │ Admin     │   │ Escalation│
                  │ Notif.   │   │ Alert     │   │ Case      │
                  └──────────┘   └───────────┘   └───────────┘
```

### 3.2 Layer Invariants

| Rule | Enforcement |
|------|-------------|
| Detection NEVER assigns risk tiers or modifies user state | Code enforced — detection/index.ts only writes to risk_signals |
| Scoring NEVER reads raw message content | Code enforced — scoring/aggregator.ts queries only metrics and signals |
| Enforcement NEVER recalculates risk scores | Code enforced — enforcement/index.ts reads latest score from risk_scores |
| No permanent bans without human approval | Code enforced — triggers.ts never returns `permanent_ban` |
| All actions logged to immutable audit trail | Code enforced — actions.ts writes to audit_logs on every action |
| Kill switch disables all enforcement | Code enforced — actions.ts checks `config.enforcementKillSwitch` first |
| Shadow mode logs without enforcing | Code enforced — actions.ts skips user status update when `config.shadowMode` |

---

## 4. System Architecture

### 4.1 Backend Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | Express | 4.21 |
| Language | TypeScript | 5.5 |
| Database | PostgreSQL | 16 |
| Cache/Queue | Redis (optional) | 7 |
| Auth | JWT + HMAC-SHA256 | jsonwebtoken 9.0 |
| Validation | Zod | 3.23 |
| AI | OpenAI API | gpt-4o-mini |
| Password | bcryptjs | 3.0 |
| Security | Helmet | 7.1 |

### 4.2 Dashboard Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 14.2 |
| UI Library | React | 18.3 |
| Styling | Tailwind CSS | 3.4 |
| Charts | Recharts | 2.12 |
| Dates | date-fns | 3.6 |
| E2E Tests | Playwright | 1.47 |

### 4.3 Infrastructure

| Component | Technology |
|-----------|-----------|
| VPS | Hostinger (Ubuntu 22.04 LTS, ≥4 vCPU, 8GB RAM) |
| Reverse Proxy | Nginx (HTTPS, rate limiting, security headers) |
| Process Manager | PM2 (cluster mode, log rotation) |
| Containerization | Docker (multi-stage build, non-root) |
| CI/CD | GitHub Actions (lint → test → build → Docker smoke) |
| SSL | Certbot (Let's Encrypt) |
| Backups | pg_dump with 30-day retention |

---

## 5. Functional Capabilities

### 5.1 Detection Engine

**Pipeline:** Event → Obfuscation Detection → Regex Matching → Keyword Detection → Contextual Analysis → Signal Generation → DB Persistence

**Techniques:**

| Layer | Method | Details |
|-------|--------|---------|
| Deterministic | Regex | Phone (3 patterns), Email (3), URL (3), Social (3) |
| Deterministic | Keywords | 105 keywords: messaging apps (30), payment platforms (29), off-platform intent (24), grooming language (22) |
| Evasion | Obfuscation | Spaced characters, emoji substitution, leetspeak, character separators, partial disclosure |
| Contextual | Window | ±2 messages within ±1 hour of target message |
| Contextual | Transaction | Proximity detection: pre-payment, payment window (±5 min), post-payment |
| Temporal | Patterns | REPEATED_SIGNALS, ESCALATION_PATTERN, CROSS_SESSION, ROLE_IMBALANCE, HIGH_VOLUME_CONVERSATION |

**Signal Types (10):**

| Signal | Source | Description |
|--------|--------|-------------|
| CONTACT_PHONE | Regex | Phone number detected |
| CONTACT_EMAIL | Regex | Email address detected |
| CONTACT_SOCIAL | Regex | Social media handle detected |
| CONTACT_MESSAGING_APP | Keywords | Messaging app reference |
| PAYMENT_EXTERNAL | Keywords | External payment platform reference |
| OFF_PLATFORM_INTENT | Keywords | Intent to move off-platform |
| GROOMING_LANGUAGE | Keywords | Manipulative language patterns |
| TX_REDIRECT_ATTEMPT | Context | Contact sharing + active payment |
| TX_FAILURE_CORRELATED | Context | Contact sharing near failed transaction |
| TX_TIMING_ALIGNMENT | Context | Contact sharing during payment window |

### 5.2 Scoring Engine

**Master Formula:**
```
CIS_Trust(u) = 0.30 × Operational + 0.40 × Behavioral + 0.30 × Network
```

**Score: 0 (fully trusted) → 100 (maximum risk)**

| Layer | Weight | Inputs | Max Points |
|-------|--------|--------|------------|
| Operational Integrity | 30% | Escrow avoidance (40), cancellation rate (30), off-platform payments (30) | 100 |
| Behavioral Trajectory | 40% | Signal volume (25), diversity (25), escalation (20), repeats (15), obfuscation (15) | 100 |
| Network Corroboration | 30% | Flagged counterparties (30), shared endpoints (25), similar patterns (25), device cluster (20) | 100 |

**Time Decay:** 14-day half-life exponential decay on behavioral signals.

**Risk Tiers:**

| Tier | Score Range | Severity |
|------|-------------|----------|
| Monitor | 0–19 | 0 |
| Low | 20–39 | 1 |
| Medium | 40–59 | 2 |
| High | 60–79 | 3 |
| Critical | 80–100 | 4 |

**Trend Detection:** Escalating (+5 avg delta), Stable (±5), Decaying (-5).

### 5.3 Enforcement Engine

**Graduated Enforcement Ladder:**

| Tier | Offense | Action | Duration | Human Required |
|------|---------|--------|----------|----------------|
| Monitor | Any | None | — | No |
| Low | 1st | Soft Warning | — | No |
| Low | 2nd+ | Hard Warning | — | No |
| Medium | 1st-2nd | Hard Warning | — | No |
| Medium | 3rd+ | Temporary Restriction | 24 hours | No |
| High | Evasion/repeat | Temporary Restriction | 72 hours | **Yes** |
| High | Other | Admin Escalation | — | **Yes** |
| Critical | Any | Account Suspension | Until resolved | **Yes** |

**Hard Constraints:**
- No automated permanent bans (code-enforced invariant)
- Kill switch disables all enforcement instantly
- Shadow mode logs actions without applying them
- All actions are reversible (except permanent ban, which requires legal approval)

### 5.4 Admin Dashboard

**10 Implemented Modules (all with real API integration):**

| Module | Capabilities |
|--------|-------------|
| OverviewDashboard | Metric cards, priority bar chart, trend line chart, category pie chart |
| CategoryDashboard | Category filtering, provider trust scores, sorting |
| AlertsInbox | Priority queue, status transitions, claim/dismiss, AI risk summary |
| CaseInvestigation | Case list/detail, notes timeline, status transitions |
| EnforcementManagement | Action table, reversal workflow, confirmation modal |
| RiskTrends | Score table, tier filtering, 30-day trend chart |
| AppealsModule | Appeal list/detail, AI analysis, resolution modal |
| SystemHealth | Health check polling (30s), shadow mode / kill switch status |
| AuditLogsModule | Filterable audit trail, pagination |
| SettingsModule | Admin CRUD, role management, permission overrides |

**Intelligence Dashboard (5 components):**
- ExecutiveSummary: 8 KPI tiles with sparklines
- GlobalControlsBar: Time range, granularity, entity type, category, risk level filters
- ActivityTimeline: Stacked area chart with layer toggles

---

## 6. APIs & Integrations

### 6.1 API Endpoints (23 route files, 50+ endpoints)

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/health` | GET | None | Health check + system status |
| `/api/auth` | POST login/logout | None/JWT | Authentication, rate limited |
| `/api/users` | GET, POST, PATCH, DELETE | JWT + RBAC | User CRUD, status changes |
| `/api/messages` | GET, POST | JWT + RBAC | Message management, triggers detection |
| `/api/transactions` | GET, POST, PATCH | JWT + RBAC | Transaction management |
| `/api/risk-signals` | GET, POST | JWT + RBAC | Detection output queries |
| `/api/risk-scores` | GET | JWT + RBAC | Trust score queries, tier filtering |
| `/api/enforcement-actions` | GET, PATCH | JWT + RBAC | Enforcement history, reversals |
| `/api/audit-logs` | GET | JWT + RBAC | Immutable audit trail |
| `/api/events` | POST | JWT + RBAC | Event ingestion (Sidebase webhook) |
| `/api/alerts` | GET, PATCH | JWT + RBAC | Alert triage workflow |
| `/api/cases` | GET, POST, PATCH | JWT + RBAC | Case management + notes |
| `/api/appeals` | GET, POST, PATCH | JWT + RBAC | Appeal submission + resolution |
| `/api/analyze-event` | POST | JWT + HMAC | Service-to-service detection trigger |
| `/api/shadow` | GET | JWT + RBAC | Shadow mode metrics |
| `/api/stats` | GET | JWT + RBAC | Dashboard overview metrics |
| `/api/stats/v2` | GET | JWT + RBAC | KPI, timeline, advanced filtering |
| `/api/ai` | POST | JWT + RBAC | Risk summary, appeal analysis, pattern detection |
| `/api/admin/users` | GET, POST, PATCH, DELETE | JWT + RBAC | Admin user CRUD |
| `/api/admin/roles` | GET, POST, PATCH | JWT + RBAC | Role + permission management |

### 6.2 Authentication

| Method | Use Case | Details |
|--------|----------|---------|
| JWT Bearer | Dashboard → Backend | 24h expiry, carries id/email/role/permissions |
| HMAC-SHA256 | Sidebase → Backend | 5-min replay window, timing-safe comparison |
| Rate Limiting | Login | 10 attempts/IP/15min, 5 failed → 15min lockout |
| Rate Limiting | Global API | 100 req/min per IP |
| Rate Limiting | AI endpoints | 10 req/min per IP |
| Rate Limiting | Write endpoints | 30 mutations/min per IP |

### 6.3 External Integrations

| Integration | Status | Purpose |
|-------------|--------|---------|
| Sidebase (QwickServices Platform) | Designed, not connected | Live event source (messages, transactions) |
| OpenAI API | Implemented with fallback | Risk summaries, appeal analysis, pattern detection |
| Stripe (via Sidebase) | Observed indirectly | Platform payment processing (escrow model) |

---

## 7. Data Architecture & Schema

### 7.1 Database Tables (14 core + 3 supporting)

| Table | Migration | Purpose | Key Fields |
|-------|-----------|---------|------------|
| `users` | 001 | User identity | id (UUID), trust_score (0-100), status (active/restricted/suspended/banned) |
| `messages` | 002 | Message content | sender_id, receiver_id, content, conversation_id |
| `transactions` | 003 | Payment records | user_id, counterparty_id, amount, currency, status, payment_method |
| `risk_signals` | 004 | Detection output | signal_type (10 values), confidence (0-1), evidence (JSONB), obfuscation_flags, pattern_flags |
| `risk_scores` | 005 | Trust scores | score (0-100), tier (5 values), trend (3 values), factors (JSONB) |
| `enforcement_actions` | 006 | Actions taken | action_type (5 values), reason_code, effective_until, reversed_at, automated |
| `audit_logs` | 007 | Immutable audit trail | actor, action, entity_type, entity_id, details (JSONB) — append-only |
| `alerts` | 008 | Admin alert queue | priority (4 values), status (5 values), assigned_to |
| `cases` | 008 | Escalation cases | status (5 values), alert_ids (UUID[]), category |
| `case_notes` | 008 | Case documentation | case_id, author, content — timestamped |
| `appeals` | 009 | User appeals | enforcement_action_id, status (4 values), resolution_notes |
| `admin_users` | 009 | Admin accounts | email, password_hash, role, force_password_change, locked_until |
| `processed_events` | 009 | Event deduplication | event_id (unique) |
| `permissions` | 011 | Permission definitions | key, label, category, is_critical |
| `role_permissions` | 011 | Role → permission mapping | role, permission |
| `admin_permission_overrides` | 011 | Per-admin overrides | admin_user_id, permission, granted (bool) |

### 7.2 Enum Types

```sql
-- Users
user_status: active, restricted, suspended, banned
verification_status: unverified, pending, verified

-- Transactions
transaction_status: initiated, completed, failed, cancelled

-- Risk Signals
signal_type: CONTACT_PHONE, CONTACT_EMAIL, CONTACT_SOCIAL, CONTACT_MESSAGING_APP,
             PAYMENT_EXTERNAL, OFF_PLATFORM_INTENT, GROOMING_LANGUAGE,
             TX_REDIRECT_ATTEMPT, TX_FAILURE_CORRELATED, TX_TIMING_ALIGNMENT

-- Risk Scores
risk_tier: monitor, low, medium, high, critical
trend_direction: stable, escalating, decaying

-- Enforcement
enforcement_action_type: soft_warning, hard_warning, temporary_restriction,
                         account_suspension, permanent_ban

-- Alerts & Cases
alert_priority: low, medium, high, critical
alert_status: open, assigned, in_progress, resolved, dismissed
case_status: open, investigating, pending_action, resolved, closed

-- Appeals
appeal_status: submitted, under_review, approved, denied

-- Admin
admin_role: trust_safety, ops, legal_compliance, super_admin,
            trust_safety_analyst, enforcement_officer, risk_intelligence,
            ops_monitor, auditor, custom
```

### 7.3 Row-Level Security

RLS policies enforced on `messages`, `risk_signals`, and `audit_logs` tables, scoped by admin role.

---

## 8. Dependencies & Tooling

### 8.1 Backend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.21.0 | HTTP framework |
| pg | ^8.13.0 | PostgreSQL client |
| jsonwebtoken | ^9.0.2 | JWT authentication |
| bcryptjs | ^3.0.3 | Password hashing |
| zod | ^3.23.8 | Schema validation |
| helmet | ^7.1.0 | Security headers |
| cors | ^2.8.5 | CORS middleware |
| dotenv | ^16.4.5 | Environment variables |
| uuid | ^10.0.0 | ID generation |
| ioredis | ^5.4.1 | Redis client (durable bus) |

### 8.2 Dev Dependencies

| Package | Purpose |
|---------|---------|
| typescript ^5.5.4 | Type system |
| vitest ^2.0.5 | Unit/integration tests |
| tsx ^4.19.0 | TypeScript execution (dev mode) |
| eslint ^9.9.0 | Linting |
| prettier ^3.3.3 | Formatting |
| @playwright/test ^1.47.0 | E2E testing (dashboard) |

### 8.3 Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| Detection (regex) | 14 tests | Covered |
| Detection (keywords) | 11 tests | Covered |
| Obfuscation | 6 tests | Covered |
| Signal generation | 30 tests | Covered |
| Scoring | 22 tests | Covered |
| Enforcement | 11 tests | Covered |
| Durable event bus | 11 tests | Covered |
| Auth integration | 15 tests | Covered |
| **Total** | **120 tests** | **All passing** |

---

## 9. Placeholders, Gaps & TODOs

### 9.1 Identified Code Stubs

| Location | Stub | Impact |
|----------|------|--------|
| `scoring/aggregator.ts:173` | `similarPatternUsers: 0` — requires pattern matching infrastructure | Network layer reduced accuracy |
| `scoring/aggregator.ts:174` | `inDeviceCluster: false` — requires device tracking | Sybil attacks undetected |
| `events/emitter.ts` | MockEventEmitter — simulates Sidebase, not connected to live platform | No live data processing |

### 9.2 Gap Remediation Roadmap

See `GAP_REMEDIATION_ROADMAP.md` for the full 17-gap, 5-phase remediation plan. Summary:

| Phase | Gaps | Status |
|-------|------|--------|
| Phase 1: Production Hardening | Durable bus, graceful shutdown, rate limiting, infrastructure | **COMPLETE** |
| Phase 2: Test Coverage | API integration tests, event bus tests, E2E tests | Pending |
| Phase 3: Shadow Mode | Sidebase integration, shadow deployment, structured logging | Pending |
| Phase 4: Feature Completeness | Network scoring stubs, NLP detection, active enforcement | Pending |
| Phase 5: Operational Excellence | Accessibility, data export, caching, telemetry | Pending |

---

## 10. Runtime Behavior & Execution Model

### 10.1 Event Processing Pipeline

1. **Event Ingestion:** Platform events arrive via `POST /api/events` (mock) or future Sidebase webhook
2. **Event Bus:** Deduplication check (in-memory + DB), audit log, dispatch to consumers
3. **Detection (0ms delay):** Consumes `MESSAGE_CREATED`, `MESSAGE_EDITED` — produces risk signals
4. **Scoring (500ms delay):** Consumes same events — aggregates signals into trust score
5. **Enforcement (1500ms delay):** Consumes same events — evaluates triggers, executes actions

### 10.2 Event Bus Modes

| Mode | Backend | DLQ Persistence | Crash Recovery |
|------|---------|-----------------|----------------|
| `memory` (default) | In-process EventEmitter | In-memory (lost on restart) | None |
| `redis` | Redis-backed DurableEventBus | Redis list (`cis:dlq`) | Pending events recovered on startup |

### 10.3 Failure Behavior

| Failure | Response |
|---------|----------|
| Consumer throws | Event sent to dead letter queue; other consumers unaffected |
| Database unavailable | Degraded mode — event bus continues, DB operations fail gracefully |
| Redis unavailable | Falls back to in-memory DLQ |
| Scoring unavailable | Enforcement defaults to monitor-only (no action) |
| Notification failure | Retry with backoff; incident logged |
| Shutdown signal | Stop accepting connections, drain in-flight, close Redis, close DB pool |

### 10.4 Configuration Flags

| Flag | Default | Effect |
|------|---------|--------|
| `SHADOW_MODE` | `true` | Log enforcement decisions without applying them |
| `ENFORCEMENT_KILL_SWITCH` | `false` | Disable all enforcement actions |
| `EVENT_BUS_BACKEND` | `memory` | `memory` or `redis` for durable queue |
| `LOG_LEVEL` | `debug` | Controls DB query logging verbosity |

---

## 11. Security, Governance & Compliance

### 11.1 Authentication & Authorization

- **JWT:** 24h expiry, carries admin ID, email, role, and resolved permissions
- **HMAC:** SHA-256 signature with 5-minute replay window for service-to-service auth
- **RBAC:** 27 permissions across 10 roles, with per-admin overrides (grant/deny)
- **Rate Limiting:** 3 tiers — global (100/min), AI (10/min), write (30/min)
- **Account Lockout:** 5 failed login attempts → 15-minute IP lockout

### 11.2 Role Permissions Matrix

| Role | Alerts | Cases | Enforcement | Appeals | Settings |
|------|--------|-------|-------------|---------|----------|
| super_admin | Full | Full | Full | Full | Full |
| trust_safety | Full | Full | View + Reverse | View | None |
| ops | View | None | None | None | None |
| legal_compliance | View | Read | View | Full | None |
| enforcement_officer | View | None | Full | Full | None |
| auditor | None | None | None | None | None (audit_logs only) |

### 11.3 Data Protection

- **PII Redaction:** OpenAI service strips emails, phones, SSNs before LLM calls
- **Content Gating:** Message content access role-restricted
- **Audit Trail:** Append-only `audit_logs` table (no UPDATE/DELETE)
- **GDPR:** Right-of-access supported via exportable case files
- **Retention:** Raw events time-limited; enforcement/audit logs extended retention

### 11.4 Human-in-the-Loop Governance

| Action | Human Required |
|--------|----------------|
| Soft Warning | No |
| Hard Warning | No |
| Temporary Restriction (≤24h) | No |
| Temporary Restriction (72h, high tier) | **Yes** |
| Account Suspension | **Yes** |
| Permanent Ban | **Yes (mandatory legal review)** |
| Appeal Resolution | **Always human** |

---

## 12. Assumptions & Design Decisions

### 12.1 Resolved Conflicts

| Conflict | Resolution |
|----------|------------|
| Azure vs Hostinger (MASTER PROMPT mentions Azure) | Hostinger is implemented; infrastructure plan and deployment scripts target Hostinger VPS |
| Signal taxonomy granularity (docs vs code) | Code uses granular 10-type taxonomy; docs use broader categories |
| Event naming (message.sent vs message.created) | Code uses `message.created` per EventType enum |
| Trust score direction (high=good vs high=bad) | Code uses inverted scale: 0=trusted, 100=max risk |

### 12.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| In-process event bus (not Kafka/RabbitMQ) | Simplicity for single-VPS deployment; Redis-backed option added for durability |
| 14-day signal half-life | Balances recency bias with historical context; old signals don't permanently punish |
| Behavioral layer weighted 40% (highest) | Direct behavior patterns are strongest trust indicators per MarketTrust research |
| No automated permanent bans | Hard safety constraint — irreversible actions require human judgment |
| Shadow mode defaults to ON | New deployments observe before enforcing; reduces risk of false positive harm |
| Static export for dashboard | CDN/static hosting friendly; reduces server-side complexity |

### 12.3 Open Questions (from documentation)

- Exact Sidebase webhook payload format (blocked on external team)
- Production-ready NLP model selection for contextual detection
- Zone and category multiplier values for risk scoring enhancement
- Wallet abuse monitoring data source availability

---

## 13. Final Assessment

### System Strengths

1. **Exceptional documentation** — 30 architecture docs provide comprehensive coverage with minimal contradiction
2. **Sound layered architecture** — Detection/Scoring/Enforcement separation is clean and well-enforced
3. **Privacy-first design** — PII redaction, RLS, consent gating, GDPR awareness
4. **Working pipeline** — Detection through enforcement functional with synthetic data (120 tests passing)
5. **Adversary-aware** — Obfuscation detection, collusion modeling, whitewashing prevention designed in
6. **Human safety nets** — Kill switch, shadow mode, graduated enforcement, mandatory human review for irreversible actions
7. **Fully implemented dashboard** — 10 modules + intelligence dashboard, all with real API integration
8. **Production infrastructure** — Docker, CI/CD, PM2, Nginx, deploy scripts, backup automation

### Critical Path to Production

```
Phase 1 COMPLETE → Phase 2 (Test Coverage) → Phase 3 (Shadow Mode)
                                                    │
                                            7-day live observation
                                                    │
                                            Threshold calibration
                                                    │
                                          Phase 4 (Active Enforcement)
                                            LOW tier → MEDIUM → HIGH
```

### Maturity Assessment

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Architecture | Production-ready | Clean separation, well-documented invariants |
| Backend Implementation | ~90% complete | All core pipelines functional; network scoring stubs remain |
| Dashboard Implementation | ~95% complete | All modules functional; E2E tests need completion |
| Infrastructure | Production-ready | Docker, CI/CD, deploy automation, backup all in place |
| Test Coverage | ~70% | Core logic well-tested; API endpoints and E2E gaps |
| Live Integration | 0% | Sidebase webhook not connected; mock data only |
| Security | Production-ready | JWT+HMAC, RBAC, rate limiting, RLS, PII redaction |
| Observability | Partial | Audit logs complete; structured logging not yet implemented |

**Overall Status: Ready for shadow-mode deployment pending Sidebase integration.**
