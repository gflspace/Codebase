# QCIS Gap Remediation Roadmap

> **Status:** Authoritative Execution Plan
> **System:** QwickServices Contact Integrity System (CIS)
> **Baseline:** Full codebase audit completed 2026-02-12
> **Scope:** All gaps between documented architecture and current implementation

---

## Audit Summary

### What's Done (No Remediation Needed)

| Area | Status | Evidence |
|------|--------|----------|
| Detection pipeline (regex, keywords, obfuscation, context, signals) | COMPLETE | 6 source files, full pipeline, unit tested |
| Scoring pipeline (3-layer trust score, tiers, trend, time decay) | COMPLETE | 4 source files, weighted formula, unit tested |
| Enforcement pipeline (triggers, actions, notifications, escalation) | COMPLETE | 4 source files, graduated ladder, unit tested |
| Database schema (12 migrations, 14+ tables, RLS policies) | COMPLETE | 001-012 migrations, enums, indexes, triggers |
| API routes (23 route files, 50+ endpoints) | COMPLETE | Real DB queries, Zod validation, JWT auth |
| Middleware (JWT, HMAC, RBAC, Zod validation, error handling) | COMPLETE | auth.ts, permissions.ts, validation.ts, errorHandler.ts |
| OpenAI service (risk summary, appeal analysis, pattern detection) | COMPLETE | PII redaction, graceful fallback, config-gated |
| Event bus (in-memory + DB deduplication, dead letter queue) | COMPLETE* | *Functional but not durable — see GAP-01 |
| Dashboard modules (10 modules, all with real API integration) | COMPLETE | OverviewDashboard through SettingsModule |
| Intelligence dashboard (KPIs, timeline, filters, sparklines) | COMPLETE | 5 components, real /stats/v2 endpoints |
| Auth flow (login, token validation, 401 auto-logout, force password change) | COMPLETE | LoginPage, RootLayout, AuthContext |
| RBAC (roles, permissions, per-admin overrides, UI enforcement) | COMPLETE | admin-users, admin-roles, permissions middleware |
| Configuration (18 env vars, validation, prod/dev separation) | COMPLETE | config.ts with requiredInProduction pattern |
| Seed data (synthetic users, signals, scores, actions) | COMPLETE | 012_seed_synthetic_data.sql |

### What's Not Done (Remediation Required)

17 gaps identified, organized into 5 phases below.

---

## Phase 1 — Production Hardening (Critical Path)

These gaps block safe production deployment. Must be resolved before any live traffic.

---

### GAP-01: Durable Event Queue

**Priority:** CRITICAL
**Current State:** In-memory EventBus with DB-backed deduplication (`processed_events` table). Dead letter queue is in-memory only — lost on server restart. No message ordering guarantees across restarts.
**Risk:** Event loss during deployment, restart, or crash. Pipeline state corruption.
**Location:** `src/backend/src/events/bus.ts`

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 1.1 | Add Redis dependency (`ioredis`) to backend | Package installed, config vars added (`REDIS_URL`) |
| 1.2 | Create `src/backend/src/events/durable-bus.ts` implementing the same `EventBus` interface | Same emit/registerConsumer/subscribe API |
| 1.3 | Persist dead letter queue to Redis list (`cis:dlq`) | DLQ survives restart; `retryDeadLetters()` reads from Redis |
| 1.4 | Add Redis-backed event stream for unprocessed events (`cis:events`) | Events persisted before consumer dispatch; consumers ACK after processing |
| 1.5 | Feature-flag: `EVENT_BUS_BACKEND=memory|redis` defaulting to `memory` | Zero-breaking-change rollout; existing tests pass with `memory` |
| 1.6 | Add unit tests for durable bus (emit, ACK, DLQ persist, restart recovery) | 8+ test cases covering happy path, consumer failure, restart |

**Dependencies:** None
**Blocked By:** Nothing
**Blocks:** GAP-03 (Sidebase integration requires reliable event ingestion)

