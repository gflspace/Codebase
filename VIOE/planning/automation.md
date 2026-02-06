# Automation Boundaries
## VIOE Planning Document

**Document Type:** Planning (Source of Truth)
**Version:** 1.0
**Last Updated:** January 2026
**Status:** Active

---

## 1. PURPOSE

This document defines the authoritative boundaries for automation in VIOE. All downstream systems (Coordination and Execution) MUST read from this document to determine:
- What can be auto-remediated
- What requires human approval
- Rollback requirements
- Automation safeguards

**PCE Principle:** Planning defines intent. Execution performs deterministic actions. This document defines where the boundary lies.

---

## 2. AUTOMATION PHILOSOPHY

### 2.1 Core Principles

| Principle | Definition |
|-----------|------------|
| **Human-in-the-Loop** | All automated actions affecting production require human approval |
| **Fail-Safe Defaults** | When uncertain, require approval rather than proceed |
| **Audit Everything** | Every automated action is logged with full context |
| **Reversibility** | Prefer actions that can be rolled back over destructive ones |
| **Gradual Trust** | Start with more approval; reduce as confidence grows |

### 2.2 Automation Levels

| Level | Name | Description | Example Actions |
|-------|------|-------------|-----------------|
| **L0** | Fully Automatic | No approval required | Triage, assign, notify |
| **L1** | Notify & Proceed | Notify then execute | Create Jira ticket |
| **L2** | Approval Required | Wait for explicit approval | Apply auto-fix |
| **L3** | Manual Only | Human must perform action | Production deployment |

---

## 3. VULNERABILITY TRIAGE AUTOMATION

### 3.1 Automatic Actions (Level 0)

The following actions are fully automatic:

| Action | Trigger | Conditions |
|--------|---------|------------|
| Team Assignment | Vulnerability imported | Confidence >= 70% (configurable) |
| Severity Classification | CVSS score present | Standard CVSS mapping |
| Suppression | Rule match | Active suppression rule exists |
| SLA Calculation | Any status change | Per prioritization policy |
| Notification | New Critical/High | Configured notification channel |

### 3.2 Bulk Triage Limits

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Maximum items per batch | 100 | Performance safeguard |
| Rate limit | 1 batch per 60 seconds | Prevent overload |
| Failure threshold | 10% | Pause batch if >10% failures |
| Auto-pause trigger | 5 consecutive failures | Investigate before proceeding |

---

## 4. REMEDIATION AUTOMATION

### 4.1 Auto-Fix Eligibility

Auto-fix generation is available ONLY for the following vulnerability types:

| Vulnerability Type | Auto-Fix Available | Confidence Required |
|-------------------|-------------------|---------------------|
| Dependency version upgrade | Yes | >= 80% |
| Missing security header | Yes | >= 90% |
| Hardcoded secret (replacement with env var) | Yes | >= 90% |
| SQL injection (parameterized query) | Limited | >= 95% |
| XSS (output encoding) | Limited | >= 95% |
| CSRF (token implementation) | No | N/A |
| Authentication bypass | No | N/A |
| Business logic flaw | No | N/A |

### 4.2 Auto-Fix Approval Requirements

| Environment | Approval Level | Approvers |
|-------------|----------------|-----------|
| Development | L1 (Notify & Proceed) | Developer can proceed |
| Staging | L2 (Approval Required) | Team Lead approval |
| Production | L3 (Manual Only) | Security Manager + Team Lead |

### 4.3 Auto-Fix Workflow

```
1. Vulnerability identified as eligible
2. AI generates fix suggestion
3. Human reviews fix preview
4. Human approves or modifies
5. System creates PR with fix
6. CI/CD pipeline runs tests
7. Human merges PR
8. System verifies fix in target environment
```

**Prohibited Automation:**
- Direct commit to main/master branch
- Bypass of code review
- Skip of test execution
- Deployment without CI passing

---

## 5. PULL REQUEST AUTOMATION

### 5.1 Automatic PR Actions

| Action | Automation Level | Conditions |
|--------|------------------|------------|
| Create branch | L0 (Automatic) | Auto-fix approved |
| Create PR | L0 (Automatic) | Branch created |
| Add reviewers | L0 (Automatic) | Based on CODEOWNERS |
| Run CI checks | L0 (Automatic) | PR created |
| Update PR status in VIOE | L0 (Automatic) | CI status changes |
| Merge PR | L3 (Manual Only) | Never auto-merge |
| Close PR | L2 (Approval Required) | Timeout or rejection |

### 5.2 CI Pipeline Requirements

Before any auto-fix can be considered complete:

| Check | Required | Failure Action |
|-------|----------|----------------|
| Linting | Yes | Block merge |
| Unit tests | Yes | Block merge |
| Integration tests | Yes | Block merge |
| Security scan | Yes | Block merge |
| Code coverage | Warning only | Notify, allow merge |

---

## 6. JIRA INTEGRATION AUTOMATION

### 6.1 Automatic Jira Actions

| Action | Automation Level | Trigger |
|--------|------------------|---------|
| Create Jira issue | L1 (Notify & Proceed) | Task created with "Sync to Jira" |
| Sync status VIOE → Jira | L0 (Automatic) | VIOE task status changes |
| Sync status Jira → VIOE | L0 (Automatic) | Jira webhook received |
| Close Jira issue | L1 (Notify & Proceed) | VIOE task completed |
| Reopen Jira issue | L2 (Approval Required) | Vulnerability recurrence |

### 6.2 Jira Field Mapping

