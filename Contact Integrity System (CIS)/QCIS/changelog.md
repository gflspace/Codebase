# QwickServices CIS — Changelog

**Maintained By:** Historian Agent
**Rule:** Append-only. Entries are immutable once written.

---

## 2026-02-08 — Factory Bootstrap

**Phase:** PLAN → SETUP transition
**Agent:** Master Claude

### Changes

- **Initialized factory infrastructure** per `master_claude.md` §1
  - Created `architecture.md` — synthesized from all 15 design/specification documents
  - Created `changelog.md` — this file (append-only history)
  - Created `project_status.md` — current phase, inventory, next steps
  - Created `plugins_mcp.md` — credential placeholders (dummy values per §10 Prime Directive)
  - Created `reference_docs/` with four reference files:
    - `how_payments_work.md`
    - `how_detection_works.md`
    - `how_enforcement_works.md`
    - `how_appeals_work.md`
  - Created `worktrees/` directory structure:
    - `worktrees/builder/`
    - `worktrees/tester/`
    - `worktrees/historian/`
    - `worktrees/optimizer/`

### Inventory at Bootstrap

**PLAN phase documents (6/6):** Complete
**SETUP phase documents (4/4):** Complete
**BUILD phase documents (4/4):** Complete (deployment feedback plan added by user)
**Living documents (5/5):** Complete (created during bootstrap)
**Reference docs (4/4):** Complete
**Worktree structure:** Created

### Notes

- All existing design documents validated and cross-referenced
- `architecture.md` represents the canonical system-wide synthesis
- Factory is now operationally ready for autonomous execution

---

## 2026-02-09 — Hostinger VPS SSH Verified & Credentials Registered

**Phase:** SETUP → BUILD (infrastructure provisioning)
**Agent:** Master Claude

### Changes

- **SSH connectivity to Hostinger VPS verified**
  - VPS ID `1233672`, hostname `srv1233672.hstgr.cloud`, IP `72.60.68.137`
  - Ubuntu 24.04.3 LTS, kernel 6.8.0-90-generic
  - KVM 2 plan: 2 vCPU, 8 GB RAM, 100 GB disk
  - SSH key-based auth confirmed (ed25519, no passphrase)
  - Public key `qcis-deploy-key` (ID 420547) registered via Hostinger API and attached to VPS

- **PostgreSQL 15 discovered pre-installed on VPS**
  - PostgreSQL 15.15 (Ubuntu 15.15-1.pgdg24.04+1)
  - Cluster `15/main` running on port 5432, status: online
  - Exceeds project minimum requirement of PostgreSQL 14+

- **`plugins_mcp.md` updated** — Hostinger VPS section upgraded from placeholders to verified values
  - All infrastructure fields now show `Verified` status
  - SSH connection command documented for quick reference
  - PostgreSQL section updated with discovered version and cluster info
  - Database and role creation marked as pending

- **`project_status.md` updated** — Blocker "Hostinger VPS not yet provisioned" resolved

### Verification Evidence

| Check | Result |
|---|---|
| Ping 72.60.68.137 | 3/3 packets, 43ms avg |
| SSH port 22 | Open |
| SSH key auth | Passwordless login confirmed |
| PostgreSQL service | active (online) |
| OS version | Ubuntu 24.04.3 LTS |

### Notes

- The `server_config` key (unencrypted ed25519) is the primary SSH key for VPS access
- The `server_config_file` key (encrypted, passphrase-protected) exists as a backup
- Hostinger API token stored in `claude_Hostinger_MCP.json` (parent directory) — not committed to repo
- PostgreSQL database `qwick_cis` and role `qwick_cis_app` not yet created — next step

---

## 2026-02-09 — PostgreSQL Provisioned, Migrations Applied, E2E Pipeline Verified

**Phase:** BUILD (infrastructure complete)
**Agent:** Master Claude

### Changes

- **PostgreSQL database and role created on VPS**
  - Database `qwick_cis` created, owner: `qwick_cis_app`
  - User `qwick_cis_app` created with `DUMMY_STRONG_PASSWORD`
  - Schema permissions granted: ALL on public schema (tables, sequences, functions)

