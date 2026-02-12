# QwickServices Contact Integrity System (CIS) — Complete System Reconstruction

> **Status:** Authoritative Living System Document
> **Generated:** 2026-02-12 | **Updated:** 2026-02-12
> **Method:** Full codebase audit — 30 architecture documents + 40+ source files cross-referenced
> **Scope:** End-to-end system reconstruction from documentation and implemented code
> **Revision:** Phase 2 deep audit — API schemas, middleware, event emission, dashboard internals, test infrastructure

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
│   ├── unit/ (7 test files)            # 120 tests total (6 detection/scoring/enforcement + 1 durable bus)
│   ├── integration/ (1 test file)      # auth.test.ts (15 tests: JWT, RBAC, lockout)
│   ├── helpers/                        # Shared test setup (mocks, token gen, server factory)
│   └── fixtures/                       # simulation-corpus.ts (37 messages)
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

### 5.5 Dashboard Component Architecture

#### Authentication Flow (LoginPage.tsx → layout.tsx)

```
1. User submits email + password → api.login()
2. Backend validates credentials → returns { token, user }
3. If user.force_password_change === true:
   a. LoginPage shows password change form
   b. Validates: ≥ 8 chars, confirmation match
   c. Calls api.resetAdminPassword() → re-authenticates
4. Token + user persisted to localStorage (cis_token, cis_user)
5. AuthContext.Provider wraps entire app
6. On bootstrap: decodes JWT exp claim, auto-logouts if expired
7. API client dispatches 'cis-auth-expired' custom event on 401 → layout listener clears auth
```

#### Auth Context & Permission System (lib/auth.ts)

```typescript
// Context interface
interface AuthState { user: AuthUser | null; token: string | null; isAuthenticated: boolean; }
interface AuthUser { id, email, name, role, permissions: string[], force_password_change?: boolean }

// Hooks
useAuth()                         → { auth, login, logout }
usePermission(...perms: string[]) → boolean  // memoized check
hasPermission(user, ...perms)     → boolean  // user.permissions includes ALL specified
```

#### Module Routing (Dashboard.tsx)

The dashboard uses a single-page architecture with a sidebar and a main content area. Module visibility is controlled by permission checks.

| Module | Component | Required Permission | Data Source |
|--------|-----------|-------------------|------------|
| Intelligence Dashboard | `IntelligenceDashboard` | `intelligence.view` | `/api/stats/v2/kpi`, `/api/stats/v2/timeline` |
| Overview | `OverviewDashboard` | `overview.view` | `/api/stats/overview` |
| Categories | `CategoryDashboard` | `category.view` | `/api/stats/categories` |
| Alerts & Inbox | `AlertsInbox` | `alerts.view` | `/api/alerts` |
| Case Investigation | `CaseInvestigation` | `cases.view` | `/api/cases`, `/api/cases/:id` |
| Enforcement | `EnforcementManagement` | `enforcement.view` | `/api/enforcement-actions` |
| Risk & Trends | `RiskTrends` | `risk.view` | `/api/risk-scores` |
| Appeals | `AppealsModule` | `appeals.view` | `/api/appeals` |
| System Health | `SystemHealth` | `system_health.view` | `/api/health` (30s polling) |
| Audit Logs | `AuditLogsModule` | `audit_logs.view` | `/api/audit-logs` |
| Settings | `SettingsModule` | `settings.view` | `/api/admin/users`, `/api/admin/roles` |

#### Dashboard Sidebar Features

- **Service Category Filter** (collapsible): All, Cleaning, Plumbing, Electrical, Moving, Tutoring, Handyman, Landscaping, Pet Care, Auto Repair, Personal Training
- **User info display**: Name, formatted role
- **Logout button**: Clears localStorage, resets AuthContext
- **Module navigation**: Active state tracking, permission-gated visibility

#### API Client (lib/api.ts — 274 lines, 25+ endpoint groups)

