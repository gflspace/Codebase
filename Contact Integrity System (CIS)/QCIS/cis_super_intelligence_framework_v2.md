# CIS Super-Intelligence Framework v2.0

> **Status:** Authoritative System Document — Supersedes `unified_cis_super_intelligence_framework.md`
> **System:** QwickServices Contact Integrity System (CIS)
> **Classification:** Chief Architecture Specification
> **Created:** 2026-02-09
> **Baseline:** v1.0 Unified Framework + Production Implementation Audit

---

## 0. What This Document Is

This is not a summary. This is a **re-architecture** of CIS from a detection-and-enforcement system into a **self-evolving marketplace intelligence operating system**.

The previous framework established vision. This document translates that vision into **executable engines, services, pipelines, and control loops** grounded in the reality of what has been built.

**Current Implementation State (verified):**
- Detection pipeline: fully operational (regex, keywords, obfuscation, context analysis)
- Scoring engine: fully operational (three-layer trust, tier assignment, trend tracking)
- Enforcement engine: fully operational (graduated, shadow mode, kill switch, appeals)
- Database: 9 migrations, 14 tables, all relationships enforced
- API: 15 routes, JWT + HMAC auth, full RBAC
- LLM integration: **zero** — no AI models are called anywhere in the system
- Learning loops: **zero** — no outcome tracking, no weight tuning, no self-improvement
- Predictive capabilities: **zero** — system is entirely reactive to events

This document closes those gaps.

---

## 1. CIS Super-Intelligence Vision (vNext)

### 1.1 The Shift

| Dimension | v1 (Current) | v2 (Target) |
|---|---|---|
| **Posture** | Reactive — responds to events | Anticipatory — predicts before events |
| **Decision Model** | Threshold-based rules | Reasoning-driven with confidence scoring |
| **Intelligence** | Pattern matching | Hypothesis generation + counterfactual reasoning |
| **Learning** | Static weights | Outcome-driven self-tuning |
| **LLM Role** | Not used | First-class reasoning component |
| **Memory** | Flat database queries | Layered hot/warm/cold knowledge system |
| **Scope** | Abuse detection only | Full marketplace intelligence (risk + opportunity) |

### 1.2 The Operating Principle

CIS is the **cognitive nervous system** of the QwickServices marketplace. It does not watch the system — it thinks for it.

Three axioms:

1. **Trust is a living trajectory, not a static score.** It has velocity, acceleration, and momentum.
2. **Every signal is a hypothesis, not a verdict.** Confidence is earned through corroboration across dimensions and time.
3. **The system must get smarter every day.** Every enforcement outcome, every appeal decision, every user recovery is training data.

---

## 2. Upgraded Intelligence Architecture

### 2.1 System Topology

```
┌──────────────────────────────────────────────────────────────────────┐
│                     QwickServices Platform                          │
│            (Sidebase — System of Record)                            │
│  Users ─── Messages ─── Transactions ─── Accounts ─── Sessions     │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ Domain Events (immutable, replay-capable)
                         ▼
              ┌─────────────────────┐
              │   Ingestion Gateway │  Normalize, validate, route
              └──────┬──────────────┘
                     │
        ┌────────────┼─────────────────┐
        ▼            ▼                 ▼
┌───────────┐ ┌────────────┐ ┌──────────────────┐
│ Detection │ │  Feature   │ │   LLM Reasoning  │
│  Engine   │ │  Synthesis │ │     Gateway      │
│ (Existing)│ │  Engine    │ │ (OpenAI + Claude)│
└─────┬─────┘ └──────┬─────┘ └────────┬─────────┘
      │               │                │
      └───────────┬───┘────────────────┘
                  ▼
        ┌──────────────────┐
        │  Intelligence    │  Aggregate, correlate, reason
        │     Cortex       │
        └────────┬─────────┘
                 │
        ┌────────┼──────────────┐
        ▼        ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐
│  Scoring │ │ Decision │ │  Prediction  │
│  Engine  │ │ Reasoner │ │    Engine    │
│(Existing)│ │  (NEW)   │ │    (NEW)     │
└────┬─────┘ └─────┬────┘ └──────┬───────┘
     │              │             │
     └──────────┬───┘─────────────┘
                ▼
      ┌──────────────────┐
      │   Enforcement    │  Execute, notify, log
      │     Engine       │
      │   (Existing)     │
      └────────┬─────────┘
               │
     ┌─────────┼──────────────┐
     ▼         ▼              ▼
┌─────────┐ ┌──────────┐ ┌──────────────┐
│ Action  │ │ Learning │ │  Knowledge   │
│ Logger  │ │   Loop   │ │   Store      │
│(Exists) │ │  (NEW)   │ │   (NEW)      │
└─────────┘ └──────────┘ └──────────────┘
               │
               ▼
      ┌──────────────────┐
      │  Admin Dashboard │  Investigate, decide, override
      │   (Existing)     │
      └──────────────────┘
```

### 2.2 New Components (Five Systems to Build)

**1. Feature Synthesis Engine**
Transforms raw signals into composite features that no single detector produces.

- Cross-signal correlation (message timing + transaction failure + contact sharing = compound risk)
- Temporal feature construction (velocity of escalation, decay curves)
- Entity relationship features (counterparty risk contamination, cluster membership)
- Economic context features (wallet volatility, fee-avoidance ratio, payment method entropy)

**2. LLM Reasoning Gateway**
Routes reasoning tasks to the appropriate model with structured prompts, context scoping, and cost awareness.

- Intent explanation generation
- Policy interpretation for edge cases
- Appeal summarization and recommendation
- Hypothesis generation from ambiguous signal clusters
- Natural language audit narratives

**3. Decision Reasoner**
Multi-objective decision engine that selects optimal actions with explainable rationale.

- Weighs competing objectives: safety vs. retention vs. revenue vs. fairness
- Generates confidence scores for every recommendation
- Produces human-readable reason chains
- Supports counterfactual reasoning ("what if we do nothing?")

**4. Prediction Engine**
Generates forward-looking risk assessments without waiting for violations.

- Risk trajectory projection (where is this user heading?)
- Churn risk correlation (users who leave vs. users who escalate)
- Economic stress detection (behavioral proxies for financial pressure)
- Opportunity intelligence (users ready for trust elevation, not just demotion)

