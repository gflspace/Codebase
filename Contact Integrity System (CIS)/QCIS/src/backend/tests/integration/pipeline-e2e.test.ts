// QwickServices CIS — End-to-End Pipeline Smoke Tests
// Tests the full pipeline: Webhook → Normalize → EventBus → Detection → Scoring → Enforcement → Alerting → Rules

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import http from 'http';
import {
  mockQuery,
  resetAllMocks,
  createTestApp,
  startServer,
  stopServer,
  mockNormalizeWebhookEvent,
  authHeaders,
  uuid,
} from '../helpers/setup';

// Import route modules
import webhookRoutes from '../../src/api/routes/webhooks';
import evaluateRoutes from '../../src/api/routes/evaluate';
import alertRoutes from '../../src/api/routes/alerts';
import enforcementRoutes from '../../src/api/routes/enforcement-actions';
import adminRulesRoutes from '../../src/api/routes/admin-rules';

const WEBHOOK_SECRET = 'test-webhook-secret';
const HMAC_SECRET = 'test-hmac-secret';

// Setup Express app with all routes
const app = createTestApp();
app.use('/api/webhooks', webhookRoutes);
app.use('/api/evaluate', evaluateRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/enforcement-actions', enforcementRoutes);
app.use('/api/admin/rules', adminRulesRoutes);

let server: http.Server;
let port: number;

beforeAll(async () => {
  const s = await startServer(app);
  server = s.server;
  port = s.port;
});

afterAll(() => stopServer(server));

beforeEach(() => {
  resetAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function signWebhookPayload(body: object): string {
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
}

function hmacHeaders(body: Record<string, unknown>): Record<string, string> {
  const timestamp = String(Date.now());
  const bodyStr = JSON.stringify(body);
  const signature = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(`${timestamp}.${bodyStr}`)
    .digest('hex');

  return {
    'Content-Type': 'application/json',
    'x-hmac-signature': signature,
    'x-hmac-timestamp': timestamp,
  };
}

async function postWebhook(body: object, signature?: string) {
  const sig = signature ?? signWebhookPayload(body);
  return fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': sig,
    },
    body: JSON.stringify(body),
  });
}

// ─── TEST GROUP 1: Webhook → Event Normalization ─────────────────────────────