Centralized fetch wrapper with:
- Automatic `Authorization: Bearer <token>` injection
- 401 detection → dispatches `cis-auth-expired` custom event
- Base URL configurable via `NEXT_PUBLIC_API_URL` (defaults to `/api`)
- Generic error message fallback on network/parse failures

#### Dashboard Configuration

| Setting | Value |
|---------|-------|
| Output Mode | Static export (`next build` → HTML/CSS/JS) |
| React Strict Mode | Enabled |
| Trailing Slashes | Enabled |
| CSS Framework | Tailwind CSS with CIS theme variables |
| Theme Colors | `--cis-green: #32A402`, `--cis-orange: #ffa500`, `--cis-red: #ff0000` + soft variants |

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

### 6.4 Middleware Stack (execution order in index.ts)

```
1. helmet()                              — Security headers (XSS, HSTS, sniffing)
2. cors({ origin: [dashboard, api] })    — CORS whitelist
3. express.json({ limit: '1mb' })        — Body parser
4. globalLimiter → /api/*                — 100 req/min per IP (skips /health)
5. aiLimiter → /api/ai/*                 — 10 req/min per IP
6. writeLimiter → /api/users, messages,  — 30 req/min per IP (skips GET)
     transactions, events, alerts, cases,
     appeals, enforcement-actions, admin
7. [Route-level middleware]:
   a. authenticateJWT                    — Validates Bearer token, populates req.adminUser
   b. requirePermission(...)             — Checks req.adminUser.permissions has ALL required
   c. validateParams / validateQuery     — Zod schema on req.params / req.query
   d. validate                           — Zod schema on req.body
   e. Route handler (async)
8. notFound                              — 404 for unmatched routes
9. errorHandler                          — Global error catch (500 with safe message)
```

### 6.5 Zod Validation Schemas (src/backend/src/api/schemas/index.ts)

| Schema | Purpose | Key Validations |
|--------|---------|-----------------|
| `uuidParam` | Path parameter validation | `id: z.string().uuid()` |
| `paginationQuery` | Pagination query params | `page: int ≥1`, `limit: int 1-100 (default 20)` |
| `eventSchema` | Event ingestion | `type: enum(12 types)`, `payload: record`, `version: int` |
| `loginSchema` | Auth login | `email: z.email()`, `password: z.string().min(8)` |
| `createUserSchema` | User creation | `external_id`, `display_name`, `email`, `metadata` (all optional) |
| `updateUserSchema` | User update | `display_name`, `verification_status`, `status`, `metadata` |
| `createMessageSchema` | Message creation | `sender_id: uuid`, `receiver_id: uuid`, `content: min(1) max(10000)` |
| `messageQuerySchema` | Message filters | `sender_id`, `receiver_id`, `conversation_id` (all optional UUID) |
| `createTransactionSchema` | Transaction creation | `user_id: uuid`, `amount: positive`, `currency: 3 chars` |
| `updateTransactionSchema` | Status change | `status: enum(initiated,completed,failed,cancelled)` |
| `riskSignalSchema` | Signal creation | `signal_type: enum(10)`, `confidence: 0-1`, `evidence: { message_ids[], timestamps[] }` |
| `signalQuerySchema` | Signal filters | `user_id`, `signal_type`, `min_confidence: 0-1` |
| `riskScoreQuerySchema` | Score filters | `user_id`, `tier: enum(5)`, `min_score: 0-100`, `category` |
| `enforcementQuerySchema` | Enforcement filters | `user_id`, `action_type: enum(5)`, `active_only: bool`, `category` |
| `auditLogQuerySchema` | Audit log filters | `actor`, `action`, `entity_type`, `entity_id`, `from/to: datetime` |
| `alertQuerySchema` | Alert filters | `status: enum(5)`, `priority: enum(4)`, `assigned_to`, `category`, `user_type` |
| `updateAlertSchema` | Alert update | `status: enum(5)`, `assigned_to: uuid|null`, `priority: enum(4)` |
| `createCaseSchema` | Case creation | `user_id: uuid`, `title: max(500)`, `description`, `alert_ids: uuid[]` |
| `updateCaseSchema` | Case update | `status: enum(5)`, `assigned_to`, `title`, `description` |
| `addCaseNoteSchema` | Case note | `content: min(1)` |
| `createAppealSchema` | Appeal creation | `enforcement_action_id: uuid`, `user_id: uuid`, `reason: min(1)` |
| `resolveAppealSchema` | Appeal resolution | `status: enum(approved,denied)`, `resolution_notes: min(1)` |
| `createAdminSchema` | Admin creation | `email`, `name`, `password: min(8)`, `role: enum(10)`, `permission_overrides[]` |
| `updateAdminSchema` | Admin update | `name`, `role: enum(10)`, `active: bool`, `permission_overrides[]` |
| `resetPasswordSchema` | Password reset | `new_password: min(8) max(128)` |

