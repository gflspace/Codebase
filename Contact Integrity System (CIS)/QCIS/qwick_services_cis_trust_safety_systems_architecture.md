# Trust & Safety Systems Architecture

**System:** QwickServices Contact Integrity System (CIS)  
**Model Role:** Trust & Safety Systems Architecture Model  
**Objective:** Define a modular, event-driven, auditable technical foundation for detection, scoring, review, and enforcement at scale

---

## A. Core Architecture Overview

### Authoritative Components

- **Backend Platform (System of Record):** Sidebase  
  Owns user accounts, messages, transactions, enforcement state, and audit logs.

- **Detection Orchestrator:** Claude Code  
  Performs content analysis, pattern detection, and behavioral classification.

- **Architecture Style:** Event-driven, asynchronous  
- **Design Principle:** Strict separation of concerns across all layers

> No component performs duties outside its assigned layer.

---

## B. Event-Driven Pipeline

### Event Sources (Emitted by Sidebase)

- `message.sent`
- `message.edited`
- `message.attachment_uploaded`
- `transaction.initiated`
- `transaction.failed`
- `transaction.completed`
- `account.warning_issued`
- `account.restriction_applied`
- `appeal.submitted`
- `appeal.resolved`

### Event Flow (Descriptive Diagram)

1. **Event Emission**  
   Sidebase emits immutable domain events.

2. **Event Ingestion**  
   Events are published to an event bus / queue.

3. **Detection Layer**  
   Claude Code consumes events and produces structured detection signals.

4. **Scoring Layer**  
   Risk engine aggregates signals and computes risk scores.

5. **Routing Decision**  
   Scores are routed to enforcement or human review queues.

6. **Enforcement Execution**  
   Enforcement service applies actions and updates account state.

7. **Logging & Observability**  
   All steps emit audit and metric events.

### Event Properties (Mandatory)

- Immutable
- Time-ordered
- Replayable
- Idempotent

---

## C. Detection Layer (Analysis & Classification)

### Responsibilities

- Parse message content and metadata
- Identify policy violations and behavioral patterns
- Detect obfuscation, code words, and evasion tactics
- Generate explainable, structured findings

### Explicit Constraints

- Detection **never enforces**
- Detection **never assigns risk tiers**

### Outputs (Structured Signals)

- Violation type(s)
- Pattern indicators
- Confidence score (0–1)
- Evidence references (IDs, hashes, offsets)

---

## D. Scoring Layer (Risk Aggregation)

### Responsibilities

- Aggregate detection signals over time
- Apply weighting, decay, and escalation logic
- Incorporate user tenure and trust level
- Track behavioral trends

### Explicit Constraints

- Scoring **never analyzes raw content**
- Scoring **never enforces actions**

### Outputs

- Normalized risk score (0–100)
- Risk tier (monitor → critical)
- Contributing factors (ranked)
- Trend indicators (stable / escalating / decaying)

---

## E. Enforcement Layer (Action Execution)

### Responsibilities

- Map risk tiers to proportional enforcement actions
- Apply warnings, restrictions, suspensions, or bans
- Trigger user notifications and appeal eligibility
- Persist enforcement state and rationale

### Explicit Constraints

- Enforcement **never analyzes content**
- Enforcement **never recalculates risk**

### Outputs

- Enforcement action record
- Account state change events
- User-facing explanation references

---

## F. Review & Oversight Interfaces

### Supported Functions

- Trust & Safety manual review
- Appeals and dispute resolution
- Legal and compliance audits

### Interface Requirements

- Full evidence traceability (signal → score → action)
- Clear decision rationale
- Complete enforcement and appeal history
- Role-based data visibility

---

## G. System Guardrails

- Clear API contracts between layers
- No circular dependencies
- Role-based access control (RBAC)
- Full observability (metrics, logs, alerts)
- Thresholds configurable without redeploys

---

## H. Failure & Fallback Handling

- **Detection failure:** Event retried or queued for replay
- **Scoring unavailable:** Default to monitor-only state
- **Enforcement failure:** Rollback and alert Ops
- **Human review overload:** Automated throttling of irreversible actions

---

## I. Audit & Replay Strategy

- All domain events stored in append-only log
- Ability to replay events for:
  - Model updates
  - Incident investigations
  - Regulatory audits
- Versioned detection and scoring models recorded with outcomes

---

## J. Scalability & Extensibility Notes

- Horizontal scaling via stateless consumers
- New detectors added without changing scoring logic
- New enforcement actions added without retraining detection
- Jurisdiction-specific rules injected at scoring or enforcement layers

---

## Non-Negotiable Principles

- Detection ≠ Scoring ≠ Enforcement
- Events over synchronous calls
- Explainability over black-box decisions
- Human-in-the-loop for irreversible actions

---

**Status:** Architecture Validated  
**Last Review:** _[Auto-generated]_

