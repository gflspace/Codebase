# QwickServices CIS — System Architecture

**System:** QwickServices Contact Integrity System (CIS)
**Last Updated:** 2026-02-08
**Maintained By:** Master Claude (Historian Agent)

---

## 1. System Purpose

CIS protects **platform integrity, revenue assurance, and user safety** by detecting, scoring, and enforcing against off-platform circumvention, payment bypass, and coordinated abuse on the QwickServices marketplace.

---

## 2. Non-Negotiable Architectural Principles

- **Detection ≠ Scoring ≠ Enforcement** — layers are strictly separated
- **Events over synchronous calls** — all inter-layer communication is event-driven
- **Explainability over black-box decisions** — every action traceable to evidence
- **Human-in-the-loop for irreversible actions** — no permanent bans without human approval
- **Full auditability at all times** — append-only logs, replayable event history

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    QwickServices Platform                     │
│              (Sidebase — System of Record)                    │
│                                                               │
│  Users ─── Messages ─── Transactions ─── Accounts             │
└──────────────────────┬────────────────────────────────────────┘
                       │ Domain Events (immutable)
                       ▼
              ┌────────────────┐
              │   Event Bus    │  (Durable queue, replay-capable)
              └───┬────┬───┬──┘
                  │    │   │
        ┌─────────┘    │   └─────────┐
        ▼              ▼             ▼
 ┌──────────┐  ┌──────────┐  ┌──────────────┐
 │ Detection │  │ Scoring  │  │ Enforcement  │
 │  Layer    │  │  Layer   │  │    Layer     │
 │ (Claude)  │  │ (Risk)   │  │  (Actions)   │
 └─────┬─────┘  └─────┬────┘  └──────┬───────┘
       │               │              │
       │  Signals       │  Tiers       │  Actions
       ▼               ▼              ▼
 ┌─────────────────────────────────────────────┐
 │         PostgreSQL (System of Record)        │
 │  risk_signals │ risk_scores │ enforcement    │
 │  audit_logs   │ users       │ messages       │
 └─────────────────────────────────────────────┘
                       │
                       ▼
 ┌─────────────────────────────────────────────┐
 │      Admin Dashboard (React / Next.js)       │
 │  Alerts │ Cases │ Enforcement │ Trends       │
 │  RBAC   │ Audit │ Appeals     │ System Health│
 └─────────────────────────────────────────────┘
```

---

## 4. Layer Specifications

### 4.1 Event Emission (Sidebase Backend)

**Role:** Authoritative system of record. Emits domain events, persists all state.

**Events Emitted:**
- `message.created`, `message.edited`, `message.deleted`
- `transaction.initiated`, `transaction.completed`, `transaction.failed`, `transaction.cancelled`
- `user.status_changed`
- `enforcement.action_applied`, `enforcement.action_reversed`
- `appeal.submitted`, `appeal.resolved`

**Event Properties (Mandatory):**
- Immutable, time-ordered, replayable, idempotent
- Include `event_id`, `event_type`, `occurred_at`, `correlation_id`

---

### 4.2 Detection Layer (Claude Code Orchestrator)

**Role:** External, stateless analysis engine. Consumes events, produces structured signals.

**Responsibilities:**
- Parse message content and metadata
- Identify policy violations and behavioral patterns
- Detect obfuscation, code words, evasion tactics
- Assign independent confidence scores (0.0-1.0)

**Signal Taxonomy:**
| Signal Code | Description |
|---|---|
| CONTACT_PHONE | Phone number disclosure |
| CONTACT_EMAIL | Email disclosure |
| CONTACT_SOCIAL | Social handle or link |
| CONTACT_MESSAGING_APP | External chat app reference |
| PAYMENT_EXTERNAL | Off-platform payment reference |
| OFF_PLATFORM_INTENT | Intent to move conversation |
| GROOMING_LANGUAGE | Soft lead-in / trust-building phrases |
| TX_REDIRECT_ATTEMPT | Off-platform payment suggestion |
| TX_FAILURE_CORRELATED | Message after repeated failures |
| TX_TIMING_ALIGNMENT | Message within payment window |

**Techniques:**
- Deterministic: regex (phone, email, URL), keyword dictionaries
- Contextual: NLP classifier, windowed context (+-2 messages), role-aware interpretation
- Evasion: spaced digits, emoji replacement, leetspeak, phonetic spelling, progressive disclosure

**Hard Constraints:**
- Detection NEVER enforces
- Detection NEVER assigns risk tiers
- Output is advisory only

**API Contract:**
- Backend → Orchestrator: `POST /analyze-event` (signed JWT/HMAC)
- Orchestrator → Backend: `POST /risk-signal` (structured detection output)

---

### 4.3 Scoring Layer (Risk Aggregation Engine)

**Role:** Aggregates detection signals into normalized risk scores and tiers.

**Responsibilities:**
- Aggregate signals over time with weighting, decay, and escalation
- Incorporate user tenure and trust level
- Track behavioral trends (stable / escalating / decaying)

**Trust Score Formula:**
```
CIS_Trust_Score(u) =
  0.30 * Operational_Integrity +
  0.40 * Behavioral_Trajectory +
  0.30 * Network_Corroboration
