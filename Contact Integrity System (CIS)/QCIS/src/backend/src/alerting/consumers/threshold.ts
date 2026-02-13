// QwickServices CIS — Threshold Alert Consumer (Layer 8)
// Fires alerts when a user's risk score crosses key thresholds (70, 85).

import { DomainEvent, EventType } from '../../events/types';
import { query } from '../../database/connection';
import { createAlert } from '../index';

const THRESHOLDS = [
  { value: 85, priority: 'critical', label: 'Critical Risk Threshold' },
  { value: 70, priority: 'high', label: 'Risk Threshold Crossed' },
];

/**
 * Extract user_id from an event payload (handles all payload shapes).
 */
function extractUserId(payload: Record<string, unknown>): string | undefined {
  return (payload.sender_id as string)
    || (payload.user_id as string)
    || (payload.client_id as string)
    || (payload.provider_id as string)
    || undefined;
}

/**
 * Check if an open threshold alert already exists for this user within 24h.
 */
async function hasRecentThresholdAlert(userId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT id FROM alerts
       WHERE user_id = $1
         AND source = 'threshold'
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
 * Fetch latest 2 risk scores for the user to detect threshold crossings.
 */
async function getRecentScores(userId: string): Promise<number[]> {
  try {
    const result = await query(
      `SELECT score FROM risk_scores
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 2`,
      [userId]
    );
    return result.rows.map((r: { score: string }) => parseFloat(r.score));
  } catch {
    return [];
  }
}

/**
 * Handle a scoring-related event by checking for threshold crossings.
 */
export async function handleThresholdCheck(event: DomainEvent): Promise<void> {
  const userId = extractUserId(event.payload);
  if (!userId) return;

  // Delay to let scoring + enforcement complete first
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const scores = await getRecentScores(userId);
  if (scores.length < 2) return;

  const [currentScore, previousScore] = scores;

  for (const threshold of THRESHOLDS) {
    if (previousScore < threshold.value && currentScore >= threshold.value) {
      // Check for dedup
      const exists = await hasRecentThresholdAlert(userId);
      if (exists) continue;

      await createAlert({
        user_id: userId,
        priority: threshold.priority,
        title: `${threshold.label}: Score reached ${currentScore}`,
        description: `User risk score crossed ${threshold.value} threshold (previous: ${previousScore}, current: ${currentScore}).`,
        source: 'threshold',
        metadata: {
          threshold_value: threshold.value,
          previous_score: previousScore,
          current_score: currentScore,
        },
      });
      // Only fire the highest threshold crossed
      break;
    }
  }
}

/**
 * Register the threshold alert consumer on the event bus.
 */
export function registerThresholdAlertConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'alerting-threshold',
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
    handler: handleThresholdCheck,
  });
}