---

### GAP-02: Graceful Shutdown

**Priority:** HIGH
**Current State:** No SIGTERM/SIGINT handlers in `src/backend/src/index.ts`. On shutdown: DB pool leaks, in-flight requests abandoned, event consumers cut mid-processing.
**Risk:** Connection pool exhaustion, data corruption during deployments.
**Location:** `src/backend/src/index.ts`

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 2.1 | Add SIGTERM + SIGINT handlers to `index.ts` | Process listens for both signals |
| 2.2 | Stop accepting new HTTP requests (server.close()) | No new connections after signal |
| 2.3 | Drain in-flight requests (configurable timeout, default 10s) | Existing requests complete or timeout |
| 2.4 | Flush event bus (complete current consumer processing) | No half-processed events |
| 2.5 | Close database pool (`closePool()` already exists) | Pool connections released |
| 2.6 | Log shutdown sequence with timestamps | Audit trail of clean shutdown |

**Dependencies:** None
**Blocked By:** Nothing
**Blocks:** GAP-05 (zero-downtime deployment requires graceful shutdown)

---

### GAP-03: Sidebase Live Event Integration

**Priority:** CRITICAL
**Current State:** Event ingestion endpoint exists (`POST /api/events`) and routes events to the bus. However, the comment says "mock Sidebase emitter" and the `MockEventEmitter` in `emitter.ts` generates synthetic data only. No live webhook receiver or Sidebase SDK integration.
**Risk:** System cannot operate on real marketplace data without this.
**Location:** `src/backend/src/api/routes/events.ts`, `src/backend/src/events/emitter.ts`

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 3.1 | Define webhook contract with Sidebase team (event types, payload format, auth) | Documented webhook spec (JSON schema + HMAC verification) |
| 3.2 | Create `POST /api/webhooks/sidebase` route with HMAC signature verification | Separate from admin-facing `/api/events`; uses Sidebase-specific HMAC secret |
| 3.3 | Add payload transformer: Sidebase event format → CIS DomainEvent format | Mapping layer handles field name differences, missing fields |
| 3.4 | Add event type allowlist (only process MESSAGE_CREATED, MESSAGE_EDITED, TRANSACTION_*) | Unknown event types logged and dropped, not processed |
| 3.5 | Add integration test with sample Sidebase payloads | End-to-end: webhook → transform → bus → detection → signal |
| 3.6 | Add `/api/webhooks/sidebase/health` for Sidebase to verify connectivity | Returns 200 OK with CIS version |

**Dependencies:** GAP-01 (durable bus recommended before live traffic)
**Blocked By:** External: Sidebase webhook API availability
**Blocks:** GAP-09 (shadow mode testing requires live events)

---

### GAP-04: Global API Rate Limiting

**Priority:** HIGH
**Current State:** Rate limiting only on `/auth/login` (10 attempts/IP/15min). All other endpoints unprotected.
**Risk:** Brute force on data endpoints, resource exhaustion, abuse of AI endpoints.
**Location:** `src/backend/src/index.ts` (missing), `src/backend/src/api/routes/auth.ts` (login only)

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 4.1 | Add `express-rate-limit` as dependency (already patterns in auth.ts) | Package installed |
| 4.2 | Add global rate limiter: 100 req/min per IP for authenticated routes | Applied to all `/api/*` except `/api/health` |
| 4.3 | Add stricter limiter for AI endpoints: 10 req/min per user | Applied to `/api/ai/*` |
| 4.4 | Add stricter limiter for write endpoints: 30 req/min per user | Applied to POST/PATCH/DELETE routes |
| 4.5 | Return proper 429 responses with `Retry-After` header | Standard HTTP rate limit response |
| 4.6 | Add rate limit config to `config.ts` (env var overridable) | `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` |

**Dependencies:** None
**Blocked By:** Nothing
**Blocks:** Nothing (but required before production)

---

### GAP-05: Infrastructure & Deployment Automation

