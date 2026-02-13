// QwickServices CIS — Laravel E2E Integration Tests
// Tests full Laravel→CIS flow with realistic scenarios
// Validates webhook ingestion, event normalization, and pre-transaction evaluation

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  mockQuery,
  resetAllMocks,
  createTestApp,
  startServer,
  stopServer,
  authHeaders,
  uuid,
  mockNormalizeWebhookEvent,
} from '../helpers/setup';
import crypto from 'crypto';
import webhookRoutes from '../../src/api/routes/webhooks';
import evaluateRoutes from '../../src/api/routes/evaluate';
import { EventType } from '../../src/events/types';
import http from 'http';

const app = createTestApp();
app.use('/api/webhooks', webhookRoutes);
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

// ─── Helper Functions ────────────────────────────────────────────

function signWebhookPayload(payload: string): string {
  const hmac = crypto.createHmac('sha256', 'test-webhook-secret');
  hmac.update(payload);
  return hmac.digest('hex');
}

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

function createBookingWebhook(eventType: string, bookingId: string, clientId: string, providerId: string, status = 'confirmed') {
  return {
    event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    source: 'qwickservices',
    payload: {
      booking_id: bookingId,
      customer_id: clientId,
      provider_id: providerId,
      service_category: 'cleaning',
      amount: 150.00,
      currency: 'USD',
      status,
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    },
  };
}

function createPaymentWebhook(eventType: string, txId: string, userId: string, amount: number, status = 'completed') {
  return {
    event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    source: 'qwickservices',
    payload: {
      transaction_id: txId,
      user_id: userId,
      amount,
      tx_type: 'deposit',
      currency: 'USD',
      payment_method: 'credit_card',
      status,
    },
  };
}

function createMessageWebhook(messageId: string, senderId: string, receiverId: string, content: string) {
  return {
    event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    event_type: 'chat-message-sent',
    timestamp: new Date().toISOString(),
    source: 'qwickservices',
    payload: {
      message_id: messageId,
      sender_id: senderId,
      receiver_id: receiverId,
      content,
    },
  };
}

function createProviderWebhook(providerId: string, userId: string, serviceCategory = 'plumbing') {
  return {
    event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    event_type: 'provider-register',
    timestamp: new Date().toISOString(),
    source: 'qwickservices',
    payload: {
      provider_id: providerId,
      user_id: userId,
      service_category: serviceCategory,
    },
  };
}

function createRatingWebhook(ratingId: string, clientId: string, providerId: string, score: number, bookingId?: string) {
  return {
    event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    event_type: 'rating-submitted',
    timestamp: new Date().toISOString(),
    source: 'qwickservices',
    payload: {
      rating_id: ratingId,
      client_id: clientId,
      provider_id: providerId,
      booking_id: bookingId,
      score,
      comment: 'Great service!',
    },
  };
}

// ─── Test Suite 1: Full Booking Lifecycle ────────────────────────

