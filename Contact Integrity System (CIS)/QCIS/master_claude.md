# master_claude.md

## QwickServices CIS — Master Orchestrator & Software Factory

**Role:** Elite Senior Software Systems Architect & Execution Engine
**Scope:** This file is the **single source of truth** for the entire QwickServices Contact Integrity System (CIS) software factory.

This repository operates as a **self-updating, multi-agent software factory** that runs with minimal human intervention.

---

## 0. Operating Rules (Non-Negotiable)

1. The **root folder** containing `master_claude.md` is the **Source of Truth**.
2. All documentation is **living** and must be updated via slash commands.
3. Detection ≠ Scoring ≠ Enforcement (never collapse layers).
4. Every change must be logged.
5. If a mistake occurs, typing `# <rule>` permanently amends this file (the **Hash Rule**).
6. **All CIS ↔ Qwickservices integration behavior SHALL conform to `cis_read_only_integration_architecture_v_1.md`.** No exceptions. No overrides.

---

## 1. Repository Structure (Authoritative)

```
/
├─ master_claude.md            # This file (orchestrator)
├─ architecture.md             # System design & interactions
├─ cis_read_only_integration_architecture_v_1.md  # Integration security contract
├─ changelog.md                # Immutable history of changes
├─ project_status.md           # Current state & next steps
├─ plugins_mcp.md              # Tool & credential placeholders
├─ reference_docs/
│   ├─ how_payments_work.md
│   ├─ how_detection_works.md
│   ├─ how_enforcement_works.md
│   └─ how_appeals_work.md
├─ worktrees/
│   ├─ builder/
│   ├─ tester/
│   ├─ historian/
│   └─ optimizer/
```

---

## 2. Slash Command Interface (MANDATORY)

Claude must respond to these commands by **updating files directly**.

```
/architecture   → Update architecture.md
/changelog      → Append to changelog.md
/status         → Update project_status.md
/ref <topic>    → Update or create reference_docs/<topic>.md
/plugins        → Update plugins_mcp.md
/hash           → Add permanent rule to this file
/integration    → Update cis_read_only_integration_architecture_v_1.md
```

---

## 3. Multi-Agent Model (Master → Child Agents)

### Master Agent
**master_claude** — orchestrates, validates, merges worktrees.

### Child Agents

1. **The Builder**
   - Implements architecture, backend, detection, enforcement
   - Works in `worktrees/builder/`

2. **The Tester**
   - Runs Playwright & regression tests
   - Works in `worktrees/tester/`

3. **The Historian**
   - Updates `changelog.md`
   - Ensures historical context is preserved
   - Works in `worktrees/historian/`

4. **The Optimizer**
   - Reflects after each cycle
   - Updates `project_status.md` with lessons & improvements
   - Works in `worktrees/optimizer/`

---

## 4. PLAN PHASE — Strategic Foundations (Agent Mapping)

### A. Policy Layer
- File: `qwick_services_cis_trust_safety_enforcement_model.md`
- Agent: **Builder**

### B. Behavioral Risk Analysis
- File: `qwick_services_cis_behavioral_risk_trust_model.md`
- Agent: **Builder**

### C. Enforcement Decisions
- File: `qwick_services_cis_enforcement_decision_output.md`
- Agent: **Builder**

### D. Governance & Compliance
- File: `qwick_services_cis_platform_governance_compliance_framework.md`
- Agent: **Builder**

### E. Data Requirements
- File: `qwick_services_cis_risk_detection_enforcement_data_inputs.md`
- Agent: **Builder**

### F. Draft Policy Framework
- File: `qwick_services_cis_trust_safety_policy_risk_action_framework_draft.md`
- Agent: **Builder**

---

## 5. SETUP PHASE — Architecture & Tooling

### Infrastructure
- File: `qwick_services_cis_hostinger_secure_infrastructure_setup_plan.md`
- Agent: **Builder**

### Backend & Orchestrator
- File: `qwick_services_cis_backend_detection_orchestration_design.md`
- Agent: **Builder**

### Observability
- File: `qwick_services_cis_observability_logging_compliance_framework.md`
- Agent: **Builder**

### Admin Dashboard
- File: `qwick_services_cis_trust_safety_admin_dashboard_architecture_ui_design.md`
- Agent: **Builder**

---

## 6. BUILD PHASE — Execution & Deployment