**Priority:** HIGH
**Current State:** Hostinger VPS plan documented (`qwick_services_cis_hostinger_secure_infrastructure_setup_plan.md`) but no CI/CD scripts, no Dockerfile, no PM2 ecosystem file, no Nginx config, no backup scripts.
**Risk:** Manual deployment prone to human error; no rollback path; no automated recovery.

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 5.1 | Create `Dockerfile` for backend (Node 20 LTS, multi-stage build) | `docker build` produces <200MB image |
| 5.2 | Create `docker-compose.yml` (backend + PostgreSQL + Redis) | `docker compose up` starts full local stack |
| 5.3 | Create PM2 ecosystem file (`ecosystem.config.js`) | Cluster mode, log rotation, restart policy |
| 5.4 | Create Nginx reverse proxy config (HTTPS termination, rate limiting) | SSL via Certbot, proxy_pass to localhost:3001 |
| 5.5 | Create GitHub Actions CI pipeline (lint → test → build) | Runs on push to main and PRs |
| 5.6 | Create deployment script (`scripts/deploy.sh`) with rollback | SSH to VPS, pull, migrate, restart, health check, rollback on failure |
| 5.7 | Create database backup script (`scripts/backup-db.sh`) | Daily pg_dump to `/backups/` with 30-day retention |
| 5.8 | Create `.env.production.example` with all required vars | Documents every env var for production |

**Dependencies:** GAP-02 (graceful shutdown for zero-downtime deploys)
**Blocked By:** Nothing
**Blocks:** GAP-09 (shadow mode deployment requires infrastructure)

---

## Phase 2 — Test Coverage (Quality Gate)

These gaps don't block functionality but block confidence in correctness. Required before shadow mode.

---

### GAP-06: API Endpoint Integration Tests

**Priority:** HIGH
**Current State:** 23 route files with 50+ endpoints, zero integration test coverage. Only 6 unit tests (detection, scoring, enforcement) + 1 auth integration test.
**Risk:** Regressions undetected on endpoint behavior, validation, error handling.
**Location:** `src/backend/tests/` (missing `integration/` directory for routes)

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 6.1 | Create test database setup/teardown helpers (create test DB, run migrations, seed, cleanup) | Isolated test DB per suite run |
| 6.2 | Write integration tests for auth routes (login, token refresh, lockout) | 5+ tests |
| 6.3 | Write integration tests for user CRUD routes | 6+ tests (list, get, create, update, filter, status change event) |
| 6.4 | Write integration tests for message + transaction routes | 4+ tests (create, list, event emission verification) |
| 6.5 | Write integration tests for risk-signals + risk-scores routes | 4+ tests (query by user, filter by tier/type) |
| 6.6 | Write integration tests for enforcement routes (list, reverse) | 4+ tests including reversal workflow |
| 6.7 | Write integration tests for alerts + cases + appeals routes | 6+ tests covering status transitions |
| 6.8 | Write integration tests for admin user + roles routes | 5+ tests (CRUD, permission overrides) |
| 6.9 | Add test coverage reporting to CI pipeline | Minimum 60% line coverage gate |

**Dependencies:** GAP-05.5 (CI pipeline for automated runs)
**Blocked By:** Nothing
**Blocks:** GAP-09 (shadow mode requires confidence in endpoint correctness)

---

### GAP-07: Event Bus & Infrastructure Tests

**Priority:** MEDIUM
**Current State:** Zero test coverage on event bus (emit, consumer registration, deduplication, dead letter queue, retry logic).
**Risk:** Idempotency violations, event loss, consumer failure cascading.
**Location:** `src/backend/tests/` (missing `unit/event-bus.test.ts`)

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 7.1 | Write unit tests for EventBus.emit() (happy path, dedup, DB persistence) | 4+ tests |
| 7.2 | Write unit tests for consumer registration and dispatch | 3+ tests (single type, wildcard, multiple consumers) |
| 7.3 | Write unit tests for dead letter queue (failure → DLQ, max retries, retry) | 4+ tests |
| 7.4 | Write unit tests for idempotency (same event ID rejected) | 2+ tests (in-memory cache, DB fallback) |
| 7.5 | Write integration test: event → detection → scoring → enforcement pipeline | 1 end-to-end test with assertions at each stage |

