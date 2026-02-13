// QwickServices CIS — Trend Alert Consumer (Layer 8)
// Fires alerts when a user's signal velocity exceeds 2x their 7-day average.

import { DomainEvent, EventType } from '../../events/types';
import { query } from '../../database/connection';
import { createAlert } from '../index';

/**
 * Extract user_id from an event payload.
 */
function extractUserId(payload: Record<string, unknown>): string | undefined {
  return (payload.sender_id as string)
    || (payload.user_id as string)
    || (payload.client_id as string)
    || (payload.provider_id as string)
    || undefined;
}

/**
 * Check if a trend alert already exists for this user within 24h.
 */
async function hasRecentTrendAlert(userId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT id FROM alerts
       WHERE user_id = $1
         AND source = 'trend'
         AND status IN ('open', 'assigned', 'in_progress')
         AND created_at >= NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [userId]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get signal counts: today's count and 7-day daily average.
 */
export async function getSignalVelocity(userId: string): Promise<{ todayCount: number; dailyAverage: number }> {
  try {
    const [todayResult, weekResult] = await Promise.all([
      query(
        `SELECT COUNT(*) AS cnt FROM risk_signals
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
        [userId]
      ),
      query(
        `SELECT COUNT(*) AS cnt FROM risk_signals
         WHERE user_id = $1
           AND created_at >= NOW() - INTERVAL '7 days'
           AND created_at < NOW() - INTERVAL '24 hours'`,
        [userId]
      ),
    ]);

    const todayCount = parseInt(todayResult.rows[0]?.cnt || '0', 10);
    const weekCount = parseInt(weekResult.rows[0]?.cnt || '0', 10);
    // 6 days of history (excluding today)
    const dailyAverage = weekCount / 6;

    return { todayCount, dailyAverage: Math.round(dailyAverage * 100) / 100 };
  } catch {
    return { todayCount: 0, dailyAverage: 0 };
  }
}

/**
 * Handle a scoring-related event by checking signal velocity.
 */
export async function handleTrendCheck(event: DomainEvent): Promise<void> {
  const userId = extractUserId(event.payload);
  if (!userId) return;

  // Delay to let detection + scoring complete
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const { todayCount, dailyAverage } = await getSignalVelocity(userId);

  // Only alert if daily average is meaningful (>= 2) and today exceeds 2x
  if (dailyAverage < 2 || todayCount <= 2 * dailyAverage) return;

  // Dedup: max 1 trend alert per user per 24h
  const exists = await hasRecentTrendAlert(userId);
  if (exists) return;

  await createAlert({
    user_id: userId,
    priority: 'medium',
    title: `Signal Trend Alert: ${todayCount} signals in 24h vs ${dailyAverage}/day average`,
    description: `User generated ${todayCount} risk signals in the last 24 hours, exceeding 2x the 7-day daily average of ${dailyAverage}.`,
    source: 'trend',
    metadata: {
      today_count: todayCount,
      daily_average: dailyAverage,
      ratio: Math.round((todayCount / dailyAverage) * 100) / 100,
    },
  });
}

/**
 * Register the trend alert consumer on the event bus.
 */
export function registerTrendAlertConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'alerting-trend',
    eventTypes: [
      EventType.MESSAGE_CREATED,
      EventType.MESSAGE_EDITED,
      EventType.TRANSACTION_INITIATED,
      EventType.TRANSACTION_COMPLETED,
      EventType.TRANSACTION_FAILED,
      EventType.BOOKING_CREATED,
      EventType.BOOKING_CANCELLED,
      EventType.BOOKING_COMPLETED,
      EventType.BOOKING_NO_SHOW,
      EventType.WALLET_DEPOSIT,
      EventType.WALLET_WITHDRAWAL,
      EventType.WALLET_TRANSFER,
      EventType.PROVIDER_REGISTERED,
      EventType.PROVIDER_UPDATED,
      EventType.USER_REGISTERED,
    ],
    handler: handleTrendCheck,
  });
}