**5. Learning Loop**
Closes the feedback cycle between enforcement outcomes and system behavior.

- Tracks enforcement outcomes (did the warning work? did the user appeal? did they churn?)
- Adjusts scoring weights based on measured accuracy
- Evolves detection thresholds based on false-positive/negative rates
- Refines LLM prompts based on reviewer agreement rates

---

## 3. Intelligence Core — Signal to Decision Pipeline

### 3.1 Signal Ingestion Layer

**What Exists:** Event bus consuming `message.created`, `transaction.*`, `user.*` events.

**What's Added:**

```
┌─────────────────────────────────────────────────────┐
│              Ingestion Gateway                       │
├─────────────────────────────────────────────────────┤
│ 1. Event Validation    — Schema check, dedup        │
│ 2. Event Enrichment    — Attach user context,       │
│                          session state, history ref  │
│ 3. Event Classification — Route to appropriate      │
│                           processing pipeline        │
│ 4. Event Buffering     — Windowed batching for      │
│                          context-aware analysis      │
└─────────────────────────────────────────────────────┘
```

**New Event Types to Ingest:**
- `session.started`, `session.ended` — session-level behavior aggregation
- `payment_method.added`, `payment_method.changed` — financial behavior signals
- `profile.updated` — identity change detection
- `search.performed` — intent signals before contact
- `review.submitted`, `review.received` — reputation manipulation detection

### 3.2 Feature Synthesis Engine

Raw signals are necessary but insufficient. The Feature Synthesis Engine constructs **composite features** that encode meaning no single signal carries.

**Feature Categories:**

| Category | Features | Source Signals |
|---|---|---|
| **Velocity** | Signal acceleration rate, escalation speed | Signal timestamps, tier history |
| **Compound** | Contact + payment + timing triple match | Detection output correlation |
| **Relational** | Counterparty risk score, cluster membership | Network graph queries |
| **Economic** | Fee-avoidance ratio, payment entropy | Transaction patterns |
| **Temporal** | Time-of-day risk profile, day-of-week patterns | Event timestamps |
| **Behavioral** | Grooming progression score, evasion sophistication index | Behavioral model signals |

**Feature Computation Pipeline:**

```typescript
interface SynthesizedFeature {
  feature_id: string;
  entity_id: string;           // user or entity being scored
  feature_type: string;        // e.g., 'velocity', 'compound', 'relational'
  feature_name: string;        // e.g., 'escalation_velocity'
  value: number;               // normalized 0.0 - 1.0
  confidence: number;          // how reliable this feature is
  contributing_signals: string[]; // signal IDs that produced this feature
  window: {
    start: string;             // ISO timestamp
    end: string;
    duration_seconds: number;
  };
  computed_at: string;
}
```

### 3.3 Trust & Risk Vector Computation

**What Exists:** Three-layer trust score (Operational 0.30, Behavioral 0.40, Network 0.30).

**What's Upgraded:** Trust Score becomes a **Trust Vector** — a multi-dimensional representation that captures direction, not just magnitude.

```
TrustVector(entity, t) = {
  score: number,           // 0-100 composite (backward compatible)
  tier: string,            // monitor | low | medium | high | critical

  // Dimensional decomposition
  dimensions: {
    operational: number,   // escrow, cancellations, payment alignment
    behavioral: number,    // signal patterns, escalation, obfuscation
    network: number,       // counterparty risk, device clusters, collusion
  },

  // Temporal dynamics (NEW)
  velocity: number,        // rate of score change (positive = improving)
  acceleration: number,    // rate of velocity change (momentum)
  trend: 'stable' | 'improving' | 'degrading' | 'volatile',

  // Decay modeling (NEW)
  decay_applied: number,   // how much historical decay has been applied
  recovery_potential: number, // estimated recovery capacity based on behavior

  // Confidence (NEW)
  confidence: number,      // 0.0-1.0: how much data backs this vector
  signal_count: number,    // total signals contributing
  last_signal_at: string,  // recency of evidence
}
```

**Temporal Decay Model:**

```
decay(signal, age_days) = signal.weight * e^(-λ * age_days)

Where:
  λ = decay_rate (configurable per signal type)
  - Low-severity signals: λ = 0.05 (half-life ≈ 14 days)
  - Medium signals: λ = 0.02 (half-life ≈ 35 days)
  - High/critical signals: λ = 0.005 (half-life ≈ 139 days)
  - Coordinated abuse: λ = 0.001 (half-life ≈ 693 days — near permanent)
```

**Momentum Model:**

```
momentum(entity) = Σ(recent_signals * recency_weight) - Σ(decayed_signals * age_penalty)

If momentum > threshold_escalating → trend = 'degrading'
If momentum < threshold_recovering → trend = 'improving'
If |momentum| < threshold_stable → trend = 'stable'
If variance(momentum, window) > threshold_volatile → trend = 'volatile'
```

---

## 4. Advanced Decision & Reasoning Engine

### 4.1 Architecture

The Decision & Reasoning Engine (DRE) replaces simple tier-to-action mapping with **multi-objective reasoning**.

```
┌─────────────────────────────────────────────────┐
│           Decision & Reasoning Engine            │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │ Policy       │    │  Objective           │   │
│  │ Interpreter  │───▶│  Balancer            │   │
│  └──────────────┘    └──────────┬───────────┘   │
│                                 │               │
│  ┌──────────────┐    ┌──────────▼───────────┐   │
│  │ Context      │───▶│  Action              │   │
│  │ Assembler    │    │  Selector            │   │
│  └──────────────┘    └──────────┬───────────┘   │
│                                 │               │
│  ┌──────────────┐    ┌──────────▼───────────┐   │
│  │ Counterfactual│   │  Explainability      │   │
│  │ Simulator    │───▶│  Generator           │   │
│  └──────────────┘    └──────────────────────┘   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 4.2 Multi-Objective Decision Logic

Every enforcement decision balances competing objectives:

```typescript
interface DecisionObjectives {
  safety: number;      // Protect users and platform integrity (weight: 0.40)
  fairness: number;    // Proportionality, avoid over-enforcement (weight: 0.25)
  revenue: number;     // Revenue protection vs. user retention (weight: 0.15)
  learning: number;    // Information value of the action for the system (weight: 0.10)
  efficiency: number;  // Operational cost of the action (weight: 0.10)
}