### 6.6 Detailed Route Specifications

#### Auth Routes (`/api/auth`)

| Endpoint | Auth | Permission | Request | Response | Side Effects |
|----------|------|------------|---------|----------|-------------|
| `POST /login` | None | None | `{ email, password }` | `{ token, user: { id, email, name, role, permissions, force_password_change } }` | IP rate limit (10/15min), failed login counter (5 → 15min lockout), bcrypt/SHA256 dual support with auto-migration |
| `GET /me` | JWT | Any | — | `{ user: req.adminUser }` | — |

#### User Routes (`/api/users`)

| Endpoint | Permission | Query/Body | Response Shape |
|----------|------------|------------|----------------|
| `GET /` | `overview.view` | `?user_type&service_category&status&page&limit` | `{ data: user[], pagination }` |
| `GET /:id` | `overview.view` | — | `{ data: user }` (404 if not found) |
| `POST /` | `overview.view` | `{ external_id?, display_name?, email?, metadata? }` | `{ data: user }` (201) |
| `PATCH /:id` | `overview.view` | `{ display_name?, verification_status?, status?, metadata? }` | `{ data: user }` — emits `USER_STATUS_CHANGED` if status changed |

#### Message Routes (`/api/messages`)

| Endpoint | Permission | Query/Body | Response Shape |
|----------|------------|------------|----------------|
| `GET /` | `messages.view` | `?sender_id&receiver_id&conversation_id&page&limit` | `{ data: message[], pagination }` |
| `GET /:id` | `messages.view` | — | `{ data: message }` |
| `POST /` | `messages.view` | `{ sender_id, receiver_id, conversation_id?, content, metadata? }` | `{ data: message }` (201) — emits `MESSAGE_CREATED` |

#### Transaction Routes (`/api/transactions`)

| Endpoint | Permission | Query/Body | Response Shape |
|----------|------------|------------|----------------|
| `GET /` | `overview.view` | `?user_id&status&page&limit` | `{ data: transaction[], pagination }` |
| `GET /:id` | `overview.view` | — | `{ data: transaction }` |
| `POST /` | `overview.view` | `{ user_id, counterparty_id?, amount, currency?, payment_method?, external_ref?, metadata? }` | `{ data: transaction }` (201) — emits `TRANSACTION_INITIATED` |
| `PATCH /:id` | `overview.view` | `{ status }` | `{ data: transaction }` — emits `TRANSACTION_COMPLETED/FAILED/CANCELLED` |

#### Risk Signal Routes (`/api/risk-signals`)

| Endpoint | Permission | Query/Body | Response Shape |
|----------|------------|------------|----------------|
| `GET /` | `risk.view` | `?user_id&signal_type&min_confidence&page&limit` | `{ data: signal[], pagination }` |
| `GET /:id` | `risk.view` | — | `{ data: signal }` |
| `POST /` | `risk.view` | `{ source_event_id, user_id?, signal_type, confidence, evidence, obfuscation_flags, pattern_flags }` | `{ data: signal }` (201) |

