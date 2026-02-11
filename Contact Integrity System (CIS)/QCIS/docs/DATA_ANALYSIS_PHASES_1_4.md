# CIS Synthetic Data Engineering — Phases 1–4

## Phase 1: Database Schema Analysis

### Table Inventory (14 tables)

| # | Table | Columns | Purpose |
|---|-------|---------|---------|
| 1 | users | 13 | Core user identity + trust state |
| 2 | messages | 10 | Message content for detection |
| 3 | transactions | 11 | Payment records for timing correlation |
| 4 | risk_signals | 10 | Detection output: individual signals |
| 5 | risk_scores | 9 | Aggregated trust scores per user |
| 6 | enforcement_actions | 15 | Actions taken based on risk |
| 7 | audit_logs | 9 | Append-only audit trail |
| 8 | alerts | 11 | Admin alert queue |
| 9 | cases | 10 | Investigation cases |
| 10 | case_notes | 5 | Notes on cases |
| 11 | appeals | 9 | User appeals against enforcement |
| 12 | admin_users | 14 | Admin dashboard users |
| 13 | permissions | 6 | RBAC permission definitions |
| 14 | role_permissions | 2 | Role→permission junction |
| 15 | admin_permission_overrides | 3 | Per-admin permission overrides |
| 16 | processed_events | 2 | Event deduplication |

### Enum Types (10)

| Enum | Values |
|------|--------|
| user_status | active, restricted, suspended, banned |
| verification_status | unverified, pending, verified |
| transaction_status | initiated, completed, failed, cancelled |
| signal_type | CONTACT_PHONE, CONTACT_EMAIL, CONTACT_SOCIAL, CONTACT_MESSAGING_APP, PAYMENT_EXTERNAL, OFF_PLATFORM_INTENT, GROOMING_LANGUAGE, TX_REDIRECT_ATTEMPT, TX_FAILURE_CORRELATED, TX_TIMING_ALIGNMENT |
| risk_tier | monitor, low, medium, high, critical |
| trend_direction | stable, escalating, decaying |
| enforcement_action_type | soft_warning, hard_warning, temporary_restriction, account_suspension, permanent_ban |
| alert_priority | low, medium, high, critical |
| alert_status | open, assigned, in_progress, resolved, dismissed |
| case_status | open, investigating, pending_action, resolved, closed |
| appeal_status | submitted, under_review, approved, denied |
| admin_role | trust_safety, ops, legal_compliance, super_admin, trust_safety_analyst, enforcement_officer, risk_intelligence, ops_monitor, auditor, custom |

### Relationships

**One-to-Many:**
- users → messages (sender_id, receiver_id)
- users → transactions (user_id, counterparty_id)
- users → risk_signals (user_id)
- users → risk_scores (user_id)
- users → enforcement_actions (user_id)
- users → alerts (user_id)
- users → cases (user_id)
- users → appeals (user_id)
- cases → case_notes (case_id)
- enforcement_actions → appeals (enforcement_action_id)
- risk_scores → enforcement_actions (risk_score_id)
- admin_users → admin_users (created_by, self-referential)

**Many-to-Many:**
- admin_role ↔ permissions (via role_permissions)
- admin_users ↔ permissions (via admin_permission_overrides)

### Soft Delete Fields
- messages.deleted_at (TIMESTAMPTZ, nullable)

### Status Enums (state machines)
- users.status: active → restricted → suspended → banned
- transactions.status: initiated → completed | failed | cancelled
- alerts.status: open → assigned → in_progress → resolved | dismissed
- cases.status: open → investigating → pending_action → resolved | closed
- appeals.status: submitted → under_review → approved | denied

### Risk-Related Fields
- users.trust_score (NUMERIC 0-100, default 50)
- risk_signals.confidence (NUMERIC 0-1)
- risk_signals.signal_type (10 enum values)
- risk_signals.obfuscation_flags (TEXT[])
- risk_signals.pattern_flags (TEXT[])
- risk_scores.score (NUMERIC 0-100)
- risk_scores.tier (5 enum values)
- risk_scores.trend (3 enum values)
- risk_scores.factors (JSONB: {operational, behavioral, network})
- enforcement_actions.action_type (5 enum values)
- alerts.priority (4 enum values)