// Action selection maximizes: Σ(objective_i * weight_i * confidence_i)
```

**Decision Output Contract:**

```typescript
interface EnforcementDecision {
  decision_id: string;
  entity_id: string;
  recommended_action: string;     // soft_warning | hard_warning | restrict | escalate | suspend
  confidence: number;             // 0.0-1.0
  reason_chain: string[];         // ordered list of reasoning steps
  reason_code: string;            // machine-readable
  reason_human: string;           // human-readable paragraph
  contributing_signals: string[]; // traceability
  objectives_impact: DecisionObjectives;  // how this action scores on each objective
  counterfactual: {
    do_nothing: string;           // projected outcome if no action taken
    alternative_actions: {
      action: string;
      projected_outcome: string;
    }[];
  };
  requires_human_approval: boolean;
  approval_reason: string | null;
}
```

### 4.3 Policy Interpretation Layer

Policies are not hardcoded if-else chains. They are **structured documents** interpreted by the reasoning engine.

```yaml
# Example: Policy for off-platform payment detection
policy:
  id: POL-002-PAYMENT-REDIRECT
  version: 3
  effective_date: "2026-01-15"

  trigger:
    signal_types: [TX_REDIRECT_ATTEMPT, PAYMENT_EXTERNAL]
    minimum_confidence: 0.70
    minimum_signals: 1

  context_modifiers:
    - condition: user.tenure_days < 30
      effect: severity + 1  # New users get tighter scrutiny
    - condition: user.prior_warnings > 0
      effect: severity + 1  # Repeat behavior escalates
    - condition: signal.confidence < 0.80
      effect: prefer_warning_over_restriction  # Low confidence = softer action

  action_map:
    low:
      first_offense: soft_warning
      repeat: hard_warning
    medium:
      first_offense: hard_warning
      repeat: temporary_restriction
    high:
      any: admin_escalation

  constraints:
    - never: permanent_ban
    - requires_human: [account_suspension]
    - always: audit_log + reason_code + appeal_path
```

### 4.4 Explainability Engine

Every decision must be explainable at three levels:

1. **User Level:** "Your message was flagged because it appeared to share payment instructions outside the platform."
2. **Reviewer Level:** "Signal TX_REDIRECT_ATTEMPT (confidence 0.87) + PAYMENT_EXTERNAL (0.91) detected in conversation #abc123. User has 1 prior warning. Policy POL-002 recommends hard_warning."
3. **Audit Level:** Full signal chain, feature values, policy version, model outputs, decision timestamp, approver ID.

### 4.5 Counterfactual Reasoning

Before every enforcement decision, the system generates a "do nothing" projection:

```
Counterfactual("do_nothing") = {
  30_day_probability: {
    user_completes_circumvention: 0.72,
    revenue_loss_estimate: $45-$120,
    user_churns: 0.15,
    behavior_escalates: 0.68,
    other_users_affected: 1.3 (estimated network spread)
  }
}
```

This enables **proportional intervention** — if the cost of action exceeds the cost of inaction, the system defaults to monitoring.

---

## 5. Multi-LLM Orchestration Blueprint

### 5.1 Model Responsibility Matrix

| Task | Primary Model | Rationale | Fallback |
|---|---|---|---|
| **Real-time intent detection** | OpenAI GPT-4o-mini | Low latency, cost-efficient for high-volume | Rule engine (no LLM) |
| **Deep behavioral reasoning** | Claude Sonnet 4.5 | Strong at long-context pattern analysis | OpenAI GPT-4o |
| **Policy interpretation** | Claude Sonnet 4.5 | Precise instruction following, structured output | OpenAI GPT-4o |
| **Appeal analysis & summary** | Claude Sonnet 4.5 | Nuanced reasoning, empathy calibration | OpenAI GPT-4o |
| **Audit narrative generation** | Claude Haiku 4.5 | Fast, cost-efficient structured summaries | GPT-4o-mini |
| **Hypothesis generation** | OpenAI GPT-4o | Creative abductive reasoning | Claude Sonnet 4.5 |
| **Signal explanation** | OpenAI GPT-4o-mini | Concise, user-facing language | Claude Haiku 4.5 |
| **Counterfactual simulation** | Claude Sonnet 4.5 | Complex multi-variable projection | OpenAI GPT-4o |
| **Adversary pattern evolution** | OpenAI GPT-4o | New evasion technique identification | Claude Sonnet 4.5 |

### 5.2 LLM Gateway Architecture

```
┌──────────────────────────────────────────────────┐
│              LLM Reasoning Gateway                │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────────┐                             │
│  │  Request Router  │ ← Task type + priority      │
│  └────────┬─────────┘                             │
│           │                                       │
│  ┌────────▼─────────┐   ┌───────────────────┐    │
│  │  Context Builder │   │  PII Redactor     │    │
│  │  - Scope data    │──▶│  - Strip names    │    │
│  │  - Select window │   │  - Hash IDs       │    │
│  │  - Attach policy │   │  - Mask payments  │    │
│  └──────────────────┘   └────────┬──────────┘    │
│                                  │                │
│  ┌───────────────────────────────▼──────────┐    │
│  │           Prompt Template Engine          │    │
│  │  - Versioned prompts per task type        │    │
│  │  - Structured output schemas (JSON)       │    │
│  │  - Few-shot examples                      │    │
│  └───────────────────────┬──────────────────┘    │
│                          │                        │
│         ┌────────────────┼────────────────┐      │
│         ▼                ▼                ▼      │
│  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │  OpenAI    │  │  Claude    │  │ Fallback  │  │
│  │  Adapter   │  │  Adapter   │  │ (Rules)   │  │
│  └──────┬─────┘  └──────┬─────┘  └─────┬─────┘  │
│         │               │              │          │
│  ┌──────▼───────────────▼──────────────▼──────┐  │
│  │          Response Validator                 │  │
│  │  - Schema validation                        │  │
│  │  - Confidence extraction                    │  │
│  │  - Hallucination guard                      │  │
│  │  - Cost tracking                            │  │
│  └─────────────────────┬──────────────────────┘  │
│                        │                          │
│  ┌─────────────────────▼──────────────────────┐  │
│  │          Decision Audit Logger              │  │
│  │  - Model used, prompt version, tokens       │  │
│  │  - Latency, cost, confidence                │  │
│  │  - Redacted input/output hash               │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
└──────────────────────────────────────────────────┘
```

### 5.3 Prompt Orchestration Patterns

**Pattern 1: Single-Model Inference**
Used for: real-time intent detection, signal explanation
```
[Context Scope] → [Prompt Template] → [Model] → [Validate] → [Log]
```

**Pattern 2: Chain-of-Thought Reasoning**
Used for: complex case analysis, appeal resolution
```
[Context] → [Model A: Hypothesis] → [Model A: Evidence Evaluation] → [Model A: Recommendation] → [Validate] → [Log]
```

**Pattern 3: Adversarial Validation**
Used for: high-stakes decisions (suspension, ban recommendation)
```
[Context] → [Model A: Recommendation] → [Model B: Challenge] → [Reconcile] → [Log]
```
If Model A (e.g., OpenAI) recommends suspension and Model B (e.g., Claude) disagrees, the decision escalates to human review with both rationales attached.

**Pattern 4: Ensemble Consensus**
Used for: threshold-boundary cases, ambiguous signals
```
[Context] → [Model A: Score] + [Model B: Score] → [Weighted Average] → [Log]
```

### 5.4 Cost & Latency Management

```typescript
interface LLMBudget {
  daily_spend_limit_usd: number;        // e.g., 50.00
  per_request_ceiling_usd: number;       // e.g., 0.10
  latency_ceiling_ms: {
    real_time: 2000,                     // intent detection
    near_real_time: 10000,               // scoring augmentation
    batch: 60000,                        // appeal analysis, reports
  };
  fallback_policy: 'degrade_to_rules' | 'queue_for_batch' | 'skip';
}
```

**Routing Decision Tree:**
```
if (task.priority == 'real_time' && budget.remaining > threshold):
  → Use cheapest capable model (GPT-4o-mini / Haiku)