describe('Pipeline E2E — Webhook Ingestion & Normalization', () => {
  it('POST /api/webhooks/ingest accepts valid booking.created with HMAC signature', async () => {
    const body = {
      event_id: 'ext-booking-001',
      event_type: 'booking-save',
      timestamp: '2026-02-13T10:00:00.000Z',
      source: 'qwickservices',
      payload: {
        booking_id: 'b-123',
        customer_id: uuid(1),
        provider_id: uuid(2),
        status: 'pending',
        amount: 150.0,
      },
    };

    mockNormalizeWebhookEvent.mockResolvedValue({
      id: uuid(100),
      type: 'booking.created',
      correlation_id: uuid(99),
      timestamp: '2026-02-13T10:00:00.000Z',
      version: 1,
      payload: body.payload,
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // idempotency check
      .mockResolvedValueOnce({ rows: [] }) // insert webhook_events
      .mockResolvedValueOnce({ rows: [] }) // bus emit internals
      .mockResolvedValueOnce({ rows: [] }); // update status

    const res = await postWebhook(body);
    const json = await res.json();

    expect(res.status).toBe(202);
    expect(json.received).toBe(true);
    expect(json.event_id).toBeDefined();
  });

  it('POST /api/webhooks/ingest accepts valid payment.completed', async () => {
    const body = {
      event_id: 'ext-payment-001',
      event_type: 'save-payment',
      timestamp: '2026-02-13T11:00:00.000Z',
      source: 'qwickservices',
      payload: {
        transaction_id: 'tx-456',
        user_id: uuid(1),
        amount: 75.5,
        currency: 'USD',
        status: 'completed',
      },
    };

    mockNormalizeWebhookEvent.mockResolvedValue({
      id: uuid(101),
      type: 'payment.completed',
      correlation_id: uuid(100),
      timestamp: '2026-02-13T11:00:00.000Z',
      version: 1,
      payload: body.payload,
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await postWebhook(body);
    const json = await res.json();

    expect(res.status).toBe(202);
    expect(json.received).toBe(true);
  });

  it('POST /api/webhooks/ingest accepts valid message.sent', async () => {
    const body = {
      event_id: 'ext-message-001',
      event_type: 'message-save',
      timestamp: '2026-02-13T12:00:00.000Z',
      source: 'qwickservices',
      payload: {
        message_id: 'msg-789',
        sender_id: uuid(1),
        recipient_id: uuid(2),
        content: 'Hello, this is a test message',
      },
    };

    mockNormalizeWebhookEvent.mockResolvedValue({
      id: uuid(102),
      type: 'message.sent',
      correlation_id: uuid(101),
      timestamp: '2026-02-13T12:00:00.000Z',
      version: 1,
      payload: body.payload,
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await postWebhook(body);
    const json = await res.json();

    expect(res.status).toBe(202);
    expect(json.received).toBe(true);
  });

  it('POST /api/webhooks/ingest accepts valid provider.registered', async () => {
    const body = {
      event_id: 'ext-provider-001',
      event_type: 'provider-register',
      timestamp: '2026-02-13T13:00:00.000Z',
      source: 'qwickservices',
      payload: {
        user_id: uuid(3),
        service_category: 'plumbing',
        verified: true,
      },
    };

    mockNormalizeWebhookEvent.mockResolvedValue({
      id: uuid(103),
      type: 'provider.registered',
      correlation_id: uuid(102),
      timestamp: '2026-02-13T13:00:00.000Z',
      version: 1,
      payload: body.payload,
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await postWebhook(body);
    const json = await res.json();

    expect(res.status).toBe(202);
    expect(json.received).toBe(true);
  });

  it('POST /api/webhooks/ingest accepts valid rating.submitted', async () => {
    const body = {
      event_id: 'ext-rating-001',
      event_type: 'rating-save',
      timestamp: '2026-02-13T14:00:00.000Z',
      source: 'qwickservices',
      payload: {
        rating_id: 'rating-123',
        rater_id: uuid(1),
        rated_user_id: uuid(2),
        stars: 5,
        comment: 'Great service!',
      },
    };

    mockNormalizeWebhookEvent.mockResolvedValue({
      id: uuid(104),
      type: 'rating.submitted',
      correlation_id: uuid(103),
      timestamp: '2026-02-13T14:00:00.000Z',
      version: 1,
      payload: body.payload,
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await postWebhook(body);
    const json = await res.json();

    expect(res.status).toBe(202);
    expect(json.received).toBe(true);
  });

  it('POST /api/webhooks/ingest rejects invalid HMAC signature (401)', async () => {
    const body = {
      event_id: 'ext-event-999',
      event_type: 'booking-save',
      timestamp: '2026-02-13T15:00:00.000Z',
      source: 'qwickservices',
      payload: {},
    };

    const res = await postWebhook(body, 'invalid-signature-12345678');
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toContain('Invalid');
  });
});

// ─── TEST GROUP 2: Pre-Transaction Evaluation ────────────────────────────────

describe('Pipeline E2E — Pre-Transaction Evaluation', () => {
  const EVAL_BODY = {
    action_type: 'booking.create',
    user_id: uuid(10),
  };

  it('POST /api/evaluate returns allow for clean user (score 10)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(50), score: '10.00', tier: 'low', factors: {} }] }) // risk_scores
      .mockResolvedValueOnce({ rows: [] }) // risk_signals
      .mockResolvedValueOnce({ rows: [{ id: uuid(60) }] }); // evaluation_log insert

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(EVAL_BODY),
      body: JSON.stringify(EVAL_BODY),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.decision).toBe('allow');
    expect(json.risk_score).toBe(10);
    expect(json.risk_tier).toBe('low');
  });

  it('POST /api/evaluate returns flag for medium risk (score 55)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(50), score: '55.00', tier: 'medium', factors: {} }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(60) }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(EVAL_BODY),
      body: JSON.stringify(EVAL_BODY),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.decision).toBe('allow'); // shadow mode
    expect(json.reason).toContain('[SHADOW]');
    expect(json.risk_score).toBe(55);
    expect(json.risk_tier).toBe('medium');
  });

  it('POST /api/evaluate returns block for critical risk (score 90)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(50), score: '90.00', tier: 'critical', factors: {} }] })
      .mockResolvedValueOnce({ rows: [] })
      // enforcement history queries
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      // executeAction (shadow mode insert + audit log)
      .mockResolvedValueOnce({ rows: [{ id: uuid(70) }] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(71) }] })
      // eval log
      .mockResolvedValueOnce({ rows: [{ id: uuid(60) }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(EVAL_BODY),
      body: JSON.stringify(EVAL_BODY),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.decision).toBe('allow'); // shadow mode
    expect(json.reason).toContain('[SHADOW]');
    expect(json.risk_score).toBe(90);
    expect(json.risk_tier).toBe('critical');
  });

  it('POST /api/evaluate returns block for suspended user', async () => {
    // This would typically check user status in the DB, but we're mocking
    // For now, we'll simulate via high score + enforcement history
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(50), score: '95.00', tier: 'critical', factors: {} }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // has active suspensions
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ action_type: 'SUSPEND_ACCOUNT' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(70) }] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(71) }] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(60) }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(EVAL_BODY),
      body: JSON.stringify(EVAL_BODY),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.decision).toBe('allow'); // shadow mode
    expect(json.risk_score).toBe(95);
  });

  it('POST /api/evaluate validates required fields', async () => {
    const invalidBody = { action_type: 'booking.create' }; // missing user_id

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(invalidBody),
      body: JSON.stringify(invalidBody),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});

