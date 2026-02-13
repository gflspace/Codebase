# QwickServices CIS — Laravel E2E Integration Tests

## Overview

The `laravel-e2e.test.ts` suite validates the complete Laravel→CIS integration flow, testing webhook ingestion, event normalization, and pre-transaction evaluation with realistic multi-event scenarios.

## Test Coverage

### 12 Test Suites | 20+ Test Cases

```
✓ Laravel E2E — Booking Lifecycle (3 tests)
✓ Laravel E2E — Payment Lifecycle (2 tests)
✓ Laravel E2E — Message with Contact Info (1 test)
✓ Laravel E2E — Provider Registration (1 test)
✓ Laravel E2E — Rating Flow (1 test)
✓ Laravel E2E — Multi-Event Correlation (1 test)
✓ Laravel E2E — Pre-Transaction Evaluation (2 tests)
✓ Laravel E2E — Webhook Security (2 tests)
✓ Laravel E2E — Idempotency (1 test)
✓ Laravel E2E — Evaluate Action Types (2 tests)
✓ Laravel E2E — JWT Authentication (1 test)
✓ Laravel E2E — Webhook Validation (2 tests)
```

## Running Tests

### All E2E Tests
```bash
npm test -- laravel-e2e
```

### Specific Suite
```bash
npm test -- laravel-e2e -t "Booking Lifecycle"
```

### Watch Mode (development)
```bash
npm test -- laravel-e2e --watch
```

### Coverage Report
```bash
npm test -- laravel-e2e --coverage
```

## Test Architecture

### Full Request→Response Cycle
Unlike unit tests, these integration tests:
- ✅ Exercise full Express app with real routes
- ✅ Test HMAC signature verification
- ✅ Validate Zod schemas end-to-end
- ✅ Verify database query patterns
- ❌ DO NOT mock event bus (uses memory backend)
- ❌ DO NOT mock normalizer (tests real payload mapping)

### Database Mocking Strategy
```typescript
// Mock DB responses in sequence
mockQuery
  .mockResolvedValueOnce({ rows: [] })        // 1. Idempotency check
  .mockResolvedValueOnce({ rows: [{ id }] }) // 2. Insert webhook_events
  .mockResolvedValueOnce({ rows: [] });      // 3. Update processed status
```

## Key Test Scenarios

### 1. Full Booking Lifecycle
**Validates:** Webhook ingestion → event normalization → scoring → enforcement

```typescript
describe('Booking Lifecycle', () => {
  it('processes booking.created webhook with 202 and stores webhook_events');
  it('processes booking.completed webhook and triggers scoring');
  it('processes booking.cancelled webhook and generates cancellation signal');
});
```

**What it tests:**
- HMAC signature validation
- Idempotency key deduplication
- Event type mapping (`booking-create` → `booking.created`)
- Lazy user resolution (external_id → CIS UUID)
- Event bus emission (fires to consumers)

### 2. Payment Lifecycle
**Validates:** Pre-transaction evaluation + post-transaction recording

```typescript
describe('Payment Lifecycle', () => {
  it('processes payment.initiated and returns allow decision from /evaluate');
  it('processes payment.completed webhook');
});
```

**What it tests:**
- `/api/evaluate` decision logic (allow/flag/block)
- Shadow mode behavior (returns allow with [SHADOW] reason)
- Risk score lookup and tier mapping
- Evaluation logging (evaluation_log table)

### 3. Multi-Event Correlation
**Validates:** Pattern detection across sequential events

```typescript
it('processes 3 rapid cancellations in sequence for same user', async () => {
  // Send booking-cancel webhook 3x for same user_id
  // Booking consumer detects BOOKING_RAPID_CANCELLATION pattern
});
```

**What it tests:**
- Sequential webhook processing (ordering guarantees)
- Correlation via user_id across events
- Signal generation from behavioral patterns

### 4. Security & Validation
**Validates:** HMAC auth, input validation, idempotency

```typescript
describe('Webhook Security', () => {
  it('rejects webhook with wrong signature');
  it('rejects webhook with unknown source');
});

describe('Idempotency', () => {
  it('rejects duplicate webhook with same idempotency key');
});
```

**What it tests:**
- Timing-safe HMAC comparison
- Zod schema enforcement (required fields, enum values)
- Duplicate detection (webhook_events.idempotency_key index)

## Test Helpers

### Webhook Payload Generators
```typescript
createBookingWebhook(eventType, bookingId, clientId, providerId, status)
createPaymentWebhook(eventType, txId, userId, amount, status)
createMessageWebhook(messageId, senderId, receiverId, content)
createProviderWebhook(providerId, userId, serviceCategory)
createRatingWebhook(ratingId, clientId, providerId, score, bookingId?)
```

### HMAC Signature Helpers
```typescript
// For /webhooks/ingest (single signature)
signWebhookPayload(payload: string): string

// For /evaluate (timestamp + body signature)
hmacHeaders(body: Record<string, unknown>): Record<string, string>
```

### Database Mocks (from `setup.ts`)
```typescript
mockQuery           // Mock Postgres queries
mockNormalizeWebhookEvent // Mock event normalization
authHeaders()       // Generate JWT auth headers
uuid(n)             // Deterministic UUIDs for testing
```

## Expected Behavior

### Successful Webhook Ingestion
1. **Request:** POST /api/webhooks/ingest with valid HMAC
2. **Response:** 202 Accepted + `{ received: true, event_id: "uuid" }`
3. **Side effects:**
   - Record inserted into `webhook_events` (status: received → processed)
   - Domain event emitted to event bus
   - Consumers triggered (detection, scoring, enforcement)