- **Remote access configured**
  - `postgresql.conf`: `listen_addresses = '*'`
  - `pg_hba.conf`: `hostssl` and `host` rules for `qwick_cis_app` from `0.0.0.0/0` (scram-sha-256)
  - SSL already enabled (`ssl = on`)
  - Config backups created: `postgresql.conf.bak.20260209`, `pg_hba.conf.bak.20260209`

- **UFW firewall configured and enabled**
  - Rules: OpenSSH (22), PostgreSQL (5432/tcp), HTTP (80/tcp), HTTPS (443/tcp)
  - Verified SSH still works after UFW activation

- **Local connectivity verified**
  - Node.js `pg` module connects from Windows to VPS over SSL
  - Port 5432 reachable, query returns PostgreSQL 15.15 version string

- **Bug fix: `config.ts` dotenv path**
  - Changed `path.resolve(__dirname, '../../.env')` to `path.resolve(__dirname, '../.env')`
  - Was resolving to `src/.env` instead of `src/backend/.env`

- **`.env` created** at `src/backend/.env` pointing at VPS
  - DB_HOST=72.60.68.137, DB_SSL=true
  - All other config values from `.env.example`

- **All 9 migrations applied successfully**
  - 001_users, 002_messages, 003_transactions, 004_risk_signals, 005_risk_scores
  - 006_enforcement_actions, 007_audit_logs, 008_alerts_cases, 009_appeals
  - 14 tables created, all owned by `qwick_cis_app`

- **Backend started and E2E pipeline verified**
  - Server starts on port 3001, database connected
  - Health check returns 200 with `{"status":"healthy","database":"connected"}`
  - 3 event consumers registered: detection, scoring, enforcement
  - Full pipeline test: event → 8 signals → score 34.80 (tier: low) → soft_warning enforcement → audit trail

- **Living documents updated**
  - `plugins_mcp.md`: PostgreSQL section upgraded to verified, firewall rules, connection commands
  - `project_status.md`: Infrastructure status table, blockers resolved, next steps updated
  - `changelog.md`: This entry

### E2E Pipeline Verification

| Stage | Table | Rows | Sample Data |
|---|---|---|---|
| Users | `users` | 2 | Test Sender, Test Receiver |
| Detection | `risk_signals` | 8 | CONTACT_PHONE (0.745), CONTACT_EMAIL (0.545), OFF_PLATFORM_INTENT (0.745) |
| Scoring | `risk_scores` | 1 | Score 34.80, tier `low`, behavioral factor 72 |
| Enforcement | `enforcement_actions` | 1 | `soft_warning`, reason: `LOW_RISK_FIRST_OFFENSE`, automated |
| Audit | `audit_logs` | 2 | Full event trail with correlation IDs |
| Events | `processed_events` | 2 | message.created events tracked |

### Files Modified

| File | Change |
|---|---|
| `src/backend/.env` | Created — VPS connection config |
| `src/backend/src/config.ts` | Fixed dotenv path: `../../.env` → `../.env` |
| `plugins_mcp.md` | PostgreSQL + firewall details |
| `changelog.md` | This entry |
| `project_status.md` | Phase, infra status, blockers, lessons |

---

## 2026-02-09 — Backend Deployed to Hostinger VPS

**Phase:** BUILD (production deployment)
**Agent:** Master Claude

### Changes

- **Node.js 20.20.0 installed on VPS** via NodeSource (npm 10.8.2)
- **PM2 6.0.14 installed** — process manager with systemd auto-start
- **Nginx 1.24.0 installed** — reverse proxy on port 80 → backend port 3001
- **Repository cloned** to `/opt/qcis-repo`, symlinked to `/opt/qcis-backend`
- **TypeScript compiled** — `dist/index.js` + 9 SQL migration files copied
- **Two build fixes applied:**
  - `auth.ts`: `expiresIn` type assertion for `@types/jsonwebtoken` StringValue compatibility
  - `signals.ts`: Nullish coalescing for possibly undefined `messageCount`
