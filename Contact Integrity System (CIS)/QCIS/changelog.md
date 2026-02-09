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
