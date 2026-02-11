# CIS Synthetic Data Engineering — Phases 5–7

## Phase 5: Synthetic Data Design

### Scenario Matrix

#### A. Normal Scenarios (60% of dataset)

**A1. Active Healthy Users (20 users)**
- 15 customers, 5 providers
- Verified or pending verification
- trust_score: 0–20 (monitor tier)
- 5–15 messages each, all innocuous content
- 3–8 completed transactions each
- 0 risk signals, 0 enforcement actions
- Distribution: steady over 30-day window

**A2. Completed Jobs with Clean Communication (40 message threads)**
- Normal service discussions: scheduling, pricing, service details
- No flagged keywords or patterns
- Transactions: initiated → completed lifecycle
- Payment method: 'platform', 'escrow'
- Expected signals: 0
- Expected enforcement: none

**A3. Healthy Response Times**
- Messages within conversation: 5–30 min apart
- Transaction initiated → completed: 1–7 days
- No spikes or bursts

#### B. Edge Cases (25% of dataset)

**B1. Abandoned Jobs (3 users)**
- Transaction initiated but never completed (status stays 'initiated')
- 2–3 messages then silence
- trust_score: 10–25
- Expected signals: 0 (no risky content)
- Expected enforcement: none

**B2. Failed Transactions (4 users)**
- 1–3 failed transactions per user
- Some completed transactions too (mixed)
- Operational score impact: cancellation rate pushes score up
- trust_score: 15–35
- Expected signals: 0–1 (TX_FAILURE_CORRELATED if near messages)

**B3. Repeated Cancellations (2 users)**
- 4+ cancelled transactions in 30 days
- High cancellation rate drives operational score
- trust_score: 25–40 (low tier)
- Expected enforcement: SOFT_WARNING or HARD_WARNING

**B4. Slow Response Patterns (3 users)**
- Messages 2+ hours apart
- No risky content
- Multiple conversations with different counterparties
- trust_score: 5–15
- Expected enforcement: none

#### C. High-Risk Scenarios (15% of dataset)

**C1. Off-Platform Language Attempts (3 users)**
- Messages containing: "text me at", "call me on", "lets move to WhatsApp"
- Some with obfuscation: "w h a t s a p p", "what$app"
- Progressive escalation across messages
- trust_score: 45–75 (medium to high)
- Expected signals: OFF_PLATFORM_INTENT, CONTACT_MESSAGING_APP
- Expected enforcement: HARD_WARNING → TEMPORARY_RESTRICTION

**C2. Contact Info Obfuscation (2 users)**
- Phone numbers with leetspeak: "c@ll me at f1ve f1ve f1ve..."
- Emails with separators: "j.o.h.n.@.g.m.a.i.l"
- Spaced characters: "5 5 5 1 2 3 4"
- trust_score: 55–80 (high tier)
- Expected signals: CONTACT_PHONE, CONTACT_EMAIL with high confidence + obfuscation flags
- Expected enforcement: TEMPORARY_RESTRICTION (72h) or ACCOUNT_SUSPENSION

**C3. Coordinated Activity Spike (2 linked users)**
- Same-day burst: 15+ messages in 2 hours
- Messages to multiple different users
- Similar message patterns
- Shared counterparty overlap
- trust_score: 60–85 (high to critical)
- Expected signals: multiple types, HIGH_VOLUME_CONVERSATION flag
- Expected enforcement: ADMIN_ESCALATION → case created

**C4. Same IP / Shared Infrastructure (3 users)**
- Transactions share external_ref values
- Messages to same receiver pool
- Network scoring: flaggedCounterparties + sharedPaymentEndpoints
- trust_score: 50–70
- Expected enforcement: HARD_WARNING → TEMPORARY_RESTRICTION

**C5. Rapid Job Creation Burst (1 user)**
- 8 transactions initiated in 24 hours
- Most cancelled or failed
- Off-platform keywords in messages around same time
- trust_score: 70–90 (high to critical)
- Expected signals: TX_REDIRECT_ATTEMPT, OFF_PLATFORM_INTENT, PAYMENT_EXTERNAL
- Expected enforcement: ACCOUNT_SUSPENSION

**C6. Payment Failure + Messaging Spike (2 users)**
- Transaction fails, then 5+ messages within 10 minutes
- Messages contain payment platform keywords: "just venmo me", "pay via cashapp"
- trust_score: 55–75
- Expected signals: TX_FAILURE_CORRELATED, PAYMENT_EXTERNAL, TX_REDIRECT_ATTEMPT
- Expected enforcement: TEMPORARY_RESTRICTION

