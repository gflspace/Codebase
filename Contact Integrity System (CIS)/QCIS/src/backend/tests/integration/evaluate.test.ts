// QwickServices CIS — Phase 3B: /api/evaluate Integration Tests

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  mockQuery, resetAllMocks, createTestApp, startServer, stopServer,
  authHeaders, uuid,
} from '../helpers/setup';
import crypto from 'crypto';
import evaluateRoutes from '../../src/api/routes/evaluate';
import http from 'http';

const app = createTestApp();
app.use('/api/evaluate', evaluateRoutes);

let server: http.Server;
let port: number;

beforeAll(async () => {
  const s = await startServer(app);
  server = s.server;
  port = s.port;
});
afterAll(() => stopServer(server));
beforeEach(() => resetAllMocks());

// ─── HMAC Helper ─────────────────────────────────────────────

function hmacHeaders(body: Record<string, unknown>): Record<string, string> {
  const timestamp = String(Date.now());
  const bodyStr = JSON.stringify(body);
  const signature = crypto
    .createHmac('sha256', 'test-hmac-secret')
    .update(`${timestamp}.${bodyStr}`)
    .digest('hex');

  return {
    'Content-Type': 'application/json',
    'x-hmac-signature': signature,
    'x-hmac-timestamp': timestamp,
  };
}

const VALID_BODY = {
  action_type: 'booking.create',
  user_id: uuid(1),
};

// ─── Authentication ──────────────────────────────────────────

describe('POST /api/evaluate — Authentication', () => {
  it('accepts HMAC auth', async () => {
    // No risk score found
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // risk_scores
      .mockResolvedValueOnce({ rows: [] }) // risk_signals
      .mockResolvedValueOnce({ rows: [{ id: '1' }] }); // evaluation_log insert

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(VALID_BODY),
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decision).toBe('allow');
  });

  it('accepts JWT auth', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(200);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(401);
  });

  it('rejects invalid HMAC signature', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hmac-signature': 'invalid-signature-that-is-64-chars-long-aaaaaaaaaaaaaaaaaaaaaaaaa',
        'x-hmac-timestamp': String(Date.now()),
      },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(401);
  });
});

// ─── Validation ──────────────────────────────────────────────

describe('POST /api/evaluate — Validation', () => {
  it('rejects invalid action_type', async () => {
    const body = { action_type: 'invalid.type', user_id: uuid(1) };
    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(body),
      body: JSON.stringify(body),
    });

    expect(res.status).toBe(400);
    const result = await res.json();
    expect(result.error).toBe('Validation error');
  });

  it('rejects missing user_id', async () => {
    const body = { action_type: 'booking.create' };
    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(body),
      body: JSON.stringify(body),
    });

    expect(res.status).toBe(400);
  });

  it('rejects non-UUID user_id', async () => {
    const body = { action_type: 'booking.create', user_id: 'not-a-uuid' };
    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(body),
      body: JSON.stringify(body),
    });

    expect(res.status).toBe(400);
  });
});

// ─── Decision Logic ──────────────────────────────────────────

describe('POST /api/evaluate — Decision Logic', () => {
  it('returns allow when score < 40', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(10), score: '25.00', tier: 'low', factors: {} }] })
      .mockResolvedValueOnce({ rows: [{ signal_type: 'CONTACT_PHONE', pattern_flags: [] }] })
      .mockResolvedValueOnce({ rows: [{ id: '1' }] }); // eval log

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(VALID_BODY),
      body: JSON.stringify(VALID_BODY),
    });

    const body = await res.json();
    expect(body.decision).toBe('allow');
    expect(body.risk_score).toBe(25);
    expect(body.risk_tier).toBe('low');
  });

  it('returns allow in shadow mode for score >= 40 (with SHADOW reason)', async () => {
    // Config mock defaults to shadowMode=true
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(10), score: '55.00', tier: 'medium', factors: {} }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '1' }] }); // eval log

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(VALID_BODY),
      body: JSON.stringify(VALID_BODY),
    });

    const body = await res.json();
    expect(body.decision).toBe('allow');
    expect(body.reason).toContain('[SHADOW]');
  });

  it('returns allow in shadow mode for score >= 70 (with SHADOW reason)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(10), score: '85.00', tier: 'critical', factors: {} }] })
      .mockResolvedValueOnce({ rows: [] })
      // enforcement history queries (getEnforcementHistory)
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      // executeAction (shadow mode insert + audit log)
      .mockResolvedValueOnce({ rows: [{ id: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: '1' }] })
      // eval log
      .mockResolvedValueOnce({ rows: [{ id: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(VALID_BODY),
      body: JSON.stringify(VALID_BODY),
    });

    const body = await res.json();
    expect(body.decision).toBe('allow');
    expect(body.reason).toContain('[SHADOW]');
  });

  it('returns allow when no risk score exists', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(VALID_BODY),
      body: JSON.stringify(VALID_BODY),
    });

    const body = await res.json();
    expect(body.decision).toBe('allow');
    expect(body.reason).toContain('No risk score');
  });

  it('includes evaluation_time_ms in response', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(VALID_BODY),
      body: JSON.stringify(VALID_BODY),
    });

    const body = await res.json();
    expect(body.evaluation_time_ms).toBeGreaterThanOrEqual(0);
    expect(typeof body.evaluation_time_ms).toBe('number');
  });

  it('includes signals array in response', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(10), score: '25.00', tier: 'low', factors: {} }] })
      .mockResolvedValueOnce({
        rows: [
          { signal_type: 'CONTACT_PHONE', pattern_flags: [] },
          { signal_type: 'BOOKING_CANCEL_PATTERN', pattern_flags: [] },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(VALID_BODY),
      body: JSON.stringify(VALID_BODY),
    });

    const body = await res.json();
    expect(body.signals).toContain('CONTACT_PHONE');
    expect(body.signals).toContain('BOOKING_CANCEL_PATTERN');
  });
});

// ─── Fail-Open ───────────────────────────────────────────────

describe('POST /api/evaluate — Fail-Open', () => {
  it('returns allow on database error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(VALID_BODY),
      body: JSON.stringify(VALID_BODY),
    });

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.decision).toBe('allow');
    expect(body.reason).toContain('fail-open');
  });
});

// ─── Response Shape ──────────────────────────────────────────

describe('POST /api/evaluate — Response Shape', () => {
  it('returns correct response structure', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(10), score: '30.00', tier: 'low', factors: {} }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(VALID_BODY),
      body: JSON.stringify(VALID_BODY),
    });

    const body = await res.json();
    expect(body).toHaveProperty('decision');
    expect(body).toHaveProperty('risk_score');
    expect(body).toHaveProperty('risk_tier');
    expect(body).toHaveProperty('reason');
    expect(body).toHaveProperty('signals');
    expect(body).toHaveProperty('evaluation_time_ms');
  });

  it('accepts optional counterparty_id', async () => {
    const bodyWithCounterparty = {
      ...VALID_BODY,
      counterparty_id: uuid(2),
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(bodyWithCounterparty),
      body: JSON.stringify(bodyWithCounterparty),
    });

    expect(res.status).toBe(200);
  });

  it('accepts optional metadata', async () => {
    const bodyWithMetadata = {
      ...VALID_BODY,
      metadata: { booking_value: 150, service: 'plumbing' },
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(bodyWithMetadata),
      body: JSON.stringify(bodyWithMetadata),
    });

    expect(res.status).toBe(200);
  });
});