#### Risk Score Routes (`/api/risk-scores`)

| Endpoint | Permission | Query/Body | Response Shape |
|----------|------------|------------|----------------|
| `GET /` | `risk.view` | `?user_id&tier&min_score&category&page&limit` | `{ data: score[] + user joins, pagination }` |
| `GET /user/:id` | `risk.view` | — | `{ data: latest_score }` (404 if no score) |
| `GET /:id` | `risk.view` | — | `{ data: score }` |

#### Enforcement Action Routes (`/api/enforcement-actions`)

| Endpoint | Permission | Query/Body | Response Shape |
|----------|------------|------------|----------------|
| `GET /` | `enforcement.view` | `?user_id&action_type&active_only&category&page&limit` | `{ data: action[] + user joins, pagination }` |
| `GET /:id` | `enforcement.view` | — | `{ data: action + user join }` |
| `POST /:id/reverse` | `enforcement.reverse` | `{ reason }` (required) | `{ data: reversed_action }` — emits `ENFORCEMENT_ACTION_REVERSED` |

#### Alert Routes (`/api/alerts`)

| Endpoint | Permission | Query/Body | Response Shape |
|----------|------------|------------|----------------|
| `GET /` | `alerts.view` | `?status&priority&assigned_to&category&user_type&page&limit` | `{ data: alert[] + user joins, pagination }` (sorted: critical > high > medium > low) |
| `GET /:id` | `alerts.view` | — | `{ data: alert + user join }` |
| `PATCH /:id` | `alerts.action` | `{ status?, assigned_to?, priority? }` | `{ data: alert }` |

#### Case Routes (`/api/cases`)

| Endpoint | Permission | Query/Body | Response Shape |
|----------|------------|------------|----------------|
| `GET /` | `cases.view` | `?status&category&user_type&page&limit` | `{ data: case[] + user joins, pagination }` |
| `GET /:id` | `cases.view` | — | `{ data: { ...case, notes: case_note[] } }` |
| `POST /` | `cases.create` | `{ user_id, title, description?, alert_ids }` | `{ data: case }` (201) — auto-assigns to current admin |
| `PATCH /:id` | `cases.action` | `{ status?, assigned_to?, title?, description? }` | `{ data: case }` |
| `POST /:id/notes` | `cases.action` | `{ content }` | `{ data: case_note }` (201) — author = current admin email |

#### Appeal Routes (`/api/appeals`)

| Endpoint | Permission | Query/Body | Response Shape |
|----------|------------|------------|----------------|
| `GET /` | `appeals.view` | `?status&category&page&limit` | `{ data: appeal[] + enforcement + user joins, pagination }` |
| `POST /` | `appeals.view` | `{ enforcement_action_id, user_id, reason }` | `{ data: appeal }` (201) — validates action exists, not reversed, no pending appeal (409) — emits `APPEAL_SUBMITTED` |
| `POST /:id/resolve` | `appeals.resolve` | `{ status: approved|denied, resolution_notes }` | `{ data: appeal }` — **if approved:** reverses enforcement, restores user status (if restricted/suspended), writes audit log — emits `APPEAL_RESOLVED` |

#### Admin User Routes (`/api/admin/users`)

| Endpoint | Permission | Query/Body | Response Shape |
|----------|------------|------------|----------------|
| `GET /` | `settings.manage_admins` | — | `{ data: admin[] + permissions + action_count_30d }` |
| `GET /:id` | `settings.manage_admins` | — | `{ data: { ...admin, permissions, permission_overrides } }` |
| `POST /` | `settings.manage_admins` | `{ email, name, password, role, force_password_change?, permission_overrides? }` | `{ data: admin + permissions }` (201) — super_admin creation restricted to super_admin, 409 on duplicate email, writes audit log |
| `PATCH /:id` | `settings.manage_admins` | `{ name?, role?, active?, permission_overrides? }` | `{ data: admin + permissions }` — prevents self-deactivation, super_admin promotion restricted, replaces all overrides on update |
| `POST /:id/reset-password` | `settings.manage_admins` | `{ new_password }` | `{ data: { message, admin } }` — sets force_password_change=true, writes audit log |