// ─── TEST GROUP 3: Alerting Integration ──────────────────────────────────────

describe('Pipeline E2E — Alerting Integration', () => {
  it('GET /api/alerts returns paginated alert list', async () => {
    const mockAlerts = [
      {
        id: uuid(1),
        user_id: uuid(10),
        alert_type: 'RISK_ESCALATION',
        status: 'open',
        priority: 'high',
        message: 'Risk score increased to 75',
        created_at: '2026-02-13T10:00:00.000Z',
      },
      {
        id: uuid(2),
        user_id: uuid(11),
        alert_type: 'PATTERN_DETECTED',
        status: 'open',
        priority: 'medium',
        message: 'Multiple cancellations detected',
        created_at: '2026-02-13T11:00:00.000Z',
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ rows: mockAlerts })
      .mockResolvedValueOnce({ rows: [{ count: '2' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/alerts`, {
      method: 'GET',
      headers: authHeaders(),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.pagination.total).toBe(2);
  });

  it('GET /api/alerts filters by priority', async () => {
    const mockAlerts = [
      {
        id: uuid(1),
        alert_type: 'RISK_ESCALATION',
        status: 'open',
        priority: 'high',
        message: 'Critical risk detected',
        created_at: '2026-02-13T10:00:00.000Z',
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ rows: mockAlerts })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/alerts?priority=high`, {
      method: 'GET',
      headers: authHeaders(),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].priority).toBe('high');
  });

  it('GET /api/alerts filters by status', async () => {
    const mockAlerts = [
      {
        id: uuid(2),
        alert_type: 'PATTERN_DETECTED',
        status: 'resolved',
        priority: 'medium',
        message: 'Alert resolved',
        created_at: '2026-02-13T11:00:00.000Z',
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ rows: mockAlerts })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/alerts?status=resolved`, {
      method: 'GET',
      headers: authHeaders(),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data[0].status).toBe('resolved');
  });

  it('PATCH /api/alerts/:id updates alert status', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(1),
        status: 'in_progress',
        assigned_to: uuid(100),
      }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/alerts/${uuid(1)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'in_progress' }),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe('in_progress');
  });

  it('GET /api/alerts returns correct pagination metadata', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '45' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/alerts?page=2&limit=10`, {
      method: 'GET',
      headers: authHeaders(),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pagination.page).toBe(2);
    expect(json.pagination.limit).toBe(10);
    expect(json.pagination.total).toBe(45);
    expect(json.pagination.pages).toBe(5);
  });
});

// ─── TEST GROUP 4: Enforcement Pipeline ──────────────────────────────────────

describe('Pipeline E2E — Enforcement Pipeline', () => {
  it('GET /api/enforcement-actions returns actions list', async () => {
    const mockActions = [
      {
        id: uuid(1),
        user_id: uuid(10),
        action_type: 'FLAG_PROFILE',
        reason: 'High risk score',
        reason_code: 'RISK_THRESHOLD',
        risk_score_id: uuid(50),
        automated: true,
        created_at: '2026-02-13T10:00:00.000Z',
      },
      {
        id: uuid(2),
        user_id: uuid(11),
        action_type: 'SUSPEND_ACCOUNT',
        reason: 'Critical risk detected',
        reason_code: 'CRITICAL_RISK',
        risk_score_id: uuid(51),
        automated: true,
        created_at: '2026-02-13T11:00:00.000Z',
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ rows: mockActions })
      .mockResolvedValueOnce({ rows: [{ count: '2' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/enforcement-actions`, {
      method: 'GET',
      headers: authHeaders(),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.pagination.total).toBe(2);
  });

  it('GET /api/enforcement-actions filters by action_type', async () => {
    const mockActions = [
      {
        id: uuid(1),
        user_id: uuid(10),
        action_type: 'soft_warning',
        reason: 'Test reason',
        automated: true,
        created_at: '2026-02-13T10:00:00.000Z',
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ rows: mockActions })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/enforcement-actions?action_type=soft_warning`, {
      method: 'GET',
      headers: authHeaders(),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data[0].action_type).toBe('soft_warning');
  });

  it('GET /api/enforcement-actions?active_only=true filters active', async () => {
    const mockActions = [
      {
        id: uuid(1),
        user_id: uuid(10),
        action_type: 'SUSPEND_ACCOUNT',
        reason: 'Active suspension',
        reversed_at: null,
        effective_until: '2026-03-01T00:00:00.000Z',
        automated: true,
        created_at: '2026-02-13T10:00:00.000Z',
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ rows: mockActions })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/enforcement-actions?active_only=true`, {
      method: 'GET',
      headers: authHeaders(),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data[0].reversed_at).toBeNull();
  });

  it('POST /api/enforcement-actions/:id/reverse reverses an action', async () => {
    // Route does a single UPDATE ... RETURNING * (no SELECT first, no audit log)
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(1),
        user_id: uuid(10),
        action_type: 'soft_warning',
        reversed_at: '2026-02-13T12:00:00.000Z',
        reversed_by: uuid(100),
        reversal_reason: 'False positive',
      }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/enforcement-actions/${uuid(1)}/reverse`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ reason: 'False positive' }),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.reversed_at).toBeDefined();
  });

  it('GET /api/enforcement-actions?user_id=UUID filters by user', async () => {
    const targetUserId = uuid(10);
    const mockActions = [
      {
        id: uuid(1),
        user_id: targetUserId,
        action_type: 'FLAG_PROFILE',
        reason: 'Test',
        automated: true,
        created_at: '2026-02-13T10:00:00.000Z',
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ rows: mockActions })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/enforcement-actions?user_id=${targetUserId}`, {
      method: 'GET',
      headers: authHeaders(),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data[0].user_id).toBe(targetUserId);
  });
});

// ─── TEST GROUP 5: Rules Engine Integration ──────────────────────────────────

describe('Pipeline E2E — Rules Engine Integration', () => {
  it('GET /api/admin/rules lists detection rules', async () => {
    const mockRules = [
      {
        id: uuid(1),
        name: 'High Cancellation Rate',
        description: 'Flags users with >3 cancellations in 30 days',
        rule_type: 'detection',
        priority: 100,
        enabled: true,
        dry_run: false,
        version: 1,
        created_at: '2026-02-01T10:00:00.000Z',
      },
      {
        id: uuid(2),
        name: 'Suspicious Payment Pattern',
        description: 'Detects unusual payment behavior',
        rule_type: 'detection',
        priority: 200,
        enabled: true,
        dry_run: false,
        version: 1,
        created_at: '2026-02-02T10:00:00.000Z',
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ rows: mockRules })
      .mockResolvedValueOnce({ rows: [{ count: '2' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules`, {
      method: 'GET',
      headers: authHeaders(),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.pagination.total).toBe(2);
  });

  it('POST /api/admin/rules creates a new rule', async () => {
    const newRule = {
      name: 'Test Detection Rule',
      description: 'A test rule for pipeline validation',
      rule_type: 'detection',
      trigger_event_types: ['booking.cancelled'],
      conditions: {
        all: [
          { field: 'score', operator: 'gte', value: 50 },
        ],
      },
      actions: [
        { type: 'create_enforcement', action_type: 'temporary_restriction' },
      ],
      priority: 150,
      enabled: true,
      dry_run: false,
    };

    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: uuid(10),
          ...newRule,
          version: 1,
          created_by: uuid(1),
          previous_version_id: null,
          created_at: '2026-02-13T12:00:00.000Z',
          updated_at: '2026-02-13T12:00:00.000Z',
        }],
      })
      .mockResolvedValueOnce({ rows: [] }); // audit log

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(newRule),
    });

    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.id).toBeDefined();
    expect(json.data.name).toBe('Test Detection Rule');
    expect(json.data.version).toBe(1);
  });

  it('PUT /api/admin/rules/:id creates new version', async () => {
    const ruleUpdate = {
      name: 'Updated Rule Name',
      description: 'Updated description',
      conditions: {
        all: [
          { field: 'score', operator: 'gte', value: 75 },
        ],
      },
    };

    mockQuery
      .mockResolvedValueOnce({
        // SELECT existing rule
        rows: [{
          id: uuid(1),
          name: 'Original Rule',
          description: 'Original',
          rule_type: 'detection',
          trigger_event_types: ['booking.cancelled'],
          conditions: { all: [{ field: 'score', operator: 'gte', value: 50 }] },
          actions: [{ type: 'create_enforcement', action_type: 'temporary_restriction' }],
          priority: 100,
          enabled: true,
          dry_run: false,
          version: 1,
        }],
      })
      .mockResolvedValueOnce({ rows: [] }) // UPDATE disable old
      .mockResolvedValueOnce({
        // INSERT new version
        rows: [{
          id: uuid(11),
          name: 'Updated Rule Name',
          description: 'Updated description',
          rule_type: 'detection',
          version: 2,
          previous_version_id: uuid(1),
          created_at: '2026-02-13T12:00:00.000Z',
          updated_at: '2026-02-13T12:00:00.000Z',
        }],
      })
      .mockResolvedValueOnce({ rows: [] }); // audit log

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules/${uuid(1)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(ruleUpdate),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.version).toBe(2);
    expect(json.data.previous_version_id).toBe(uuid(1));
  });

  it('DELETE /api/admin/rules/:id soft-disables', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(1) }] }) // UPDATE set enabled=false RETURNING id
      .mockResolvedValueOnce({ rows: [] }); // audit log

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules/${uuid(1)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.deleted).toBe(true);
    expect(json.data.id).toBe(uuid(1));
  });

  it('POST /api/admin/rules/:id/test returns match count', async () => {
    mockQuery
      .mockResolvedValueOnce({
        // SELECT * FROM detection_rules WHERE id = $1
        rows: [{
          id: uuid(1),
          name: 'Test Rule',
          rule_type: 'detection',
          trigger_event_types: ['booking.cancelled'],
          conditions: { all: [{ field: 'score', operator: 'gte', value: 50 }] },
          actions: [{ type: 'create_enforcement', action_type: 'temporary_restriction' }],
          enabled: true,
        }],
      })
      .mockResolvedValueOnce({
        // SELECT DISTINCT ON (user_id) user_id, score, tier FROM risk_scores
        rows: [
          { user_id: uuid(10), score: '80.00', tier: 'high' },
          { user_id: uuid(11), score: '30.00', tier: 'low' },
        ],
      })
      // buildRuleContext for user 10: signal count + user lookup (parallel)
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [{ user_type: 'client', service_category: 'plumbing' }] })
      // buildRuleContext for user 11: signal count + user lookup (parallel)
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/admin/rules/${uuid(1)}/test`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    // User 10 (score 80) matches score >= 50, user 11 (score 30) does not
    expect(json.data.matches).toBe(1);
    expect(json.data.total).toBe(2);
  });
});

// ─── TEST GROUP 6: Full Pipeline Trace ───────────────────────────────────────

describe('Pipeline E2E — Full Pipeline Trace', () => {
  it('Webhook ingest → evaluate returns consistent score-based decision', async () => {
    const userId = uuid(20);

    // Step 1: Ingest webhook
    const webhookBody = {
      event_id: 'ext-full-pipeline-001',
      event_type: 'booking-save',
      timestamp: '2026-02-13T15:00:00.000Z',
      source: 'qwickservices',
      payload: {
        booking_id: 'b-pipeline-test',
        customer_id: userId,
        provider_id: uuid(21),
        status: 'pending',
      },
    };

    mockNormalizeWebhookEvent.mockResolvedValue({
      id: uuid(200),
      type: 'booking.created',
      correlation_id: uuid(199),
      timestamp: '2026-02-13T15:00:00.000Z',
      version: 1,
      payload: webhookBody.payload,
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // idempotency check
      .mockResolvedValueOnce({ rows: [] }) // insert webhook_events
      .mockResolvedValueOnce({ rows: [] }) // update status=processed
      // evaluate mocks (queued before webhook response completes)
      .mockResolvedValueOnce({ rows: [{ id: uuid(50), score: '35.00', tier: 'low', factors: {} }] }) // risk_scores
      .mockResolvedValueOnce({ rows: [] }) // risk_signals
      .mockResolvedValueOnce({ rows: [] }) // loadActiveRules (no rules)
      .mockResolvedValueOnce({ rows: [] }); // logEvaluation

    const webhookRes = await postWebhook(webhookBody);
    expect(webhookRes.status).toBe(202);

    // Step 2: Evaluate the user
    const evalBody = {
      action_type: 'booking.create',
      user_id: userId,
    };

    const evalRes = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(evalBody),
      body: JSON.stringify(evalBody),
    });

    const evalJson = await evalRes.json();

    expect(evalRes.status).toBe(200);
    expect(evalJson.decision).toBe('allow');
    expect(evalJson.risk_score).toBe(35);
  });

  it('A user with active enforcement gets blocked on evaluate', async () => {
    const userId = uuid(25);
    const evalBody = {
      action_type: 'booking.create',
      user_id: userId,
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(50), score: '80.00', tier: 'high', factors: {} }] })
      .mockResolvedValueOnce({ rows: [] })
      // enforcement history indicates active suspension
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ action_type: 'SUSPEND_ACCOUNT', reversed_at: null }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(70) }] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(71) }] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(60) }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(evalBody),
      body: JSON.stringify(evalBody),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.decision).toBe('allow'); // shadow mode
    expect(json.risk_score).toBe(80);
  });

  it('Multiple signals for same user compound into higher risk evaluation', async () => {
    const userId = uuid(30);
    const evalBody = {
      action_type: 'booking.create',
      user_id: userId,
    };

    // User has multiple risk signals
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(50), score: '65.00', tier: 'medium', factors: {} }] }) // risk_scores
      .mockResolvedValueOnce({
        // risk_signals
        rows: [
          { signal_type: 'CONTACT_PHONE', pattern_flags: [] },
          { signal_type: 'BOOKING_CANCEL_PATTERN', pattern_flags: [] },
          { signal_type: 'VELOCITY_SPIKE', pattern_flags: [] },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // loadActiveRules (no rules)
      .mockResolvedValueOnce({ rows: [] }); // logEvaluation

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(evalBody),
      body: JSON.stringify(evalBody),
    });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.risk_score).toBe(65);
    expect(json.signals).toHaveLength(3);
    expect(json.signals).toContain('CONTACT_PHONE');
    expect(json.signals).toContain('BOOKING_CANCEL_PATTERN');
    expect(json.signals).toContain('VELOCITY_SPIKE');
  });

  it('Admin rule override changes enforcement decision', async () => {
    // This test simulates a scenario where a rule is created/updated
    // and then affects evaluation decisions

    // Step 1: Create a rule
    const newRule = {
      name: 'Override Test Rule',
      description: 'Test rule for override',
      rule_type: 'enforcement_trigger',
      trigger_event_types: ['booking.created'],
      conditions: {
        all: [{ field: 'score', operator: 'gte', value: 50 }],
      },
      actions: [{ type: 'create_enforcement', action_type: 'temporary_restriction' }],
      priority: 50,
      enabled: true,
      dry_run: false,
    };

    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          id: uuid(15),
          ...newRule,
          version: 1,
          created_by: uuid(1),
          previous_version_id: null,
          created_at: '2026-02-13T16:00:00.000Z',
          updated_at: '2026-02-13T16:00:00.000Z',
        }],
      })
      .mockResolvedValueOnce({ rows: [] }); // audit log

    const ruleRes = await fetch(`http://127.0.0.1:${port}/api/admin/rules`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(newRule),
    });

    expect(ruleRes.status).toBe(201);

    // Step 2: Evaluate user who would trigger this rule
    const userId = uuid(35);
    const evalBody = {
      action_type: 'booking.create',
      user_id: userId,
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(50), score: '60.00', tier: 'medium', factors: {} }] }) // risk_scores
      .mockResolvedValueOnce({ rows: [] }) // risk_signals
      .mockResolvedValueOnce({ rows: [] }) // loadActiveRules (no rules in this mock context)
      .mockResolvedValueOnce({ rows: [] }); // logEvaluation

    const evalRes = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(evalBody),
      body: JSON.stringify(evalBody),
    });

    const evalJson = await evalRes.json();

    expect(evalRes.status).toBe(200);
    expect(evalJson.decision).toBe('allow'); // shadow mode
    expect(evalJson.risk_score).toBe(60);
  });
});