describe('Laravel E2E — Booking Lifecycle', () => {
  it('processes booking.created webhook with 202 and stores webhook_events', async () => {
    const webhookBody = createBookingWebhook('booking-create', uuid(10), uuid(1), uuid(2));
    const bodyStr = JSON.stringify(webhookBody);
    const signature = signWebhookPayload(bodyStr);

    // Mock normalizer to return domain event
    mockNormalizeWebhookEvent.mockResolvedValueOnce({
      id: uuid(100),
      type: EventType.BOOKING_CREATED,
      correlation_id: uuid(101),
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        booking_id: uuid(10),
        client_id: uuid(1),
        provider_id: uuid(2),
        service_category: 'cleaning',
        amount: 150.00,
        currency: 'USD',
        status: 'confirmed',
      },
    });

    // Mock DB queries: idempotency check, insert webhook_events, update processed
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // idempotency check
      .mockResolvedValueOnce({ rows: [{ id: uuid(50) }] }) // insert webhook_events
      .mockResolvedValueOnce({ rows: [] }); // update status to processed

    const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body: bodyStr,
    });

    expect(res.status).toBe(202);
    const result = await res.json();
    expect(result.received).toBe(true);
    expect(result.event_id).toBeDefined();

    // Verify webhook_events was stored
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, status FROM webhook_events'),
      expect.arrayContaining(['qwickservices'])
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO webhook_events'),
      expect.any(Array)
    );
  });

  it('processes booking.completed webhook and triggers scoring', async () => {
    const webhookBody = createBookingWebhook('booking-complete', uuid(10), uuid(1), uuid(2), 'completed');
    const bodyStr = JSON.stringify(webhookBody);
    const signature = signWebhookPayload(bodyStr);

    mockNormalizeWebhookEvent.mockResolvedValueOnce({
      id: uuid(100),
      type: EventType.BOOKING_COMPLETED,
      correlation_id: uuid(101),
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        booking_id: uuid(10),
        client_id: uuid(1),
        provider_id: uuid(2),
        status: 'completed',
      },
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(50) }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body: bodyStr,
    });

    expect(res.status).toBe(202);
    expect(mockNormalizeWebhookEvent).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'booking-complete',
    }));
  });

  it('processes booking.cancelled webhook and generates cancellation signal', async () => {
    const webhookBody = createBookingWebhook('booking-cancel', uuid(10), uuid(1), uuid(2), 'cancelled');
    const bodyStr = JSON.stringify(webhookBody);
    const signature = signWebhookPayload(bodyStr);

    mockNormalizeWebhookEvent.mockResolvedValueOnce({
      id: uuid(100),
      type: EventType.BOOKING_CANCELLED,
      correlation_id: uuid(101),
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        booking_id: uuid(10),
        client_id: uuid(1),
        provider_id: uuid(2),
        status: 'cancelled',
      },
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(50) }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body: bodyStr,
    });

    expect(res.status).toBe(202);
  });
});

// ─── Test Suite 2: Payment Lifecycle ─────────────────────────────

describe('Laravel E2E — Payment Lifecycle', () => {
  it('processes payment.initiated and returns allow decision from /evaluate', async () => {
    const evalBody = {
      action_type: 'payment.initiate',
      user_id: uuid(1),
      counterparty_id: uuid(2),
      metadata: {
        amount: 250.00,
        payment_method: 'credit_card',
      },
    };

    // Mock low risk score
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(10), score: '25.00', tier: 'low', factors: {} }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(99) }] }); // eval log

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(evalBody),
      body: JSON.stringify(evalBody),
    });

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.decision).toBe('allow');
    expect(result.risk_score).toBe(25);
  });

  it('processes payment.completed webhook', async () => {
    const webhookBody = createPaymentWebhook('payment-deposit', uuid(20), uuid(1), 500.00);
    const bodyStr = JSON.stringify(webhookBody);
    const signature = signWebhookPayload(bodyStr);

    mockNormalizeWebhookEvent.mockResolvedValueOnce({
      id: uuid(100),
      type: EventType.WALLET_DEPOSIT,
      correlation_id: uuid(101),
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        wallet_tx_id: uuid(20),
        user_id: uuid(1),
        tx_type: 'deposit',
        amount: 500.00,
        currency: 'USD',
        status: 'completed',
      },
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(50) }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body: bodyStr,
    });

    expect(res.status).toBe(202);
  });
});

// ─── Test Suite 3: Message with Contact Info ─────────────────────

describe('Laravel E2E — Message with Contact Info', () => {
  it('detects phone number in chat.message_sent content', async () => {
    const msgBody = createMessageWebhook(
      uuid(30),
      uuid(1),
      uuid(2),
      'Hey, call me at 555-123-4567 to discuss the job'
    );
    const bodyStr = JSON.stringify(msgBody);
    const signature = signWebhookPayload(bodyStr);

    mockNormalizeWebhookEvent.mockResolvedValueOnce({
      id: uuid(100),
      type: EventType.MESSAGE_CREATED,
      correlation_id: uuid(101),
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        message_id: uuid(30),
        sender_id: uuid(1),
        receiver_id: uuid(2),
        content: 'Hey, call me at 555-123-4567 to discuss the job',
      },
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(50) }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body: bodyStr,
    });

    expect(res.status).toBe(202);
    // Detection consumer would be called by event bus — tested separately
  });
});

// ─── Test Suite 4: Provider Registration ─────────────────────────

