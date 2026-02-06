# Compliance Mapping
## VIOE Planning Document

**Document Type:** Planning (Source of Truth)
**Version:** 1.0
**Last Updated:** January 2026
**Status:** Active

---

## 1. PURPOSE

This document defines the authoritative compliance mappings for VIOE. All downstream systems (Coordination and Execution) MUST read from this document to determine:
- How vulnerabilities map to compliance controls
- Framework-specific requirements
- Evidence collection rules
- Audit support procedures

**PCE Principle:** Planning defines intent. This document is the single source of truth for compliance requirements.

---

## 2. SUPPORTED COMPLIANCE FRAMEWORKS

### 2.1 Framework Overview

| Framework | Full Name | Primary Focus | Version |
|-----------|-----------|---------------|---------|
| **SOC 2** | Service Organization Control 2 | Service providers | Type II |
| **ISO 27001** | Information Security Management | Enterprise security | 2022 |
| **GDPR** | General Data Protection Regulation | Data privacy | 2018 |
| **PCI DSS** | Payment Card Industry Data Security Standard | Payment data | 4.0 |

### 2.2 Framework Applicability

| Framework | When Applicable |
|-----------|-----------------|
| SOC 2 | SaaS providers, cloud services, data processors |
| ISO 27001 | Organizations seeking ISMS certification |
| GDPR | Processing EU citizen personal data |
| PCI DSS | Handling cardholder data |

---

## 3. SOC 2 CONTROL MAPPING

### 3.1 Trust Service Criteria Coverage

| Category | Criteria ID | Description | VIOE Coverage |
|----------|-------------|-------------|---------------|
| **Security** | CC6.1 | Logical and Physical Access Controls | Full |
| **Security** | CC6.2 | Prior to Issuing Access | Full |
| **Security** | CC6.3 | Access Removal | Full |
| **Security** | CC6.6 | System Access Restrictions | Full |
| **Security** | CC6.7 | Access to Protected Information | Full |
| **Security** | CC6.8 | Prevent/Detect Unauthorized Software | Partial |
| **Security** | CC7.1 | Detect Security Events | Full |
| **Security** | CC7.2 | Monitor System Components | Full |
| **Security** | CC7.3 | Evaluate Security Events | Full |
| **Security** | CC7.4 | Respond to Security Incidents | Full |
| **Security** | CC7.5 | Recover from Security Incidents | Full |
| **Availability** | A1.1 | System Availability | Partial |
| **Availability** | A1.2 | Environmental Protections | Out of Scope |
| **Processing Integrity** | PI1.1 | System Processing | Partial |
| **Confidentiality** | C1.1 | Confidential Information | Full |
| **Confidentiality** | C1.2 | Disposal of Confidential Information | Partial |

### 3.2 Vulnerability-to-SOC2 Mapping

| Vulnerability Type | Primary Control | Secondary Controls |
|-------------------|-----------------|-------------------|
| Authentication Bypass | CC6.1, CC6.6 | CC7.1 |
| SQL Injection | CC6.1, CC7.2 | CC7.3 |
| XSS | CC6.1, CC7.2 | - |
| Privilege Escalation | CC6.1, CC6.7 | CC7.1 |
| Data Exposure | C1.1 | CC6.7 |
| Denial of Service | A1.1 | CC7.4 |
| Insecure Dependencies | CC6.8 | CC7.2 |
| Missing Encryption | C1.1 | CC6.7 |
| Logging Failure | CC7.1, CC7.2 | CC7.3 |

---

## 4. ISO 27001 CONTROL MAPPING

### 4.1 Annex A Control Coverage

| Domain | Control ID | Control Name | VIOE Coverage |
|--------|------------|--------------|---------------|
| A.5 | A.5.1 | Information Security Policy | Partial |
| A.6 | A.6.1 | Internal Organization | Partial |
| A.7 | A.7.2 | During Employment | Out of Scope |
| A.8 | A.8.1 | Responsibility for Assets | Full |
| A.8 | A.8.2 | Information Classification | Full |
| A.9 | A.9.1 | Access Control Policy | Full |
| A.9 | A.9.2 | User Access Management | Full |
| A.9 | A.9.4 | System and App Access | Full |
| A.10 | A.10.1 | Cryptographic Controls | Partial |
| A.12 | A.12.2 | Protection from Malware | Partial |
| A.12 | A.12.4 | Logging and Monitoring | Full |
| A.12 | A.12.6 | Technical Vulnerability Management | Full |
| A.13 | A.13.1 | Network Security Management | Partial |
| A.13 | A.13.2 | Information Transfer | Partial |
| A.14 | A.14.1 | Security in Development | Full |
| A.14 | A.14.2 | Security in Dev Processes | Full |
| A.16 | A.16.1 | Incident Management | Full |
| A.18 | A.18.2 | Compliance Reviews | Full |

### 4.2 Vulnerability-to-ISO27001 Mapping