- **Production `.env` created** at `/opt/qcis-backend/.env` (chmod 600)
  - `NODE_ENV=production`, `DB_HOST=localhost`, `DB_SSL=false`
  - JWT and HMAC secrets generated via `openssl rand -hex 32`
  - `SHADOW_MODE=true` (enforcement disabled)
- **Migration verification** — all 9 migrations skipped (already applied), confirms DB connectivity
- **PM2 process started** — `qcis-backend` online, cluster mode, ~64MB RAM
- **PM2 auto-start configured** — `pm2 startup systemd` + `pm2 save`
- **Nginx reverse proxy configured** at `/etc/nginx/sites-available/qcis`
  - `/api/*` → proxy to `127.0.0.1:3001`
  - `/` → JSON status response (no frontend yet)

### Verification Evidence

| Check | Result |
|---|---|
| `node --version` | v20.20.0 |
| `pm2 status` | qcis-backend online, 0 restarts |
| `curl http://72.60.68.137/api/health` | 200 `{"status":"healthy","database":"connected"}` |
| `curl http://72.60.68.137/api/users` | 401 `{"error":"Missing or invalid authorization header"}` |
| PM2 startup | systemd service `pm2-root` enabled |
| PM2 logs | No errors, all 3 event consumers registered |

### Files Modified

| File | Change |
|---|---|
| `src/backend/src/api/middleware/auth.ts` | Type fix: `expiresIn` cast to `jwt.SignOptions["expiresIn"]` |
| `src/backend/src/detection/signals.ts` | Null fix: `(context?.conversationPattern.messageCount ?? 0) > 10` |
| `plugins_mcp.md` | Added Application Deployment section |
| `changelog.md` | This entry |
| `project_status.md` | Deployment status, next steps updated |

---

## 2026-02-09 — SSL Enabled via Let's Encrypt for cis.qwickservices.com

**Phase:** BUILD (HTTPS deployment)
**Agent:** Master Claude

### Changes

- **DNS A record created** at GoDaddy for `cis.qwickservices.com` → `72.60.68.137` (TTL 600)
- **Nginx `server_name` updated** — added `cis.qwickservices.com` alongside IP
- **Certbot 2.9.0 installed** with `python3-certbot-nginx` plugin
- **SSL certificate obtained** from Let's Encrypt for `cis.qwickservices.com`
  - Certificate: `/etc/letsencrypt/live/cis.qwickservices.com/fullchain.pem`
  - Private key: `/etc/letsencrypt/live/cis.qwickservices.com/privkey.pem`
  - Expires: 2026-05-10 (auto-renewal enabled via systemd timer)
- **Nginx auto-configured by Certbot:**
  - Port 443 with SSL termination
  - Port 80 HTTP→HTTPS 301 redirect
- **Auto-renewal verified** — `certbot renew --dry-run` passed
- **`.env` updated** on VPS:
  - `DASHBOARD_URL=https://cis.qwickservices.com`
  - `API_BASE_URL=https://cis.qwickservices.com`
- **PM2 restarted** with `--update-env` to pick up new environment variables

### Verification Evidence

| Check | Result |
|---|---|
| `nslookup cis.qwickservices.com` | `72.60.68.137` |
| `curl https://cis.qwickservices.com/api/health` | 200 `{"status":"healthy","database":"connected"}` |
| `curl -I http://cis.qwickservices.com/api/health` | 301 → `https://cis.qwickservices.com/api/health` |
| `certbot renew --dry-run` | All simulated renewals succeeded |

### Files Modified

| File | Change |
|---|---|
| `/etc/nginx/sites-available/qcis` | `server_name` + Certbot SSL config (443 + redirect) |
| `/opt/qcis-backend/.env` | `DASHBOARD_URL` and `API_BASE_URL` → HTTPS |
| `plugins_mcp.md` | SSL section, domain, URLs updated |
| `changelog.md` | This entry |
| `project_status.md` | Infrastructure table, next steps |

---

## 2026-02-09 — Root Route Fix: Proxy All Traffic Through Backend