elif (task.priority == 'near_real_time'):
  → Use primary model for task type
elif (budget.remaining < 20%):
  → Degrade to rule-based fallback
elif (task.requires_adversarial_validation):
  → Use both models, compare
else:
  → Queue for batch processing
```

### 5.5 Security & Governance Controls

**API Key Management:**
```
OPENAI_API_KEY = ${OPENAI_API_KEY}
ANTHROPIC_API_KEY = ${ANTHROPIC_API_KEY}
```
Keys stored exclusively in environment variables or secret manager. Never in code, config files, prompts, or documents.

**PII Redaction (Mandatory Before Any LLM Call):**
```typescript
interface RedactionRules {
  always_redact: [
    'full_name',         // → [USER_A], [USER_B]
    'email',             // → [EMAIL_REDACTED]
    'phone',             // → [PHONE_REDACTED]
    'payment_details',   // → [PAYMENT_REDACTED]
    'ip_address',        // → [IP_REDACTED]
    'physical_address',  // → [ADDRESS_REDACTED]
  ];
  hash_identifiers: [
    'user_id',           // → hash(user_id)[:8]
    'transaction_id',    // → hash(tx_id)[:8]
  ];
  preserve: [
    'signal_type',
    'confidence_score',
    'risk_tier',
    'policy_references',
    'timestamps',        // Relative, not absolute when possible
  ];
}
```

**Audit Log for Every LLM Call:**
```typescript
interface LLMAuditEntry {
  call_id: string;
  timestamp: string;
  model_provider: 'openai' | 'anthropic';
  model_id: string;
  task_type: string;
  prompt_template_version: string;
  input_token_count: number;
  output_token_count: number;
  latency_ms: number;
  cost_usd: number;
  confidence_returned: number;
  decision_used: boolean;      // Did the system act on this output?
  human_override: boolean;     // Did a human override the LLM output?
  redaction_applied: boolean;
  correlation_id: string;      // Links to the enforcement decision
}
```

**Role-Based Model Access:**
| Role | Can Trigger LLM | Can View LLM Output | Can Modify Prompts |
|---|---|---|---|
| System (automated) | Yes — scoped to task | Audit log only | No |
| Trust & Safety | Yes — case analysis | Full (redacted) | No |
| Ops | No | Aggregate metrics | No |
| Legal/Compliance | Yes — appeal review | Full (redacted) | No |
| Engineering | N/A | Full | Yes (versioned, reviewed) |

---

## 6. Knowledge, Memory & Learning Systems

### 6.1 Layered Memory Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Memory System                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  HOT MEMORY (Operational — sub-second access)        │
│  ├─ Active investigations and open cases             │
│  ├─ Current enforcement actions in effect             │
│  ├─ Real-time event buffer (last 15 minutes)         │
│  ├─ Active session states                            │
│  └─ In-flight LLM requests                           │
│  Storage: Redis / In-memory cache                    │
│  TTL: Minutes to hours                               │
│                                                      │
│  WARM MEMORY (Behavioral — indexed query access)     │
│  ├─ Rolling risk vectors (30-day window)             │
│  ├─ Feature synthesis outputs                        │
│  ├─ Signal aggregates per entity                     │
│  ├─ Trend vectors and momentum calculations          │
│  ├─ Counterparty relationship graphs                 │
│  └─ Recent enforcement outcomes + user responses     │
│  Storage: PostgreSQL (existing) + materialized views │
│  TTL: 30-90 days active, then archived               │
│                                                      │
│  COLD MEMORY (Knowledge — batch query access)        │
│  ├─ Adversary Pattern Library (evolving)             │
│  ├─ Historical case outcomes and precedents          │
│  ├─ Policy version history                           │
│  ├─ Scoring weight evolution log                     │
│  ├─ False positive / negative archives               │
│  ├─ Appeal decision precedents                       │
│  └─ Seasonal and economic trend baselines            │
│  Storage: PostgreSQL archive tables + object storage │
│  TTL: Years (with privacy-compliant expiration)      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 6.2 Adversary Pattern Library

The system maintains a **living library** of known and emerging adversary tactics.

```typescript
interface AdversaryPattern {
  pattern_id: string;
  name: string;                    // e.g., "progressive_disclosure"
  category: string;                // e.g., "obfuscation", "collusion", "whitewashing"
  description: string;
  detection_signals: string[];     // signal types that indicate this pattern
  confidence_threshold: number;    // minimum confidence to flag
  evasion_techniques: string[];    // known ways adversaries adapt this pattern
  first_observed: string;
  last_observed: string;
  occurrence_count: number;
  effectiveness_score: number;     // how often detection catches this (0-1)
  evolution_notes: string[];       // how this pattern has changed over time
  related_patterns: string[];      // pattern_ids of similar tactics
  status: 'active' | 'declining' | 'emerging' | 'deprecated';
}
```

**Pattern Evolution Process:**
1. New evasion detected → signal with low confidence
2. LLM Gateway generates hypothesis about the technique
3. Human reviewer validates or rejects
4. If validated, new pattern entry created or existing pattern updated
5. Detection engine updated with new rules/patterns
6. Effectiveness tracked over subsequent encounters

### 6.3 Institutional Memory (Case Precedents)

```typescript
interface CasePrecedent {
  precedent_id: string;
  case_id: string;
  scenario_description: string;    // "User shared spaced phone number after 2 warnings"
  signals_present: string[];
  risk_tier: string;
  action_taken: string;
  outcome: string;                 // "User appealed, appeal denied, behavior stopped"
  reviewer_notes: string;
  policy_references: string[];
  reuse_count: number;             // How many times this precedent guided a decision
  last_referenced: string;
}
```

### 6.4 Memory Pruning & Reinforcement

**Pruning Rules:**
- Hot → Warm: After case resolution or enforcement expiration
- Warm → Cold: After 90 days of inactivity on the entity
- Cold → Archive: After retention period expires
- Archive → Delete: Per GDPR/privacy policy schedules

**Reinforcement Rules:**
- Precedent referenced in decision → increment `reuse_count`, refresh `last_referenced`
- Adversary pattern detected → refresh `last_observed`, increment `occurrence_count`
- Pattern not seen in 180 days → status transitions to `declining`
- Overridden decision → flag for weight recalibration

---

## 7. Learning & Self-Improvement Loop

### 7.1 Outcome Tracking

Every enforcement action generates an **outcome record** after a defined observation window.

```typescript
interface EnforcementOutcome {
  outcome_id: string;
  decision_id: string;
  action_taken: string;
  observation_window_days: number;   // 7, 14, 30
  outcome_signals: {
    behavior_stopped: boolean;       // Did the risky behavior cease?
    behavior_escalated: boolean;     // Did the user escalate?
    user_appealed: boolean;
    appeal_result: string | null;    // approved | denied | null
    user_churned: boolean;           // Did the user leave the platform?
    user_recovered: boolean;         // Did the user return to good standing?
    revenue_impact: number;          // Estimated $ impact
    repeat_offense: boolean;         // Same violation type recurred?
  };
  classification: 'true_positive' | 'false_positive' | 'true_negative' | 'effective_intervention' | 'ineffective_intervention';
  computed_at: string;
}
```

### 7.2 Weight & Threshold Tuning

**What Gets Tuned:**

| Parameter | Current State | Tuning Mechanism |
|---|---|---|
| Trust score weights (O/B/N: 0.30/0.40/0.30) | Static | Gradient adjustment based on false positive/negative rates |
| Detection confidence thresholds | Static per signal type | Bayesian updating from outcome data |
| Enforcement escalation thresholds | Static tier mapping | Effectiveness-weighted adjustment |
| Temporal decay rates (λ) | Proposed but not implemented | Calibrated against recovery curves |
| Policy severity modifiers | Static | Adjusted based on appeal overturn rates |

**Tuning Process:**

```
1. Collect outcomes for last 30 days
2. Calculate per-signal-type accuracy:
   - True Positive Rate = confirmed violations / total flags
   - False Positive Rate = overturned / total flags
   - Intervention Effectiveness = behavior stopped / total actions
