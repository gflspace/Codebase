// QwickServices CIS — Scoring Engine
// Orchestrates signal aggregation → trust score → tier assignment
// Hard constraint: scoring NEVER reads raw message content

import { query } from '../database/connection';
import { generateId } from '../shared/utils';
import { DomainEvent, EventType } from '../events/types';
import {
  calculateTrustScore,
  computeOperationalScore,
  computeBehavioralScore,
  computeNetworkScore,
} from './trust-score';
import {
  aggregateOperationalInputs,
  aggregateBehavioralInputs,
  aggregateNetworkInputs,
} from './aggregator';
import { assignTierWithTrend, RiskTier } from './tiers';

export interface ScoringResult {
  user_id: string;
  score: number;
  tier: RiskTier;
  trend: string;
  factors: {
    operational: number;
    behavioral: number;
    network: number;
  };
  signal_count: number;
}

/**
 * Compute and persist a risk score for a user.
 */
export async function computeRiskScore(userId: string): Promise<ScoringResult> {
  // Step 1: Aggregate inputs from each layer
  const [operationalInputs, behavioralInputs, networkInputs] = await Promise.all([
    aggregateOperationalInputs(userId),
    aggregateBehavioralInputs(userId),
    aggregateNetworkInputs(userId),
  ]);

  // Step 2: Compute per-layer scores
  const operationalScore = computeOperationalScore(operationalInputs);
  const behavioralScore = computeBehavioralScore(behavioralInputs);
  const networkScore = computeNetworkScore(networkInputs);

  // Step 3: Calculate composite trust score
  const trustScore = calculateTrustScore({
    operational: operationalScore,
    behavioral: behavioralScore,
    network: networkScore,
  });

  // Step 4: Get recent scores for trend analysis
  let recentScores: number[] = [];
  try {
    const result = await query(
      'SELECT score FROM risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
      [userId]
    );
    recentScores = result.rows.map((r: { score: string }) => parseFloat(r.score));
  } catch {
    // Non-fatal
  }

  // Step 5: Assign tier with trend
  const { tier, trend } = assignTierWithTrend(trustScore.score, recentScores);

  // Step 6: Count total signals
  let signalCount = 0;
  try {
    const countResult = await query(
      'SELECT COUNT(*) FROM risk_signals WHERE user_id = $1',
      [userId]
    );
    signalCount = parseInt(countResult.rows[0].count, 10);
  } catch {
    // Non-fatal
  }

  // Step 7: Persist the score
  const scoreId = generateId();
  try {
    await query(
      `INSERT INTO risk_scores (id, user_id, score, tier, factors, trend, signal_count, last_signal_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        scoreId,
        userId,
        trustScore.score,
        tier,
        JSON.stringify(trustScore.factors),
        trend,
        signalCount,
      ]
    );
  } catch (err) {
    console.error('[Scoring] Failed to persist score:', err);
  }

  // Step 8: Update user's trust_score field
  try {
    await query(
      'UPDATE users SET trust_score = $1 WHERE id = $2',
      [trustScore.score, userId]
    );
  } catch {
    // Non-fatal
  }

  return {
    user_id: userId,
    score: trustScore.score,
    tier,
    trend,
    factors: trustScore.factors,
    signal_count: signalCount,
  };
}

/**
 * Register the scoring engine as an event bus consumer.
 * Triggers re-scoring when new risk signals are generated.
 */
export function registerScoringConsumer(): void {
  const { getEventBus } = require('../events/bus');
  const bus = getEventBus();

  // Re-score after detection generates signals
  // We listen on message events (which trigger detection → signals)
  bus.registerConsumer({
    name: 'scoring-engine',
    eventTypes: [
      EventType.MESSAGE_CREATED,
      EventType.MESSAGE_EDITED,
      EventType.TRANSACTION_INITIATED,
      EventType.TRANSACTION_COMPLETED,
      EventType.TRANSACTION_FAILED,
    ],
    handler: async (event: DomainEvent) => {
      // Extract user_id from event payload
      const userId = (event.payload as { sender_id?: string; user_id?: string }).sender_id
        || (event.payload as { user_id?: string }).user_id;

      if (!userId) return;

      // Delay slightly to let detection signals persist first
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = await computeRiskScore(userId);
      if (result.score > 0) {
        console.log(
          `[Scoring] User ${userId.slice(0, 8)}: score=${result.score}, tier=${result.tier}, trend=${result.trend}`
        );
      }
    },
  });
}