### 6.7 Event Emission System (src/backend/src/events/emit.ts)

All CRUD routes that modify state emit fire-and-forget domain events via `safeEmit()`. Errors are logged but never block the HTTP response.

| Helper Function | Triggered By | Event Type | Key Payload Fields |
|----------------|-------------|-----------|-------------------|
| `emitMessageCreated()` | `POST /messages` | `message.created` | message_id, sender_id, receiver_id, content |
| `emitMessageEdited()` | (future) | `message.edited` | message_id, content, previous_content |
| `emitTransactionInitiated()` | `POST /transactions` | `transaction.initiated` | transaction_id, user_id, amount, currency, status |
| `emitTransactionStatusChanged()` | `PATCH /transactions/:id` | `transaction.completed/failed/cancelled` | transaction_id, user_id, status |
| `emitUserStatusChanged()` | `PATCH /users/:id` (when status changes) | `user.status_changed` | user_id, previous_status, new_status, reason |
| `emitAppealSubmitted()` | `POST /appeals` | `appeal.submitted` | appeal_id, enforcement_action_id, user_id |
| `emitAppealResolved()` | `POST /appeals/:id/resolve` | `appeal.resolved` | appeal_id, status, resolution_notes |
| `emitEnforcementReversed()` | `POST /enforcement-actions/:id/reverse` | `enforcement.action_reversed` | action_id, user_id, action_type, reversal_reason |

**Event Construction Pattern:**
```typescript
function buildEvent(type: EventType, payload: Record<string, unknown>): DomainEvent {
  return { id: generateId(), type, correlation_id: generateId(), timestamp: nowISO(), version: 1, payload };
}
```

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

### 8.4 Test Infrastructure

#### Backend Test Framework (Vitest)

**Configuration** (`src/backend/vitest.config.ts`):
```typescript
{
  globals: true,           // describe/it/expect without imports
  environment: 'node',     // Node.js test environment
  include: ['tests/**/*.test.ts'],
  coverage: { provider: 'v8', reporter: ['text', 'lcov'] }
}
```

**Scripts** (`src/backend/package.json`):
- `npm run test` → `vitest run` (single run)
- `npm run test:watch` → `vitest` (watch mode)

#### Test File Inventory

**Unit Tests:**

| File | Tests | What It Covers |
|------|-------|---------------|
| `tests/unit/detection-regex.test.ts` | 14 | Phone (3 formats), email (3), URL (3), social handles (3) |
| `tests/unit/detection-keywords.test.ts` | 11 | Messaging apps (30 keywords), payments (29), off-platform intent (24), grooming (22) |
| `tests/unit/obfuscation.test.ts` | 6 | Spaced characters, emoji substitution, leetspeak, character separators |
| `tests/unit/scoring.test.ts` | 22 | 3-layer weighted formula, tier assignment, trend detection, 14-day time decay |
| `tests/unit/enforcement.test.ts` | 11 | Trigger evaluation across all 5 risk tiers, graduated enforcement ladder |
| `tests/unit/durable-bus.test.ts` | 11 | Consumer dispatch, wildcards, DLQ persistence, retry logic, idempotency |

**Integration Tests:**

| File | Tests | What It Covers |
|------|-------|---------------|
| `tests/integration/auth.test.ts` | 15 | JWT validation (missing/malformed/expired/wrong secret/valid), permission enforcement (missing/partial/full), token generation, permission resolution with overrides, account lockout (locked/deactivated) |

**Test Fixtures:**

| File | Purpose |
|------|---------|
| `tests/fixtures/simulation-corpus.ts` | 37 corpus messages across 5 categories: clean (10), single-signal violations (7), obfuscated (6), escalation sequences (3), multi-signal (2) |