| Vulnerability Type | Primary Control | Secondary Controls |
|-------------------|-----------------|-------------------|
| Authentication Bypass | A.9.4.2 | A.9.2.3 |
| SQL Injection | A.12.6.1 | A.14.2.5 |
| XSS | A.14.2.5 | A.12.6.1 |
| Privilege Escalation | A.9.2.3 | A.9.4.1 |
| Data Exposure | A.8.2.3 | A.13.2.1 |
| Denial of Service | A.12.1.3 | A.17.1.1 |
| Insecure Dependencies | A.12.6.1 | A.14.2.1 |
| Missing Encryption | A.10.1.1 | A.13.2.1 |
| Logging Failure | A.12.4.1 | A.12.4.3 |

---

## 5. GDPR CONTROL MAPPING

### 5.1 Relevant GDPR Articles

| Article | Title | VIOE Relevance |
|---------|-------|----------------|
| Article 5 | Principles of Processing | Integrity, Confidentiality |
| Article 25 | Data Protection by Design | Security controls |
| Article 32 | Security of Processing | Technical measures |
| Article 33 | Breach Notification | Incident response |
| Article 35 | Data Protection Impact Assessment | Risk assessment |

### 5.2 Article 32 Security Measures Mapping

| Measure | Sub-Category | VIOE Coverage |
|---------|--------------|---------------|
| Pseudonymisation | Data Protection | Out of Scope |
| Encryption | Data Protection | Partial |
| Confidentiality | Access Control | Full |
| Integrity | Change Management | Full |
| Availability | System Uptime | Partial |
| Resilience | Disaster Recovery | Partial |
| Restoration | Backup/Recovery | Out of Scope |
| Testing | Security Assessment | Full |

### 5.3 Vulnerability-to-GDPR Mapping

| Vulnerability Type | Article | Measure Affected |
|-------------------|---------|------------------|
| Data Exposure | Art. 32(1)(b) | Confidentiality |
| Authentication Bypass | Art. 32(1)(b) | Confidentiality, Integrity |
| SQL Injection | Art. 32(1)(b) | Integrity, Confidentiality |
| Missing Encryption | Art. 32(1)(a) | Encryption |
| Logging Failure | Art. 32(1)(d) | Testing/Assessment |
| Access Control Flaw | Art. 32(1)(b) | Confidentiality |

---

## 6. PCI DSS CONTROL MAPPING

### 6.1 PCI DSS v4.0 Requirements Coverage

| Requirement | Title | VIOE Coverage |
|-------------|-------|---------------|
| 1 | Network Security Controls | Partial |
| 2 | Secure Configurations | Partial |
| 3 | Protect Account Data | Partial |
| 4 | Encrypt Transmission | Partial |
| 5 | Protect from Malware | Partial |
| 6 | Develop Secure Systems | Full |
| 7 | Restrict Access | Full |
| 8 | Identify Users | Full |
| 9 | Restrict Physical Access | Out of Scope |
| 10 | Log and Monitor | Full |
| 11 | Test Security | Full |
| 12 | Support Information Security | Partial |

### 6.2 Vulnerability-to-PCIDSS Mapping

| Vulnerability Type | Primary Requirement | Secondary Requirements |
|-------------------|---------------------|----------------------|
| SQL Injection | 6.2, 6.3 | 11.3 |
| XSS | 6.2, 6.3 | 11.3 |
| Authentication Bypass | 8.3 | 7.1 |
| Missing Encryption | 3.5, 4.1 | 3.4 |
| Privilege Escalation | 7.1, 7.2 | 8.6 |
| Insecure Dependencies | 6.3 | 11.3 |
| Logging Failure | 10.2, 10.3 | 10.5 |
| Network Exposure | 1.3, 1.4 | 11.4 |

---

## 7. COMPLIANCE SCORING MODEL

### 7.1 Score Calculation

| Component | Weight | Calculation |
|-----------|--------|-------------|
| Control Coverage | 40% | (Controls Met / Total Controls) × 100 |
| Vulnerability Impact | 30% | 100 - (Weighted Vuln Score) |
| Evidence Strength | 20% | (Strong + 0.5×Adequate) / Total Evidence |
| Process Maturity | 10% | Based on response times, automation |

### 7.2 Score Interpretation

| Score Range | Status | Audit Readiness |
|-------------|--------|-----------------|
| 90 - 100 | Compliant | Audit-ready |
| 75 - 89 | Mostly Compliant | Minor gaps to address |
| 60 - 74 | Partially Compliant | Significant work needed |
| 40 - 59 | Non-Compliant | Major remediation required |
| 0 - 39 | Critical Non-Compliance | Fundamental controls missing |

### 7.3 Gap Severity Classification