### Volume Summary

| Entity | Normal | Edge | High-Risk | Total |
|--------|--------|------|-----------|-------|
| Users (customers) | 15 | 8 | 10 | 33 |
| Users (providers) | 5 | 4 | 3 | 12 |
| Users (system) | 0 | 0 | 0 | 1 (existing) |
| Messages | 200 | 40 | 120 | 360 |
| Transactions | 100 | 30 | 50 | 180 |
| Risk Signals | 0 | 5 | 85 | 90 |
| Risk Scores | 20 | 12 | 30 | 62 |
| Enforcement Actions | 0 | 3 | 15 | 18 |
| Alerts | 0 | 2 | 12 | 14 |
| Cases | 0 | 0 | 5 | 5 |
| Case Notes | 0 | 0 | 8 | 8 |
| Appeals | 0 | 0 | 4 | 4 |
| Audit Logs | 20 | 10 | 50 | 80 |

---

## Phase 6: Time-Series Test Data Design

### Baseline Distribution (30-day window)

**Timeline:** Day 1 = NOW() - 30 days, Day 30 = NOW()

**Message Volume (daily):**
```
Weekdays: 10-15 messages/day (baseline)
Weekends: 5-8 messages/day (lower)
Week 1 (day 1-7): ramp-up, 5-10/day
Week 2-3 (day 8-21): steady state, 10-15/day
Week 4 (day 22-30): includes anomaly injection
```

**Transaction Volume (daily):**
```
Weekdays: 5-8 transactions/day
Weekends: 2-4/day
Steady throughout with 80% completion rate
```

**Risk Signal Frequency:**
```
Days 1-14: 0-1 signals/day (low-risk users only)
Days 15-21: 2-4 signals/day (edge cases emerge)
Days 22-28: 5-10 signals/day (high-risk scenarios activate)
Days 29-30: spike to 15-20 signals/day (coordinated activity)
```

### Anomaly Injection Patterns

**Pattern 1: Gradual Risk Accumulation (User C1-type)**
```
Day 10: First innocuous message with borderline keyword
Day 14: Message with "lets talk outside the app"
Day 17: Message with "whatsapp me at..."
Day 20: Message with obfuscated phone number
Day 23: Multiple messages with escalating intent
→ Score trajectory: 10 → 25 → 40 → 55 → 70
→ Tier progression: monitor → low → medium → high
→ Trend: escalating
```

**Pattern 2: Sudden Coordinated Event (Users C3-type)**
```
Days 1-24: Normal activity (2-3 messages/day)
Day 25, 14:00-16:00: Burst of 15 messages to 5 different users
Day 25, 14:30: 3 transactions initiated simultaneously
Day 25, 15:00: Messages contain payment redirect keywords
→ Score jumps: 15 → 75 in one day
→ Tier: monitor → critical
→ Trend: escalating
```

**Pattern 3: Failed Transaction Cascade (User C6-type)**
```
Day 18: Transaction initiated ($150)
Day 19: Transaction fails
Day 19 + 5min: 3 messages with "just pay me directly"
Day 20: Another transaction initiated ($150)
Day 21: Transaction fails again
Day 21 + 2min: Messages with "use venmo instead"
→ Score trajectory: 20 → 45 → 65
→ Signals: TX_FAILURE_CORRELATED + PAYMENT_EXTERNAL
```

**Pattern 4: Seasonal Variation**
```
Day 1 (Monday): High activity
Day 6 (Saturday): Low activity
Day 7 (Sunday): Low activity
Day 8 (Monday): High activity resumes
... repeat weekly
```

### Timestamp Generation Rules

1. **Business hours bias**: 70% of messages between 08:00-20:00 UTC
2. **Conversation threading**: Messages within a conversation 5-60 min apart
3. **Transaction timing**: Initiated during business hours, completed 1-7 days later
4. **Signal timing**: Same timestamp as triggering message (pipeline processes immediately)
5. **Score timing**: 500ms after signal creation (simulating pipeline delay)
6. **Enforcement timing**: 1500ms after score creation

---

## Phase 7: Output Requirements

### Example JSON Records

#### User (Customer - Normal)
```json
{
  "id": "c1000001-0000-0000-0000-000000000001",
  "external_id": "ext-cust-001",
  "display_name": "Sarah Mitchell",
  "email": "sarah.mitchell@email.com",
  "phone": "555-201-0001",
  "verification_status": "verified",
  "trust_score": 8.50,
  "status": "active",
  "user_type": "customer",
  "service_category": null,
  "metadata": {},
  "created_at": "2025-01-15T10:30:00Z"
}
```