**Dependencies:** None
**Blocked By:** Nothing
**Blocks:** Nothing directly (but increases confidence for GAP-01)

---

### GAP-08: Dashboard E2E Tests

**Priority:** MEDIUM
**Current State:** Playwright configured, 6 test suites defined but ~80% stubbed with `// Requires running backend...`. Only login page visibility tests work.
**Risk:** UI regressions, broken workflows, RBAC bypass undetected.
**Location:** `src/dashboard/tests/e2e/dashboard.spec.ts`

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 8.1 | Create E2E test fixtures (seed admin users with known credentials, seed alerts/cases) | Reproducible test state |
| 8.2 | Write E2E test: full login → dashboard → module navigation | Login works, all modules render |
| 8.3 | Write E2E test: alert triage workflow (view → claim → resolve) | Alert status transitions correctly |
| 8.4 | Write E2E test: case investigation (view → add note → close) | Case lifecycle complete |
| 8.5 | Write E2E test: enforcement reversal workflow | Reversal with justification succeeds |
| 8.6 | Write E2E test: appeal resolution workflow | Appeal reviewed and resolved |
| 8.7 | Write E2E test: RBAC enforcement (ops role cannot access enforcement) | Permission-denied modules hidden |
| 8.8 | Write E2E test: settings module (create sub-admin, assign role) | Admin CRUD works end-to-end |
| 8.9 | Add Playwright to CI pipeline (run against docker-compose stack) | E2E runs on every PR |

**Dependencies:** GAP-05.2 (docker-compose for test backend), GAP-06.1 (test DB helpers)
**Blocked By:** Nothing
**Blocks:** Nothing directly

---

## Phase 3 — Shadow Mode Validation

These gaps must be resolved to run CIS in shadow mode against live traffic.

---

### GAP-09: Shadow Mode Live Deployment

**Priority:** HIGH
**Current State:** Shadow mode flag exists (`SHADOW_MODE=true` in config, checked in `enforcement/actions.ts`), and shadow-mode actions are logged with `metadata.shadow_mode=true`. However: no live event source (GAP-03), no deployment infrastructure (GAP-05), and no shadow-mode monitoring dashboard or metrics collection.
**Risk:** Cannot validate system behavior against real traffic patterns before enabling enforcement.
**Location:** `src/backend/src/enforcement/actions.ts`, `src/backend/src/api/routes/shadow.ts`

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 9.1 | Deploy backend to Hostinger VPS in shadow mode (SHADOW_MODE=true, ENFORCEMENT_KILL_SWITCH=false) | System running, health check green |
| 9.2 | Connect Sidebase webhook to CIS (GAP-03 completed) | Live events flowing into CIS pipeline |
| 9.3 | Create shadow-mode monitoring dashboard tab | Shows: events processed/hr, signals generated, would-have-enforced actions, false positive candidates |
| 9.4 | Run shadow mode for minimum 7 days | Collect baseline metrics |
| 9.5 | Analyze shadow results: false positive rate, signal distribution, tier accuracy | Written analysis report |
| 9.6 | Calibrate thresholds based on shadow data (confidence thresholds, tier boundaries) | Updated constants in scoring/tiers.ts if needed |
| 9.7 | Human review of top-50 would-have-enforced cases | Manual validation of enforcement decisions |

**Dependencies:** GAP-01, GAP-03, GAP-05
**Blocked By:** All Phase 1 gaps
**Blocks:** GAP-13 (active enforcement requires validated shadow run)

---

### GAP-10: Structured Logging