**Phase:** BUILD (routing fix)
**Agent:** Master Claude

### Changes

- **Nginx `location /` updated** — replaced static JSON placeholder with proxy to backend
  - Previously returned hardcoded `{"service":"QwickServices CIS","status":"running","api":"/api/health"}`
  - Now proxies to `127.0.0.1:3001` like `/api/` routes, letting the backend handle all requests
- **Backend root route added** (`GET /`) in `index.ts`
  - Returns service info: name, version, status, and endpoint links
- **All 94 tests passing** — no regressions

### Verification Evidence

| Check | Result |
|---|---|
| `curl https://cis.qwickservices.com/` | 200 `{"service":"QwickServices Contact Integrity System","version":"0.1.0","status":"running","endpoints":{...}}` |
| `curl https://cis.qwickservices.com/api/health` | 200 `{"status":"healthy","database":"connected"}` |
| Unit tests | 94/94 passing |

### Files Modified

| File | Change |
|---|---|
| `src/backend/src/index.ts` | Added `GET /` root route with service info |
| `/etc/nginx/sites-available/qcis` | `location /` now proxies to backend instead of static response |
| `changelog.md` | This entry |

---

## 2026-02-09 — Production E2E Test: Full Pipeline Verified over HTTPS

**Phase:** BUILD (production validation)
**Agent:** Master Claude

### Changes

- **Admin user created** in `admin_users` table
  - Email: `admin@qwickservices.com`, role: `trust_safety`
  - Password hashed via SHA256
- **Full E2E pipeline tested** over `https://cis.qwickservices.com` with live data

### E2E Test Flow & Results

| Step | Endpoint | Result |
|---|---|---|
| Health Check | `GET /api/health` | 200 — healthy, DB connected |
| Auth Login | `POST /api/auth/login` | JWT token issued for `trust_safety` role |
| Create Sender | `POST /api/users` | `d68ec8ce` — E2E Test Sender, trust_score 50.00 |
| Create Receiver | `POST /api/users` | `d40d9447` — E2E Test Receiver, trust_score 50.00 |
| Sync Detection | `POST /api/analyze-event` | 4 signals in 35ms (CONTACT_PHONE, CONTACT_EMAIL, CONTACT_MESSAGING_APP, OFF_PLATFORM_INTENT) |
| Async Pipeline | `POST /api/events` | 202 Accepted — full pipeline triggered |
| Detection Output | `GET /api/risk-signals` | 8 total signals (added CONTACT_SOCIAL, PAYMENT_EXTERNAL with ESCALATION_PATTERN flags) |
| Scoring Output | `GET /api/risk-scores/user/:id` | Score: 31.80, tier: `low`, trend: `stable`, factors: behavioral 72, operational 10 |
| Enforcement Output | `GET /api/enforcement-actions` | `soft_warning` issued (shadow_mode: true), reason: `LOW_RISK_FIRST_OFFENSE` |
| Audit Trail | `GET /api/audit-logs` | Events logged with timestamps and actor tracking |
| Shadow Status | `GET /api/shadow/status` | 16 signals, 2 shadow actions, 0 dead letter queue, readiness checklist active |

### Pipeline Timing (Async via Event Bus)

| Stage | Trigger Delay | Output |
|---|---|---|
| Detection | Immediate | 4 signals → `risk_signals` table |
| Scoring | +500ms | Score 31.80/low → `risk_scores` table |
| Enforcement | +1500ms | soft_warning → `enforcement_actions` table |

### Test Messages Used

1. **Sync** (`/api/analyze-event`): `"Hey, call me at 555-867-5309 or email me at john@gmail.com instead of using this app. Lets meet on WhatsApp to arrange payment outside the platform."`
2. **Async** (`/api/events`): `"Text me on Telegram @johnpay99 for cash payment off this site. My venmo is john-pays. Dont use the app payment."`

### Notes

- `/api/analyze-event` runs detection synchronously (returns signals immediately) but does NOT trigger scoring or enforcement
- `/api/events` emits to the event bus, triggering the full async pipeline (detection → scoring → enforcement)
- Shadow mode confirmed active — enforcement actions logged but not applied to user accounts
- Admin credentials documented in `plugins_mcp.md`

