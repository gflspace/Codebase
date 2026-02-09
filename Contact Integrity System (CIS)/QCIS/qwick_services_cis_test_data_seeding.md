# QwickServices CIS — Test Data Seeding Guide

**Created:** 2026-02-09
**Purpose:** Populate all dashboard modules with realistic, cross-linked test data for E2E UI validation

---

## Overview

The CIS dashboard requires data across 7 modules to validate UI rendering and interaction flows. This document describes the test data seed, how to apply it, and how to reset it.

---

## Seed Script

**Location:** `src/backend/src/database/seed-test-data.sql`

**Properties:**
- Idempotent: uses `ON CONFLICT (id) DO NOTHING` with fixed UUIDs
- Labeled: all metadata includes `"test_data": true`
- Transactional: wrapped in `BEGIN`/`COMMIT`
- Verification: includes post-seed count queries

---

## Seeded Entities

### Users (3 new, 4 existing = 7 total)

| Label | ID | Display Name | Trust Score | Status | Notes |
|---|---|---|---|---|---|
| user_low_1 | `d68ec8ce-...` | E2E Test Sender | 31.80 | active | Existing, low-risk |
| user_low_2 | `55cc0cb7-...` | Test Sender | 34.80 | active | Existing, low-risk |
| user_med_1 | `aaaaaaaa-...-01` | Maria Chen | 55.00 | active | New, escalation candidate |
| user_high_1 | `aaaaaaaa-...-02` | James Rodriguez | 78.00 | active | New, enforcement history |
| user_sys | `aaaaaaaa-...-03` | CIS System | 50.00 | active | New, system actor |
| receiver | `6e385513-...` | Test Receiver | 50.00 | active | Existing, conversation target |
| receiver_2 | `d40d9447-...` | E2E Test Receiver | 50.00 | active | Existing |

### Alerts (5)

| ID Suffix | User | Status | Priority | Assigned | Signals |
|---|---|---|---|---|---|
| `bbbb...01` | user_low_1 | open | low | unassigned | 2 (phone, email) |
| `bbbb...02` | user_low_2 | assigned | low | admin_ts | 3 (payment, off-platform) |
| `bbbb...03` | user_med_1 | in_progress | medium | admin_ts | 3 (WhatsApp, Venmo, off-platform) |
| `bbbb...04` | user_high_1 | resolved | high | admin_ts | 2 (CashApp, TX redirect) |
| `bbbb...05` | user_high_1 | dismissed | low | admin_ts | 1 (ban evasion) |

### Cases (3)

| ID Suffix | User | Status | Linked Alerts | Notes |
|---|---|---|---|---|
| `cccc...01` | user_low_1 | open | alert_001 | 2 case notes |
| `cccc...02` | user_med_1 | investigating | alert_003 | 2 case notes |
| `cccc...03` | user_high_1 | closed | alert_004, alert_005 | 3 case notes |

### Risk Scores (2, existing)

| User | Score | Tier | Trend | Signals |
|---|---|---|---|---|
| user_low_1 | 31.80 | low | stable | 8 |
| user_low_2 | 34.80 | low | stable | 8 |

**Tier distribution:** monitor: 0, low: 2, medium: 0, high: 0, critical: 0

### Enforcement Actions (2, existing)

| User | Action | Status | Reason |
|---|---|---|---|
| user_low_1 | soft_warning | active | LOW_RISK_FIRST_OFFENSE |
| user_low_2 | soft_warning | active | LOW_RISK_FIRST_OFFENSE |

### Appeals (0)

Empty state — no appeals seeded. Validates empty-state rendering.

### Audit Logs (15 total)

| Action Type | Count | Source |
|---|---|---|
| event.message.created | 3 | Existing (event bus) |
| alert.created | 3 | Seed (detection pipeline) |
| case.created | 2 | Seed (admin) |
| case.closed | 1 | Seed (admin) |
| alert.assigned | 1 | Seed (admin) |
| alert.status_changed | 1 | Seed (admin) |
| alert.resolved | 1 | Seed (admin) |
| alert.dismissed | 1 | Seed (admin) |
| enforcement.shadow.soft_warning | 2 | Seed (enforcement engine) |

---

## How to Seed

### First-time or re-seed (idempotent)

```bash
# On VPS
PGPASSWORD=$(grep DB_PASSWORD /opt/qcis-backend/.env | cut -d= -f2) \
  psql -U qwick_cis_app -d qwick_cis -h localhost \
  -f /opt/qcis-repo/src/backend/src/database/seed-test-data.sql
```

### From local (via SSH)

```bash
ssh -i "server_config" root@72.60.68.137 \
  "PGPASSWORD=\$(grep DB_PASSWORD /opt/qcis-backend/.env | cut -d= -f2) \
  psql -U qwick_cis_app -d qwick_cis -h localhost \
  -f /opt/qcis-repo/src/backend/src/database/seed-test-data.sql"
```

---

## How to Reset

**Reset script:** `src/backend/src/database/reset-test-data.sql`

Deletes only seeded test records by fixed UUID. Does not affect:
- Existing E2E test users (user_low_1, user_low_2)
- Existing risk signals, scores, or enforcement actions
- Admin users
- Schema or migrations

```bash
# On VPS
PGPASSWORD=$(grep DB_PASSWORD /opt/qcis-backend/.env | cut -d= -f2) \
  psql -U qwick_cis_app -d qwick_cis -h localhost \
  -f /opt/qcis-repo/src/backend/src/database/reset-test-data.sql
```

### Full reset (all test data including existing E2E records)

```sql
-- WARNING: Removes ALL data, not just seeded test data
TRUNCATE users, messages, transactions, risk_signals, risk_scores,
  enforcement_actions, audit_logs, alerts, cases, case_notes,
  appeals, processed_events CASCADE;
```

---

## Dashboard Module Validation Matrix

| Module | Data Source | Expected UI State |
|---|---|---|
| Alerts & Inbox | `GET /api/alerts` | 5 alerts with filter by status, assign/dismiss actions |
| Case Investigation | `GET /api/cases`, `GET /api/cases/:id` | 3 selectable cases, each with notes timeline |
| Enforcement Management | `GET /api/enforcement-actions` | 2 active soft warnings, reverse button available |
| Risk & Trends | `GET /api/risk-scores` | 2 low-tier scores, tier distribution cards |
| Appeals | `GET /api/appeals` | Empty state: "No appeals found" |
| System Health | `GET /api/health` | Status cards (healthy, shadow mode, DB connected) |
| Audit Logs | `GET /api/audit-logs` | 15 entries with action/entity type filters |

---

## UUID Scheme

All seeded records use deterministic UUIDs for idempotency:

| Prefix | Entity |
|---|---|
| `aaaaaaaa-bbbb-cccc-dddd-*` | Users |
| `bbbbbbbb-0001-0001-0001-*` | Alerts |
| `cccccccc-0001-0001-0001-*` | Cases |
| `dddddddd-0001-0001-0001-*` | Case Notes |
| `eeeeeeee-0001-0001-0001-*` | Messages |
| `ffffffff-0001-0001-0001-*` | Conversation IDs |
| `11111111-0001-0001-0001-*` | Risk Signals |
| `22222222-0001-0001-0001-*` | Audit Logs |
