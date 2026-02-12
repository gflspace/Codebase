// QwickServices CIS — Phase 2C: Temporal Pattern Detection Consumer
// Detects burst activity (z-score > 3 vs 7-day baseline) and
// dormant account activation (last event > 30 days ago).

import { DomainEvent, EventType } from '../../events/types';
import { SignalType } from '../signals';
import { persistSignal } from '../persist';
import { query } from '../../database/connection';

// ─── User ID extraction ─────────────────────────────────────────

function extractUserId(event: DomainEvent): string | null {
  const p = event.payload as Record<string, unknown>;
  return (p.sender_id as string) ?? (p.user_id as string) ?? (p.client_id as string) ?? null;
}

// ─── Detection Logic ────────────────────────────────────────────

async function detectBurstActivity(event: DomainEvent, userId: string): Promise<void> {
  try {
    // Count events in the last 1 hour
    const recentResult = await query(
      `SELECT COUNT(*) AS event_count
       FROM audit_logs
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '1 hour'`,
      [userId]
    );
    const recentCount = parseInt(recentResult.rows[0]?.event_count ?? '0', 10);

    // 7-day baseline: average hourly event count
    const baselineResult = await query(
      `SELECT COUNT(*) AS event_count
       FROM audit_logs
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '7 days'
         AND created_at < NOW() - INTERVAL '1 hour'`,
      [userId]
    );
    const baselineTotal = parseInt(baselineResult.rows[0]?.event_count ?? '0', 10);
    const baselineHours = 7 * 24 - 1; // exclude the current hour
    const baselineAvg = baselineTotal / baselineHours;

    if (baselineAvg <= 0) return;

    // Simple z-score: (current - mean) / mean (using mean as proxy for stddev)
    const zScore = (recentCount - baselineAvg) / baselineAvg;

    if (zScore > 3.0) {
      const confidence = Math.min(0.9, 0.5 + (zScore - 3) * 0.1);
      await persistSignal(event.id, userId, {
        signal_type: SignalType.TEMPORAL_BURST_ACTIVITY,
        confidence,
        evidence: {
          user_id: userId,
          events_last_1h: recentCount,
          baseline_avg_hourly: Math.round(baselineAvg * 100) / 100,
          z_score: Math.round(zScore * 100) / 100,
        },
      });
    }
  } catch (err) {
    console.error('[TemporalPattern] detectBurstActivity error:', err);
  }
}

async function detectDormantActivation(event: DomainEvent, userId: string): Promise<void> {
  try {
    const result = await query(
      `SELECT MAX(created_at) AS last_event
       FROM audit_logs
       WHERE user_id = $1
         AND created_at < NOW() - INTERVAL '1 minute'`,
      [userId]
    );
    const lastEvent = result.rows[0]?.last_event;
    if (!lastEvent) return;

    const daysSinceLastEvent =
      (Date.now() - new Date(lastEvent).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastEvent > 30) {
      await persistSignal(event.id, userId, {
        signal_type: SignalType.TEMPORAL_DORMANT_ACTIVATION,
        confidence: 0.55,
        evidence: {
          user_id: userId,
          days_since_last_event: Math.round(daysSinceLastEvent),
          last_event_at: lastEvent,
        },
      });
    }
  } catch (err) {
    console.error('[TemporalPattern] detectDormantActivation error:', err);
  }
}

// ─── Event Handler ──────────────────────────────────────────────

async function handleTemporalEvent(event: DomainEvent): Promise<void> {
  const userId = extractUserId(event);
  if (!userId) return;

  await detectBurstActivity(event, userId);
  await detectDormantActivation(event, userId);
}

// ─── Consumer Registration ──────────────────────────────────────

const MONITORED_EVENT_TYPES = [
  EventType.MESSAGE_CREATED,
  EventType.BOOKING_CREATED,
  EventType.BOOKING_CANCELLED,
  EventType.WALLET_DEPOSIT,
  EventType.WALLET_WITHDRAWAL,
  EventType.WALLET_TRANSFER,
  EventType.TRANSACTION_INITIATED,
];

export function registerTemporalPatternConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'temporal-pattern-detection',
    eventTypes: MONITORED_EVENT_TYPES,
    handler: handleTemporalEvent,
  });
}

// Export internals for testing
export {
  extractUserId,
  detectBurstActivity,
  detectDormantActivation,
  handleTemporalEvent,
  MONITORED_EVENT_TYPES,
};