---

## 2026-02-09 — Critical Bug Fixes: Security, Appeals, Audit, Dedup, Config

**Phase:** BUILD (hardening)
**Agent:** Master Claude

### Changes

- **[CRITICAL] Appeal approval now restores user status** (`appeals.ts`)
  - Previously: approving an appeal reversed the enforcement action (`reversed_at` set) but did NOT restore the user's `status` from `restricted`/`suspended` back to `active`
  - Fix: wrapped in database transaction — atomically reverses enforcement action + restores user status + writes audit log
  - Audit log entry created for every enforcement reversal with appeal details

- **[CRITICAL] POST /api/appeals now requires authentication** (`appeals.ts`)
  - Previously: `POST /api/appeals` had NO `authenticateJWT` middleware — any unauthenticated request could submit appeals
  - Fix: added `authenticateJWT` middleware before validation

- **[HIGH] Shadow mode enforcement now writes audit logs** (`actions.ts`)
  - Previously: shadow mode persisted the enforcement action to DB but did NOT create an audit log entry (active mode did)
  - Fix: added audit log insert with `enforcement.shadow.<action>` action type for full observability

- **[HIGH] Event bus dedup now checks database after restart** (`bus.ts`)
  - Previously: `emit()` only checked in-memory `Set` for duplicates — on restart, the Set was empty and all events would be re-processed
  - The `processed_events` DB table was written to but never read during dedup checks
  - Fix: added DB fallback check in `emit()` when the in-memory Set doesn't contain the event ID, with cache-back to Set for future lookups

- **[HIGH] Password hashing upgraded from SHA256 to bcrypt** (`auth.ts`)
  - Previously: used `crypto.createHash('sha256')` — fast hash with no salt, vulnerable to rainbow tables
  - Fix: installed `bcryptjs`, login now supports both bcrypt (preferred) and SHA256 (legacy migration)
  - Legacy SHA256 passwords are automatically migrated to bcrypt (cost factor 12) on successful login

- **[MEDIUM] JWT_SECRET and HMAC_SECRET now required in production** (`config.ts`)
  - Previously: both used `optional()` with weak dev defaults that silently fell through in production
  - Fix: new `requiredInProduction()` helper — throws on missing value when `NODE_ENV=production`, warns in dev

### Dependencies Added

| Package | Version | Purpose |
|---|---|---|
| `bcryptjs` | ^2.4.3 | Secure password hashing with salt |
| `@types/bcryptjs` | ^2.4.6 | TypeScript types (devDep) |

### Verification

| Check | Result |
|---|---|
| Unit tests | 94/94 passing |
| TypeScript compilation | Clean (0 errors) |

### Files Modified

| File | Change |
|---|---|
| `src/backend/src/api/routes/appeals.ts` | Auth on POST, transaction for approval + user status restore + audit log |
| `src/backend/src/api/routes/auth.ts` | bcrypt support with SHA256→bcrypt auto-migration |
| `src/backend/src/enforcement/actions.ts` | Shadow mode audit logging |
| `src/backend/src/events/bus.ts` | DB fallback for dedup on restart |
| `src/backend/src/config.ts` | `requiredInProduction()` for secrets |
| `src/backend/package.json` | Added bcryptjs dependency |
| `changelog.md` | This entry |
| `project_status.md` | Updated |

---

## 2026-02-09 — Admin Dashboard Deployed to Production

**Phase:** BUILD (dashboard deployment)
**Agent:** Master Claude

### Changes

- **Next.js dashboard configured for static export** (`next.config.js`)
  - Added `output: 'export'` and `trailingSlash: true` for Nginx-compatible static hosting
  - Dashboard builds to `src/dashboard/out/` as pure HTML/CSS/JS

- **Dashboard API client updated for same-origin deployment** (`api.ts`)
  - Changed default `API_BASE` from `http://localhost:3001/api` to `/api` (relative URL)
  - Eliminates CORS issues — dashboard and API share `cis.qwickservices.com`

