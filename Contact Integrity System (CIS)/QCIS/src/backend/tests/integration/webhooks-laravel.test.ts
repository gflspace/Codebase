// QwickServices CIS — Laravel Webhook Integration Tests
// Simulates QwickServices Laravel platform sending webhooks to CIS
// Tests HMAC verification, idempotency, event normalization, and error handling

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
  uuid,
} from '../helpers/setup';
import webhookRoutes from '../../src/api/routes/webhooks';

const WEBHOOK_SECRET = 'test-webhook-secret';

const app = createTestApp();
app.use('/api/webhooks', webhookRoutes);

let server: http.Server;
let port: number;

beforeAll(async () => {
  const s = await startServer(app);
  server = s.server;
  port = s.port;
});

afterAll(() => stopServer(server));
beforeEach(() => resetAllMocks());

// ─── Test Helpers ────────────────────────────────────────────────

function signPayload(body: unknown): string {
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
}

function makeWebhookPayload(eventType: string, payload: Record<string, unknown>) {
  return {
    event_id: crypto.randomUUID(),
    event_type: eventType,
    timestamp: new Date().toISOString(),
    source: 'qwickservices',
    payload,
  };
}

async function sendWebhook(body: unknown, signature?: string) {
  const bodyStr = JSON.stringify(body);
  const sig = signature ?? signPayload(body);
  return fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': sig,
    },
    body: bodyStr,
  });
}

function mockSuccessfulWebhookProcessing() {
  // 1. Idempotency check (no existing)
  mockQuery.mockResolvedValueOnce({ rows: [] });
  // 2. INSERT webhook_events
  mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
  // 3. UPDATE webhook_events (mark processed)
  mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
  // 4. Mock normalizer
  mockNormalizeWebhookEvent.mockResolvedValueOnce({
    id: uuid(100),
    type: 'message.created',
    correlation_id: uuid(200),
    timestamp: new Date().toISOString(),
    version: 1,
    payload: {},
  });
}

// ─── Authentication Tests ────────────────────────────────────────