### Audit Fields
- created_at: ALL tables
- updated_at: users, transactions, alerts, cases, admin_users
- audit_logs.timestamp: dedicated audit table

### JSON Columns (JSONB)
- users.metadata
- messages.metadata
- transactions.metadata
- risk_signals.evidence ({message_ids: UUID[], timestamps: string[]})
- risk_scores.factors ({operational: number, behavioral: number, network: number})
- enforcement_actions.metadata
- alerts.metadata
- cases.metadata
- audit_logs.details

### Array Columns
- risk_signals.obfuscation_flags (TEXT[])
- risk_signals.pattern_flags (TEXT[])
- enforcement_actions.triggering_signal_ids (UUID[])
- alerts.risk_signal_ids (UUID[])
- cases.alert_ids (UUID[])

---

## Phase 2: Business Logic Mapping

### Entity → Actions → State Changes → Data Impact

#### Message Creation Flow
```
POST /api/messages (content, sender_id, receiver_id)
  → INSERT messages
  → emit MESSAGE_CREATED
    → Detection (0ms delay):
        analyzeEvent → obfuscation + regex + keywords + context
        → INSERT 0-N risk_signals
    → Scoring (500ms delay):
        computeRiskScore(sender_id)
        → INSERT risk_scores
        → UPDATE users.trust_score
    → Enforcement (1500ms delay):
        processEnforcement(sender_id)
        → INSERT enforcement_actions (if triggered)
        → UPDATE users.status (if restriction/suspension)
        → INSERT alerts (if medium+)
        → INSERT cases (if high/critical)
```

#### Transaction Lifecycle
```
POST /api/transactions (user_id, amount, ...)
  → INSERT transactions (status=initiated)
  → emit TRANSACTION_INITIATED
    → Scoring recalculates (escrow ratio, cancel rate)

PATCH /api/transactions/:id (status=completed|failed|cancelled)
  → UPDATE transactions.status
  → emit TRANSACTION_COMPLETED|FAILED|CANCELLED
    → Scoring adjusts operational layer
    → Failed tx near messages → TX_FAILURE_CORRELATED signal
```

#### Enforcement Trigger Matrix
```
Tier=MONITOR → No action
Tier=LOW, first offense → SOFT_WARNING
Tier=LOW, repeat → HARD_WARNING
Tier=MEDIUM, 1st/2nd → HARD_WARNING
Tier=MEDIUM, 3rd+ → TEMPORARY_RESTRICTION (24h)
Tier=HIGH, with evasion → TEMPORARY_RESTRICTION (72h, requires approval)
Tier=HIGH, no evasion → ADMIN_ESCALATION (case created)
Tier=CRITICAL → ACCOUNT_SUSPENSION (requires approval)
```

#### Scoring Model
```
CIS_Trust_Score = 0.30 × Operational + 0.40 × Behavioral + 0.30 × Network

Operational (30%):
  - Escrow avoidance: (1 - escrowUsageRatio) × 40
  - Cancellation rate: (cancelled/total) × 30
  - Off-platform payment attempts: min(attempts × 10, 30)

Behavioral (40%):
  - Signal volume: min(signals × 5, 25) [time-decayed, 14-day half-life]
  - Signal diversity: min(uniqueTypes × 8, 25)
  - Escalation pattern: +20 if escalating
  - Repeated violations: min(repeats × 7, 15)
  - Obfuscation attempts: min(attempts × 10, 15)

Network (30%):
  - Flagged counterparties: min(count × 10, 30)
  - Shared payment endpoints: +25 if true
  - Similar pattern users: min(count × 8, 25) [STUB]
  - Device cluster: +20 if true [STUB]

Tier thresholds: 0-20=monitor, 20-40=low, 40-60=medium, 60-80=high, 80-100=critical
Trend: avgDiff > 5 = escalating, < -5 = decaying, else stable
```

#### Detection Confidence Model
```
Base confidence by match count:
  0 matches → 0.0
  1 match   → 0.5
  2 matches → 0.7
  3+ matches → 0.85

Obfuscation boost: +0.3 × obfuscation_confidence
Context boost:
  payment_window → +0.15
  pre_payment → +0.10
  escalation pattern → +0.10
  3+ unique signal types → +0.10

Max confidence: 1.0
```