- **Backend CORS updated** (`index.ts`)
  - Added both `config.dashboardUrl` and `config.apiBaseUrl` to allowed origins
  - Supports both same-origin and cross-origin access patterns

- **Dashboard built and deployed on VPS**
  - `npm install` + `npm run build` in `/opt/qcis-repo/src/dashboard`
  - Symlink: `/opt/qcis-dashboard` → `/opt/qcis-repo/src/dashboard/out`
  - Static files served by Nginx at `/`

- **Nginx reconfigured for dashboard + API coexistence**
  - `location /` → serves static dashboard files (`/opt/qcis-dashboard`)
  - `location /api/` → reverse proxy to backend on port 3001
  - `location /_next/static/` → cached with 365d expiry for performance
  - `try_files` with `$uri.html` fallback for Next.js trailing slash routes

### Dashboard Modules (7)

| Module | Route | Access Roles |
|---|---|---|
| Alerts Inbox | `/alerts` | trust_safety, ops |
| Case Investigation | `/cases` | trust_safety |
| Enforcement Management | `/enforcement` | trust_safety, ops |
| Risk Trends | `/risk` | trust_safety, ops, legal_compliance |
| Appeals | `/appeals` | trust_safety, legal_compliance |
| System Health | `/system` | ops |
| Audit Logs | `/audit` | trust_safety, legal_compliance |

### Verification Evidence

| Check | Result |
|---|---|
| `curl -s -o /dev/null -w "%{http_code}" https://cis.qwickservices.com/` | 200 (dashboard HTML) |
| `curl https://cis.qwickservices.com/api/health` | 200 `{"status":"healthy","database":"connected"}` |
| Login test (`POST /api/auth/login`) | JWT token issued, bcrypt auto-migration confirmed |
| CSS assets (`/_next/static/css/`) | 200, served with cache headers |

### Files Modified

| File | Change |
|---|---|
| `src/dashboard/next.config.js` | Added `output: 'export'`, `trailingSlash: true` |
| `src/dashboard/src/lib/api.ts` | Default API_BASE → `/api` (relative) |
| `src/backend/src/index.ts` | CORS: added `apiBaseUrl` origin |
| `/etc/nginx/sites-available/qcis` | Dashboard static files + API proxy + asset caching |
| `changelog.md` | This entry |
| `project_status.md` | Dashboard marked as deployed |

---

## 2026-02-09 — Seeded CIS Dashboard Test Data for E2E Validation

**Phase:** BUILD (dashboard E2E test readiness)
**Agent:** Master Claude

### Changes

- **Created idempotent test data seed script** (`seed-test-data.sql`)
  - All records use fixed UUIDs for idempotency (ON CONFLICT DO NOTHING)
  - All metadata tagged with `"test_data": true`
  - Companion reset script (`reset-test-data.sql`) for clean teardown

- **Seeded entities (cross-linked, internally consistent):**

| Entity | Count | Details |
|---|---|---|
| Users | 3 new (7 total) | user_med_1 (Maria Chen, score 55), user_high_1 (James Rodriguez, score 78), user_sys (system actor) |
| Messages | 6 | 3 conversations (2 messages each) with off-platform signals |
| Risk Signals | 6 new (22 total) | 3 for user_med_1 (WhatsApp, Venmo, off-platform), 3 for user_high_1 (CashApp, TX redirect, ban evasion) |
| Alerts | 5 | All statuses: open, assigned, in_progress, resolved, dismissed |
| Cases | 3 | open, investigating, closed — each with linked alerts and case notes |
| Case Notes | 7 | Investigation timeline entries across all 3 cases |
| Enforcement | 2 (existing) | Linked to risk_score_ids |
| Risk Scores | 2 (existing) | low: 2 (31.80, 34.80), all other tiers: 0 |
| Appeals | 0 | Empty state preserved for UI validation |
| Audit Logs | 12 new (15 total) | alert.created, case.created, case.closed, alert.assigned, alert.status_changed, alert.resolved, alert.dismissed, enforcement.shadow.soft_warning |

### Verification Results