#### User (Provider - Normal)
```json
{
  "id": "p1000001-0000-0000-0000-000000000001",
  "external_id": "ext-prov-001",
  "display_name": "Mike's Cleaning Services",
  "email": "mike.clean@email.com",
  "phone": "555-301-0001",
  "verification_status": "verified",
  "trust_score": 5.00,
  "status": "active",
  "user_type": "provider",
  "service_category": "Cleaning",
  "metadata": {"business_license": "BL-2024-001"},
  "created_at": "2025-01-10T14:00:00Z"
}
```

#### User (High-Risk)
```json
{
  "id": "c1000001-0000-0000-0000-000000000030",
  "external_id": "ext-cust-030",
  "display_name": "Alex Dubois",
  "email": "alex.dubois99@email.com",
  "phone": "555-201-0030",
  "verification_status": "pending",
  "trust_score": 72.00,
  "status": "restricted",
  "user_type": "customer",
  "service_category": null,
  "metadata": {},
  "created_at": "2025-01-20T09:15:00Z"
}
```

#### Message (Innocuous)
```json
{
  "id": "m1000001-0000-0000-0000-000000000001",
  "sender_id": "c1000001-...-000000000001",
  "receiver_id": "p1000001-...-000000000001",
  "conversation_id": "conv0001-...-000000000001",
  "content": "Hi Mike, I need a deep clean for my 2-bedroom apartment. Are you available this Saturday?",
  "metadata": {},
  "created_at": "2025-01-16T11:00:00Z"
}
```

#### Message (Off-Platform Intent)
```json
{
  "id": "m1000001-0000-0000-0000-000000000200",
  "sender_id": "c1000001-...-000000000030",
  "receiver_id": "p1000001-...-000000000005",
  "conversation_id": "conv0001-...-000000000020",
  "content": "Hey can we take this off the app? Just text me at 555-901-2345, way easier to coordinate",
  "metadata": {},
  "created_at": "2025-02-04T14:30:00Z"
}
```

#### Message (Obfuscated Contact)
```json
{
  "id": "m1000001-0000-0000-0000-000000000210",
  "sender_id": "c1000001-...-000000000032",
  "receiver_id": "p1000001-...-000000000003",
  "conversation_id": "conv0001-...-000000000022",
  "content": "my number is f1ve f1ve f1ve n1ne zero one tw0 thr33 four f1ve, hit me up",
  "metadata": {},
  "created_at": "2025-02-05T16:45:00Z"
}
```

#### Transaction (Normal - Completed)
```json
{
  "id": "t1000001-0000-0000-0000-000000000001",
  "user_id": "c1000001-...-000000000001",
  "counterparty_id": "p1000001-...-000000000001",
  "amount": 150.00,
  "currency": "USD",
  "status": "completed",
  "payment_method": "escrow",
  "external_ref": null,
  "metadata": {"service": "deep_clean"},
  "created_at": "2025-01-17T09:00:00Z"
}
```

#### Transaction (Failed)
```json
{
  "id": "t1000001-0000-0000-0000-000000000150",
  "user_id": "c1000001-...-000000000030",
  "counterparty_id": "p1000001-...-000000000005",
  "amount": 200.00,
  "currency": "USD",
  "status": "failed",
  "payment_method": "platform",
  "external_ref": null,
  "metadata": {},
  "created_at": "2025-02-04T13:00:00Z"
}
```

#### Risk Signal
```json
{
  "id": "rs100001-0000-0000-0000-000000000001",
  "source_event_id": "evt00001-0000-0000-0000-000000000200",
  "user_id": "c1000001-...-000000000030",
  "signal_type": "OFF_PLATFORM_INTENT",
  "confidence": 0.700,
  "evidence": {
    "message_ids": ["m1000001-...-000000000200"],
    "timestamps": ["2025-02-04T14:30:00Z"]
  },
  "obfuscation_flags": [],
  "pattern_flags": ["ESCALATION_PATTERN"],
  "processed": false,
  "created_at": "2025-02-04T14:30:00Z"
}
```

#### Risk Score
```json
{
  "id": "sc100001-0000-0000-0000-000000000001",
  "user_id": "c1000001-...-000000000030",
  "score": 55.00,
  "tier": "medium",
  "factors": {"operational": 35, "behavioral": 68, "network": 15},
  "trend": "escalating",
  "signal_count": 5,
  "last_signal_at": "2025-02-04T14:30:00Z",
  "created_at": "2025-02-04T14:30:01Z"
}
```

