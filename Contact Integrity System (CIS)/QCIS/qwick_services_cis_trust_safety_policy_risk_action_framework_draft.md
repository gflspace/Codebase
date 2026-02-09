# Trust & Safety Risk & Policy Documentation (Draft)

**System:** QwickServices Contact Integrity System (CIS)  
**Purpose:** Planning & documentation using placeholder data only  
**Status:** Initial Draft — Non-Enforcement

---

## 1. Platform Trust & Safety Policy

### 1.1 Policy Scope
This policy governs user behavior, platform protections, and enforcement principles for QwickServices. It applies to **all in-platform interactions**, including messaging, transactions, and account activity.

The objectives are to:
- Protect users from harm, fraud, and abuse
- Preserve platform integrity and revenue
- Ensure fair, proportional, and explainable enforcement
- Maintain regulatory and audit readiness

---

### 1.2 Core Platform Rules

#### A. Off-Platform Contact & Circumvention
Users may not:
- Share phone numbers, emails, social handles, or external links to move transactions off-platform
- Use coded language, obfuscation, or attachments to bypass detection
- Coordinate with other users to evade platform safeguards

#### B. Payments & Financial Integrity
Users may not:
- Request or suggest off-platform payments
- Attempt to avoid platform fees
- Cancel transactions after service delivery in bad faith

#### C. Abuse, Harassment & Manipulation
Users may not:
- Harass, threaten, or coerce other users
- Misuse the appeal process
- Create multiple accounts to evade enforcement

---

### 1.3 Roles & Responsibilities

**Users**
- Use platform tools as intended
- Keep communication and payments on-platform

**Trust & Safety (T&S)**
- Review flagged behavior
- Approve escalations
- Handle high-risk and repeat abuse

**Operations (Ops)**
- Monitor system health and false positives
- Manage review queues and SLAs

**Legal & Compliance**
- Review irreversible actions
- Ensure regulatory alignment
- Respond to audits and regulators

---

### 1.4 Enforcement & Appeals Principles
- Minimum effective enforcement
- Predictable escalation
- Separation between enforcement and appeal review
- Appeals available for reversible actions
- No appeal override for clear, repeated, or malicious abuse

---

## 2. Risk Categories

| Category | Description | Example Behaviors | Severity |
|--------|------------|------------------|----------|
| Low | Accidental or ambiguous behavior | Single message hinting at external contact | Low |
| Medium | Clear policy breach without strong harm | Repeated contact sharing attempts | Medium |
| High | Deliberate, coordinated, or harmful abuse | Off-platform payment coordination, evasion | High |

### Key Risk Signals
- **Behavioral patterns:** frequency, timing, escalation
- **Transaction timing:** contact attempts near payment events
- **Repeat offenses:** prior warnings or flags
- **Evasion tactics:** obfuscation, attachments, code words

---

## 3. Initial Action Matrix

| Risk Level | Action | Repeat Offense Logic | Trust / Tenure Modifier |
|-----------|--------|---------------------|-------------------------|
| Low | Soft warning | Escalate on 2nd occurrence | High trust = slower escalation |
| Medium | Hard warning | Restriction on 3rd occurrence | Low trust = faster escalation |
| Medium–High | Temporary restriction | Suspension on 4th offense | Trust does not excuse intent |
| High | Account suspension | Ban on evasion or coordination | No leniency |
| Critical | Permanent ban | Immediate for fraud rings | Not applicable |

---

## 4. Illustrative Placeholder Examples

### Example 1: Low-Risk Message

**Message Object (Placeholder)**
```json
{
  "message_id": "m1",
  "sender_id": "u123",
  "receiver_id": "u456",
  "timestamp": "2026-01-01T10:00:00Z",
  "content": "Can we talk later?",
  "attachments": []
}
```

**Assessment**
- Ambiguous intent
- No prior flags

**Outcome**
- Risk: Low
- Action: Soft educational warning

---

### Example 2: Medium-Risk Pattern

**User Profile (Placeholder)**
```json
{
  "user_id": "u789",
  "account_age_days": 12,
  "verification_status": "unverified",
  "trust_score": 32,
  "historical_flags": ["contact_hint"]
}
```

**Behavior**
- Repeated messages suggesting external contact

**Outcome**
- Risk: Medium
- Action: Hard warning (logged)

---

### Example 3: High-Risk Transaction Correlation

**Transaction Object (Placeholder)**
```json
{
  "transaction_id": "t55",
  "user_id": "u999",
  "amount": 250,
  "currency": "XAF",
  "status": "failed",
  "timestamp": "2026-01-02T14:30:00Z"
}
```

**Behavior**
- Message immediately after failure requesting mobile money directly
- Prior warning exists

**Outcome**
- Risk: High
- Action: Temporary restriction or suspension

---

## 5. Risk Scoring & Justification (Illustrative)

Risk scores combine:
- Signal confidence
- Frequency and recency
- Transaction correlation
- User trust score and tenure

**Example Justification**
> Repeated contact attempts + low trust score + proximity to payment failure = elevated intent → escalation justified.

---

## 6. Regulatory & Documentation Notes

- All enforcement actions are logged immutably
- Decisions are explainable using documented signals
- Placeholder data reflects GDPR-compliant minimization
- Policy designed to withstand regulatory and judicial review

---

**Document Status:** Draft for Planning & Alignment  
**Next Step:** Convert to user-facing policy + internal SOPs