| Dashboard Module | Expected State | API Result |
|---|---|---|
| Alerts & Inbox | 5 alerts, all statuses represented | 5/5 statuses confirmed |
| Case Investigation | 3 selectable cases with timelines | 3 cases, 7 notes |
| Enforcement Management | 2 active soft warnings | 2/2 active, reversible |
| Risk & Trends | monitor:0, low:2, med:0, high:0, crit:0 | 2 low-tier scores |
| Appeals | Empty state | 0 appeals |
| Audit Logs | System + admin events | 15 entries, 9 action types |

### Files Created

| File | Purpose |
|---|---|
| `src/backend/src/database/seed-test-data.sql` | Idempotent seed script |
| `src/backend/src/database/reset-test-data.sql` | Clean teardown script |

---

## 2026-02-09 — Phase 1 Production Hardening

**Phase:** BUILD
**Agent:** Builder

### Changes

- **Durable event bus** — Redis-backed event persistence with retry, DLQ, and crash recovery
- **Graceful shutdown** — Signal handlers drain HTTP connections, event bus, Redis, and DB pool
- **Rate limiting** — Global (100/min), AI (10/min), write (30/min) per-IP sliding window
- **Infrastructure automation** — PM2 ecosystem config, deployment scripts
- **Auth hardening** — Integration tests for login, token validation, permission checks
- **Health probe** — `/api/health` endpoint with uptime, DB status, event bus state

---

## 2026-02-10 — Phase 2A–2D: Detection Expansion & Scoring Redesign

**Phase:** BUILD
**Agent:** Builder

### Changes

- **Phase 2A — Data Foundation**: Webhook ingestion, bookings/wallet tables, event normalization
- **Phase 2B — Scoring Model**: 5-component additive trust score (Operational 25%, Behavioral 30%, Network 20%, Verification 15%, Historical 10%) with exponential time decay
- **Phase 2C — Detection Expansion**: 5 new event bus consumers (booking-anomaly, payment-anomaly, provider-behavior, temporal-pattern, contact-change) with 20 signal types
- **Phase 2D — Signal Completeness**: Ratings table, schema sync, signal breakdown API, dashboard visibility

---

## 2026-02-12 — Phase 3: Intelligence Layers & Alerting Engine

**Phase:** BUILD
**Agent:** Builder

### Changes

- **Phase 3A — Intelligence**: Off-platform leakage funnel, network graph, device fingerprinting, contagion propagation (4 consumers)
- **Phase 3B — Enforcement Orchestrator**: Contextual enforcement triggers with graduated responses
- **Phase 3C — Alerting Engine**: 5 alert consumers (threshold, trend, leakage, anomaly, cluster) + SLA escalation service
- **Phase 3D — Rules Engine**: Admin-configurable detection rules with Zod schema validation
- **SSE Streaming**: Real-time event push via `/api/stream`
- **Dashboard Modules**: Intelligence, network explorer, leakage funnel, rules engine, data sync

---

## 2026-02-14 — Phase 4: Cross-Signal Correlation & Network Intelligence

**Phase:** BUILD
**Agent:** Builder

### Changes

- **Correlation Engine**: Cross-signal pattern matching with configurable windows
- **Network Penalty**: Trust score reduction based on flagged counterparty density
- **Dispute Detection**: Dispute signals integrated into risk pipeline
- **Dashboard Intelligence**: Cluster intelligence, correlation explorer, anomaly alerts
- **Score Recalculation**: Batch recalculation API with audit logging
- **Migrations 031-034**: Correlation tables, decay coefficients, network indexes

---

## 2026-02-15 — Production Deployment & CI/CD

**Phase:** BUILD
**Agent:** Builder

### Changes

- **CI/CD Pipelines**: GitHub Actions for test, build, deploy
- **SSL Configuration**: Nginx SSL termination, HTTP→HTTPS redirect
- **Monitoring Stack**: PM2 metrics, health probes, error alerting
- **Laravel Integration**: Webhook ingestion from QwickServices Laravel backend
- **AI Test Suite**: 46 integration tests for all AI endpoints
- **Dashboard Polish**: Dark mode, E2E test stubs, error boundaries

