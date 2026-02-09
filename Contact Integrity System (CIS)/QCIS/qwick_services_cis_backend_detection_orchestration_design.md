# Backend & Trust & Safety Orchestration Design

**System:** QwickServices Contact Integrity System (CIS)  
**Role:** Backend & Trust & Safety Orchestration Engineer  
**Goal:** Design an event-driven, auditable, privacy-aware backend with an external detection orchestrator

---

## 1. Backend System (PostgreSQL-Based)

### 1.1 Architectural Role
The backend is the **authoritative system of record**. It:
- Persists users, messages, transactions, signals, scores, and actions
- Emits domain events
- Executes enforcement decisions

> **Non‑negotiable:** The backend does **not** perform detection or scoring.

---

### 1.2 Core Database Schemas (Conceptual)

#### Users & Profiles
- `users`
  - `id (UUID, PK)`
  - `created_at`
  - `verification_status`
  - `trust_score`
  - `status (active | restricted | suspended | banned)`

#### Messages
- `messages`
  - `id (UUID, PK)`
  - `sender_id (FK → users.id)`
  - `receiver_id (FK → users.id)`
  - `content`
  - `metadata (jsonb)`
  - `created_at`
  - `edited_at`

#### Transactions
- `transactions`
  - `id (UUID, PK)`
  - `user_id (FK → users.id)`
  - `amount`
  - `currency`
  - `status`
  - `created_at`

#### Risk Signals
- `risk_signals`
  - `id (UUID, PK)`
  - `source_event_id`
  - `signal_type`
  - `confidence`
  - `evidence_refs (jsonb)`
  - `created_at`

#### Risk Scores
- `risk_scores`
  - `id (UUID, PK)`
  - `user_id (FK)`
  - `score (0–100)`
  - `tier`
  - `factors (jsonb)`
  - `created_at`

#### Enforcement Actions
- `enforcement_actions`
  - `id (UUID, PK)`
  - `user_id (FK)`
  - `action_type`
  - `reason`
  - `effective_until`
  - `created_at`

#### Audit Logs (Append‑Only)
- `audit_logs`
  - `id (UUID, PK)`
  - `actor`
  - `action`
  - `entity_type`
  - `entity_id`
  - `timestamp`

**Design Notes**
- UUIDs everywhere
- Foreign keys enforced
- Row‑level security for messages and signals
- JSONB used only for explainability and evidence

---

## 2. Event Model & Payloads

### 2.1 Event Emission
Backend emits immutable events:
- `message.created`
- `message.edited`
- `transaction.initiated`
- `transaction.failed`
- `transaction.completed`
- `user.status_changed`

### 2.2 Example Event Payload (Message)
```json
{
  "event_id": "uuid",
  "event_type": "message.created",
  "occurred_at": "ISO8601",
  "payload": {
    "message_id": "uuid",
    "sender_id": "uuid",
    "receiver_id": "uuid",
    "content": "string",
    "metadata": {}
  }
}
```

Events are:
- Immutable
- Time‑ordered
- Replayable

---

## 3. Claude Code Detection Orchestrator

### 3.1 Role & Deployment
- Runs as an **external service**
- Subscribes to backend events
- Stateless and horizontally scalable

### 3.2 Responsibilities
- Analyze content + metadata
- Detect policy violations
- Identify evasion or patterns
- Assign confidence levels

> **Constraint:** Never enforces, never scores risk tiers.

### 3.3 Orchestrator Output
```json
{
  "source_event_id": "uuid",
  "violations": ["off_platform_contact"],
  "confidence": 0.82,
  "evidence_refs": {
    "message_id": "uuid",
    "snippets": ["call me later"]
  }
}
```

---

## 4. API Contract (Backend ↔ Orchestrator)

### 4.1 Backend → Orchestrator
- Endpoint: `POST /analyze-event`
- Auth: Signed JWT / HMAC
- Payload: Event JSON

### 4.2 Orchestrator → Backend
- Endpoint: `POST /risk-signal`
- Payload: Structured detection output

### 4.3 Security
- TLS everywhere
- Request signing + replay protection
- Strict schema validation

---

## 5. Event → Action Trigger Flow

1. Backend persists event
2. Event published to bus
3. Claude Code analyzes event
4. Detection signal returned
5. Backend stores signal
6. Scoring layer aggregates signals
7. Enforcement layer executes action
8. Audit log written

---

## 6. Security & Compliance Guardrails

- Encryption at rest (DB, backups)
- Encryption in transit (TLS)
- RBAC for message content access
- Full logging of detection I/O
- Explainable evidence references

---

## 7. Failure Handling & Fallbacks

- **Orchestrator down:** Events queued, no enforcement
- **Signal timeout:** Default to monitor state
- **Duplicate events:** Idempotent processing
- **Partial failures:** Alert Ops, retry with backoff

---

## 8. Deployment & Scaling Strategy

- Backend: Horizontally scalable API nodes
- PostgreSQL: Primary + read replicas
- Orchestrator: Stateless workers, autoscaled
- Event bus: Durable queue with replay

---

## 9. Architectural Guarantees

- Backend = source of truth
- Orchestrator = analysis engine
- Detection ≠ Scoring ≠ Enforcement
- Events over sync calls
- Every action explainable

---

**Status:** Design Complete — Ready for SQL & API Implementation

