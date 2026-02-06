# VIOE - Vulnerability Intelligence & Orchestration Engine
## Known Limitations & Assumptions

**Document Version:** 1.0
**Classification:** Internal / Enterprise Client
**Last Updated:** January 2026

---

## Table of Contents

1. [Document Purpose](#1-document-purpose)
2. [Technical Limitations](#2-technical-limitations)
3. [Operational Constraints](#3-operational-constraints)
4. [Integration Limitations](#4-integration-limitations)
5. [AI & Automation Limitations](#5-ai--automation-limitations)
6. [Compliance Limitations](#6-compliance-limitations)
7. [Explicit Assumptions](#7-explicit-assumptions)
8. [Boundary Conditions](#8-boundary-conditions)
9. [Future Considerations](#9-future-considerations)

---

## 1. Document Purpose

### 1.1 Purpose

This document transparently communicates VIOE's current limitations, constraints, and the assumptions under which the platform operates. This transparency:

- Prevents false expectations
- Enables informed decision-making
- Supports proper implementation planning
- Identifies areas for future enhancement

### 1.2 Audience

- Product Owners evaluating capabilities
- Implementation teams planning deployments
- Enterprise customers assessing fit
- Internal teams for roadmap planning

### 1.3 Commitment

We are committed to continuously improving VIOE. Many limitations listed here are being actively addressed. This document will be updated as limitations are resolved.

---

## 2. Technical Limitations

### 2.1 Data Volume Limits

| Limitation | Current Limit | Impact |
|------------|---------------|--------|
| **Bulk import batch size** | 100 items per operation | Large imports must be batched |
| **Single file upload size** | 50 MB maximum | Large scan files must be split |
| **Items per page** | 50 items maximum | Pagination required for large lists |
| **Export row limit** | 10,000 rows | Large exports require filtering |

**Workaround:** For large data volumes, use API integration with pagination or batch imports into multiple operations.

### 2.2 Browser Support

| Limitation | Current State | Impact |
|------------|---------------|--------|
| **Supported browsers** | Chrome, Firefox, Edge (latest 2 versions) | Older browsers may have issues |
| **Mobile browsers** | Functional but not optimized | Desktop recommended |
| **Safari** | Supported with minor limitations | Some features may differ |
| **Internet Explorer** | Not supported | Legacy browser users affected |

**Recommendation:** Use latest Chrome, Firefox, or Edge for optimal experience.

### 2.3 Real-Time Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| **Dashboard refresh** | Manual or periodic refresh | Not instant real-time |
| **Integration sync** | Polling-based, not instant | Delay in external updates |
| **Notification delivery** | Near real-time, not guaranteed instant | Slight delays possible |

**Note:** Critical alerts are prioritized but may have seconds of delay.

### 2.4 Performance Boundaries

| Scenario | Expected Performance | Notes |
|----------|---------------------|-------|
| **Dashboard load** | <3 seconds | With typical data volume |
| **Vulnerability list** | <2 seconds | First 50 items |
| **Report generation** | <60 seconds | Standard reports |
| **Compliance report** | <120 seconds | Full framework report |
| **Large export** | Variable | Depends on data volume |

**Factors affecting performance:** Data volume, concurrent users, network conditions.

### 2.5 API Limitations

| Limitation | Current State | Impact |
|------------|---------------|--------|
| **Rate limiting** | 100 requests/minute | High-volume automations throttled |
| **Payload size** | 5 MB maximum | Large data must be chunked |
| **Concurrent connections** | Per account limit | Excessive parallelism blocked |
| **Webhook retry** | 3 attempts | Unreliable endpoints may miss events |

---

## 3. Operational Constraints

### 3.1 User & Access Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| **Concurrent sessions** | Limited per user | Multiple devices may conflict |
| **Session timeout** | 30 minutes inactivity | Unsaved work may be lost |
| **Password complexity** | Required | Users must meet requirements |
| **Role changes** | Immediate effect | May impact active sessions |

### 3.2 Data Management Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| **No bulk delete** | Items deleted individually | Large cleanup is time-consuming |
| **Suppression retroactivity** | New rules don't unsuppress existing | Manual review needed |
| **Historical data** | Limited editing | Past records mostly read-only |
| **Audit log immutability** | Cannot modify audit logs | By design for compliance |

### 3.3 Workflow Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| **Status transitions** | Must follow defined paths | Cannot skip states |
| **Assignment changes** | One team at a time | No multi-team assignment |
| **Task dependencies** | Not enforced | Manual coordination required |
| **SLA customization** | Admin configuration only | Users cannot adjust |

### 3.4 Reporting Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| **Custom reports** | Limited customization | Standard templates only |
| **Scheduled reports** | Not available (current) | Manual generation required |
| **Cross-report drill-down** | Limited | Some manual navigation |
| **Historical comparison** | Limited periods | Long-term trend analysis manual |

---

## 4. Integration Limitations

### 4.1 Scanner Integration Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| **Supported scanners** | 6 currently supported | Others require file import |
| **API variations** | Scanner API differences | Some data may not map |
| **Real-time sync** | Polling-based | Delay in new findings |
| **Custom fields** | Limited mapping | Some scanner data not imported |

**Supported Scanners:** Snyk, SonarQube, Checkmarx, Qualys, Tenable, Rapid7

**Workaround:** Other scanners can export to CSV/JSON for file import.

### 4.2 Jira Integration Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| **Project types** | Standard projects only | Advanced projects may vary |
| **Custom fields** | Limited mapping | Some fields not synced |
| **Status mapping** | Configuration required | Must match workflow |
| **Attachments** | Not synced | Manual attachment needed |
| **Comments** | Not synced | Communication separate |

**Note:** Jira Cloud and Server supported; Data Center may have differences.

### 4.3 Slack Integration Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| **Message formatting** | Standard format only | No customization |
| **Interactive actions** | Limited | Some actions open VIOE |
| **Private channels** | Requires bot invitation | Manual channel setup |
| **Thread replies** | Not supported | All messages to channel |

### 4.4 Directory Integration Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| **Sync frequency** | Periodic, not real-time | Delay in user changes |
| **Nested groups** | Limited support | Flat group mapping preferred |
| **Custom attributes** | Limited mapping | Standard attributes only |
| **Two-way sync** | One-way (from directory) | VIOE changes not written back |

---

## 5. AI & Automation Limitations

### 5.1 AI Assignment Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| **Accuracy ceiling** | ~85-90% typical accuracy | Some manual review needed |
| **New assets** | Lower confidence initially | Learning period required |
| **Ambiguous ownership** | May have low confidence | Manual assignment needed |
| **Context limitations** | Based on available data | Missing data affects accuracy |

**Assumption:** AI accuracy improves with usage and feedback.

### 5.2 Data Source Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| **Git history required** | For commit-based assignment | New repos have limited data |
| **CODEOWNERS accuracy** | Depends on file maintenance | Outdated files affect assignment |
| **Directory completeness** | Depends on directory data | Incomplete orgs affect mapping |

### 5.3 Auto-Fix Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| **Supported vulnerability types** | Limited types | Not all vulns have auto-fix |
| **Fix accuracy** | Requires human review | Not fully automated |
| **Language support** | Common languages only | Niche languages not supported |
| **Context awareness** | Limited to file | May miss broader patterns |

**Important:** Auto-fix suggestions must always be reviewed before application.

### 5.4 Predictive Analysis Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| **Historical data required** | Predictions need history | New deployments limited |
| **Prediction accuracy** | Estimates, not guarantees | Use as guidance |
| **Industry specificity** | General patterns | May not match your sector |
| **Emerging threats** | Novel threats not predicted | Zero-days not foreseeable |

---

## 6. Compliance Limitations

### 6.1 Framework Coverage

| Limitation | Description | Impact |
|------------|-------------|--------|
| **Supported frameworks** | SOC 2, ISO 27001, GDPR, PCI DSS | Others not available |
| **Control mapping** | Automated but not exhaustive | May need manual review |
| **Evidence automation** | Partial automation | Some evidence manual |
| **Certification scope** | Vulnerability management focus | Doesn't cover all controls |

**Important:** VIOE compliance reports support but do not replace formal compliance assessments.

### 6.2 Compliance Report Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| **Point-in-time** | Snapshot, not continuous | Regular regeneration needed |
| **Scope** | Vulnerability-focused | Other controls not covered |
| **Auditor acceptance** | Varies by auditor | May need supplementation |
| **Certification** | Does not grant certification | Evidence for process only |

### 6.3 Evidence Limitations

| Limitation | Description | Impact |
|------------|-------------|--------|
| **Automatic collection** | Limited to VIOE data | External evidence manual |
| **Evidence strength** | Varies by control | Some controls weak |
| **Format** | Standard formats | Custom formats not supported |
| **Retention** | Per retention policy | Historical evidence limits |

---

## 7. Explicit Assumptions

### 7.1 User Environment Assumptions

| Assumption | Description | If Not Met |
|------------|-------------|------------|
| **Modern browser** | Chrome/Firefox/Edge latest | Functionality may be limited |
| **Stable network** | Reliable internet connection | Operations may fail |
| **Adequate screen** | Desktop/laptop display | UI may be suboptimal |
| **JavaScript enabled** | Browser JavaScript on | Application will not work |

### 7.2 Data Quality Assumptions

| Assumption | Description | If Not Met |
|------------|-------------|------------|
| **Accurate import data** | Scanner data is correct | VIOE reflects source errors |
| **Unique identifiers** | CVE/asset uniqueness | Duplicates may occur |
| **Consistent naming** | Asset names consistent | Matching may fail |
| **Current directory data** | Directory is maintained | Assignment accuracy drops |

### 7.3 Organizational Assumptions

| Assumption | Description | If Not Met |
|------------|-------------|------------|
| **Defined teams** | Teams exist before import | Assignment has no target |
| **Clear ownership** | Code ownership exists | AI has less to learn from |
| **Active management** | Regular platform use | Data becomes stale |
| **Process adoption** | Teams follow workflows | Benefits not realized |

### 7.4 Integration Assumptions

| Assumption | Description | If Not Met |
|------------|-------------|------------|
| **API availability** | External APIs accessible | Integrations fail |
| **Credential validity** | Tokens/keys are valid | Connections rejected |
| **Format compatibility** | Standard data formats | Parsing errors occur |
| **Rate limit compliance** | Within API limits | Requests throttled |

### 7.5 Security Assumptions

| Assumption | Description | If Not Met |
|------------|-------------|------------|
| **Credential security** | Users protect passwords | Account compromise risk |
| **Network security** | Traffic is not intercepted | Data exposure risk |
| **Access control** | Roles properly assigned | Unauthorized access risk |
| **Audit review** | Logs are monitored | Issues not detected |

---

## 8. Boundary Conditions

### 8.1 Scale Boundaries

| Boundary | Recommended Maximum | Notes |
|----------|---------------------|-------|
| **Total vulnerabilities** | 500,000 active | Performance may degrade beyond |
| **Daily imports** | 50,000 new items | System can handle more with tuning |
| **Concurrent users** | 200 | Per deployment |
| **Teams** | 100 | Practical limit |
| **Assets** | 10,000 | Active assets |

### 8.2 Time Boundaries

| Boundary | Limit | Notes |
|----------|-------|-------|
| **Report date range** | 2 years | Performance optimization |
| **Trend history** | 1 year | Dashboard displays |
| **Audit log** | 3 years | Compliance retention |
| **Resolved vulnerabilities** | 2 years | After resolution |

### 8.3 Complexity Boundaries

| Boundary | Limit | Notes |
|----------|-------|-------|
| **Filter combinations** | Practical limits | Very complex filters may slow |
| **Suppression rules** | 100 active | More rules = more processing |
| **Simultaneous integrations** | All supported | No explicit limit |
| **Webhook endpoints** | 20 | Per event type |

---

## 9. Future Considerations

### 9.1 Limitations Under Active Development

| Limitation | Status | Expected |
|------------|--------|----------|
| **Mobile optimization** | In development | Future release |
| **Additional scanners** | Ongoing expansion | Per demand |
| **Custom reports** | Planned | Future release |
| **Scheduled reports** | Planned | Future release |

### 9.2 Limitations Requiring Customer Feedback

| Limitation | Feedback Needed |
|------------|-----------------|
| **Framework support** | Which frameworks are priority? |
| **Integration priorities** | Which tools are critical? |
| **Feature gaps** | What's blocking your workflow? |
| **Scale requirements** | What volumes do you anticipate? |

### 9.3 Providing Feedback

To report limitations or request improvements:
- Contact your account manager
- Submit feature requests through support
- Participate in customer advisory programs

### 9.4 Version Updates

This document will be updated:
- With each major release
- When significant limitations are resolved
- When new limitations are identified
- Based on customer feedback

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Documentation Team | Initial release |

---

*Transparency about limitations builds trust and enables success.*

**VIOE - Vulnerability Intelligence & Orchestration Engine**
*Known Limitations & Assumptions*