### Detection Logic
- File: `qwick_services_cis_detection_risk_signal_engineering_specification.md`
- Agent: **Builder**

### Action Triggers
- File: `qwick_services_cis_enforcement_action_trigger_specification.md`
- Agent: **Builder**

### Simulation & Testing
- File: `qwick_services_cis_trust_safety_simulation_evaluation_report_pre_production.md`
- Agent: **Tester**

### Deployment & Feedback
- File: `qwick_services_cis_deployment_feedback_plan_shadow_→_active.md`
- Agent: **Optimizer**

---

## 7. Worktrees & Multi-Agent Scaling

- Each agent operates in its **own isolated worktree**
- No direct writes to root except via merge
- Master validates and merges completed worktrees

**Rule:** No partial merges.

---

## 8. Quality Assurance & Regression Prevention

### The Hash Rule

If the user types:
```
# Do not repeat X
```

Claude must:
1. Append the rule to this file
2. Treat it as permanent system law

---

## 9. Execution Loop (Factory Mode)

1. Builder implements feature
2. Tester validates via Playwright
3. Historian logs changes
4. Optimizer updates status & improvements
5. Master merges → updates architecture & status

---

## 10. Prime Directive

> **This factory must continue operating even with incomplete credentials.**
> Dummy values are used until `/plugins` is updated with real secrets.

---

## 11. CIS ↔ Qwickservices Integration Governance (MANDATORY)

### 11.0 Binding Reference

All integration behavior between CIS and Qwickservices is governed by:

> **`cis_read_only_integration_architecture_v_1.md`**

This section operationalizes those directives within the CIS software factory. Any conflict between this section and the architecture document is resolved in favor of the architecture document.

---

### 11.1 Integration Mode (Immutable)

```
INTEGRATION_MODE      = READ_ONLY_PULL
DATA_DIRECTION        = UNIDIRECTIONAL (Qwickservices → CIS)
SOURCE_OF_TRUTH       = QWICKSERVICES
REVERSE_DATA_FLOW     = PROHIBITED
MUTATION_CAPABILITY   = NONE
```

**Qwickservices is the immutable system of record.** CIS acts strictly as observer, consumer, and analytical processor. No reverse data path exists under any circumstance.

---

### 11.2 Read-Only Enforcement (Zero Tolerance)

The following operations are **permanently prohibited** on the Qwickservices data source:

| Category | Prohibited Operations |
|----------|----------------------|
| DML | INSERT, UPDATE, DELETE, MERGE, REPLACE, UPSERT |
| DDL | CREATE, ALTER, DROP, TRUNCATE, RENAME |
| DCL | GRANT, REVOKE |
| Procedural | CALL, EXECUTE (stored procedures), trigger activation |
| Schema | Index creation, view creation, temporary table creation |
| Advisory | Query plan hints that alter DB behavior |

**Only `SELECT` statements are permitted. No exceptions.**

#### SQL Verb Validation Guard

The CIS sync layer MUST inspect every SQL statement before execution. The guard:

1. Extracts the SQL verb from the statement
2. Rejects any statement whose verb is not `SELECT`
3. Logs the policy violation attempt with timestamp, query hash, and source
4. Immediately terminates the database connection on breach
5. Emits a security alert

Implementation: `src/backend/src/sync/connection.ts` — the `externalQuery()` function is the single entry point for all Qwickservices database access. All queries pass through this chokepoint.

---

### 11.3 Real-Time Pull Configuration

CIS pulls data from Qwickservices using controlled low-latency polling:

```
SYNC_ENABLED          = true (when activated)
SYNC_INTERVAL_MS      = 30000 (30 seconds, configurable 5000–60000)
SYNC_BATCH_SIZE       = 100 (max rows per table per cycle)
SYNC_DB_DRIVER        = mysql (QwickServices/Laravel default)
SYNC_FALLBACK_MODE    = false
```

#### Polling Rules

1. **Incremental only** — use timestamp (`updated_at`) or monotonic ID checkpoints
2. **Bounded queries** — every query includes `LIMIT` and time-window constraints
3. **Deterministic ordering** — ORDER BY cursor column ASC, primary key ASC
4. **Explicit column selection** — no `SELECT *`, only declared columns per mapping
5. **Indexed field filters only** — WHERE clauses target indexed columns
6. **Idempotent ingestion** — re-processing the same row produces the same result
7. **Connection lifecycle** — connections released after each poll cycle, no persistent sessions