3. For each parameter:
   - If FPR > target → relax threshold (increase confidence requirement)
   - If TPR < target → tighten threshold (lower confidence requirement)
   - If effectiveness < target → consider different action type
4. Generate proposed changes
5. Human review of proposed changes
6. Apply changes to staging environment
7. A/B comparison with control
8. Promote or rollback
```

**Constraints:**
- Maximum adjustment per cycle: 10% of current value
- Human approval required for any weight change > 5%
- All changes logged with before/after values and justification
- Rollback capability for any tuning change

### 7.3 Prompt Evolution

LLM prompts are treated as **versioned artifacts** with measurable performance.

```typescript
interface PromptVersion {
  prompt_id: string;
  version: number;
  task_type: string;              // e.g., "intent_detection", "appeal_analysis"
  template: string;               // The actual prompt text
  expected_output_schema: object; // JSON schema for validation
  performance_metrics: {
    accuracy: number;             // Agreement with human reviewers
    latency_p50_ms: number;
    latency_p99_ms: number;
    cost_per_call_usd: number;
    hallucination_rate: number;   // Output failed schema validation
  };
  a_b_test_id: string | null;
  status: 'active' | 'testing' | 'deprecated';
  created_by: string;
  approved_by: string;
  created_at: string;
}
```

### 7.4 Human-in-the-Loop Feedback Ingestion

```
┌───────────────────────────────────────────┐
│         Human Feedback Sources             │
├───────────────────────────────────────────┤
│                                            │
│  1. Appeal Decisions                       │
│     → Appeal approved = potential FP       │
│     → Appeal denied = confirmed TP         │
│                                            │
│  2. Reviewer Overrides                     │
│     → System recommended X, human chose Y  │
│     → Logged as training signal             │
│                                            │
│  3. Case Resolution Notes                  │
│     → Free-text reasoning from reviewers   │
│     → Parsed by LLM for pattern extraction │
│                                            │
│  4. Threshold Override Requests            │
│     → "This signal fires too often"        │
│     → Queued for calibration review        │
│                                            │
└───────────────────────────────────────────┘
```

---

## 8. Autonomous & Proactive Capabilities

### 8.1 Pre-Violation Detection

The system generates alerts **before violations occur** by recognizing precursor patterns.

**Precursor Signal Categories:**
- **Grooming Trajectory:** Progressive trust-building language that historically precedes off-platform moves
- **Economic Pressure Indicators:** Wallet volatility, payment method churn, fee sensitivity language
- **Session Pattern Anomalies:** Unusual time-of-day activity, sudden behavioral changes
- **Relationship Escalation:** Rapidly deepening counterparty engagement outside normal patterns

**Proactive Alert Types:**
```typescript
type ProactiveAlert = {
  alert_type: 'predictive';
  entity_id: string;
  predicted_risk: string;         // "off_platform_contact_within_7_days"
  probability: number;            // 0.0 - 1.0
  basis: string[];                // features and patterns driving prediction
  recommended_intervention: string; // "educational_nudge" | "soft_warning" | "monitoring_escalation"
  time_horizon: string;           // "7_days" | "14_days" | "30_days"
  cost_of_inaction: string;       // Human-readable projected impact
};
```

### 8.2 Autonomous Alert Generation

The system generates alerts without human prompts in these scenarios:

| Trigger | Alert | Audience |
|---|---|---|
| Entity risk vector crosses tier boundary | Risk Escalation Alert | Trust & Safety |
| New adversary pattern detected by LLM | Pattern Discovery Alert | Trust & Safety + Engineering |
| False positive rate exceeds threshold | Accuracy Degradation Alert | Ops + Engineering |
| Entity shows recovery trajectory | Recovery Opportunity Alert | Trust & Safety |
| Coordinated behavior cluster identified | Network Alert | Trust & Safety + Legal |
| Enforcement effectiveness drops | Intervention Effectiveness Alert | Trust & Safety + Ops |
| LLM cost approaching budget limit | Budget Alert | Ops + Engineering |
| Appeal overturn rate spikes | Policy Calibration Alert | Legal + Trust & Safety |

### 8.3 Proactive Recommendations

CIS does not only restrict. It also **recommends positive interventions**:

| Signal | Recommendation |
|---|---|
| New user with risk-adjacent behavior | Educational onboarding nudge about platform policies |
| User approaching trust threshold positively | Trust elevation notification, expanded capabilities |
| User recovering from enforcement | Recovery acknowledgment, reduced monitoring |
| Economic stress signals without violation | Proactive support outreach (payment plan, fee guidance) |
| High-trust user with declining engagement | Retention-focused outreach |

### 8.4 "What If We Do Nothing" Simulation

For every medium+ risk scenario, the system generates a projected outcome of inaction:

```typescript
interface InactionProjection {
  entity_id: string;
  current_risk_tier: string;
  projection_window_days: number;

