# Detection & Risk Signal Engineering Specification

**System:** QwickServices Contact Integrity System (CIS)  
**Role:** Detection & Risk Signal Engineering Model  
**Objective:** Design explainable, privacy-aware detection logic that produces policy-relevant risk signals without enforcement or scoring

---

## 1. Detection Layer Scope & Guarantees

### Mission
The detection layer **identifies and reports signals only**. It does **not**:
- Assign final risk tiers
- Trigger enforcement
- Modify user state

### Non‑Negotiable Constraint
**Detection ≠ Scoring ≠ Enforcement**

---

## 2. NLP‑Based Message Scanning

### 2.1 Detection Objectives

- Detect sharing of contact information
- Identify intent to move interactions off‑platform
- Flag early circumvention or grooming language

---

### 2.2 Signal Taxonomy (Message‑Based)

| Signal Code | Description | Examples |
|------------|------------|----------|
| CONTACT_PHONE | Phone number disclosure | `+237 6xx xxx xxx`, `six five four…` |
| CONTACT_EMAIL | Email disclosure | `name@gmail.com` |
| CONTACT_SOCIAL | Social handle or link | `@username`, `instagram.com/...` |
| CONTACT_MESSAGING_APP | External chat apps | WhatsApp, Telegram, Signal |
| PAYMENT_EXTERNAL | Off‑platform payment refs | PayPal, CashApp, crypto |
| OFF_PLATFORM_INTENT | Intent to move convo | “let’s talk elsewhere” |
| GROOMING_LANGUAGE | Soft lead‑in phrases | “later”, “privately”, “trust me” |

---

### 2.3 NLP & Pattern Techniques

**Deterministic Layer**
- Regex for phone numbers (local + international)
- Regex for email formats
- URL and domain matching
- Keyword dictionaries (apps, payments)

**Contextual Layer**
- Lightweight NLP classifier (intent vs coincidence)
- Windowed context analysis (±2 messages)
- Role‑aware interpretation (sender vs receiver)

**Confidence Assignment**
- Each signal receives an independent confidence score (0.0–1.0)
- Confidence increases with:
  - Explicitness
  - Repetition
  - Proximity to transactions

---

## 3. Transaction Monitoring Integration (Placeholder)

### 3.1 Event Inputs

- `transaction.initiated`
- `transaction.failed`
- `transaction.completed`

### 3.2 Transaction‑Linked Signals

| Signal Code | Description |
|------------|------------|
| TX_REDIRECT_ATTEMPT | Message suggests off‑platform payment |
| TX_FAILURE_CORRELATED | Message after repeated failures |
| TX_TIMING_ALIGNMENT | Message within payment window |

### 3.3 Correlation Rules

- Messages within configurable time window of transaction events
- Confidence amplified when transaction failure precedes contact sharing

---

## 4. Obfuscation & Evasion Detection

### 4.1 Obfuscation Patterns

- Spaced numbers (`6 5 4 1`)
- Emojis replacing characters (📞 📧 💬)
- Leetspeak (`zero`, `at`, `dot`)
- Phonetic spellings
- Partial disclosures across messages

### 4.2 Evasion Rules

- Each obfuscation technique adds an **intent amplification flag**
- Progressive disclosure across messages increases confidence
- Multiple evasion techniques → pattern escalation flag

### 4.3 Image & Attachment Indicators

- Presence of images during disclosure attempts
- OCR‑capable flag only (no raw image logging)

---

## 5. Pattern Recognition & Temporal Analysis

### 5.1 Behavioral Patterns

| Pattern Flag | Description |
|-------------|------------|
| REPEATED_SIGNALS | Same signal type repeated |
| ESCALATION | Increasing explicitness |
| CROSS_SESSION | Signals across sessions |
| ROLE_IMBALANCE | One‑sided pressure |

### 5.2 Temporal Signals

- Pre‑payment grooming
- Payment‑window redirection
- Post‑payment disappearance or move attempt

Patterns always outweigh isolated signals.

---

## 6. Detection Output Structure

### 6.1 Signal Output Schema
```json
{
  "source_event_id": "uuid",
  "signal_type": "CONTACT_PHONE",
  "confidence": 0.87,
  "evidence": {
    "message_ids": ["uuid"],
    "timestamps": ["ISO8601"]
  },
  "obfuscation_flags": ["spaced_digits"],
  "pattern_flags": ["REPEATED_SIGNALS"]
}
```

### 6.2 Output Guarantees

- No enforcement recommendations
- No final risk score
- Fully explainable signal lineage

---

## 7. Privacy & Compliance Guardrails

- Message content accessed only with consent / lawful basis
- Sensitive values redacted or hashed in logs
- Raw content retention minimized
- All detection access logged for audit

---

## 8. Failure & False‑Positive Mitigation

### Precision Strategy

- High confidence required for irreversible downstream actions
- Single low‑confidence signals remain informational

### False‑Positive Controls

- Contextual NLP overrides raw regex hits
- Whitelisting benign patterns (e.g., support emails)
- Feedback loop from appeals into detection tuning

---

## 9. Architectural Principles Reinforced

- Precision over recall for severe outcomes
- Patterns over isolated hits
- Explainability over black‑box models
- Detection is advisory, not authoritative

---

**Status:** Detection Specification Complete  
**Next Step:** Convert to Claude Code prompts + test corpus