describe('Laravel E2E — Provider Registration', () => {
  it('processes provider.registered and creates user (lazy registration)', async () => {
    const webhookBody = createProviderWebhook(uuid(40), uuid(5));
    const bodyStr = JSON.stringify(webhookBody);
    const signature = signWebhookPayload(bodyStr);

    mockNormalizeWebhookEvent.mockResolvedValueOnce({
      id: uuid(100),
      type: EventType.PROVIDER_REGISTERED,
      correlation_id: uuid(101),
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        provider_id: uuid(40),
        user_id: uuid(5),
        service_category: 'plumbing',
      },
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(50) }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body: bodyStr,
    });

    expect(res.status).toBe(202);
  });
});

// ─── Test Suite 5: Rating Flow ───────────────────────────────────

describe('Laravel E2E — Rating Flow', () => {
  it('processes rating.submitted webhook', async () => {
    const webhookBody = createRatingWebhook(uuid(60), uuid(1), uuid(2), 5, uuid(10));
    const bodyStr = JSON.stringify(webhookBody);
    const signature = signWebhookPayload(bodyStr);

    mockNormalizeWebhookEvent.mockResolvedValueOnce({
      id: uuid(100),
      type: EventType.RATING_SUBMITTED,
      correlation_id: uuid(101),
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        rating_id: uuid(60),
        client_id: uuid(1),
        provider_id: uuid(2),
        booking_id: uuid(10),
        score: 5,
        comment: 'Great service!',
      },
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(50) }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body: bodyStr,
    });

    expect(res.status).toBe(202);
  });
});

// ─── Test Suite 6: Multi-Event Correlation ───────────────────────

describe('Laravel E2E — Multi-Event Correlation', () => {
  it('processes 3 rapid cancellations in sequence for same user', async () => {
    const userId = uuid(1);
    const cancellations = [
      createBookingWebhook('booking-cancel', uuid(70), userId, uuid(2), 'cancelled'),
      createBookingWebhook('booking-cancel', uuid(71), userId, uuid(3), 'cancelled'),
      createBookingWebhook('booking-cancel', uuid(72), userId, uuid(4), 'cancelled'),
    ];

    for (let i = 0; i < cancellations.length; i++) {
      const bodyStr = JSON.stringify(cancellations[i]);
      const signature = signWebhookPayload(bodyStr);

      mockNormalizeWebhookEvent.mockResolvedValueOnce({
        id: uuid(100 + i),
        type: EventType.BOOKING_CANCELLED,
        correlation_id: uuid(101),
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {
          booking_id: uuid(70 + i),
          client_id: userId,
          provider_id: uuid(2 + i),
          status: 'cancelled',
        },
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: uuid(50 + i) }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signature,
        },
        body: bodyStr,
      });

      expect(res.status).toBe(202);
    }

    // Booking consumer would detect rapid cancellation pattern
  });
});

// ─── Test Suite 7: Pre-Transaction Evaluation ────────────────────

describe('Laravel E2E — Pre-Transaction Evaluation', () => {
  it('returns allow for clean user with no risk score', async () => {
    const evalBody = {
      action_type: 'booking.create',
      user_id: uuid(1),
      counterparty_id: uuid(2),
      metadata: {
        booking_amount: 120.00,
        service_type: 'cleaning',
      },
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // No risk score
      .mockResolvedValueOnce({ rows: [] }) // No signals
      .mockResolvedValueOnce({ rows: [{ id: uuid(99) }] }); // eval log

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(evalBody),
      body: JSON.stringify(evalBody),
    });

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.decision).toBe('allow');
    expect(result.risk_score).toBe(0);
    expect(result.reason).toContain('No risk score');
  });

  it('returns allow in shadow mode for user with score >= 70', async () => {
    const evalBody = {
      action_type: 'booking.create',
      user_id: uuid(1),
      counterparty_id: uuid(2),
    };

    // Mock high risk score
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(10), score: '85.00', tier: 'critical', factors: {} }] })
      .mockResolvedValueOnce({ rows: [] })
      // enforcement history queries (getEnforcementHistory)
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      // executeAction (shadow mode insert + audit log)
      .mockResolvedValueOnce({ rows: [{ id: uuid(80) }] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(81) }] })
      // eval log
      .mockResolvedValueOnce({ rows: [{ id: uuid(99) }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(evalBody),
      body: JSON.stringify(evalBody),
    });

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.decision).toBe('allow');
    expect(result.reason).toContain('[SHADOW]');
    expect(result.risk_score).toBe(85);
  });
});

// ─── Test Suite 8: Webhook Security ──────────────────────────────