  scenarios: {
    most_likely: {
      probability: number;
      outcome: string;             // "User completes off-platform transaction within 14 days"
      revenue_impact_usd: number;
      user_safety_risk: string;    // "low" | "medium" | "high"
      network_spread_risk: number; // Probability other users are affected
    };
    best_case: {
      probability: number;
      outcome: string;             // "Behavior self-corrects"
    };
    worst_case: {
      probability: number;
      outcome: string;             // "User establishes off-platform channel, recruits others"
      revenue_impact_usd: number;
    };
  };

  recommendation: string;          // Based on expected value calculation
  generated_by: string;            // Model ID
  confidence: number;
}
```

---

## 9. What Changed from the Previous Framework

### New (Did Not Exist in v1)

| Component | Description |
|---|---|
| Feature Synthesis Engine | Composite features from raw signals — velocity, compound, relational, economic |
| LLM Reasoning Gateway | Full multi-model orchestration with routing, redaction, cost management, audit |
| Decision Reasoner | Multi-objective action selection with confidence scoring and counterfactual reasoning |
| Prediction Engine | Forward-looking risk projection before violations occur |
| Learning Loop | Outcome tracking, weight tuning, prompt evolution, human feedback ingestion |
| Hot/Warm/Cold Memory | Layered storage with decay, pruning, and reinforcement |
| Adversary Pattern Library | Living catalog of known and emerging attack patterns |
| Case Precedent System | Institutional memory of past decisions for consistency |
| Proactive Recommendations | Positive interventions (education, trust elevation, recovery support) |
| Inaction Simulation | "What if we do nothing" projections for proportional response |
| Prompt Versioning | LLM prompts as versioned, measurable, evolvable artifacts |
| PII Redaction Pipeline | Mandatory pre-LLM scrubbing with audit trail |
| Adversarial Validation | Cross-model challenge pattern for high-stakes decisions |
| Trust Vector | Multi-dimensional trust with velocity, acceleration, and momentum |

### Enhanced (Existed in v1, Upgraded in v2)

| Component | v1 State | v2 Upgrade |
|---|---|---|
| Trust Score | Three-pillar weighted sum | Trust Vector with velocity, acceleration, momentum, confidence |
| Temporal Decay | Mentioned conceptually | Explicit decay functions with configurable λ per signal severity |
| Risk Assessment | "Vector, not a flag" concept | Full RiskVector with momentum modeling and trend classification |
| Policy Logic | Hardcoded tier-to-action mapping | Structured policy documents interpreted by reasoning engine |
| Explainability | Stated as principle | Three-level explanation engine (user, reviewer, audit) |
| Model Routing | Simple if/else pseudocode | Full gateway with cost/latency awareness, fallback chains, adversarial validation |
| Learning | "Outcomes feed weight rebalancing" | Explicit tuning process with constraints, human approval, A/B testing, rollback |
| Knowledge Objects | YAML concept sketch | Full TypeScript interfaces with lifecycle, evolution tracking, effectiveness scoring |

### Deprecated (Removed from v2)

| Component | Reason |
|---|---|
| Single-score risk flags | Replaced by multi-dimensional Trust Vector |
| Static detection thresholds | Replaced by outcome-driven threshold tuning |
| Punishment-only enforcement | Replaced by proportional + positive intervention model |
| Simple model routing pseudocode | Replaced by full LLM Gateway architecture |
| Implied learning loop | Replaced by explicit outcome tracking and tuning process |

---

## 10. Implementation Roadmap

### Phase 1 — Intelligence Foundation (Weeks 1-4)

**Goal:** Establish the data infrastructure and feature pipeline that all intelligence systems depend on.

**Technical:**
- [ ] Implement Feature Synthesis Engine (velocity, compound, temporal features)
- [ ] Add Trust Vector computation (extend existing scoring with velocity/acceleration/momentum)
- [ ] Create materialized views for warm memory (30-day rolling aggregates)
- [ ] Implement temporal decay functions on signal weights
- [ ] Add new event types to ingestion (session, payment_method, profile events)
- [ ] Create `feature_store` table and `trust_vectors` table

**Organizational:**
- [ ] Define feature ownership (which team maintains which features)
- [ ] Establish baseline metrics (current FPR, TPR, intervention effectiveness)

**Governance:**
- [ ] Document all new data processing purposes (GDPR compliance)
- [ ] Define retention policies for new data types

### Phase 2 — LLM Integration (Weeks 5-8)

**Goal:** Bring AI reasoning into the decision pipeline as a first-class component.

**Technical:**
- [ ] Build LLM Reasoning Gateway service (router, context builder, PII redactor, validators)
- [ ] Implement OpenAI adapter with structured output parsing
- [ ] Implement Anthropic/Claude adapter with structured output parsing
- [ ] Create prompt templates for: intent detection, appeal analysis, signal explanation
- [ ] Build prompt versioning and A/B testing infrastructure
- [ ] Implement cost tracking and budget enforcement
- [ ] Create `llm_audit_logs` table
- [ ] Add fallback-to-rules degradation path

**Organizational:**
- [ ] Train Trust & Safety team on LLM-augmented case review
- [ ] Establish prompt review process (engineering + T&S collaboration)

**Governance:**
- [ ] Implement PII redaction pipeline with validation tests
- [ ] Document AI decision disclosure policy
- [ ] Create model access RBAC policies

### Phase 3 — Decision & Reasoning Engine (Weeks 9-12)

**Goal:** Replace tier-to-action mapping with multi-objective reasoning.

**Technical:**
- [ ] Build Decision Reasoner with multi-objective scoring
- [ ] Implement structured policy documents and policy interpreter
- [ ] Build Explainability Engine (user, reviewer, audit level outputs)
- [ ] Implement counterfactual "do nothing" projection
- [ ] Build adversarial validation pattern (cross-model challenge for high-stakes decisions)
- [ ] Create `enforcement_decisions` table with full reasoning chain storage

**Organizational:**
- [ ] Migrate existing enforcement policies to structured YAML format
- [ ] Define human approval workflows for LLM-recommended actions

**Governance:**
- [ ] Validate that all automated decisions include reason codes and appeal paths
- [ ] Audit explainability output for legal defensibility

### Phase 4 — Learning Loop (Weeks 13-16)

**Goal:** Close the feedback cycle so the system improves from its own decisions.

**Technical:**
- [ ] Implement Outcome Tracking (7/14/30-day observation windows)
- [ ] Build weight/threshold tuning pipeline with constraints and rollback
- [ ] Implement prompt performance tracking and evolution
- [ ] Build human feedback ingestion (appeals, overrides, reviewer notes)
- [ ] Create `enforcement_outcomes` and `tuning_history` tables

**Organizational:**
- [ ] Establish tuning review cadence (bi-weekly)
- [ ] Train reviewers on feedback mechanisms

**Governance:**
- [ ] Define maximum auto-adjustment bounds
- [ ] Require human approval for weight changes > 5%
- [ ] Implement tuning audit log

### Phase 5 — Prediction & Proactive Intelligence (Weeks 17-20)

**Goal:** Shift from reactive to anticipatory posture.

**Technical:**
- [ ] Build Prediction Engine (risk trajectory projection)
- [ ] Implement precursor pattern detection
- [ ] Build proactive alert generation (predictive alerts, recovery opportunities)
- [ ] Implement inaction simulation engine
- [ ] Build opportunity intelligence (trust elevation, retention signals)
- [ ] Create `predictions` and `proactive_alerts` tables

**Organizational:**
- [ ] Define proactive intervention policies (when is a nudge appropriate?)
- [ ] Train T&S on predictive alerts vs. reactive alerts

**Governance:**
- [ ] Ensure predictive alerts do not create bias against specific user segments
- [ ] Audit prediction accuracy quarterly

### Phase 6 — Knowledge & Memory (Weeks 21-24)

**Goal:** Build institutional memory so the system accumulates wisdom.

**Technical:**
- [ ] Implement Adversary Pattern Library with lifecycle management
- [ ] Build Case Precedent system with similarity search
- [ ] Implement hot/warm/cold memory tiering with automated transitions
- [ ] Build memory pruning and reinforcement logic
- [ ] Add Redis caching layer for hot memory
- [ ] Create `adversary_patterns`, `case_precedents`, `memory_transitions` tables

**Organizational:**
- [ ] Assign pattern library curator role
- [ ] Establish quarterly pattern review cadence

**Governance:**
- [ ] Define privacy-compliant memory retention schedules
- [ ] Implement right-to-erasure workflows across all memory tiers

---

## 11. Risks, Constraints & Safeguards

### Technical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| LLM hallucination produces wrong enforcement | User wrongly restricted | Schema validation, confidence thresholds, human approval gates |
| LLM latency spikes degrade detection pipeline | Delayed enforcement | Fallback to rule-based engine, async LLM processing |
| Feature synthesis introduces bias | Unfair enforcement | Regular bias audits, segment-level accuracy tracking |
| Learning loop creates positive feedback cycle | Systematic over-enforcement | Maximum adjustment bounds, human review of all weight changes |
| Cost overrun on LLM calls | Budget exhaustion | Per-request ceilings, daily budgets, automatic degradation |
| Adversary discovers detection patterns | Evasion adaptation | Pattern rotation, LLM-based novel evasion detection |

### Organizational Risks

| Risk | Impact | Mitigation |
|---|---|---|
| T&S team overwhelmed by predictive alerts | Alert fatigue, ignored alerts | Confidence-based alert suppression, priority routing |
| Engineering maintains prompts without T&S input | Policy drift in AI reasoning | Prompt review process requires T&S approval |
| Over-reliance on AI decisions | Reduced human judgment | Mandatory human approval for high-stakes actions, regular calibration |

### Governance Risks

| Risk | Impact | Mitigation |
|---|---|---|
| LLM processes PII despite redaction | Privacy violation | Defense in depth: redaction + model audit + output scanning |
| Automated decisions lack explainability | Regulatory non-compliance | Three-level explainability engine, audit log completeness |
| Tuning changes create regulatory exposure | Legal liability | All changes logged, reviewed, and reversible |
| Predictive enforcement creates discrimination | Legal and reputational harm | Fairness metrics, segment analysis, human override |

### Hard Constraints (Non-Negotiable)

1. **No permanent ban without human approval** — regardless of AI recommendation
2. **No raw PII sent to external LLMs** — redaction pipeline is mandatory, not optional
3. **No enforcement from a single signal** — minimum 2-layer agreement required
4. **No learning adjustment > 10% per cycle** — prevents runaway self-modification
5. **No predictive enforcement without explainable basis** — predictions inform, they do not auto-enforce
6. **Kill switch always operational** — one command disables all automated enforcement
7. **Shadow mode available for any component** — new systems prove themselves before going live
8. **Every decision is auditable end-to-end** — from raw event to final action with full reasoning chain

---

## 12. Database Schema Extensions

### New Tables Required

```sql
-- Feature Store
CREATE TABLE feature_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES users(id),
  feature_type VARCHAR(50) NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  value NUMERIC NOT NULL,
  confidence NUMERIC NOT NULL,
  contributing_signal_ids UUID[] NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trust Vectors (extends risk_scores)