describe('Webhook Authentication', () => {
  it('rejects requests without signature header', async () => {
    const payload = makeWebhookPayload('booking.created', {
      client_id: uuid(1),
      provider_id: uuid(2),
      service_category: 'spa',
      amount: 100.0,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Missing X-Webhook-Signature');
  });

  it('rejects requests with invalid signature', async () => {
    const payload = makeWebhookPayload('booking.created', {
      client_id: uuid(1),
      provider_id: uuid(2),
      service_category: 'spa',
      amount: 100.0,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    });

    const res = await sendWebhook(payload, 'invalid_signature_12345');

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Invalid webhook signature');
  });

  it('accepts requests with valid HMAC signature', async () => {
    const payload = makeWebhookPayload('booking.created', {
      client_id: uuid(1),
      provider_id: uuid(2),
      service_category: 'spa',
      amount: 100.0,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    });

    mockSuccessfulWebhookProcessing();

    const res = await sendWebhook(payload);

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.event_id).toBeDefined();
    expect(mockNormalizeWebhookEvent).toHaveBeenCalledOnce();
  });
});

// ─── Event Type Tests ────────────────────────────────────────────

describe('Laravel Event Processing', () => {
  it('processes booking.created webhook', async () => {
    const payload = makeWebhookPayload('booking.created', {
      client_id: uuid(1),
      provider_id: uuid(2),
      service_category: 'spa',
      amount: 100.0,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    });

    mockSuccessfulWebhookProcessing();

    const res = await sendWebhook(payload);

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(3); // idempotency check, insert, update
    expect(mockNormalizeWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'booking.created',
        payload: expect.objectContaining({
          client_id: uuid(1),
          provider_id: uuid(2),
        }),
      })
    );
  });

  it('processes payment.completed webhook', async () => {
    const payload = makeWebhookPayload('payment.completed', {
      user_id: uuid(1),
      amount: 50.0,
      currency: 'USD',
      payment_method: 'card',
      status: 'completed',
    });

    mockSuccessfulWebhookProcessing();

    const res = await sendWebhook(payload);

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockNormalizeWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'payment.completed',
        payload: expect.objectContaining({
          user_id: uuid(1),
          amount: 50.0,
        }),
      })
    );
  });

  it('processes chat.message_sent webhook', async () => {
    const payload = makeWebhookPayload('chat.message_sent', {
      sender_id: uuid(1),
      receiver_id: uuid(2),
      content: 'Can we meet outside the platform?',
    });

    mockSuccessfulWebhookProcessing();

    const res = await sendWebhook(payload);

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockNormalizeWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'chat.message_sent',
        payload: expect.objectContaining({
          sender_id: uuid(1),
          receiver_id: uuid(2),
        }),
      })
    );
  });

  it('processes provider.registered webhook', async () => {
    const payload = makeWebhookPayload('provider.registered', {
      provider_id: uuid(3),
      user_id: uuid(3),
      service_category: 'massage',
    });

    mockSuccessfulWebhookProcessing();

    const res = await sendWebhook(payload);

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockNormalizeWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'provider.registered',
        payload: expect.objectContaining({
          provider_id: uuid(3),
          service_category: 'massage',
        }),
      })
    );
  });

  it('processes rating.submitted webhook', async () => {
    const payload = makeWebhookPayload('rating.submitted', {
      rating_id: uuid(10),
      client_id: uuid(1),
      provider_id: uuid(2),
      booking_id: uuid(5),
      score: 5,
      comment: 'Great service!',
    });

    mockSuccessfulWebhookProcessing();

    const res = await sendWebhook(payload);

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockNormalizeWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'rating.submitted',
        payload: expect.objectContaining({
          rating_id: uuid(10),
          score: 5,
        }),
      })
    );
  });

  it('processes booking.cancelled webhook', async () => {
    const payload = makeWebhookPayload('booking.cancelled', {
      booking_id: uuid(7),
      client_id: uuid(1),
      provider_id: uuid(2),
      cancelled_by: 'client',
      reason: 'Changed plans',
    });

    mockSuccessfulWebhookProcessing();

    const res = await sendWebhook(payload);

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockNormalizeWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'booking.cancelled',
        payload: expect.objectContaining({
          booking_id: uuid(7),
          cancelled_by: 'client',
        }),
      })
    );
  });
});

// ─── Idempotency Tests ───────────────────────────────────────────

describe('Webhook Idempotency', () => {
  it('returns duplicate response for repeated event_id', async () => {
    const eventId = crypto.randomUUID();
    const payload = {
      event_id: eventId,
      event_type: 'booking.created',
      timestamp: new Date().toISOString(),
      source: 'qwickservices',
      payload: {
        client_id: uuid(1),
        provider_id: uuid(2),
        service_category: 'spa',
        amount: 100.0,
        status: 'pending',
        scheduled_at: new Date().toISOString(),
      },
    };

    // Mock idempotency check finding existing record
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'existing-webhook-id', status: 'processed' }],
    });

    const res = await sendWebhook(payload);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.duplicate).toBe(true);
    expect(body.event_id).toBe('existing-webhook-id');
    expect(mockQuery).toHaveBeenCalledTimes(1); // Only idempotency check
    expect(mockNormalizeWebhookEvent).not.toHaveBeenCalled();
  });

  it('processes same event_id only once', async () => {
    const eventId = crypto.randomUUID();
    const payload = {
      event_id: eventId,
      event_type: 'payment.completed',
      timestamp: new Date().toISOString(),
      source: 'qwickservices',
      payload: {
        user_id: uuid(1),
        amount: 50.0,
        currency: 'USD',
        payment_method: 'card',
        status: 'completed',
      },
    };

    // First call: no existing record
    mockSuccessfulWebhookProcessing();

    const res1 = await sendWebhook(payload);
    expect(res1.status).toBe(202);
    const body1 = await res1.json();
    expect(body1.duplicate).toBeUndefined();

    // Second call: existing record found
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'webhook-id-123', status: 'processed' }],
    });

    const res2 = await sendWebhook(payload);
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.duplicate).toBe(true);
    expect(body2.event_id).toBe('webhook-id-123');
  });
});

