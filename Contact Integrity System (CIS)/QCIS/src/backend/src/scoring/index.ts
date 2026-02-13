// QwickServices CIS — Scoring Engine
// Orchestrates signal aggregation → trust score → tier assignment
// Hard constraint: scoring NEVER reads raw message content
// Supports both 3-layer (V1) and 5-component (V2) models via config.scoringModel

import { query } from '../database/connection';
import { generateId } from '../shared/utils';
import { config } from '../config';
import { DomainEvent, EventType } from '../events/types';
import { cacheGet, cacheSet, cacheDelete } from '../cache';

// V1 imports (3-layer model)
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

// V2 imports (5-component model)
import {
  calculateTrustScoreV2,
  computeBehavioralScoreV2,
  computeFinancialScore,
  computeCommunicationScore,
  computeHistoricalScore,
  computeKYCScore,
} from './trust-score-v2';
import {
  aggregateBehavioralInputsV2,
  aggregateFinancialInputs,
  aggregateCommunicationInputs,
  aggregateHistoricalInputs,
  aggregateKYCInputs,
} from './aggregator-v2';

import { assignTierWithTrend, RiskTier } from './tiers';

export interface ScoringResult {
  user_id: string;
  score: number;
  tier: RiskTier;
  trend: string;
  factors: Record<string, unknown>;
  signal_count: number;
}

/**
 * Compute and persist a risk score for a user.
 * Delegates to V1 or V2 pipeline based on config.scoringModel.
 */
export async function computeRiskScore(userId: string): Promise<ScoringResult> {
  // Check cache first
  const cacheKey = `score:${userId}`;
  try {
    const cached = await cacheGet<ScoringResult>(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (err) {
    // Cache failure is non-blocking
    console.warn('[Scoring] Cache read failed, computing score:', err);
  }

  // Compute score
  let result: ScoringResult;
  if (config.scoringModel === '5-component') {
    result = await computeRiskScoreV2(userId);
  } else {
    result = await computeRiskScoreV1(userId);
  }

  // Cache result
  try {
    await cacheSet(cacheKey, result, { ttlSeconds: 60 });
  } catch (err) {
    // Cache failure is non-blocking
    console.warn('[Scoring] Cache write failed:', err);
  }

  return result;
}

// ─── V1 Pipeline (3-layer, legacy) ─────────────────────────

async function computeRiskScoreV1(userId: string): Promise<ScoringResult> {
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

  // Step 4-8: Shared persistence path
  return persistAndReturn(userId, trustScore.score, trustScore.factors as unknown as Record<string, unknown>, '3-layer');
}

// ─── V2 Pipeline (5-component) ─────────────────────────────

async function computeRiskScoreV2(userId: string): Promise<ScoringResult> {
  // Step 1: Aggregate all 5 components in parallel
  const [behavioralInputs, financialInputs, communicationInputs, historicalInputs, kycInputs] =
    await Promise.all([
      aggregateBehavioralInputsV2(userId),
      aggregateFinancialInputs(userId),
      aggregateCommunicationInputs(userId),
      aggregateHistoricalInputs(userId),
      aggregateKYCInputs(userId),
    ]);

  // Step 2: Compute per-component scores
  const factors = {
    behavioral: { score: computeBehavioralScoreV2(behavioralInputs), inputs: behavioralInputs },
    financial: { score: computeFinancialScore(financialInputs), inputs: financialInputs },
    communication: { score: computeCommunicationScore(communicationInputs), inputs: communicationInputs },
    historical: { score: computeHistoricalScore(historicalInputs), inputs: historicalInputs },
    kyc: { score: computeKYCScore(kycInputs), inputs: kycInputs },
  };

  // Step 3: Calculate composite trust score
  const trustScore = calculateTrustScoreV2(factors);

  // Step 4-8: Shared persistence path
  return persistAndReturn(userId, trustScore.score, trustScore.factors as unknown as Record<string, unknown>, '5-component');
}

// ─── Shared Persistence ────────────────────────────────────

async function persistAndReturn(
  userId: string,
  score: number,
  factors: Record<string, unknown>,
  modelVersion: string
): Promise<ScoringResult> {
  // Get recent scores for trend analysis
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

  // Assign tier with trend
  const { tier, trend } = assignTierWithTrend(score, recentScores);

  // Count total signals
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

  // Persist the score
  const scoreId = generateId();
  try {
    await query(
      `INSERT INTO risk_scores (id, user_id, score, tier, factors, trend, signal_count, last_signal_at, model_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
      [
        scoreId,
        userId,
        score,
        tier,
        JSON.stringify(factors),
        trend,
        signalCount,
        modelVersion,
      ]
    );

    // Invalidate cache when new score is inserted
    try {
      await cacheDelete(`score:${userId}`);
      await cacheDelete(`eval:${userId}`);
    } catch {
      // Cache deletion is non-blocking
    }
  } catch (err) {
    console.error('[Scoring] Failed to persist score:', err);
  }

  // Update user's trust_score field
  try {
    await query(
      'UPDATE users SET trust_score = $1 WHERE id = $2',
      [score, userId]
    );
  } catch {
    // Non-fatal
  }

  return {
    user_id: userId,
    score,
    tier,
    trend,
    factors,
    signal_count: signalCount,
  };
}

/**
 * Extract user_id from an event payload.
 * Handles all payload shapes: sender_id, user_id, client_id, provider_id.
 */
function extractUserId(payload: Record<string, unknown>): string | undefined {
  return (payload.sender_id as string)
    || (payload.user_id as string)
    || (payload.client_id as string)
    || (payload.provider_id as string)
    || undefined;
}

/**
 * Register the scoring engine as an event bus consumer.
 * Triggers re-scoring when new risk signals are generated.
 */
export function registerScoringConsumer(): void {
  const { getEventBus } = require('../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'scoring-engine',
    eventTypes: [
      // Original message/transaction events
      EventType.MESSAGE_CREATED,
      EventType.MESSAGE_EDITED,
      EventType.TRANSACTION_INITIATED,
      EventType.TRANSACTION_COMPLETED,
      EventType.TRANSACTION_FAILED,
      // Phase 2A booking events
      EventType.BOOKING_CREATED,
      EventType.BOOKING_CANCELLED,
      EventType.BOOKING_COMPLETED,
      EventType.BOOKING_NO_SHOW,
      // Phase 2A wallet events
      EventType.WALLET_DEPOSIT,
      EventType.WALLET_WITHDRAWAL,
      EventType.WALLET_TRANSFER,
      // Phase 2A provider/user events
      EventType.PROVIDER_REGISTERED,
      EventType.PROVIDER_UPDATED,
      EventType.USER_REGISTERED,
    ],
    handler: async (event: DomainEvent) => {
      const userId = extractUserId(event.payload);
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
