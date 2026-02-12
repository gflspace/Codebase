// QwickServices CIS — Phase 2C: Provider Behavior Detection Consumer
// Analyzes provider events for duplicate identity, response degradation,
// cancellation spikes, and rating manipulation.
// Note: PROVIDER_RATING_MANIPULATION requires RATING_SUBMITTED event (Phase 2D dependency).

import { DomainEvent, EventType, ProviderEventPayload, BookingEventPayload } from '../../events/types';
import { SignalType } from '../signals';
import { persistSignal } from '../persist';
import { query } from '../../database/connection';

// ─── Detection Logic ────────────────────────────────────────────

async function detectDuplicateIdentity(
  event: DomainEvent,
  payload: ProviderEventPayload
): Promise<void> {
  try {
    // Check if provider's phone or email matches another existing user
    const result = await query(
      `SELECT COUNT(*) AS match_count
       FROM users
       WHERE id != $1
         AND (
           (phone IS NOT NULL AND phone = (SELECT phone FROM users WHERE id = $1))
           OR
           (email IS NOT NULL AND email = (SELECT email FROM users WHERE id = $1))
         )`,
      [payload.user_id]
    );
    const count = parseInt(result.rows[0]?.match_count ?? '0', 10);
    if (count > 0) {
      await persistSignal(event.id, payload.user_id, {
        signal_type: SignalType.PROVIDER_DUPLICATE_IDENTITY,
        confidence: 0.8,
        evidence: {
          provider_id: payload.provider_id,
          user_id: payload.user_id,
          matching_users: count,
        },
      });
    }
  } catch (err) {
    console.error('[ProviderBehavior] detectDuplicateIdentity error:', err);
  }
}

async function detectResponseDegradation(
  event: DomainEvent,
  payload: BookingEventPayload
): Promise<void> {
  try {
    // Average completion duration in last 30 days vs 90-day historical
    const recentResult = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - scheduled_at))) AS avg_duration
       FROM bookings
       WHERE provider_id = $1
         AND status = 'completed'
         AND scheduled_at IS NOT NULL
         AND updated_at >= NOW() - INTERVAL '30 days'`,
      [payload.provider_id]
    );
    const recent = parseFloat(recentResult.rows[0]?.avg_duration ?? '0');
    if (recent <= 0) return;

    const historicalResult = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - scheduled_at))) AS avg_duration
       FROM bookings
       WHERE provider_id = $1
         AND status = 'completed'
         AND scheduled_at IS NOT NULL
         AND updated_at >= NOW() - INTERVAL '90 days'
         AND updated_at < NOW() - INTERVAL '30 days'`,
      [payload.provider_id]
    );
    const historical = parseFloat(historicalResult.rows[0]?.avg_duration ?? '0');
    if (historical <= 0) return;

    if (recent > historical * 1.5) {
      await persistSignal(event.id, payload.provider_id, {
        signal_type: SignalType.PROVIDER_RESPONSE_DEGRADATION,
        confidence: 0.6,
        evidence: {
          provider_id: payload.provider_id,
          avg_duration_30d: Math.round(recent),
          avg_duration_historical: Math.round(historical),
          ratio: Math.round((recent / historical) * 100) / 100,
        },
      });
    }
  } catch (err) {
    console.error('[ProviderBehavior] detectResponseDegradation error:', err);
  }
}