// ─── Error Handling Tests ────────────────────────────────────────

describe('Webhook Error Handling', () => {
  it('returns 400 for unknown event type', async () => {
    const payload = makeWebhookPayload('foo.bar', {
      some_field: 'value',
    });

    // Mock idempotency check (no existing)
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Mock INSERT webhook_events
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Mock normalizer throwing error
    mockNormalizeWebhookEvent.mockRejectedValueOnce(
      new Error('Unknown webhook event type: foo.bar')
    );
    // Mock UPDATE (mark failed) - will be called in catch block
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await sendWebhook(payload);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Unknown webhook event type');
  });

  it('handles database errors gracefully', async () => {
    const payload = makeWebhookPayload('booking.created', {
      client_id: uuid(1),
      provider_id: uuid(2),
      service_category: 'spa',
      amount: 100.0,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    });

    // Mock idempotency check failing
    mockQuery.mockRejectedValueOnce(new Error('Database connection error'));

    const res = await sendWebhook(payload);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Webhook processing failed');
  });

  it('validates payload structure - missing required fields', async () => {
    const invalidPayload = {
      event_type: 'booking.created',
      timestamp: new Date().toISOString(),
      source: 'qwickservices',
      payload: {},
      // Missing event_id
    };

    const res = await sendWebhook(invalidPayload);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.details).toBeDefined();
  });

  it('validates payload structure - invalid timestamp format', async () => {
    const invalidPayload = {
      event_id: crypto.randomUUID(),
      event_type: 'booking.created',
      timestamp: 'not-a-valid-datetime',
      source: 'qwickservices',
      payload: {},
    };

    const res = await sendWebhook(invalidPayload);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.details).toBeDefined();
  });

  it('validates source is allowed', async () => {
    const payload = {
      event_id: crypto.randomUUID(),
      event_type: 'booking.created',
      timestamp: new Date().toISOString(),
      source: 'untrusted-source',
      payload: {},
    };

    const res = await sendWebhook(payload);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.details).toBeDefined();
  });
});

// ─── Batch Processing Tests ──────────────────────────────────────

describe('Webhook Batch Processing', () => {
  it('processes a burst of 5 webhooks sequentially', async () => {
    const webhooks = [
      makeWebhookPayload('booking.created', {
        client_id: uuid(1),
        provider_id: uuid(2),
        service_category: 'spa',
        amount: 100.0,
        status: 'pending',
        scheduled_at: new Date().toISOString(),
      }),
      makeWebhookPayload('payment.completed', {
        user_id: uuid(1),
        amount: 50.0,
        currency: 'USD',
        payment_method: 'card',
        status: 'completed',
      }),
      makeWebhookPayload('chat.message_sent', {
        sender_id: uuid(1),
        receiver_id: uuid(2),
        content: 'Hello',
      }),
      makeWebhookPayload('provider.registered', {
        provider_id: uuid(3),
        user_id: uuid(3),
        service_category: 'massage',
      }),
      makeWebhookPayload('rating.submitted', {
        rating_id: uuid(10),
        client_id: uuid(1),
        provider_id: uuid(2),
        booking_id: uuid(5),
        score: 5,
        comment: 'Great!',
      }),
    ];

    const results = [];

    for (const webhook of webhooks) {
      mockSuccessfulWebhookProcessing();
      const res = await sendWebhook(webhook);
      results.push(res.status);
    }

    // All webhooks should be accepted
    expect(results).toEqual([202, 202, 202, 202, 202]);
    expect(mockNormalizeWebhookEvent).toHaveBeenCalledTimes(5);
    expect(mockQuery).toHaveBeenCalledTimes(15); // 3 queries per webhook × 5
  });

  it('continues processing after one webhook fails', async () => {
    const webhook1 = makeWebhookPayload('booking.created', {
      client_id: uuid(1),
      provider_id: uuid(2),
      service_category: 'spa',
      amount: 100.0,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    });

    const webhook2 = makeWebhookPayload('unknown.event', {
      some_field: 'value',
    });

    const webhook3 = makeWebhookPayload('payment.completed', {
      user_id: uuid(1),
      amount: 50.0,
      currency: 'USD',
      payment_method: 'card',
      status: 'completed',
    });

    // First webhook succeeds
    mockSuccessfulWebhookProcessing();
    const res1 = await sendWebhook(webhook1);
    expect(res1.status).toBe(202);

    // Second webhook fails (unknown event type)
    mockQuery.mockResolvedValueOnce({ rows: [] }); // idempotency check
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // insert
    mockNormalizeWebhookEvent.mockRejectedValueOnce(
      new Error('Unknown webhook event type: unknown.event')
    );
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // update failed status
    const res2 = await sendWebhook(webhook2);
    expect(res2.status).toBe(400);

    // Third webhook succeeds
    mockSuccessfulWebhookProcessing();
    const res3 = await sendWebhook(webhook3);
    expect(res3.status).toBe(202);
  });
});