CREATE TABLE trust_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  score NUMERIC NOT NULL,
  tier VARCHAR(20) NOT NULL,
  operational NUMERIC NOT NULL,
  behavioral NUMERIC NOT NULL,
  network NUMERIC NOT NULL,
  velocity NUMERIC NOT NULL DEFAULT 0,
  acceleration NUMERIC NOT NULL DEFAULT 0,
  trend VARCHAR(20) NOT NULL DEFAULT 'stable',
  decay_applied NUMERIC NOT NULL DEFAULT 0,
  recovery_potential NUMERIC NOT NULL DEFAULT 0,
  confidence NUMERIC NOT NULL,
  signal_count INTEGER NOT NULL,
  last_signal_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LLM Audit Logs
CREATE TABLE llm_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL,
  model_provider VARCHAR(20) NOT NULL,
  model_id VARCHAR(50) NOT NULL,
  task_type VARCHAR(50) NOT NULL,
  prompt_template_version INTEGER NOT NULL,
  input_token_count INTEGER NOT NULL,
  output_token_count INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  cost_usd NUMERIC NOT NULL,
  confidence_returned NUMERIC,
  decision_used BOOLEAN NOT NULL DEFAULT FALSE,
  human_override BOOLEAN NOT NULL DEFAULT FALSE,
  redaction_applied BOOLEAN NOT NULL DEFAULT TRUE,
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforcement Outcomes
CREATE TABLE enforcement_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL,
  enforcement_action_id UUID REFERENCES enforcement_actions(id),
  observation_window_days INTEGER NOT NULL,
  behavior_stopped BOOLEAN,
  behavior_escalated BOOLEAN,
  user_appealed BOOLEAN NOT NULL DEFAULT FALSE,
  appeal_result VARCHAR(20),
  user_churned BOOLEAN NOT NULL DEFAULT FALSE,
  user_recovered BOOLEAN NOT NULL DEFAULT FALSE,
  revenue_impact NUMERIC,
  repeat_offense BOOLEAN NOT NULL DEFAULT FALSE,
  classification VARCHAR(50) NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adversary Patterns