### Successful Pre-Transaction Evaluation
1. **Request:** POST /api/evaluate with `action_type` + `user_id`
2. **Response:** 200 OK + `{ decision, risk_score, risk_tier, reason, signals, evaluation_time_ms }`
3. **Decision logic:**
   - Score <40 → `allow`
   - Score 40-70 → `flag` (or `allow` in shadow mode)
   - Score ≥70 → `block` (or `allow` in shadow mode)
4. **Side effects:**
   - Record inserted into `evaluation_log`
   - Enforcement action created if score ≥70 (even in shadow mode, for analytics)

## Common Patterns

### Testing Idempotency
```typescript
// First request: success
mockQuery.mockResolvedValueOnce({ rows: [] }); // not found
// ... process normally

// Second request: duplicate
mockQuery.mockResolvedValueOnce({ rows: [{ id: existingId }] }); // found
const res = await fetch(url, { ... });
expect(res.status).toBe(200);
expect((await res.json()).duplicate).toBe(true);
```

### Testing Shadow Mode
```typescript
// High risk score (≥70) but shadow mode enabled
mockQuery.mockResolvedValueOnce({ rows: [{ score: '85.00', tier: 'critical' }] });
// ... (enforcement history queries)
// ... (executeAction creates record with shadow_mode=true)

const res = await fetch('/api/evaluate', { ... });
const result = await res.json();
expect(result.decision).toBe('allow'); // NOT 'block'
expect(result.reason).toContain('[SHADOW]');
```

### Testing Event Normalization
```typescript
// Laravel payload → CIS DomainEvent
mockNormalizeWebhookEvent.mockResolvedValueOnce({
  id: uuid(100),
  type: EventType.BOOKING_CREATED,
  payload: {
    booking_id: uuid(10),
    client_id: uuid(1), // External ID auto-resolved
    provider_id: uuid(2),
    // ... normalized fields
  },
});
```

## Debugging Failed Tests

### Test fails with "401 Unauthorized"
**Cause:** HMAC signature mismatch or timestamp too old
**Fix:**
```typescript
// Ensure consistent secret between test and config
const signature = crypto
  .createHmac('sha256', 'test-webhook-secret') // Must match config
  .update(bodyStr)
  .digest('hex');
```

### Test fails with "400 Validation error"
**Cause:** Missing required fields or invalid enum value
**Fix:** Check Zod schema in `src/api/schemas/index.ts`
```typescript
// webhookIngestSchema requires:
{
  event_id: string,
  event_type: string,
  timestamp: string (ISO 8601),
  source: 'qwickservices', // Must be exact
  payload: object
}
```

### Test fails with "mockQuery called with unexpected args"
**Cause:** Database query order changed after code refactor
**Fix:** Update mock sequence to match new query order
```typescript
// Use expect.stringContaining() for query text matching
expect(mockQuery).toHaveBeenCalledWith(
  expect.stringContaining('INSERT INTO webhook_events'),
  expect.any(Array)
);
```

## CI/CD Integration

### Pre-Commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit
npm test -- laravel-e2e --run --silent || {
  echo "❌ Laravel E2E tests failed. Commit rejected."
  exit 1
}
```

### GitHub Actions
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- laravel-e2e --run
```

## Coverage Goals

Current coverage (estimated):
- **Webhook routes:** 95% (missing: batch ingestion, exotic error paths)
- **Evaluate route:** 90% (missing: rule engine edge cases)
- **Event normalization:** 85% (missing: user.registered, provider.updated)
- **End-to-end flows:** 75% (missing: multi-hop leakage funnel)

### Gaps to Fill
1. **Batch webhook ingestion** (`POST /webhooks/ingest/batch`)
2. **Contact field change events** (phone/email updates)
3. **Rating manipulation patterns** (cluster of low ratings)
4. **Network graph intelligence** (relationship strength updates)
5. **Enforcement reversals** (appeal approved → action reversed)

## Best Practices

### ✅ DO
- Use deterministic UUIDs (`uuid(1)`, `uuid(2)`) for reproducibility
- Mock DB responses in strict call order
- Test both success and error paths
- Validate HTTP status codes AND response bodies
- Clear mocks between tests (`beforeEach(() => resetAllMocks())`)

### ❌ DON'T
- Mock the entire event bus (defeats purpose of integration tests)
- Hard-code timestamps (use `new Date().toISOString()`)
- Test implementation details (focus on API contracts)
- Skip security tests (HMAC, validation, idempotency)
- Ignore side effects (check that DB inserts happened)

## Troubleshooting Flaky Tests

### Symptom: Test passes 90% of the time, fails randomly
**Causes:**
- Race conditions in async event emission
- Non-deterministic UUID generation
- Clock-dependent timestamp validation

**Fixes:**
```typescript
// Use deterministic UUIDs
const bookingId = uuid(10); // NOT crypto.randomUUID()

// Use fixed timestamps (not Date.now())
const timestamp = new Date('2026-01-15T12:00:00Z').toISOString();

// Await all promises
await fetch(...); // Don't forget to await!
```

## Related Documentation

- **`src/backend/src/api/routes/webhooks.ts`** — Webhook ingestion implementation
- **`src/backend/src/api/routes/evaluate.ts`** — Pre-transaction evaluation logic
- **`src/backend/src/events/normalizer.ts`** — Laravel→CIS event mapping
- **`src/backend/tests/helpers/setup.ts`** — Test infrastructure (mocks, helpers)
- **`TARGET_ARCHITECTURE_v2.md`** — 9-layer intelligence architecture

---

**Questions?** See `src/backend/tests/integration/evaluate.test.ts` and `messages.test.ts` for additional patterns.