// ─── Advanced Scenarios ──────────────────────────────────────────

describe('Webhook Advanced Scenarios', () => {
  it('handles large payload within limits', async () => {
    const largeComment = 'A'.repeat(5000); // 5KB comment
    const payload = makeWebhookPayload('rating.submitted', {
      rating_id: uuid(10),
      client_id: uuid(1),
      provider_id: uuid(2),
      booking_id: uuid(5),
      score: 3,
      comment: largeComment,
    });

    mockSuccessfulWebhookProcessing();

    const res = await sendWebhook(payload);

    expect(res.status).toBe(202);
    expect(mockNormalizeWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          comment: largeComment,
        }),
      })
    );
  });

  it('preserves metadata in webhook payload', async () => {
    const payload = makeWebhookPayload('booking.created', {
      client_id: uuid(1),
      provider_id: uuid(2),
      service_category: 'spa',
      amount: 100.0,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      metadata: {
        source_ip: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        platform_version: '2.4.1',
      },
    });

    mockSuccessfulWebhookProcessing();

    const res = await sendWebhook(payload);

    expect(res.status).toBe(202);
    expect(mockNormalizeWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          metadata: expect.objectContaining({
            source_ip: '192.168.1.1',
            platform_version: '2.4.1',
          }),
        }),
      })
    );
  });

  it('handles concurrent duplicate detection', async () => {
    const eventId = crypto.randomUUID();
    const payload = {
      event_id: eventId,
      event_type: 'booking.created',
      timestamp: new Date().toISOString(),
      source: 'qwickservices',
      payload: {
        client_id: uuid(1),
        provider_id: uuid(2),
        service_category: 'spa',
        amount: 100.0,
        status: 'pending',
        scheduled_at: new Date().toISOString(),
      },
    };

    // Simulate race condition: both requests check idempotency at same time
    // First request finds no duplicate
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockNormalizeWebhookEvent.mockResolvedValueOnce({
      id: uuid(100),
      type: 'booking.created',
      correlation_id: uuid(200),
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {},
    });

    const res1 = await sendWebhook(payload);
    expect(res1.status).toBe(202);

    // Second request finds duplicate
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'webhook-id-123', status: 'processed' }],
    });

    const res2 = await sendWebhook(payload);
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.duplicate).toBe(true);
  });

  it('records partial failure in database', async () => {
    const payload = makeWebhookPayload('booking.created', {
      client_id: uuid(1),
      provider_id: uuid(2),
      service_category: 'spa',
      amount: 100.0,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    });

    // Mock idempotency check
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Mock INSERT webhook_events
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Mock normalizer failing
    mockNormalizeWebhookEvent.mockRejectedValueOnce(
      new Error('Normalization failed: invalid format')
    );
    // Mock UPDATE to mark as failed (should be called)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await sendWebhook(payload);

    expect(res.status).toBe(500);
    expect(mockQuery).toHaveBeenCalledTimes(3); // check, insert, update failed
    // Verify the UPDATE was called with error message
    const updateCall = mockQuery.mock.calls[2];
    expect(updateCall[0]).toContain('UPDATE webhook_events SET status = \'failed\'');
  });
});