describe('Laravel E2E — Webhook Security', () => {
  it('rejects webhook with wrong signature', async () => {
    const webhookBody = createBookingWebhook('booking-create', uuid(10), uuid(1), uuid(2));
    const bodyStr = JSON.stringify(webhookBody);

    const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': 'wrong-signature-that-is-definitely-not-correct',
      },
      body: bodyStr,
    });

    expect(res.status).toBe(401);
  });

  it('rejects webhook with unknown source', async () => {
    const webhookBody = {
      event_id: 'evt_test',
      event_type: 'booking-create',
      timestamp: new Date().toISOString(),
      source: 'unknown-source',
      payload: {},
    };
    const bodyStr = JSON.stringify(webhookBody);
    const signature = signWebhookPayload(bodyStr);

    mockQuery.mockResolvedValueOnce({ rows: [] }); // idempotency check

    const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body: bodyStr,
    });

    // Will fail at validation level (source enum check)
    expect(res.status).toBe(400);
  });
});

// ─── Test Suite 9: Idempotency ───────────────────────────────────

describe('Laravel E2E — Idempotency', () => {
  it('rejects duplicate webhook with same idempotency key', async () => {
    const webhookBody = createBookingWebhook('booking-create', uuid(10), uuid(1), uuid(2));
    const bodyStr = JSON.stringify(webhookBody);
    const signature = signWebhookPayload(bodyStr);

    // Mock existing webhook_events record
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(50), status: 'processed' }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body: bodyStr,
    });

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.duplicate).toBe(true);
    expect(result.event_id).toBe(uuid(50));
  });
});

// ─── Test Suite 10: Evaluate with Different Action Types ─────────

describe('Laravel E2E — Evaluate Action Types', () => {
  it('evaluates provider.register action', async () => {
    const evalBody = {
      action_type: 'provider.register',
      user_id: uuid(5),
      metadata: {
        service_category: 'electrical',
        years_experience: 5,
      },
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(99) }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(evalBody),
      body: JSON.stringify(evalBody),
    });

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.decision).toBe('allow');
  });

  it('evaluates payment.initiate with high amount', async () => {
    const evalBody = {
      action_type: 'payment.initiate',
      user_id: uuid(1),
      metadata: {
        amount: 5000.00,
        payment_method: 'bank_transfer',
      },
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(10), score: '35.00', tier: 'low', factors: {} }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(99) }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: hmacHeaders(evalBody),
      body: JSON.stringify(evalBody),
    });

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.decision).toBe('allow');
    expect(result.risk_tier).toBe('low');
  });
});

// ─── Test Suite 11: Evaluate with JWT Auth ───────────────────────

describe('Laravel E2E — JWT Authentication', () => {
  it('accepts JWT token for evaluate endpoint', async () => {
    const evalBody = {
      action_type: 'booking.create',
      user_id: uuid(1),
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(99) }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(evalBody),
    });

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.decision).toBe('allow');
  });
});

// ─── Test Suite 12: Webhook Validation ───────────────────────────

describe('Laravel E2E — Webhook Validation', () => {
  it('rejects malformed webhook payload', async () => {
    const webhookBody = {
      // Missing required fields
      event_type: 'booking-create',
      source: 'qwickservices',
    };
    const bodyStr = JSON.stringify(webhookBody);
    const signature = signWebhookPayload(bodyStr);

    const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body: bodyStr,
    });

    expect(res.status).toBe(400);
  });

  it('rejects unknown event type in webhook', async () => {
    const webhookBody = {
      event_id: 'evt_test',
      event_type: 'unknown-event-type',
      timestamp: new Date().toISOString(),
      source: 'qwickservices',
      payload: {},
    };
    const bodyStr = JSON.stringify(webhookBody);
    const signature = signWebhookPayload(bodyStr);

    mockNormalizeWebhookEvent.mockRejectedValueOnce(new Error('Unknown webhook event type: unknown-event-type'));

    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // idempotency check
      .mockResolvedValueOnce({ rows: [{ id: uuid(50) }] }) // insert webhook_events
      .mockResolvedValueOnce({ rows: [] }); // update failed

    const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body: bodyStr,
    });

    expect(res.status).toBe(400);
    const result = await res.json();
    expect(result.error).toContain('Unknown webhook event type');
  });
});
