// QwickServices CIS — Webhook Ingestion Route
// POST /api/webhooks/ingest — receives events from QwickServices Laravel platform
// HMAC-SHA256 verified, idempotent, normalizes to CIS domain events

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../../config';
import { query } from '../../database/connection';
import { validate } from '../middleware/validation';
import { webhookIngestSchema } from '../schemas';
import { normalizeWebhookEvent } from '../../events/normalizer';
import { getEventBus } from '../../events/bus';
import { generateId } from '../../shared/utils';

const router = Router();

// ─── HMAC-SHA256 Signature Verification ─────────────────────

function verifyWebhookSignature(req: Request, res: Response): boolean {
  const signature = req.headers['x-webhook-signature'] as string;

  if (!signature) {
    res.status(401).json({ error: 'Missing X-Webhook-Signature header' });
    return false;
  }

  const body = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', config.webhook.secret)
    .update(body)
    .digest('hex');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return false;
    }
  } catch {
    // timingSafeEqual throws if buffers are different lengths
    res.status(401).json({ error: 'Invalid webhook signature' });
    return false;
  }

  return true;
}

// ─── POST /ingest ───────────────────────────────────────────

router.post(
  '/ingest',
  validate(webhookIngestSchema),
  async (req: Request, res: Response) => {
    // 1. HMAC verification
    if (!verifyWebhookSignature(req, res)) return;

    const { event_id, event_type, timestamp, source, payload } = req.body;
    const idempotencyKey = event_id;
    const webhookSource = source || 'qwickservices';

    try {
      // 2. Idempotency check
      const existing = await query(
        'SELECT id, status FROM webhook_events WHERE source = $1 AND idempotency_key = $2',
        [webhookSource, idempotencyKey]
      );

      if (existing.rows.length > 0) {
        res.status(200).json({
          received: true,
          event_id: existing.rows[0].id,
          duplicate: true,
        });
        return;
      }

      // 3. Insert webhook_events record
      const webhookId = generateId();
      await query(
        `INSERT INTO webhook_events (id, external_event_id, source, event_type, payload, status, idempotency_key, received_at)
         VALUES ($1, $2, $3, $4, $5, 'received', $6, NOW())`,
        [webhookId, event_id, webhookSource, event_type, JSON.stringify(payload), idempotencyKey]
      );

      // 4. Normalize to CIS domain event
      const domainEvent = await normalizeWebhookEvent({
        event_id,
        event_type,
        timestamp,
        source: webhookSource,
        payload,
      });

      // 5. Emit to event bus
      const bus = getEventBus();
      await bus.emit(domainEvent);

      // 6. Mark as processed
      await query(
        `UPDATE webhook_events SET status = 'processed', processed_at = NOW(), attempts = attempts + 1
         WHERE id = $1`,
        [webhookId]
      );

      res.status(202).json({
        received: true,
        event_id: webhookId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Webhook] Processing failed:', errorMessage);

      // Attempt to mark as failed if we have the record
      try {
        await query(
          `UPDATE webhook_events SET status = 'failed', error_message = $1, attempts = attempts + 1
           WHERE source = $2 AND idempotency_key = $3`,
          [errorMessage, webhookSource, idempotencyKey]
        );
      } catch {
        // Non-critical — log but don't mask original error
      }

      // Unknown event types get a 400
      if (errorMessage.startsWith('Unknown webhook event type')) {
        res.status(400).json({ error: errorMessage });
        return;
      }

      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

export default router;