| VIOE Field | Jira Field | Sync Direction |
|------------|------------|----------------|
| Task Title | Summary | Bidirectional |
| Description | Description | Bidirectional |
| Priority | Priority | VIOE → Jira only |
| Status | Status | Bidirectional |
| Assigned Team | Assignee | VIOE → Jira only |
| Vulnerability Link | Custom field | VIOE → Jira only |

---

## 7. NOTIFICATION AUTOMATION

### 7.1 Automatic Notifications

| Event | Recipients | Channel | Timing |
|-------|------------|---------|--------|
| New Critical vulnerability | Team + Security Manager | Slack + Email | Immediate |
| New High vulnerability | Assigned Team | Slack | Immediate |
| SLA warning (48h) | Assigned Team + Lead | Slack + Email | 48h before breach |
| SLA breach | Security Manager + Lead | Slack + Email + Page | At breach |
| Low confidence assignment | Analyst queue | Slack | Immediate |
| Daily summary | All configured users | Email | 9:00 AM local |

### 7.2 Notification Throttling

| Condition | Throttle Action |
|-----------|-----------------|
| > 10 Critical in 1 hour | Consolidate into single digest |
| > 50 notifications to same user in 1 hour | Pause and send digest |
| Weekend/holiday | Reduce to Critical only |
| User "Do Not Disturb" | Queue for next available window |

---

## 8. INCIDENT RESPONSE AUTOMATION

### 8.1 Automatic Incident Actions

| Action | Automation Level | Conditions |
|--------|------------------|------------|
| Create incident record | L0 (Automatic) | Threat pattern detected |
| AI threat assessment | L0 (Automatic) | Incident created |
| Identify affected assets | L0 (Automatic) | Incident created |
| Generate playbook | L0 (Automatic) | Incident type recognized |
| Notify responders | L0 (Automatic) | Incident severity >= High |
| Isolate systems | L3 (Manual Only) | Never automatic |
| Restore systems | L3 (Manual Only) | Never automatic |

### 8.2 Containment Action Automation

| Action | Automation Level | Approval Required |
|--------|------------------|-------------------|
| Block IP (WAF rule) | L2 | Security Analyst |
| Revoke API key | L2 | Security Manager |
| Disable user account | L3 (Manual) | Security Manager |
| Network isolation | L3 (Manual) | CISO + IT Director |
| System shutdown | L3 (Manual) | CISO |

---

## 9. COMPLIANCE AUTOMATION

### 9.1 Automatic Compliance Actions

| Action | Automation Level | Frequency |
|--------|------------------|-----------|
| Generate compliance report | L0 (Automatic) | On-demand + Monthly |
| Map vulnerabilities to controls | L0 (Automatic) | On import |
| Collect evidence artifacts | L0 (Automatic) | Daily |
| Score calculation | L0 (Automatic) | Real-time |
| Gap identification | L0 (Automatic) | On report generation |

### 9.2 Compliance Report Delivery

| Report Type | Recipients | Approval |
|-------------|------------|----------|
| Internal compliance status | Compliance Officer | None (L0) |
| External audit package | Auditors | Compliance Officer (L2) |
| Executive summary | Leadership | Security Manager (L1) |
| Evidence export | Auditors | Compliance Officer (L2) |

---

## 10. ROLLBACK REQUIREMENTS

### 10.1 Rollback Capability by Action

| Action | Rollback Method | Time Window |
|--------|-----------------|-------------|
| Team assignment | Reassign via UI | Unlimited |
| Status change | Change status via UI | Unlimited |
| Suppression | Disable rule | Unlimited |
| Auto-fix PR | Revert PR | Until merged |
| Jira sync | Manual Jira update | N/A |
| Notification | Cannot unsend | N/A |

### 10.2 Automatic Rollback Triggers

| Condition | Rollback Action |
|-----------|-----------------|
| CI pipeline failure after auto-fix | Close PR, notify developer |
| Integration error (Jira/Slack) | Retry 3x, then alert admin |
| Bulk operation > 10% failure | Pause operation, alert admin |

---

## 11. SAFEGUARDS AND LIMITS

### 11.1 Rate Limits

| Operation | Limit | Window |
|-----------|-------|--------|
| Bulk triage | 1 batch (100 items) | Per minute |
| Auto-fix generation | 10 requests | Per hour |
| Compliance report generation | 5 reports | Per hour |
| API calls (external) | 100 requests | Per minute |
| Notifications per user | 50 | Per hour |

### 11.2 Circuit Breakers

| Condition | Action |
|-----------|--------|
| External API failure rate > 50% | Disable integration, alert admin |
| Database response time > 5s | Disable non-critical automation |
| Memory usage > 90% | Pause bulk operations |
| Error rate > 10% for any operation | Pause and alert |

### 11.3 Prohibited Automation

The following are NEVER automated:

| Action | Reason |
|--------|--------|
| Delete vulnerability records | Audit trail preservation |
| Delete user accounts | Administrative oversight required |
| Modify audit logs | Compliance requirement |
| Bypass authentication | Security requirement |
| Production deployments | Change management requirement |
| Data exports > 10,000 records | Privacy review required |

---

## 12. CHANGE CONTROL

Changes to automation boundaries require:
1. Written proposal with risk assessment
2. Security Manager approval
3. Testing in non-production environment
4. 7-day notice before production enablement
5. Entry in `planning/history.md`

---

## DOCUMENT CONTROL

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Security Architecture | Initial release |

---

*This document is the authoritative source for automation boundaries in VIOE.*
*Execution layer must respect these boundaries. Coordination layer enforces them.*