### Validation Rules (from Zod schemas)

| Entity | Field | Rule |
|--------|-------|------|
| Message | content | min 1 char, max 10,000 chars |
| Message | sender_id | UUID, required |
| Message | receiver_id | UUID, required, ≠ sender_id |
| Transaction | amount | positive number, required |
| Transaction | currency | exactly 3 chars, default 'USD' |
| User | email | valid email format |
| User | trust_score | 0-100, default 50 |
| Risk Signal | confidence | 0-1 |
| Risk Score | score | 0-100 |
| Appeal | reason | min 1 char |
| Case | title | max 500 chars |

---

## Phase 3: Data Dependency Graph

```
admin_users (must exist first — admin auth)
  └── admin_permission_overrides

permissions (seeded in migration 011)
  └── role_permissions (seeded in migration 011)

users (foundation of all domain data)
  ├── messages (sender_id, receiver_id → users.id)
  │     └── risk_signals (source_event_id references message processing)
  │           └── risk_scores (aggregated from signals)
  │                 └── enforcement_actions (triggered by scores)
  │                       ├── alerts (created by enforcement)
  │                       │     └── cases (escalated from alerts)
  │                       │           └── case_notes
  │                       └── appeals (submitted against enforcement)
  └── transactions (user_id, counterparty_id → users.id)
        └── (feeds into scoring via operational layer)
```

### Insert Order (required for referential integrity)
1. `permissions` + `role_permissions` (already seeded by migration 011)
2. `admin_users` (dashboard access)
3. `users` (platform users — customers + providers)
4. `messages` (requires sender + receiver users)
5. `transactions` (requires user + optional counterparty)
6. `risk_signals` (references users, source_event_id)
7. `risk_scores` (references users)
8. `enforcement_actions` (references users, risk_scores)
9. `alerts` (references users)
10. `cases` (references users)
11. `case_notes` (references cases)
12. `appeals` (references users, enforcement_actions)
13. `audit_logs` (independent, references nothing via FK)
14. `processed_events` (independent)

### Cascade Behavior on DELETE
- DELETE user → CASCADE to: messages, transactions (user_id), risk_scores, enforcement_actions, alerts, cases, appeals
- DELETE case → CASCADE to: case_notes
- DELETE enforcement_action → CASCADE to: appeals
- DELETE admin_user → CASCADE to: admin_permission_overrides

---

## Phase 4: Sample Data Requirements Extraction

### Data Classification by Entity

#### Users
| Field | Classification | Required | Risk Impact | Dashboard Impact | Join Key |
|-------|---------------|----------|-------------|-----------------|----------|
| id | Identity | Yes | - | Yes | Yes (FK target) |
| external_id | Identity | No | - | - | - |
| display_name | Identity | No | - | Yes (display) | - |
| email | Identity | No | - | Yes (display) | - |
| phone | Identity | No | - | Yes (display) | - |
| user_type | Identity | Yes | - | Yes (filter) | - |
| service_category | Identity | No | - | Yes (filter) | - |
| verification_status | Behavioral | Yes | Minor | Yes (KPI) | - |
| trust_score | Risk Signal | Yes | Primary | Yes (KPI, chart) | - |
| status | Risk Signal | Yes | Primary | Yes (KPI, filter) | - |
| metadata | System Metadata | No | - | - | - |
| created_at | System Metadata | Yes | - | Yes (time-series) | - |

#### Messages
| Field | Classification | Required | Risk Impact | Dashboard Impact | Join Key |
|-------|---------------|----------|-------------|-----------------|----------|
| id | Identity | Yes | - | - | Yes |
| sender_id | Identity | Yes | Primary | Yes | Yes (FK) |
| receiver_id | Identity | Yes | Primary | Yes | Yes (FK) |
| conversation_id | Identity | No | Context | - | - |
| content | Behavioral | Yes | Primary (detection) | - | - |
| content_hash | System Metadata | No | - | - | - |
| created_at | System Metadata | Yes | Time correlation | Yes (time-series) | - |

