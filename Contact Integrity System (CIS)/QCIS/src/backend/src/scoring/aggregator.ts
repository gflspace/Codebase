// QwickServices CIS — Signal Aggregation with Time Decay
// Aggregates risk signals into scoring inputs

import { query } from '../database/connection';
import {
  OperationalInputs,
  BehavioralInputs,
  NetworkInputs,
} from './trust-score';

// Time decay constants
const DECAY_HALF_LIFE_DAYS = 14; // Signals lose half their weight after 14 days
const DECAY_FACTOR = Math.LN2 / (DECAY_HALF_LIFE_DAYS * 24 * 60 * 60 * 1000);

/**
 * Apply exponential time decay to a value based on age.
 * @param value The original value
 * @param ageMs Age in milliseconds
 */
export function applyTimeDecay(value: number, ageMs: number): number {
  return value * Math.exp(-DECAY_FACTOR * ageMs);
}

/**
 * Aggregate operational inputs for a user from the database.
 */
export async function aggregateOperationalInputs(userId: string): Promise<OperationalInputs> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Transaction stats
    const txResult = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN payment_method = 'escrow' OR payment_method = 'platform' THEN 1 END) as escrow_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
       FROM transactions
       WHERE user_id = $1 AND created_at >= $2`,
      [userId, thirtyDaysAgo]
    );

    // Off-platform payment signals
    const signalResult = await query(
      `SELECT COUNT(*) as count
       FROM risk_signals
       WHERE user_id = $1 AND signal_type IN ('PAYMENT_EXTERNAL', 'TX_REDIRECT_ATTEMPT')
       AND created_at >= $2`,
      [userId, thirtyDaysAgo]
    );

    const tx = txResult.rows[0];
    const total = parseInt(tx.total, 10);
    const escrowCount = parseInt(tx.escrow_count, 10);
    const cancelledCount = parseInt(tx.cancelled_count, 10);
    const offPlatformCount = parseInt(signalResult.rows[0].count, 10);

    return {
      escrowUsageRatio: total > 0 ? escrowCount / total : 1.0,
      recentCancellations: cancelledCount,
      recentTransactions: total,
      offPlatformPaymentAttempts: offPlatformCount,
    };
  } catch {
    return {
      escrowUsageRatio: 1.0,
      recentCancellations: 0,
      recentTransactions: 0,
      offPlatformPaymentAttempts: 0,
    };
  }
}

/**
 * Aggregate behavioral inputs for a user from the database.
 */
export async function aggregateBehavioralInputs(userId: string): Promise<BehavioralInputs> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Recent signal stats with time-decayed counting
    const signalResult = await query(
      `SELECT signal_type, confidence, obfuscation_flags, created_at
       FROM risk_signals
       WHERE user_id = $1 AND created_at >= $2
       ORDER BY created_at DESC`,
      [userId, sevenDaysAgo]
    );

    const signals = signalResult.rows;
    const now = Date.now();

    // Count with time decay
    let weightedCount = 0;
    const signalTypes = new Set<string>();
    const typeCounts = new Map<string, number>();
    let obfuscationCount = 0;

    for (const signal of signals) {
      const age = now - new Date(signal.created_at).getTime();
      const decayedWeight = applyTimeDecay(1.0, age);
      weightedCount += decayedWeight;

      signalTypes.add(signal.signal_type);

      const typeCount = (typeCounts.get(signal.signal_type) || 0) + 1;
      typeCounts.set(signal.signal_type, typeCount);

      if (signal.obfuscation_flags && signal.obfuscation_flags.length > 0) {
        obfuscationCount++;
      }
    }

    // Find max repeated violations
    let maxRepeated = 0;
    for (const count of typeCounts.values()) {
      if (count > maxRepeated) maxRepeated = count;
    }

    // Check escalation: are recent scores higher than older ones?
    const recentScores = await query(
      `SELECT score FROM risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );
    const scores = recentScores.rows.map((r: { score: string }) => parseFloat(r.score));
    const isEscalating = scores.length >= 2 && scores[0] > scores[scores.length - 1] + 5;

    return {
      recentSignalCount: Math.round(weightedCount),
      uniqueSignalTypes: signalTypes.size,
      isEscalating,
      repeatedViolationCount: maxRepeated > 1 ? maxRepeated - 1 : 0,
      obfuscationAttempts: obfuscationCount,
    };
  } catch {
    return {
      recentSignalCount: 0,
      uniqueSignalTypes: 0,
      isEscalating: false,
      repeatedViolationCount: 0,
      obfuscationAttempts: 0,
    };
  }
}

/**
 * Aggregate network inputs for a user from the database.
 */
export async function aggregateNetworkInputs(userId: string): Promise<NetworkInputs> {
  try {
    // Count unique counterparties that also have risk signals
    const counterpartyResult = await query(
      `SELECT COUNT(DISTINCT m.receiver_id) as flagged_counterparties
       FROM messages m
       JOIN risk_signals rs ON rs.user_id = m.receiver_id
       WHERE m.sender_id = $1`,
      [userId]
    );

    // Shared payment endpoints (simplified: same external_ref)
    const sharedEndpointResult = await query(
      `SELECT COUNT(*) as shared
       FROM transactions t1
       JOIN transactions t2 ON t1.external_ref = t2.external_ref AND t1.user_id != t2.user_id
       WHERE t1.user_id = $1 AND t1.external_ref IS NOT NULL`,
      [userId]
    );

    // For now, device cluster and similar pattern detection are stubbed
    // These would require IP/device tracking infrastructure
    return {
      flaggedCounterparties: parseInt(counterpartyResult.rows[0]?.flagged_counterparties || '0', 10),
      sharedPaymentEndpoints: parseInt(sharedEndpointResult.rows[0]?.shared || '0', 10) > 0,
      similarPatternUsers: 0, // Stub — requires pattern matching infrastructure
      inDeviceCluster: false, // Stub — requires device tracking
    };
  } catch {
    return {
      flaggedCounterparties: 0,
      sharedPaymentEndpoints: false,
      similarPatternUsers: 0,
      inDeviceCluster: false,
    };
  }
}