**Priority:** MEDIUM
**Current State:** All logging via `console.log/console.error`. No structured format, no log levels, no correlation IDs in logs, no log aggregation readiness.
**Risk:** Cannot effectively debug production issues; logs not parseable by monitoring tools.
**Location:** Throughout `src/backend/src/`

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 10.1 | Add `pino` logger dependency | Package installed |
| 10.2 | Create `src/backend/src/shared/logger.ts` with structured JSON output | Logger exports with child logger support |
| 10.3 | Add correlation_id to all log entries (from event or request) | Every log line includes correlation_id |
| 10.4 | Replace all console.log/error with logger.info/error across codebase | No remaining console.log in production paths |
| 10.5 | Add request logging middleware (method, path, status, duration) | Every HTTP request logged with timing |
| 10.6 | Configure log rotation in PM2 ecosystem file | Max 50MB per file, 14-day retention |

**Dependencies:** GAP-05.3 (PM2 for log rotation)
**Blocked By:** Nothing
**Blocks:** Nothing directly (but critical for shadow mode debugging)

---

## Phase 4 — Feature Completeness

These gaps represent missing features from the documented architecture that aren't strictly blocking but are required for the full system vision.

---

### GAP-11: Network Scoring Layer (Device Cluster + Pattern Matching)

**Priority:** MEDIUM
**Current State:** Network corroboration scoring (Layer 3, 30% weight) has two stubbed inputs:
- `similarPatternUsers: 0` — "Stub — requires pattern matching infrastructure"
- `inDeviceCluster: false` — "Stub — requires device tracking"
**Risk:** Network layer scoring is incomplete (only flaggedCounterparties and sharedPaymentEndpoints work). Sybil attacks and device-sharing rings undetected.
**Location:** `src/backend/src/scoring/aggregator.ts:168-174`

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 11.1 | Add device fingerprint fields to user sessions (IP, user-agent hash, device ID if available) | New table `user_sessions` with device metadata |
| 11.2 | Implement device cluster detection (users sharing IP ranges or device fingerprints) | Query identifies clusters of 2+ users on same device/IP |
| 11.3 | Implement similar pattern detection (users with matching signal type distributions) | Cosine similarity or Jaccard index on signal vectors |
| 11.4 | Replace stubs in `aggregator.ts` with real queries | `similarPatternUsers` and `inDeviceCluster` return real data |
| 11.5 | Add unit tests for cluster and pattern detection | 4+ tests covering edge cases |
| 11.6 | Validate scoring accuracy with synthetic Sybil scenarios | Sybil ring correctly escalates to HIGH/CRITICAL |

**Dependencies:** None
**Blocked By:** Nothing
**Blocks:** Nothing (system functions without this, but at reduced accuracy)

---

### GAP-12: NLP/Contextual Detection Enhancement

**Priority:** LOW-MEDIUM
**Current State:** Detection uses deterministic methods (regex + keyword dictionaries + windowed context). The architecture documents describe NLP classifiers and LLM-assisted intent detection. OpenAI service exists but is only used for admin-facing summaries, not inline detection.
**Known Blind Spots (from simulation report):**
- Very subtle grooming language without explicit follow-up
- Images containing contact info (no OCR)
- Cultural slang not in keyword lists
**Location:** `src/backend/src/detection/`, `src/backend/src/services/openai.ts`

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 12.1 | Define NLP classification scope (which messages warrant LLM analysis) | Decision tree: deterministic pass first, NLP only on ambiguous signals (confidence 0.3-0.7) |
| 12.2 | Create `src/backend/src/detection/nlp.ts` — LLM-assisted intent classifier | Calls OpenAI with redacted content, returns intent classification + confidence |
| 12.3 | Integrate NLP into detection pipeline as optional step between keyword and signal generation | Feature-flagged: `NLP_DETECTION_ENABLED=true` |
| 12.4 | Add Cameroon/diaspora cultural slang to keyword dictionaries | 20+ regional terms from operational team input |
| 12.5 | Add unit tests for NLP detection (mocked API, confidence thresholds) | 4+ tests |
| 12.6 | Benchmark: NLP latency impact on detection pipeline | <2s p95 latency acceptable |

