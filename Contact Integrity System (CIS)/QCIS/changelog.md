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