#### Enforcement Action
```json
{
  "id": "ea100001-0000-0000-0000-000000000001",
  "user_id": "c1000001-...-000000000030",
  "action_type": "hard_warning",
  "reason": "Medium-risk behavior detected. This warning is logged.",
  "reason_code": "MEDIUM_RISK_FIRST",
  "triggering_signal_ids": ["rs100001-...-000000000001"],
  "risk_score_id": "sc100001-...-000000000001",
  "effective_until": null,
  "reversed_at": null,
  "reversed_by": null,
  "reversal_reason": null,
  "automated": true,
  "approved_by": null,
  "metadata": {},
  "created_at": "2025-02-04T14:30:02Z"
}
```

#### Alert
```json
{
  "id": "al100001-0000-0000-0000-000000000001",
  "user_id": "c1000001-...-000000000030",
  "priority": "medium",
  "status": "open",
  "title": "Enforcement: MEDIUM_RISK_FIRST",
  "description": "Automated enforcement action (hard_warning) applied to user c1000001-...-030.",
  "assigned_to": null,
  "risk_signal_ids": ["rs100001-...-000000000001"],
  "auto_generated": true,
  "metadata": {},
  "created_at": "2025-02-04T14:30:02Z"
}
```

#### Case
```json
{
  "id": "cs100001-0000-0000-0000-000000000001",
  "user_id": "c1000001-...-000000000033",
  "status": "investigating",
  "title": "Escalation: HIGH_RISK_EVASION",
  "description": "User escalated for admin review. Detected high-risk behavior with evasion patterns.",
  "assigned_to": null,
  "alert_ids": ["al100001-...-000000000005"],
  "metadata": {},
  "created_at": "2025-02-06T10:00:00Z"
}
```

#### Appeal
```json
{
  "id": "ap100001-0000-0000-0000-000000000001",
  "enforcement_action_id": "ea100001-...-000000000001",
  "user_id": "c1000001-...-000000000030",
  "status": "submitted",
  "reason": "I was just sharing my contact for an emergency situation. I did not intend to circumvent the platform.",
  "resolution_notes": null,
  "resolved_by": null,
  "submitted_at": "2025-02-05T09:00:00Z",
  "resolved_at": null
}
```

---

### Recommended Dataset Sizes

| Environment | Users | Messages | Transactions | Signals | Scores | Enforcements | Alerts | Cases |
|-------------|-------|----------|--------------|---------|--------|-------------|--------|-------|
| **Local Dev** | 46 | 360 | 180 | 90 | 62 | 18 | 14 | 5 |
| **Staging** | 200 | 2,000 | 1,000 | 500 | 300 | 80 | 60 | 20 |
| **Load Test** | 5,000 | 100,000 | 50,000 | 15,000 | 8,000 | 2,000 | 1,500 | 300 |

**Local Dev** (this seed script): Enough to exercise all dashboard panels, all risk tiers, all enforcement types, all appeal states, and generate visible time-series charts with clear patterns.

**Staging**: 4-5x multiplier. Tests pagination, filter performance, and realistic admin workloads. Can be generated by parameterizing the seed script.

**Load Test**: 100x multiplier. Tests query performance under realistic data volumes. Requires scripted generation (not hand-crafted SQL).

---

### Risk-Impacting Fields Summary

| Field | Impact Area | How It Affects Risk |
|-------|------------|-------------------|
| messages.content | Detection | Triggers all signal types via regex/keyword/obfuscation |
| transactions.status | Operational scoring | Failed/cancelled increase operational score |
| transactions.payment_method | Operational scoring | Non-escrow reduces escrowUsageRatio |
| transactions.external_ref | Network scoring | Shared refs increase sharedPaymentEndpoints |
| risk_signals.signal_type | Behavioral scoring | Diversity increases behavioral score |
| risk_signals.confidence | Behavioral scoring | Higher confidence = stronger signal |
| risk_signals.obfuscation_flags | Behavioral scoring | Each flag adds +10 to behavioral (capped 15) |
| risk_signals.pattern_flags | Enforcement triggers | ESCALATION_PATTERN triggers stricter enforcement |
| risk_scores.score | Tier assignment | Direct mapping to tier thresholds |
| risk_scores.tier | Enforcement trigger | Determines action type and severity |
| risk_scores.trend | Urgency indicator | Escalating = more urgent |
| enforcement_actions.action_type | User status | restriction/suspension changes user.status |
| users.trust_score | Dashboard display | Synced from latest risk_scores.score |
| users.status | Access control | restricted/suspended limits platform use |