```

**Three Trust Layers:**
1. **Operational Integrity** — escrow use, payment alignment, cancellation frequency
2. **Behavioral Trajectory** — repeated pairing, escalating private comms, grooming detection
3. **Network Corroboration** — shared payout endpoints, device/IP clusters, collusion graphs

**Risk Tiers:**
| Tier | Level | Description |
|---|---|---|
| 1 | Monitor | Informational signals only |
| 2 | Low | Accidental or ambiguous behavior |
| 3 | Medium | Clear violation without strong harm |
| 4 | High | Deliberate intent, evasion, or harm |
| 5 | Critical | Coordinated abuse or financial risk |

**Hard Constraints:**
- Scoring NEVER analyzes raw content
- Scoring NEVER enforces actions
- Requires >=2 layer agreement for enforcement

---

### 4.4 Enforcement Layer (Action Execution)

**Role:** Maps risk tiers to proportional, explainable enforcement actions.

**Escalation Thresholds:**
| Condition | Action |
|---|---|
| First low/medium violation | Soft warning |
| Second violation (same type) | Logged warning |
| Third violation | Temporary restriction (24-72h) |
| High-risk + intent/evasion | Admin escalation |
| Coordinated/repeated abuse | Human-approved suspension |

**Hard Constraints:**
- Enforcement NEVER analyzes content
- Enforcement NEVER recalculates risk
- Automation NEVER permanently bans users
- All irreversible actions require human approval
- Users receive clear reason codes and appeal paths

---

### 4.5 Review & Oversight (Admin Dashboard)

**Technology:** React / Next.js on `admin.qwickservices.com`

**Modules:**
1. Alerts & Inbox (real-time triage)
2. Case Investigation (timeline, evidence, risk factors)
3. Enforcement Management (graduated actions with confirmation)
4. Risk & Trends (score distribution, watchlists, trends)
5. Appeals (resolution workflow)
6. System Health (ops monitoring)
7. Audit Logs (legal/compliance)

**Access Control (RBAC):**
| Role | Alerts | Cases | Enforcement | Raw Content | Appeals |
|---|---|---|---|---|---|
| Trust & Safety | Full | Full | Reversible | Limited | View |
| Ops | Aggregated | No | No | No | No |
| Legal/Compliance | Full | Read | Approve Irreversible | Redacted | Full |

---

## 5. Data Architecture

### Core Schemas (PostgreSQL)

| Table | Key Fields |
|---|---|
| `users` | id, created_at, verification_status, trust_score, status |
| `messages` | id, sender_id, receiver_id, content, metadata, timestamps |
| `transactions` | id, user_id, amount, currency, status, created_at |
| `risk_signals` | id, source_event_id, signal_type, confidence, evidence_refs |
| `risk_scores` | id, user_id, score(0-100), tier, factors, created_at |
| `enforcement_actions` | id, user_id, action_type, reason, effective_until |
| `audit_logs` | id, actor, action, entity_type, entity_id, timestamp |

**Design Rules:**
- UUIDs everywhere
- Foreign keys enforced
- Row-level security on messages and signals
- JSONB for explainability and evidence only
- Append-only audit logs

---

## 6. Infrastructure

**Environment:** Hostinger VPS (Ubuntu 22.04 LTS)
**Server:** >= 4 vCPU, 8GB RAM
**Hostname:** `cis-prod.qwickservices.com`

**Stack:**
- Web server: Nginx
- Runtime: Node.js LTS + Python 3.10+
- Process manager: PM2
- SSL: Certbot (Let's Encrypt)
- Database: PostgreSQL 14+

**Security:**
- SSH key-only auth, root login disabled
- UFW firewall (22, 80, 443 only)
- Fail2Ban, automated security updates
- TLS everywhere, request signing + replay protection
- Daily encrypted backups, 30-day retention

**CI/CD:**
- `main` → production, `develop` → staging
- Pipeline: checkout → install → build/test → security scan → stage → approval gate → deploy
- SSH-based deploy, zero-downtime reload, automatic rollback

---

## 7. Observability & Compliance

**Log Streams (Separated):**
1. Raw Domain Events
2. Derived Risk Signals
3. Enforcement Decisions
4. Admin & System Access Logs

**Format:** Structured JSON with mandatory `event_id`, `event_type`, `timestamp`, `correlation_id`

**Privacy:**
- Data minimization by default
- Hashing/tokenization of identifiers
- Content logging gated by consent
- GDPR access & deletion workflows

**Retention:**
- Raw events: time-limited
- Risk/enforcement logs: extended
- Admin access logs: longest retention

---

## 8. Failure & Fallback Behavior

| Failure | Response |
|---|---|
| Detection/orchestrator down | Events queued, no enforcement |
| Scoring unavailable | Default to monitor-only |
| Enforcement failure | Rollback, alert Ops |
| Human review overload | Throttle irreversible actions |
| Notification failure | Retry with backoff, log incident |
| Duplicate events | Idempotent processing |

---

## 9. Scalability

- Stateless detection workers (horizontal scaling)
- PostgreSQL primary + read replicas
- Durable event bus with replay
- New detectors added without changing scoring
- New enforcement actions added without retraining detection
- Jurisdiction-specific rules injected at scoring or enforcement layers

---

## 10. Cross-References

| Document | Layer |
|---|---|
| `qwick_services_cis_trust_safety_systems_architecture.md` | Full architecture |
| `qwick_services_cis_backend_detection_orchestration_design.md` | Backend + orchestrator |
| `qwick_services_cis_trust_safety_enforcement_model.md` | Enforcement policy |
| `qwick_services_cis_behavioral_risk_trust_model.md` | Behavioral risk analysis |
| `qwick_services_cis_detection_risk_signal_engineering_specification.md` | Detection logic |
| `qwick_services_cis_enforcement_action_trigger_specification.md` | Action triggers |
| `qwick_services_cis_hostinger_secure_infrastructure_setup_plan.md` | Infrastructure |
| `qwick_services_cis_observability_logging_compliance_framework.md` | Observability |
| `qwick_services_cis_trust_safety_admin_dashboard_architecture_ui_design.md` | Admin dashboard |
| `QwickServices_CIS_Layered_Defense_KB.md` | Layered defense KB |

---

**Status:** Architecture Synthesized from All Design Documents
