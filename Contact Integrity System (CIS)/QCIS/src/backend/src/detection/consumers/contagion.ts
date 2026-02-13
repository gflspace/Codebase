// QwickServices CIS — Contagion Analysis Consumer
// When a user transitions to HIGH/CRITICAL, applies contagion factor to 1-hop neighbors

import { DomainEvent, EventType } from '../../events/types';
import { query } from '../../database/connection';
import { generateId } from '../../shared/utils';

const CONTAGION_FACTOR = 0.15;
const HIGH_RISK_TIERS = ['high', 'critical'];

/**
 * Check if a user's tier has changed to high/critical and apply contagion.
 */
async function handleContagionEvent(event: DomainEvent): Promise<void> {
  const payload = event.payload as Record<string, unknown>;
  const userId = (payload.sender_id as string)
    || (payload.user_id as string)
    || (payload.client_id as string)
    || (payload.provider_id as string);

  if (!userId) return;

  // Get the user's current tier
  let currentTier: string | null = null;
  let currentScore = 0;
  try {
    const scoreResult = await query(
      'SELECT score, tier FROM risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    if (scoreResult.rows.length === 0) return;
    currentTier = scoreResult.rows[0].tier;
    currentScore = parseFloat(scoreResult.rows[0].score);
  } catch {
    return;
  }

  // Only apply contagion for high/critical tiers
  if (!currentTier || !HIGH_RISK_TIERS.includes(currentTier)) return;

  // Get 1-hop neighbors from user_relationships
  let neighbors: Array<{ user_id: string; strength_score: number }> = [];
  try {
    const result = await query(
      `SELECT
         CASE WHEN user_a_id = $1 THEN user_b_id ELSE user_a_id END AS user_id,
         strength_score
       FROM user_relationships
       WHERE (user_a_id = $1 OR user_b_id = $1)
         AND strength_score > 0.1`,
      [userId]
    );
    neighbors = result.rows.map((r: { user_id: string; strength_score: string }) => ({
      user_id: r.user_id,
      strength_score: parseFloat(r.strength_score),
    }));
  } catch {
    return;
  }

  if (neighbors.length === 0) return;

  // Apply contagion to each neighbor
  let affected = 0;
  for (const neighbor of neighbors) {
    try {
      // Get neighbor's current score
      const neighborScore = await query(
        'SELECT id, score, tier FROM risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [neighbor.user_id]
      );

      if (neighborScore.rows.length === 0) continue;

      const oldScore = parseFloat(neighborScore.rows[0].score);
      const contagionDelta = currentScore * neighbor.strength_score * CONTAGION_FACTOR;

      // Only apply if delta is meaningful (>1 point)
      if (contagionDelta < 1) continue;

      const newScore = Math.min(100, oldScore + contagionDelta);

      // Skip if score wouldn't change meaningfully
      if (newScore - oldScore < 1) continue;

      // Create a risk signal for the contagion
      await query(
        `INSERT INTO risk_signals (id, user_id, signal_type, source_event_id, confidence, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          generateId(),
          neighbor.user_id,
          'NETWORK_CONTAGION',
          event.id,
          Math.min(0.8, neighbor.strength_score * 0.8),
          JSON.stringify({
            source_user_id: userId,
            source_tier: currentTier,
            source_score: currentScore,
            connection_strength: neighbor.strength_score,
            contagion_delta: Math.round(contagionDelta * 10) / 10,
          }),
        ]
      );

      affected++;
    } catch (err) {
      console.error(`[Contagion] Error processing neighbor ${neighbor.user_id.slice(0, 8)}:`, err);
    }
  }

  if (affected > 0) {
    console.log(
      `[Contagion] User ${userId.slice(0, 8)} (${currentTier}, score=${currentScore}): contagion signals created for ${affected} neighbor(s)`
    );
  }
}

export function registerContagionConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'contagion-analysis',
    eventTypes: [
      // Trigger on the same events as scoring — re-check neighbors after score changes
      EventType.MESSAGE_CREATED,
      EventType.TRANSACTION_COMPLETED,
      EventType.BOOKING_COMPLETED,
      EventType.BOOKING_CANCELLED,
      EventType.ENFORCEMENT_ACTION_APPLIED,
    ],
    handler: handleContagionEvent,
  });
}

export { handleContagionEvent, CONTAGION_FACTOR };