#### Transactions
| Field | Classification | Required | Risk Impact | Dashboard Impact | Join Key |
|-------|---------------|----------|-------------|-----------------|----------|
| id | Identity | Yes | - | - | Yes |
| user_id | Identity | Yes | - | Yes | Yes (FK) |
| counterparty_id | Identity | No | Network | Yes | Yes (FK) |
| amount | Transactional | Yes | - | Yes (KPI) | - |
| currency | Transactional | Yes | - | - | - |
| status | Transactional | Yes | Operational scoring | Yes (KPI) | - |
| payment_method | Transactional | No | Operational scoring | Yes (chart) | - |
| external_ref | Transactional | No | Network scoring | - | - |
| created_at | System Metadata | Yes | Time correlation | Yes (time-series) | - |

#### Risk Signals
| Field | Classification | Required | Risk Impact | Dashboard Impact | Join Key |
|-------|---------------|----------|-------------|-----------------|----------|
| id | Identity | Yes | - | - | Yes |
| source_event_id | Identity | Yes | Traceability | - | - |
| user_id | Identity | No | Primary | Yes (filter) | Yes (FK) |
| signal_type | Risk Signal | Yes | Primary | Yes (chart) | - |
| confidence | Risk Signal | Yes | Primary | Yes (chart) | - |
| evidence | Risk Signal | Yes | Context | - | - |
| obfuscation_flags | Risk Signal | Yes | Scoring boost | Yes | - |
| pattern_flags | Risk Signal | Yes | Enforcement trigger | Yes | - |
| created_at | System Metadata | Yes | Time decay | Yes (time-series) | - |

#### Risk Scores
| Field | Classification | Required | Risk Impact | Dashboard Impact | Join Key |
|-------|---------------|----------|-------------|-----------------|----------|
| id | Identity | Yes | - | - | Yes |
| user_id | Identity | Yes | - | Yes | Yes (FK) |
| score | Risk Signal | Yes | Primary | Yes (KPI, chart) | - |
| tier | Risk Signal | Yes | Enforcement trigger | Yes (KPI, filter) | - |
| factors | Risk Signal | Yes | Explainability | Yes (detail view) | - |
| trend | Risk Signal | Yes | Urgency indicator | Yes (KPI) | - |
| signal_count | Risk Signal | Yes | Volume indicator | Yes | - |
| created_at | System Metadata | Yes | Trend calculation | Yes (time-series) | - |

#### Enforcement Actions
| Field | Classification | Required | Risk Impact | Dashboard Impact | Join Key |
|-------|---------------|----------|-------------|-----------------|----------|
| id | Identity | Yes | - | - | Yes |
| user_id | Identity | Yes | - | Yes | Yes (FK) |
| action_type | Risk Signal | Yes | Primary | Yes (KPI, chart) | - |
| reason | Behavioral | Yes | Explainability | Yes (detail) | - |
| reason_code | Behavioral | Yes | Classification | Yes (filter) | - |
| triggering_signal_ids | Risk Signal | Yes | Traceability | Yes (drill-down) | - |
| risk_score_id | Risk Signal | No | Traceability | - | Yes (FK) |
| effective_until | System Metadata | No | Duration | Yes | - |
| reversed_at | System Metadata | No | Resolution | Yes (KPI) | - |
| automated | System Metadata | Yes | Classification | Yes (filter) | - |
| created_at | System Metadata | Yes | - | Yes (time-series) | - |

#### Alerts
| Field | Classification | Required | Risk Impact | Dashboard Impact | Join Key |
|-------|---------------|----------|-------------|-----------------|----------|
| priority | Risk Signal | Yes | Urgency | Yes (KPI, filter) | - |
| status | System Metadata | Yes | Workflow | Yes (KPI, filter) | - |
| assigned_to | System Metadata | No | Ownership | Yes (filter) | - |
| auto_generated | System Metadata | Yes | Classification | Yes (filter) | - |

### Fields Required for Time-Series Analysis
- users.created_at (user growth)
- messages.created_at (message volume)
- transactions.created_at (transaction volume)
- risk_signals.created_at (signal frequency)
- risk_scores.created_at (score trends)
- enforcement_actions.created_at (enforcement rate)
- alerts.created_at (alert volume)
- audit_logs.timestamp (activity timeline)