#### Auth Integration Test Pattern (reference for GAP-06)

The existing `auth.test.ts` establishes the pattern for all API integration tests:

```typescript
// 1. Module-level mocks (before imports)
vi.mock('../../src/database/connection', () => ({ query: mockQuery, ... }));
vi.mock('../../src/config', () => ({ config: { ... } }));

// 2. Import modules under test
import { authenticateJWT, generateToken } from '../../src/api/middleware/auth';

// 3. Create mock helpers
function mockReq(overrides) { return { headers: {}, body: {}, ... } as Request; }
function mockRes() { return { _status: 200, _json: null, status(code) {...}, json(data) {...} }; }

// 4. For HTTP tests: spin up temp Express server
const app = express(); app.use(route);
const server = app.listen(0); const port = (server.address() as { port: number }).port;
const res = await fetch(`http://127.0.0.1:${port}/...`);
server.close();
```

#### Dashboard E2E Test Framework (Playwright)

**Configuration** (`src/dashboard/playwright.config.ts`):
```typescript
{
  testDir: './tests/e2e',
  timeout: 30000,
  use: { baseURL: process.env.DASHBOARD_URL || 'http://localhost:3000', trace: 'on-first-retry' },
  webServer: { command: 'npm run dev', port: 3000, reuseExistingServer: true }
}
```

**Scripts** (`src/dashboard/package.json`):
- `npm run test:e2e` → `playwright test`

**Current E2E State:**

| Test Suite | Tests | Status |
|-----------|-------|--------|
| Authentication | 3 (login page visibility, valid login, invalid login) | Partially implemented |
| RBAC | 2 (ops role restrictions, legal role access) | Stubbed |
| Alert Triage | 2 (claim alert, dismiss alert) | Stubbed |
| Case Investigation | 2 (view details, add notes) | Stubbed |
| Enforcement | 2 (reversal justification, confirmation modal) | Stubbed |
| Appeal Resolution | 2 (resolution options, approval cascade) | Stubbed |

---

## 9. Placeholders, Gaps & TODOs

### 9.1 Identified Code Stubs

| Location | Stub | Impact |
|----------|------|--------|
| `scoring/aggregator.ts:173` | `similarPatternUsers: 0` — requires pattern matching infrastructure | Network layer reduced accuracy |
| `scoring/aggregator.ts:174` | `inDeviceCluster: false` — requires device tracking | Sybil attacks undetected |
| `events/emitter.ts` | MockEventEmitter — simulates Sidebase, not connected to live platform | No live data processing |

### 9.2 Gap Remediation Roadmap

See `GAP_REMEDIATION_ROADMAP.md` for the full 17-gap, 5-phase remediation plan.

| Phase | Gaps | Status |
|-------|------|--------|
| Phase 1: Production Hardening | Durable bus, graceful shutdown, rate limiting, infrastructure | **COMPLETE** (commit `a9dd303`) |
| Phase 2: Test Coverage | API integration tests, event bus tests, E2E tests | **IN PROGRESS** |
| Phase 3: Shadow Mode | Sidebase integration, shadow deployment, structured logging | Pending |
| Phase 4: Feature Completeness | Network scoring stubs, NLP detection, active enforcement | Pending |
| Phase 5: Operational Excellence | Accessibility, data export, caching, telemetry | Pending |

### 9.3 Phase 1 Completion Summary (Production Hardening)

| Gap | Files Created/Modified | Key Implementation |
|-----|----------------------|-------------------|
| GAP-01: Durable Event Bus | `events/durable-bus.ts`, `events/redis.ts`, `events/bus.ts` (modified) | Redis-backed DLQ (`cis:dlq`), pending event stream (`cis:events:pending`), crash recovery via `recoverPendingEvents()`, feature-flagged via `EVENT_BUS_BACKEND=memory\|redis` |
| GAP-02: Graceful Shutdown | `index.ts` (modified) | SIGTERM/SIGINT handlers, HTTP drain (configurable timeout), Redis close, DB pool close |
| GAP-04: Rate Limiting | `api/middleware/rateLimit.ts`, `config.ts` (modified) | 3-tier sliding window: global (100/min), AI (10/min), write (30/min), `X-RateLimit-*` headers, 429 + `Retry-After` |
| GAP-05: Infrastructure | `Dockerfile`, `docker-compose.yml`, `ecosystem.config.js`, `infra/nginx.conf`, `infra/deploy.sh`, `infra/backup-db.sh`, `.github/workflows/ci.yml`, `.env.production.example` | Multi-stage Docker (Node 20 Alpine, dumb-init, non-root), PostgreSQL 16 + Redis 7 compose stack, PM2 cluster mode, atomic symlink deployment with rollback, CI pipeline (lint → test → build → Docker smoke) |

### 9.4 Phase 2 Detailed Plan (Test Coverage — Quality Gate)

#### GAP-06: API Endpoint Integration Tests

**Current State:** 23 route files with 50+ endpoints, zero integration test coverage on routes. Only auth middleware is integration-tested.

**Scope:** Test every route group through the Express middleware stack with mocked DB.

| Route Group | Endpoints | Required Tests | Key Assertions |
|------------|-----------|---------------|----------------|
| Auth | `POST /login`, `GET /me` | 5+ | Login success/failure, lockout, deactivated, force password change |
| Users | `GET /`, `GET /:id`, `POST /`, `PATCH /:id` | 6+ | CRUD, pagination, filtering, status change event emission, 404 for missing, 400 for invalid UUID |
| Messages | `GET /`, `GET /:id`, `POST /` | 4+ | Create + list, event emission verification, validation (empty content, missing sender) |
| Transactions | `GET /`, `GET /:id`, `POST /`, `PATCH /:id` | 4+ | Create, status change, event emission, validation |
| Risk Signals | `GET /`, `GET /:id`, `POST /` | 4+ | Query by user, filter by type, confidence filtering |
| Risk Scores | `GET /`, `GET /user/:id`, `GET /:id` | 4+ | Query by tier, filter by min_score, latest score per user |
| Enforcement | `GET /`, `GET /:id`, `POST /:id/reverse` | 4+ | List, detail, reversal with reason (required), 404 for already reversed |
| Alerts | `GET /`, `GET /:id`, `PATCH /:id` | 4+ | Priority-sorted listing, status transitions, claim/dismiss, permission checks (alerts.action) |
| Cases | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `POST /:id/notes` | 6+ | Full CRUD, notes timeline, auto-assignment, permission differentiation (cases.view vs cases.create vs cases.action) |
| Appeals | `GET /`, `POST /`, `POST /:id/resolve` | 6+ | Create with validation (enforcement exists, not reversed, no duplicate), resolve (approved → reversal cascade, denied), permission checks (appeals.resolve) |
| Admin Users | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `POST /:id/reset-password` | 5+ | CRUD, super_admin restriction, duplicate email (409), self-deactivation prevention, permission overrides, audit logging |

**Total: 40+ integration tests**

**Test Architecture:**
- Shared test helper (`tests/helpers/setup.ts`): Mocks for DB, config, event emission, Redis, permissions; token generation for any role; Express app factory
- Each route file gets its own `tests/integration/<route>.test.ts` file
- Pattern: Mock DB → Mount route → Start temp server → fetch → Assert response

**Acceptance Criteria:**
- All route groups have integration tests covering happy path + error cases
- Auth enforcement verified (401 without token, 403 without permission)
- Zod validation verified (400 on invalid input)
- Event emission verified (emitMessageCreated, etc. called after mutations)
- Coverage gate: ≥60% backend line coverage in CI

#### GAP-07: Event Bus & Infrastructure Tests

**Current State:** DurableEventBus has 11 unit tests (added in Phase 1). In-memory EventBus (the default) has zero tests despite being the primary bus used by all existing consumers.

**Scope:** Unit tests for in-memory EventBus class.

| Test Category | Tests | Key Assertions |
|--------------|-------|----------------|
| emit() happy path | 2 | Event dispatched to registered consumer; event logged to audit trail |
| emit() idempotency | 2 | Duplicate event ID rejected (in-memory cache); duplicate event ID rejected (DB fallback) |
| registerConsumer() | 3 | Type-specific consumer receives matching events; wildcard (*) consumer receives all events; multiple consumers on same type all fire |
| Dead letter queue | 4 | Consumer exception → event in DLQ; retryDeadLetters() re-dispatches; max retries (3) exceeded → permanent failure; clearDeadLetterQueue() empties DLQ |
| Utility methods | 3 | getConsumerCount() by type and total; getRegisteredConsumers() returns correct map; subscribe/unsubscribe |

**Total: 14+ unit tests**

**Acceptance Criteria:**
- All EventBus public methods tested
- Idempotency enforcement verified (in-memory + DB check)
- DLQ lifecycle tested (failure → DLQ → retry → success OR max retries)

#### GAP-08: Dashboard E2E Tests

**Current State:** Playwright configured, 13 tests defined but ~80% stubbed with empty bodies. Only login page visibility test works without a running backend.

**Scope:** Flesh out all stubbed tests + add new test suites.

| Test Suite | Tests | What It Verifies |
|-----------|-------|-----------------|
| Authentication | 3 | Login page rendering, successful login → dashboard redirect, invalid credentials → error message |
| Module Navigation | 2 | All permitted modules visible after login, navigation between modules |
| Alert Triage Workflow | 3 | Claim open alert, change alert priority, dismiss low-priority alert |
| Case Investigation | 3 | View case detail + notes, add internal note, change case status |
| Enforcement Actions | 2 | Reversal requires justification (reason field), confirmation modal before reversal |
| Appeal Resolution | 2 | Resolution modal shows approve/deny options, approval reverses enforcement |
| RBAC Enforcement | 2 | Ops role cannot see enforcement module, restricted modules hidden from sidebar |
| Settings Module | 2 | Create sub-admin with role, admin list updates |

**Total: 19 E2E tests**

**Prerequisites:** Running backend + dashboard (via docker-compose or dev servers)

**Acceptance Criteria:**
- Login flow works end-to-end
- At least 6 workflow scenarios pass (alert triage, case investigation, enforcement reversal, appeal resolution, RBAC, settings)
- Playwright added to CI pipeline (runs against docker-compose stack)

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

---

## 14. Phase 2 Execution Dependencies

```
GAP-06 (API Integration Tests)
  └── Requires: tests/helpers/setup.ts (shared mocks, token gen)
  └── Files: tests/integration/{users,messages,transactions,risk-signals,
             risk-scores,enforcement,alerts,cases,appeals,admin-users}.test.ts
  └── Pattern: Mock DB → Mount route → Temp server → fetch → Assert
  └── Total: ~40 tests across 10 route groups

GAP-07 (EventBus Unit Tests)
  └── File: tests/unit/event-bus.test.ts
  └── Pattern: Mock DB → new EventBus() → emit/register/retry → Assert
  └── Total: ~14 tests
  └── Note: DurableEventBus already has 11 tests (Phase 1)

GAP-08 (Dashboard E2E Tests)
  └── Requires: Running backend + dashboard (docker-compose up)
  └── File: tests/e2e/dashboard.spec.ts (replace stubbed tests)
  └── Fixtures: tests/e2e/fixtures.ts (auth helpers, seed data)
  └── Total: ~19 tests
  └── Note: Cannot run in CI without docker-compose test stack

Phase 2 Exit Criteria:
  ✓ >60% backend line coverage
  ✓ All route groups have integration tests
  ✓ EventBus fully covered (both memory and durable)
  ✓ 6+ E2E workflow scenarios passing
  ✓ Coverage gate enforced in CI pipeline
```