| Gap Severity | Definition | Remediation Timeline |
|--------------|------------|---------------------|
| Critical | Control completely missing; high risk | 30 days |
| High | Control partially implemented; medium-high risk | 60 days |
| Medium | Control exists but needs improvement | 90 days |
| Low | Minor enhancement opportunity | Next audit cycle |

---

## 8. EVIDENCE COLLECTION RULES

### 8.1 Automatic Evidence Collection

| Evidence Type | Collection Trigger | Retention |
|---------------|-------------------|-----------|
| Vulnerability scan results | Each import | 3 years |
| Assignment history | Each change | 5 years |
| Remediation records | Task completion | 5 years |
| Access logs | Continuous | 3 years |
| Configuration snapshots | Daily | 1 year |
| Policy documents | On change | Indefinite |

### 8.2 Evidence Strength Criteria

| Strength | Criteria |
|----------|----------|
| **Strong** | Automated collection, timestamp verified, immutable |
| **Adequate** | Manual upload with attestation, dated |
| **Weak** | Undated, unverified, or incomplete |
| **Missing** | No evidence provided |

### 8.3 Evidence Package Contents

For each control, the evidence package includes:

| Element | Source | Format |
|---------|--------|--------|
| Control ID | Framework mapping | Text |
| Control Description | Framework definition | Text |
| Implementation Status | VIOE assessment | Enum |
| Evidence Artifacts | VIOE + manual upload | PDF/Screenshot |
| Test Results | Automated scans | JSON/PDF |
| Owner Attestation | Manual | Signed statement |

---

## 9. COMPLIANCE REPORT STRUCTURE

### 9.1 Standard Report Sections

| Section | Content | Audience |
|---------|---------|----------|
| Executive Summary | Score, gaps, recommendations | Leadership |
| Framework Coverage | Control-by-control status | Compliance team |
| Vulnerability Impact | Open vulns affecting compliance | Security team |
| Gap Analysis | Detailed gap descriptions | Remediation teams |
| Remediation Roadmap | Prioritized action plan | Project managers |
| Evidence Appendix | Collected evidence | Auditors |

### 9.2 Report Generation Rules

| Report Type | Auto-Generate | Approval Required |
|-------------|---------------|-------------------|
| Internal Status | Yes | None |
| Management Summary | Yes | Compliance Officer review |
| Audit Package | On request | Compliance Officer approval |
| External Report | On request | Legal + Compliance approval |

---

## 10. FRAMEWORK-SPECIFIC RULES

### 10.1 SOC 2 Specific Rules

| Rule | Implementation |
|------|----------------|
| Type II requires 6-month history | Retain all evidence 6+ months |
| Continuous monitoring required | Daily vulnerability assessment |
| Incident response documentation | Full incident timeline in VIOE |

### 10.2 ISO 27001 Specific Rules

| Rule | Implementation |
|------|----------------|
| Risk assessment required | Link vulns to risk register |
| Management review | Monthly compliance summary |
| Continual improvement | Track remediation trends |

### 10.3 GDPR Specific Rules

| Rule | Implementation |
|------|----------------|
| 72-hour breach notification | Incident alerts to DPO |
| Data subject rights | Out of scope (handled externally) |
| DPIA for high-risk processing | Flag high-risk vulns |

### 10.4 PCI DSS Specific Rules

| Rule | Implementation |
|------|----------------|
| Quarterly internal scans | Track scan frequency |
| Annual penetration test | Import pentest findings |
| Segmentation validation | Tag CDE assets |

---

## 11. AUDIT SUPPORT PROCEDURES

### 11.1 Pre-Audit Preparation

| Task | Timeline | Owner |
|------|----------|-------|
| Generate current compliance report | 2 weeks before | Compliance Officer |
| Review open gaps | 2 weeks before | Security Manager |
| Collect pending evidence | 1 week before | All teams |
| Dry-run evidence review | 1 week before | Compliance Officer |
| Prepare access for auditors | 3 days before | Administrator |

### 11.2 During Audit

| Support Type | VIOE Capability |
|--------------|-----------------|
| Real-time reporting | On-demand report generation |
| Evidence retrieval | Search and export |
| Control demonstration | Live system walkthrough |
| Historical data | Full audit trail access |

### 11.3 Post-Audit Actions

| Task | Timeline | Owner |
|------|----------|-------|
| Address findings | Per auditor timeline | Security Manager |
| Update remediation plan | 1 week after | Compliance Officer |
| Document lessons learned | 2 weeks after | Compliance Officer |
| Update planning documents if needed | As required | Security Architecture |

---

## 12. CHANGE CONTROL

Changes to compliance mappings require:
1. Written proposal with framework impact analysis
2. Compliance Officer approval
3. Legal review for external frameworks
4. 30-day notice before audit use
5. Entry in `planning/history.md`

---

## DOCUMENT CONTROL

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Compliance Team | Initial release |

---

*This document is the authoritative source for compliance mappings in VIOE.*
*All compliance reports and evidence collection derive from these definitions.*
