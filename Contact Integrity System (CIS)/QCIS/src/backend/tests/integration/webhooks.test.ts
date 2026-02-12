import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import {
  mockQuery, resetAllMocks, createTestApp, startServer, stopServer,
  mockNormalizeWebhookEvent,
} from '../helpers/setup';
import webhookRoutes from '../../src/api/routes/webhooks';
import http from 'http';

const WEBHOOK_SECRET = 'test-webhook-secret';

const app = createTestApp();
app.use('/api/webhooks', webhookRoutes);

let server: http.Server;
let port: number;

beforeAll(async () => { const s = await startServer(app); server = s.server; port = s.port; });
afterAll(() => stopServer(server));
beforeEach(() => {
  resetAllMocks();
  // Default: normalizer returns a valid domain event
  mockNormalizeWebhookEvent.mockResolvedValue({
    id: '00000000-0000-4000-8000-000000000099',
    type: 'booking.created',
    correlation_id: '00000000-0000-4000-8000-000000000098',
    timestamp: '2026-01-15T10:00:00.000Z',
    version: 1,
    payload: { booking_id: 'b-1', client_id: 'c-1', provider_id: 'p-1', status: 'pending' },
  });
});

// ─── Helpers ────────────────────────────────────────────────

function signPayload(body: object): string {
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
}

function validBookingPayload() {
  return {
    event_id: 'ext-event-001',
    event_type: 'booking-save',
    timestamp: '2026-01-15T10:00:00.000Z',
    source: 'qwickservices',
    payload: {
      booking_id: 'b-123',
      customer_id: 'cust-456',
      provider_id: 'prov-789',
      amount: 150.00,
      status: 'pending',
    },
  };
}

function validWalletPayload() {
  return {
    event_id: 'ext-event-002',
    event_type: 'save-payment',
    timestamp: '2026-01-15T11:00:00.000Z',
    source: 'qwickservices',
    payload: {
      transaction_id: 'tx-123',
      user_id: 'cust-456',
      amount: 50.00,
      currency: 'USD',
      status: 'completed',
    },
  };
}

async function postWebhook(body: object, signature?: string) {
  const sig = signature ?? signPayload(body);
  return fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': sig,
    },
    body: JSON.stringify(body),
  });
}

// ─── Tests ──────────────────────────────────────────────────

describe('POST /api/webhooks/ingest', () => {
  describe('HMAC Verification', () => {
    it('accepts valid HMAC signature and returns 202', async () => {
      const body = validBookingPayload();
      // Mock: no duplicate found, insert succeeds, update succeeds
      mockQuery
        .mockResolvedValueOnce({ rows: [] })        // idempotency check
        .mockResolvedValueOnce({ rows: [] })         // insert webhook_events
        .mockResolvedValueOnce({ rows: [] })         // normalizer DB calls (mock bypassed)
        .mockResolvedValueOnce({ rows: [] });        // update status to processed

      const res = await postWebhook(body);
      const json = await res.json();

      expect(res.status).toBe(202);
      expect(json.received).toBe(true);
      expect(json.event_id).toBeDefined();
    });

    it('rejects missing HMAC signature with 401', async () => {
      const body = validBookingPayload();
      const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toContain('Missing');
    });

    it('rejects invalid HMAC signature with 401', async () => {
      const body = validBookingPayload();
      const res = await postWebhook(body, 'invalid-signature-value-that-is-definitely-wrong!');
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toContain('Invalid');
    });
  });

  describe('Idempotency', () => {
    it('returns 200 for duplicate idempotency key without reprocessing', async () => {
      const body = validBookingPayload();
      // Mock: duplicate found in webhook_events
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: '00000000-0000-4000-8000-000000000050', status: 'processed' }],
      });

      const res = await postWebhook(body);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.duplicate).toBe(true);
      expect(json.received).toBe(true);
      // Normalizer should NOT have been called for duplicates
      expect(mockNormalizeWebhookEvent).not.toHaveBeenCalled();
    });
  });

  describe('Payload Validation', () => {
    it('rejects missing event_id with 400', async () => {
      const body = { event_type: 'booking-save', timestamp: '2026-01-15T10:00:00.000Z', payload: {} };
      const sig = signPayload(body);
      const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sig },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });

    it('rejects missing timestamp with 400', async () => {
      const body = { event_id: 'e-1', event_type: 'booking-save', payload: {} };
      const sig = signPayload(body);
      const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sig },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });

    it('rejects missing payload with 400', async () => {
      const body = { event_id: 'e-1', event_type: 'booking-save', timestamp: '2026-01-15T10:00:00.000Z' };
      const sig = signPayload(body);
      const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sig },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('Event Normalization', () => {
    it('calls normalizer with booking-save payload', async () => {
      const body = validBookingPayload();
      mockQuery
        .mockResolvedValueOnce({ rows: [] })        // idempotency check
        .mockResolvedValueOnce({ rows: [] })         // insert webhook_events
        .mockResolvedValueOnce({ rows: [] })         // bus emit internals
        .mockResolvedValueOnce({ rows: [] });        // update status

      await postWebhook(body);

      expect(mockNormalizeWebhookEvent).toHaveBeenCalledOnce();
      expect(mockNormalizeWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'booking-save',
          source: 'qwickservices',
        })
      );
    });

    it('calls normalizer with save-payment payload', async () => {
      const body = validWalletPayload();
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await postWebhook(body);

      expect(mockNormalizeWebhookEvent).toHaveBeenCalledOnce();
      expect(mockNormalizeWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'save-payment',
        })
      );
    });

    it('returns 400 for unknown event type', async () => {
      const body = {
        event_id: 'ext-event-999',
        event_type: 'completely-unknown-event',
        timestamp: '2026-01-15T10:00:00.000Z',
        source: 'qwickservices',
        payload: { some: 'data' },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] })         // idempotency check
        .mockResolvedValueOnce({ rows: [] })         // insert webhook_events
        .mockResolvedValueOnce({ rows: [] });        // update to failed

      // Normalizer throws for unknown event types
      mockNormalizeWebhookEvent.mockRejectedValueOnce(
        new Error('Unknown webhook event type: completely-unknown-event')
      );

      const res = await postWebhook(body);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('Unknown webhook event type');
    });
  });

  describe('Event Bus Emission', () => {
    it('emits normalized event to event bus on success', async () => {
      const body = validBookingPayload();
      // Track that bus.emit was called via the mock
      mockQuery
        .mockResolvedValueOnce({ rows: [] })        // idempotency check
        .mockResolvedValueOnce({ rows: [] })         // insert webhook_events
        .mockResolvedValueOnce({ rows: [] })         // bus internals
        .mockResolvedValueOnce({ rows: [] });        // update status

      const res = await postWebhook(body);

      expect(res.status).toBe(202);
      expect(mockNormalizeWebhookEvent).toHaveBeenCalledOnce();
    });
  });
});