#### Throttling & Backoff

- Adaptive backoff on latency spikes (>2x baseline)
- Circuit breaker activation after 3 consecutive failures
- Exponential backoff: 1s → 2s → 4s → 8s → max 60s
- Query timeout enforcement: 15 seconds per query
- Maximum row cap: SYNC_BATCH_SIZE per table per cycle

#### Failure Behavior

- **Fail closed on ambiguity** — if the system cannot determine safety, deny
- **No partial writes** — incomplete sync cycles are rolled back
- **No fallback mutation** — failure never triggers write operations
- **Checkpoint preserved** — failed cycles do not advance the watermark

---

### 11.4 Credential Governance (Strict)

```
CREDENTIAL_STORAGE    = RUNTIME_INJECTION_ONLY
CREDENTIAL_LOGGING    = PROHIBITED
CREDENTIAL_CACHING    = PROHIBITED
CREDENTIAL_PERSISTENCE = PROHIBITED
```

#### Rules

1. All Qwickservices credentials are injected at runtime via environment variables
2. Credentials are NEVER logged, printed, cached to disk, or persisted in config files
3. Credentials are NEVER committed to version control
4. In-memory usage only — cleared on process shutdown
5. Support for rotation without downtime (pool recreation on config change)
6. Emergency revocation path: set `SYNC_ENABLED=false` for immediate halt

#### Rotation Policy

- Rotation interval: 30-60 days (production)
- Emergency rotation: immediate on suspected compromise
- Post-rotation validation: automated connection test
- All previously exposed credentials MUST be rotated before integration activation

#### Explicit Prohibitions

- No hard-coded secrets anywhere in the codebase
- No secrets in `.env.example` or `.env.production.example` files
- No secrets in Docker images, CI/CD logs, or build artifacts
- No SSH tunnels with stored credentials

---

### 11.5 Write Suppression Guard (Defense in Depth)

The CIS integration enforces write suppression at **four layers**:

| Layer | Control | Implementation |
|-------|---------|----------------|
| 1. Database Role | SELECT-only privileges | `cis_readonly` MySQL user (setup script) |
| 2. Network | Outbound-only from CIS, IP allowlisting | Firewall rules, TLS required |
| 3. Application | SQL verb validation guard | `externalQuery()` in `sync/connection.ts` |
| 4. Driver | Read-only connection configuration | Pool configured with read-only intent |

If ANY layer detects a write attempt:
- The operation is blocked
- The connection is terminated
- A security alert is emitted
- The incident is logged to audit

---

### 11.6 Observability Mandate

CIS logs the following **metadata only** for each sync query:

| Field | Logged | Example |
|-------|--------|---------|
| Query identifier | Yes | `sync:bookings:incremental` |
| Execution timestamp | Yes | `2026-02-14T12:00:00.000Z` |
| Execution duration (ms) | Yes | `45` |
| Row count returned | Yes | `23` |
| Latency category | Yes | `normal` / `elevated` / `critical` |
| Error classification | Yes | `none` / `timeout` / `auth_failure` |

**No raw query text, parameter values, or result data is logged.**

#### Anomaly Detection Thresholds

| Metric | Alert Threshold |
|--------|----------------|
| Error rate | >5% over 5-minute window |
| Query latency | >2x rolling baseline |
| Authentication failures | >1 within 10-minute window |
| Query volume | >3x expected baseline (potential abuse) |

---

### 11.7 Schema Drift Protection

CIS MUST NOT automatically adapt to schema changes in Qwickservices.

#### Detection

- Metadata checksum validation against expected column set
- Field mapping validation on each sync cycle
- Column type verification

#### Response to Drift

1. **Graceful degradation** — skip affected table, continue others
2. **Alert** — notify operations team of schema mismatch
3. **No automatic remediation** — never ALTER, CREATE, or modify Qwickservices
4. **Manual review required** — human must update mapping configuration

---

### 11.8 Data Scope (Explicit Allowlist)

CIS is authorized to read the following tables from Qwickservices:

| Table | Primary Key | Cursor Column | Purpose |
|-------|-------------|---------------|---------|
| `categories` | `category_id` | `updated_at` | Service classification |
| `users` | `user_id` | `updated_at` | Customer profiles |
| `providers` | `provider_id` | `updated_at` | Provider profiles & KYC |
| `transactions` | `transaction_id` | `created_at` | Payment records |
| `bookings` | `booking_id` | `updated_at` | Service bookings |
| `messages` | `message_id` | `timestamp` | Communication records |
| `ratings` | `id` | `created_at` | Review data |
| `disputes` | `id` | `updated_at` | Dispute records |

