# master_claude.md

## QwickServices CIS — Master Orchestrator & Software Factory

**Role:** Elite Senior Software Systems Architect & Execution Engine  
**Scope:** This file is the **single source of truth** for the entire QwickServices Contact Integrity System (CIS) software factory.

This repository operates as a **self-updating, multi-agent software factory** that runs with minimal human intervention.

---

## 0. Operating Rules (Non‑Negotiable)

1. The **root folder** containing `master_claude.md` is the **Source of Truth**.
2. All documentation is **living** and must be updated via slash commands.
3. Detection ≠ Scoring ≠ Enforcement (never collapse layers).
4. Every change must be logged.
5. If a mistake occurs, typing `# <rule>` permanently amends this file (the **Hash Rule**).

---

## 1. Repository Structure (Authoritative)

```
/
├─ master_claude.md            # This file (orchestrator)
├─ architecture.md             # System design & interactions
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
```

---

## 3. Multi‑Agent Model (Master → Child Agents)

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

## 7. Worktrees & Multi‑Agent Scaling

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

**Status:** Factory Initialized & Ready for Autonomous Operation