---

## 2026-02-16 — QwickServices Data Sync Service

**Phase:** BUILD
**Agent:** Builder

### Changes

- **Sync Service**: Pull architecture from QwickServices MySQL with read-only connection
- **MySQL Driver**: Direct mysql2 integration with parameterized queries
- **Table Mappings**: 8 tables aligned to actual QwickServices schema (verified 2026-02-16)
- **Checkpoint Tracking**: `sync_watermarks` table for resumable incremental sync
- **Read-Only Governance**: `master_claude.md` §11 — SQL write suppression guard, SELECT-only grants

---

## 2026-02-18 — Sync Layer Hardening & Event Emission

**Phase:** BUILD
**Agent:** Builder

### Changes

- **Event Emission Layer**: Domain events wired through all sync consumers with backfill guard
- **UUID vs BigInt Resolution**: MySQL BigInt external IDs mapped to CIS UUID primary keys
- **Schema Drift Detection**: Runtime column validation against expected schemas
- **Sync Health Monitor**: `/api/sync/health` with circuit breaker state, watermark lag, error rates
- **Critical Bug Fixes**: MySQL readonly grants, payload ID resolution, contact-change detection

---

## 2026-02-21 — Sync Hardening, AI Intelligence, & Network Wiring

**Phase:** BUILD
**Agent:** Builder

### Changes

- **Sync Layer Hardening**: Session-level `SET SESSION TRANSACTION READ ONLY`, circuit breaker (5 failures → 60s cooldown), exponential backoff with jitter, query allowlist, event dedup
- **Domain Persistence Consumer**: Event-driven UPSERT bridge for bookings, transactions, wallets, ratings, disputes with status mappings
- **AI Intelligence Layer**: 6 OpenAI endpoints (risk summary, appeal analysis, pattern detection, platform health, anomaly digest, predictive alerts) + background insight generator (15-min cycle, Redis-backed cache)
- **Network Intelligence Wired**: Scoring aggregator queries `user_devices` + `user_relationships` for device clusters and similar-pattern users (was stubbed since Phase 3A)
- **Shadow Mode Toggle**: `POST /api/shadow/toggle` endpoint with audit logging and migration 041
- **Cache Hardening**: AI insights migrated from module-level variables to `cacheGet`/`cacheSet` for PM2 restart resilience

### Code Review Hardening (10 issues caught, 7 fixed)

| Issue | Fix |
|---|---|
| Appeal prior_violations counted the appealed action | `AND id != $2` exclusion |
| Non-UUID user_id caused 500 on PostgreSQL | UUID regex validation, returns 400 |
| Transaction/wallet amount defaults to 0 | Changed to `null` |
| mapWalletTxType substring matching fragile | Exact key lookup with `withdrawal` added |
| ExecutiveSummary retry button never re-fetched | `retryKey` state pattern in useEffect |
| Dynamic import on every /insights-feed request | Static import |
| No fetch timeout on OpenAI calls | AbortController with 30s timeout |

---

## 2026-02-21 — Intake Forms, E2E Tests, Migration Fix

**Phase:** BUILD
**Agent:** Builder

### Changes

- **Intake Form Route**: `POST /api/intake-form` (public), `GET` (list), `GET /:id`, `PATCH /:id` (admin-only) with Zod validation and IP/user-agent tracking
- **Migration 029 Collision Fixed**: Renamed `029_intake_forms.sql` → `042_intake_forms.sql` (collision with `029_performance_indexes.sql`)
- **Migration 043**: Intake RBAC permissions (`intake.view`, `intake.manage`) granted to admin roles
- **Playwright E2E Tests**: All 12 tests implemented (was 3 partial + 10 stubs) — API mocking via `page.route()`, auth injection via localStorage, coverage: login, RBAC gating, alert claim/dismiss, case details/notes, enforcement reversal modal, appeal resolution
- **Integration Tests**: 24 tests for intake-forms route (POST validation, GET filters, GET/:id, PATCH status/notes, auth checks)

---