**Dependencies:** GAP-09 (shadow data reveals which messages need NLP)
**Blocked By:** Shadow mode analysis results
**Blocks:** Nothing

---

### GAP-13: Active Enforcement Activation

**Priority:** HIGH (but sequentially last)
**Current State:** Full enforcement pipeline implemented and tested. Shadow mode and kill switch both functional. But system has never run with `SHADOW_MODE=false` against live traffic.
**Risk:** Incorrect enforcement on real users without validated thresholds.

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 13.1 | Complete shadow mode run with satisfactory results (GAP-09) | False positive rate <5%, human reviewers approve top-50 cases |
| 13.2 | Create activation checklist (all Phase 1-3 gaps resolved) | Documented go/no-go criteria |
| 13.3 | Enable active enforcement for LOW tier only (SHADOW_MODE=false, soft warnings only) | Soft warnings sent to real users |
| 13.4 | Monitor for 7 days: appeal rate, false positive feedback | <3% appeal rate on soft warnings |
| 13.5 | Expand to MEDIUM tier (hard warnings + temporary restrictions) | Graduated rollout |
| 13.6 | Expand to HIGH/CRITICAL tier (admin escalation + suspension) | Full enforcement active |
| 13.7 | Remove shadow mode default (SHADOW_MODE=false in production) | Full system operational |

**Dependencies:** GAP-09 (shadow mode validation)
**Blocked By:** All Phase 1-3 gaps
**Blocks:** Nothing (this is the end goal)

---

## Phase 5 — Operational Excellence

These gaps are nice-to-haves that improve operational maturity but don't block core functionality.

---

### GAP-14: Dashboard Accessibility (a11y)

**Priority:** LOW-MEDIUM
**Current State:** No ARIA labels on interactive elements, tables not fully keyboard-accessible, no screen reader testing.
**Risk:** Non-compliance with WCAG 2.1; limits admin usability.

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 14.1 | Add `aria-label` to all buttons, inputs, and interactive elements | Axe audit passes with 0 critical violations |
| 14.2 | Add keyboard navigation to data tables (tab, enter, arrow keys) | All table actions reachable via keyboard |
| 14.3 | Add focus management on modal open/close | Focus trapped in modals, restored on close |
| 14.4 | Add color contrast verification (WCAG AA minimum) | All text passes 4.5:1 contrast ratio |

**Dependencies:** None
**Blocked By:** Nothing
**Blocks:** Nothing

---

### GAP-15: Data Export & Reporting

**Priority:** LOW
**Current State:** No CSV/PDF export from dashboard. No scheduled reports. Architecture docs mention exportable case files for regulators.
**Risk:** Manual data extraction for compliance requests.

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 15.1 | Add `GET /api/export/cases/:id` returning JSON case file | Full case with signals, scores, actions, notes |
| 15.2 | Add CSV export for audit logs, enforcement actions, alerts | Download button in dashboard modules |
| 15.3 | Add PDF case report generation (for legal/compliance) | Formatted PDF with evidence timeline |

**Dependencies:** None
**Blocked By:** Nothing
**Blocks:** Nothing

---

### GAP-16: Request Caching & Performance

**Priority:** LOW
**Current State:** Every filter change in dashboard triggers full API reload. No request deduplication or caching. Dashboard auto-refreshes every 60s per module.
**Risk:** Unnecessary load on backend; sluggish dashboard UX at scale.

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 16.1 | Add React Query (TanStack Query) to dashboard | Dependency installed, QueryClientProvider in layout |
| 16.2 | Wrap all `api.*` calls in useQuery hooks with staleTime | Cached responses, automatic background refetch |
| 16.3 | Add server-side ETag or Last-Modified headers on list endpoints | 304 responses for unchanged data |
| 16.4 | Add pagination/infinite scroll to AlertsInbox and AuditLogsModule | Load 20 items at a time, scroll to load more |