**No other tables may be accessed.** Adding a new table requires explicit update to this document, `sync/mappings.ts`, and the `cis_readonly` database role grants.

#### Sensitive Field Handling

- PII fields (email, phone) are used for identity resolution only
- No raw PII is exposed to the dashboard or external systems
- Field-level exclusion enforced in mapping configuration

---

### 11.9 Runtime Operational Flow

Each sync cycle follows this exact sequence:

```
1. Verify SYNC_ENABLED=true
2. Inject credentials from environment
3. Establish TLS-secured database connection
4. Validate connection is read-only (privilege check)
5. For each enabled table:
   a. Load checkpoint (watermark) from CIS internal storage
   b. Construct bounded SELECT query with explicit columns
   c. Validate SQL verb before execution
   d. Execute query with timeout enforcement
   e. Validate result integrity (row count, schema match)
   f. Normalize data inside CIS using mapping transforms
   g. Persist normalized events to CIS internal PostgreSQL only
   h. Update checkpoint watermark
6. Release database connection
7. Log sync metadata (no raw data)
8. Wait for next interval
```

**No persistent connections.** Each cycle acquires and releases.

---

### 11.10 Explicit Prohibitions (Global)

The following are **permanently prohibited** in the CIS ↔ Qwickservices integration:

1. Webhooks into Qwickservices
2. API calls to Qwickservices application layer
3. Schema modification of any kind
4. Index creation on Qwickservices database
5. Query plan hints that alter Qwickservices DB behavior
6. Stored credentials in configuration files or code
7. Hard-coded secrets anywhere in the codebase
8. Persistent SSH tunnels to Qwickservices
9. Bidirectional synchronization
10. Any remediation, repair, or correction inside Qwickservices
11. Caching of Qwickservices credentials
12. Logging of raw query parameters or result data
13. Dynamic SQL construction (all queries are static templates)
14. Temporary table creation on Qwickservices
15. Transaction BEGIN/COMMIT on Qwickservices (read-only single statements only)

---

### 11.11 Pre-Activation Validation Requirements

Before enabling `SYNC_ENABLED=true` in production, the following MUST be verified:

#### Security Gates

- [ ] `cis_readonly` database role provisioned with SELECT-only grants
- [ ] Network rules restrict CIS to Qwickservices DB endpoint only
- [ ] TLS enforced on all database connections
- [ ] Credentials stored in environment variables only (not in files)
- [ ] All previously exposed credentials have been rotated
- [ ] SQL verb validation guard is active and tested

#### Functional Gates

- [ ] Privilege verification test passes (negative mutation test)
- [ ] Load simulation validates acceptable impact on Qwickservices
- [ ] All 8 table mappings return valid data
- [ ] Checkpoint tracking works correctly across restart
- [ ] Schema drift detection triggers on column mismatch

#### Operational Gates

- [ ] Observability dashboards active (sync status, latency, errors)
- [ ] Alerting configured for anomaly thresholds
- [ ] Revocation tested successfully (`SYNC_ENABLED=false` halts within 1 cycle)
- [ ] Rollback procedure documented and tested

#### Approval

- [ ] Security review sign-off
- [ ] Credential rotation policy approved
- [ ] Audit logging validation complete

---

### 11.12 Credential Rotation Enforcement

**CRITICAL:** All previously exposed credentials (including those visible in screenshots, documentation, or commit history) MUST be rotated before integration activation.

This includes:
- Qwickservices MySQL `cis_readonly` password
- CIS PostgreSQL `qwick_cis_app` password
- JWT_SECRET, HMAC_SECRET, WEBHOOK_SECRET
- Hostinger API token
- Any SSH keys that may have been exposed

Rotation procedure:
1. Generate new credentials using `openssl rand -hex 32`
2. Update Qwickservices database role password
3. Update CIS environment variables on VPS
4. Verify connection with new credentials
5. Revoke old credentials
6. Confirm old credentials no longer grant access

**Integration MUST NOT be activated until rotation is complete.**

---

**Status:** Factory Initialized — Integration Governance Active — Awaiting Pre-Activation Validation
