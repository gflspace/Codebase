// QwickServices CIS — Risk Score Decay
// Reduces risk scores over time when users have no new signals.
// Decay rates are configurable per tier via the risk_decay_config table.

import { query } from '../database/connection';
import { generateId } from '../shared/utils';

interface DecayConfig {
  tier: string;
  decay_rate_per_day: number;
  min_score: number;
  cooldown_days: number;
  enabled: boolean;
}

/**
 * Load decay configuration for a given tier.
 */
async function getDecayConfig(tier: string): Promise<DecayConfig | null> {
  try {
    const result = await query(
      'SELECT tier, decay_rate_per_day, min_score, cooldown_days, enabled FROM risk_decay_config WHERE tier = $1',
      [tier]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      tier: String(row.tier),
      decay_rate_per_day: parseFloat(row.decay_rate_per_day),
      min_score: parseFloat(row.min_score),
      cooldown_days: parseInt(row.cooldown_days, 10),
      enabled: Boolean(row.enabled),
    };
  } catch {
    return null;
  }
}

/**
 * Apply time-based risk decay to a user's score.
 * Returns the decayed score (or current score if decay doesn't apply).
 */
export async function applyRiskDecay(userId: string): Promise<number> {
  try {
    // Get latest risk score for user
    const scoreResult = await query(
      'SELECT id, score, tier, last_signal_at, factors FROM risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    if (scoreResult.rows.length === 0) return 0;

    const latestScore = scoreResult.rows[0];
    const currentScore = parseFloat(latestScore.score);
    const tier = String(latestScore.tier);
    const lastSignalAt = latestScore.last_signal_at ? new Date(latestScore.last_signal_at) : null;

    if (!lastSignalAt || currentScore <= 0) return currentScore;

    // Get decay config for this tier
    const decayConfig = await getDecayConfig(tier);
    if (!decayConfig || !decayConfig.enabled) return currentScore;

    // Calculate days since last signal
    const daysSinceLastSignal = (Date.now() - lastSignalAt.getTime()) / (24 * 60 * 60 * 1000);

    // Only decay after cooldown period
    if (daysSinceLastSignal <= decayConfig.cooldown_days) return currentScore;

    // Apply decay: score * (1 - decay_rate * (days - cooldown))
    const decayDays = daysSinceLastSignal - decayConfig.cooldown_days;
    const decayFactor = 1 - (decayConfig.decay_rate_per_day * decayDays);
    const decayedScore = Math.max(decayConfig.min_score, currentScore * Math.max(0, decayFactor));
    const roundedScore = Math.round(decayedScore * 100) / 100;

    // If score decreased, persist a new record with decay_applied_at
    if (roundedScore < currentScore) {
      const scoreId = generateId();
      await query(
        `INSERT INTO risk_scores (id, user_id, score, tier, factors, trend, signal_count, last_signal_at, model_version, decay_applied_at)
         VALUES ($1, $2, $3, $4, $5, 'decreasing', 0, $6, '5-component-decay', NOW())`,
        [
          scoreId,
          userId,
          roundedScore,
          tier, // Tier stays the same until next full re-score
          latestScore.factors ? JSON.stringify(latestScore.factors) : '{}',
          lastSignalAt.toISOString(),
        ]
      );

      console.log(
        `[Scoring] Decay applied: userId=${userId.slice(0, 8)}, rawScore=${currentScore}, decayedScore=${roundedScore}, daysSinceSignal=${Math.round(daysSinceLastSignal)}`
      );

      return roundedScore;
    }

    return currentScore;
  } catch (err) {
    console.error('[Scoring] applyRiskDecay error:', err);
    return 0;
  }
}