**Dependencies:** None
**Blocked By:** Nothing
**Blocks:** Nothing

---

### GAP-17: Error Telemetry & Monitoring

**Priority:** LOW-MEDIUM
**Current State:** No error telemetry (Sentry, Datadog, etc.). No uptime monitoring. ErrorBoundary catches React errors but only logs to console.
**Risk:** Production errors go unnoticed; no alerting on system degradation.

**Remediation:**

| Step | Action | Acceptance Criteria |
|------|--------|---------------------|
| 17.1 | Add Sentry SDK to backend (Node) and dashboard (React) | Error capture on both tiers |
| 17.2 | Configure source maps upload for dashboard builds | Stack traces map to source files |
| 17.3 | Add uptime monitor on `/api/health` (UptimeRobot or similar) | Alert on >1min downtime |
| 17.4 | Add performance monitoring (p50/p95/p99 response times) | Baseline established, alerts on degradation |

**Dependencies:** GAP-05 (production deployment exists)
**Blocked By:** Nothing
**Blocks:** Nothing

---

## Execution Order & Dependency Graph

```
Phase 1 — Production Hardening
  GAP-01 Durable Event Queue ──────────┐
  GAP-02 Graceful Shutdown ────────────┤
  GAP-04 Global Rate Limiting          │
  GAP-05 Infrastructure & Deployment ──┤
                                       │
Phase 2 — Test Coverage                │
  GAP-06 API Integration Tests         │
  GAP-07 Event Bus Tests               │
  GAP-08 Dashboard E2E Tests           │
                                       │
Phase 3 — Shadow Mode                  │
  GAP-03 Sidebase Integration ─────────┤
  GAP-09 Shadow Mode Deployment ◄──────┘
  GAP-10 Structured Logging
                                       │
Phase 4 — Feature Completeness         │
  GAP-11 Network Scoring (stubs)       │
  GAP-12 NLP Detection ◄──── (shadow data informs this)
  GAP-13 Active Enforcement ◄──────────┘
                                       │
Phase 5 — Operational Excellence       │
  GAP-14 Accessibility                 │
  GAP-15 Data Export                   │
  GAP-16 Caching & Performance         │
  GAP-17 Error Telemetry               │
```

---

## Sprint-Level Execution Plan

### Sprint 1 (Week 1-2): Foundation Hardening

| Day | Task | Gap |
|-----|------|-----|
| 1-2 | Durable event bus (Redis-backed) | GAP-01 |
| 3 | Graceful shutdown handlers | GAP-02 |
| 3-4 | Global rate limiting (express-rate-limit) | GAP-04 |
| 5-6 | Dockerfile + docker-compose | GAP-05.1-05.2 |
| 7-8 | PM2 ecosystem + Nginx config | GAP-05.3-05.4 |
| 9-10 | CI pipeline (GitHub Actions) + deploy script | GAP-05.5-05.6 |

**Exit Criteria:** `docker compose up` runs full stack; CI pipeline green; graceful shutdown tested.

### Sprint 2 (Week 3-4): Test Coverage

| Day | Task | Gap |
|-----|------|-----|
| 1-2 | Test DB setup/teardown helpers | GAP-06.1 |
| 3-5 | API endpoint integration tests (auth, users, messages, transactions) | GAP-06.2-06.4 |
| 6-7 | API endpoint integration tests (signals, scores, enforcement, alerts, cases, appeals) | GAP-06.5-06.8 |
| 8 | Event bus unit tests | GAP-07 |
| 9-10 | Dashboard E2E tests (login, alert triage, case investigation) | GAP-08.1-08.4 |

**Exit Criteria:** >60% backend line coverage; 6+ E2E scenarios passing; CI gate enforced.

### Sprint 3 (Week 5-6): Integration & Shadow Prep