async function detectCancellationSpike(
  event: DomainEvent,
  payload: BookingEventPayload
): Promise<void> {
  try {
    // Provider cancellation rate in last 14 days
    const recentResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'cancelled') AS cancel_count,
         COUNT(*) AS total_count
       FROM bookings
       WHERE provider_id = $1
         AND updated_at >= NOW() - INTERVAL '14 days'`,
      [payload.provider_id]
    );
    const recentCancels = parseInt(recentResult.rows[0]?.cancel_count ?? '0', 10);
    const recentTotal = parseInt(recentResult.rows[0]?.total_count ?? '0', 10);
    if (recentTotal === 0) return;
    const recentRate = recentCancels / recentTotal;

    // Historical cancellation rate (90 days, excluding last 14)
    const historicalResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'cancelled') AS cancel_count,
         COUNT(*) AS total_count
       FROM bookings
       WHERE provider_id = $1
         AND updated_at >= NOW() - INTERVAL '90 days'
         AND updated_at < NOW() - INTERVAL '14 days'`,
      [payload.provider_id]
    );
    const histCancels = parseInt(historicalResult.rows[0]?.cancel_count ?? '0', 10);
    const histTotal = parseInt(historicalResult.rows[0]?.total_count ?? '0', 10);
    if (histTotal === 0) return;
    const histRate = histCancels / histTotal;

    if (histRate > 0 && recentRate > histRate * 2) {
      await persistSignal(event.id, payload.provider_id, {
        signal_type: SignalType.PROVIDER_CANCELLATION_SPIKE,
        confidence: 0.65,
        evidence: {
          provider_id: payload.provider_id,
          recent_cancel_rate: Math.round(recentRate * 1000) / 1000,
          historical_cancel_rate: Math.round(histRate * 1000) / 1000,
          ratio: Math.round((recentRate / histRate) * 100) / 100,
        },
      });
    }
  } catch (err) {
    console.error('[ProviderBehavior] detectCancellationSpike error:', err);
  }
}

async function detectRatingManipulation(
  event: DomainEvent
): Promise<void> {
  const payload = event.payload as Record<string, unknown>;
  const providerId = payload.provider_id as string | undefined;
  if (!providerId) return;

  try {
    const result = await query(
      `SELECT COUNT(*) AS high_count
       FROM ratings
       WHERE provider_id = $1 AND score >= 5
         AND created_at >= NOW() - INTERVAL '24 hours'`,
      [providerId]
    );
    const highCount = parseInt(result.rows[0]?.high_count ?? '0', 10);
    if (highCount < 5) return;

    const totalResult = await query(
      `SELECT COUNT(*) AS total_count
       FROM ratings
       WHERE provider_id = $1
         AND created_at >= NOW() - INTERVAL '24 hours'`,
      [providerId]
    );
    const totalCount = parseInt(totalResult.rows[0]?.total_count ?? '0', 10);
    const ratio = totalCount > 0 ? highCount / totalCount : 0;
    const confidence = ratio > 0.8 ? 0.8 : 0.7;

    await persistSignal(event.id, providerId, {
      signal_type: SignalType.PROVIDER_RATING_MANIPULATION,
      confidence,
      evidence: { provider_id: providerId, high_ratings_24h: highCount, total_ratings_24h: totalCount, high_ratio: Math.round(ratio * 1000) / 1000 },
    });
  } catch (err) {
    console.error('[ProviderBehavior] detectRatingManipulation error:', err);
  }
}

// ─── Event Handler ──────────────────────────────────────────────

async function handleProviderEvent(event: DomainEvent): Promise<void> {
  switch (event.type) {
    case EventType.PROVIDER_REGISTERED: {
      const payload = event.payload as unknown as ProviderEventPayload;
      if (!payload.user_id) return;
      await detectDuplicateIdentity(event, payload);
      break;
    }

    case EventType.BOOKING_COMPLETED: {
      const payload = event.payload as unknown as BookingEventPayload;
      if (!payload.provider_id) return;
      await detectResponseDegradation(event, payload);
      break;
    }

    case EventType.BOOKING_CANCELLED: {
      const payload = event.payload as unknown as BookingEventPayload;
      if (!payload.provider_id) return;
      await detectCancellationSpike(event, payload);
      break;
    }

    case EventType.RATING_SUBMITTED: {
      await detectRatingManipulation(event);
      break;
    }
  }
}

// ─── Consumer Registration ──────────────────────────────────────

export function registerProviderBehaviorConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'provider-behavior-detection',
    eventTypes: [
      EventType.PROVIDER_REGISTERED,
      EventType.PROVIDER_UPDATED,
      EventType.BOOKING_COMPLETED,
      EventType.BOOKING_CANCELLED,
      EventType.RATING_SUBMITTED,
    ],
    handler: handleProviderEvent,
  });
}

// Export internals for testing
export {
  detectDuplicateIdentity,
  detectResponseDegradation,
  detectCancellationSpike,
  detectRatingManipulation,
  handleProviderEvent,
};