CREATE TABLE adversary_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  detection_signals TEXT[] NOT NULL,
  confidence_threshold NUMERIC NOT NULL,
  evasion_techniques TEXT[],
  first_observed TIMESTAMPTZ NOT NULL,
  last_observed TIMESTAMPTZ NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  effectiveness_score NUMERIC NOT NULL DEFAULT 0.5,
  evolution_notes TEXT[],
  related_patterns UUID[],
  status VARCHAR(20) NOT NULL DEFAULT 'emerging',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tuning History
CREATE TABLE tuning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_name VARCHAR(100) NOT NULL,
  previous_value NUMERIC NOT NULL,
  new_value NUMERIC NOT NULL,
  change_percentage NUMERIC NOT NULL,
  justification TEXT NOT NULL,
  triggering_metrics JSONB NOT NULL,
  approved_by UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'proposed',
  applied_at TIMESTAMPTZ,
  rollback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prompt Registry
CREATE TABLE prompt_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id VARCHAR(100) NOT NULL,
  version INTEGER NOT NULL,
  task_type VARCHAR(50) NOT NULL,
  template TEXT NOT NULL,
  expected_output_schema JSONB NOT NULL,
  accuracy NUMERIC,
  latency_p50_ms INTEGER,
  cost_per_call_usd NUMERIC,
  hallucination_rate NUMERIC,
  status VARCHAR(20) NOT NULL DEFAULT 'testing',
  created_by VARCHAR(100) NOT NULL,
  approved_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prompt_id, version)
);
```

---

## 13. Final Statement

CIS v1 built a solid foundation: a working detection-scoring-enforcement pipeline with proper separation, auditability, and graduated responses.

CIS v2 builds the brain on top of that foundation.

It reasons about risk, not just detects it.
It predicts trajectories, not just reacts to events.
It learns from outcomes, not just follows rules.
It explains its thinking, not just outputs decisions.
It recommends positive interventions, not just punishments.
It gets smarter every day without human reprogramming.

And it does all of this with:
- Full auditability at every layer
- Human approval for every irreversible action
- Privacy-first design in every LLM interaction
- Rollback capability for every system change
- Kill switch for every automated component

CIS is not watching the marketplace anymore.
CIS is thinking for it.

---

**Document Status:** Authoritative v2.0 — Supersedes unified_cis_super_intelligence_framework.md
**Next Review:** After Phase 1 completion