| Day | Task | Gap |
|-----|------|-----|
| 1-2 | Sidebase webhook integration (route + transformer + HMAC) | GAP-03 |
| 3-4 | Structured logging (pino + request logger + correlation IDs) | GAP-10 |
| 5 | Deploy to Hostinger VPS (shadow mode) | GAP-09.1 |
| 6 | Connect Sidebase webhook | GAP-09.2 |
| 7-10 | Shadow monitoring dashboard + begin 7-day observation | GAP-09.3-09.4 |

**Exit Criteria:** Live events flowing; shadow mode running; monitoring visible.

### Sprint 4 (Week 7-8): Shadow Analysis & Feature Gaps

| Day | Task | Gap |
|-----|------|-----|
| 1-2 | Analyze shadow mode results (false positives, tier accuracy) | GAP-09.5-09.6 |
| 3-4 | Human review of top-50 would-have-enforced cases | GAP-09.7 |
| 5-6 | Network scoring stubs (device cluster + pattern detection) | GAP-11 |
| 7-8 | Threshold calibration based on shadow data | GAP-09.6 |
| 9-10 | Go/no-go decision for active enforcement | GAP-13.1-13.2 |

**Exit Criteria:** Shadow analysis report complete; thresholds calibrated; go/no-go decided.

### Sprint 5 (Week 9-10): Active Enforcement Rollout

| Day | Task | Gap |
|-----|------|-----|
| 1-2 | Enable LOW tier enforcement (soft warnings only) | GAP-13.3 |
| 3-7 | Monitor LOW tier for 5 days (appeal rate, feedback) | GAP-13.4 |
| 8-9 | Expand to MEDIUM tier (if LOW tier metrics acceptable) | GAP-13.5 |
| 10 | Plan HIGH/CRITICAL tier rollout timeline | GAP-13.6 |

**Exit Criteria:** Active enforcement running on LOW+MEDIUM tiers; <3% appeal rate.

### Sprint 6+ (Ongoing): Polish & Operational Excellence

| Task | Gap | Priority |
|------|-----|----------|
| NLP detection enhancement | GAP-12 | When shadow data reveals blind spots |
| Dashboard accessibility | GAP-14 | Before external compliance audit |
| Data export & reporting | GAP-15 | When legal/compliance requests arise |
| Request caching (React Query) | GAP-16 | When dashboard performance degrades |
| Error telemetry (Sentry) | GAP-17 | Before HIGH/CRITICAL enforcement enabled |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Sidebase webhook API not ready | Medium | Critical (blocks shadow mode) | Extend mock emitter with production-like payloads; negotiate timeline |
| False positive rate too high in shadow mode | Medium | High (delays enforcement activation) | Conservative thresholds; expand benign allowlists; add NLP pass |
| Redis unavailability on Hostinger VPS | Low | High (event bus degradation) | Fallback to in-memory bus; add Redis health check to /api/health |
| Database migration failure in production | Low | Critical (data loss) | Transactional migrations; backup before deploy; rollback script |
| OpenAI API cost overrun from NLP detection | Medium | Medium (budget impact) | Feature-flag NLP; use only on ambiguous signals; set monthly budget cap |

---

## Success Metrics

| Milestone | Metric | Target |
|-----------|--------|--------|
| Phase 1 Complete | Infrastructure operational | All health checks green, CI pipeline passing |
| Phase 2 Complete | Test coverage | >60% backend, 6+ E2E scenarios |
| Phase 3 Complete | Shadow mode running | 7+ days of live data processed |
| Phase 4 Complete | Active enforcement | LOW+MEDIUM tiers active, <3% appeal rate |
| Phase 5 Complete | Production maturity | Error telemetry, a11y compliance, export capability |

---

## Final Notes

- **No gap blocks another unless explicitly marked.** Phases can overlap where dependencies allow.
- **Phase 1 is the critical path.** Without durable events + infrastructure, nothing else matters.
- **Shadow mode is the quality gate.** Never skip straight to active enforcement.
- **Every gap has acceptance criteria.** A gap is not "done" until criteria are met and verified.
- **This roadmap is a living document.** Update gap status as work progresses.
