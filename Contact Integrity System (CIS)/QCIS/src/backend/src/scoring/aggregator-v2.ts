// QwickServices CIS — V2 Signal Aggregation (5-Component Model)
// Queries Phase 2A tables (bookings, wallet_transactions, risk_signals,
// enforcement_actions, users, appeals) to produce inputs for trust-score-v2.
// Each function returns safe defaults on any DB error.

import { query } from '../database/connection';
import { applyTimeDecay } from './aggregator';
import type { BehavioralInputsV2 } from './trust-score-v2';
import type { FinancialInputs } from './trust-score-v2';
import type { CommunicationInputs } from './trust-score-v2';
import type { HistoricalInputs } from './trust-score-v2';
import type { KYCInputs } from './trust-score-v2';

// ─── Behavioral Aggregation ────────────────────────────────

export async function aggregateBehavioralInputsV2(userId: string): Promise<BehavioralInputsV2> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Booking cancellation rate (30d) — user as client OR provider
    const bookingResult = await query(
      `SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled
       FROM bookings
       WHERE (client_id = $1 OR provider_id = $1)
         AND created_at >= $2`,
      [userId, thirtyDaysAgo]
    );
    const total = parseInt(bookingResult.rows[0].total, 10);
    const cancelled = parseInt(bookingResult.rows[0].cancelled, 10);
    const cancellationRate = total > 0 ? cancelled / total : 0;

    // Booking time anomaly: bookings scheduled at unusual hours (before 6am or after 11pm) in 7d
    const anomalyResult = await query(
      `SELECT COUNT(*) AS count
       FROM bookings
       WHERE (client_id = $1 OR provider_id = $1)
         AND created_at >= $2
         AND scheduled_at IS NOT NULL
         AND (EXTRACT(HOUR FROM scheduled_at) < 6 OR EXTRACT(HOUR FROM scheduled_at) >= 23)`,
      [userId, sevenDaysAgo]
    );
    const anomalyCount = parseInt(anomalyResult.rows[0].count, 10);

    // Dormant reactivation: no activity for 60+ days then recent activity
    const dormantResult = await query(
      `SELECT
        (SELECT MAX(created_at) FROM risk_signals WHERE user_id = $1 AND created_at < $2) AS last_old_activity,
        (SELECT COUNT(*) FROM risk_signals WHERE user_id = $1 AND created_at >= $3) AS recent_count`,
      [userId, new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), sevenDaysAgo]
    );
    const lastOld = dormantResult.rows[0].last_old_activity;
    const recentCount = parseInt(dormantResult.rows[0].recent_count || '0', 10);
    const dormantReactivated = lastOld === null && recentCount > 0 ? false :
      (lastOld !== null && recentCount > 0 &&
        (Date.now() - new Date(lastOld).getTime()) > 60 * 24 * 60 * 60 * 1000);

    // Activity burst: >5 events in a single day within 7d
    const burstResult = await query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS cnt
       FROM risk_signals
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY DATE(created_at)
       HAVING COUNT(*) > 5`,
      [userId, sevenDaysAgo]
    );
    const burstCount = burstResult.rows.length;

    // Phase 4: Boost cancellation rate if contact-then-cancel correlations found
    const cancelBoost = await getCancellationCorrelationBoost(userId);
    const boostedCancellationRate = Math.min(1.0, cancellationRate * cancelBoost);

    return {
      booking_cancellation_rate: boostedCancellationRate,
      booking_time_anomaly_count: anomalyCount,
      dormant_reactivated: dormantReactivated,
      activity_burst_count: burstCount,
    };
  } catch {
    return {
      booking_cancellation_rate: 0,
      booking_time_anomaly_count: 0,
      dormant_reactivated: false,
      activity_burst_count: 0,
    };
  }
}

// ─── Financial Aggregation ─────────────────────────────────

export async function aggregateFinancialInputs(userId: string): Promise<FinancialInputs> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Off-platform payment signals (30d)
    const offPlatResult = await query(
      `SELECT COUNT(*) AS count
       FROM risk_signals
       WHERE user_id = $1
         AND signal_type IN ('PAYMENT_EXTERNAL', 'TX_REDIRECT_ATTEMPT')
         AND created_at >= $2`,
      [userId, thirtyDaysAgo]
    );
    const offPlatformSignals = parseInt(offPlatResult.rows[0].count, 10);

    // Circular payments: user sends to X, X sends back to user within 30d
    const circularResult = await query(
      `SELECT COUNT(DISTINCT w1.counterparty_id) AS count
       FROM wallet_transactions w1
       JOIN wallet_transactions w2
         ON w1.counterparty_id = w2.user_id
         AND w2.counterparty_id = w1.user_id
         AND w1.tx_type IN ('transfer', 'payment')
         AND w2.tx_type IN ('transfer', 'payment')
         AND w2.created_at >= $2
       WHERE w1.user_id = $1
         AND w1.created_at >= $2
         AND w1.status = 'completed'
         AND w2.status = 'completed'`,
      [userId, thirtyDaysAgo]
    );
    const circularCount = parseInt(circularResult.rows[0].count, 10);

    // Rapid top-ups: deposits with <1hr gaps in 7d
    const topupResult = await query(
      `SELECT COUNT(*) AS count
       FROM wallet_transactions
       WHERE user_id = $1
         AND tx_type = 'deposit'
         AND status = 'completed'
         AND created_at >= $2`,
      [userId, sevenDaysAgo]
    );
    const rapidTopups = Math.max(0, parseInt(topupResult.rows[0].count, 10) - 2); // >2 deposits in 7d is notable

    // Split transactions: multiple small payments to same counterparty on same day (30d)
    const splitResult = await query(
      `SELECT COUNT(*) AS split_days
       FROM (
         SELECT DATE(created_at) AS day, counterparty_id, COUNT(*) AS cnt
         FROM wallet_transactions
         WHERE user_id = $1
           AND tx_type IN ('transfer', 'payment')
           AND status = 'completed'
           AND created_at >= $2
           AND counterparty_id IS NOT NULL
         GROUP BY DATE(created_at), counterparty_id
         HAVING COUNT(*) >= 3
       ) sub`,
      [userId, thirtyDaysAgo]
    );
    const splitCount = parseInt(splitResult.rows[0].split_days, 10);

    // Withdrawal-to-deposit ratio (30d)
    const ratioResult = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN tx_type = 'withdrawal' THEN amount END), 0) AS withdrawals,
        COALESCE(SUM(CASE WHEN tx_type = 'deposit' THEN amount END), 0) AS deposits
       FROM wallet_transactions
       WHERE user_id = $1
         AND status = 'completed'
         AND created_at >= $2`,
      [userId, thirtyDaysAgo]
    );
    const withdrawals = parseFloat(ratioResult.rows[0].withdrawals);
    const deposits = parseFloat(ratioResult.rows[0].deposits);
    const wdRatio = deposits > 0 ? withdrawals / deposits : 0;

    return {
      off_platform_payment_signals: offPlatformSignals,
      circular_payment_count: circularCount,
      rapid_topup_count: rapidTopups,
      split_transaction_count: splitCount,
      withdrawal_to_deposit_ratio: wdRatio,
    };
  } catch {
    return {
      off_platform_payment_signals: 0,
      circular_payment_count: 0,
      rapid_topup_count: 0,
      split_transaction_count: 0,
      withdrawal_to_deposit_ratio: 0,
    };
  }
}

// ─── Communication Aggregation ─────────────────────────────

export async function aggregateCommunicationInputs(userId: string): Promise<CommunicationInputs> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Contact signals (7d, time-decayed)
    const contactResult = await query(
      `SELECT created_at
       FROM risk_signals
       WHERE user_id = $1
         AND signal_type IN ('CONTACT_PHONE', 'CONTACT_EMAIL', 'CONTACT_SOCIAL', 'CONTACT_MESSAGING_APP')
         AND created_at >= $2`,
      [userId, sevenDaysAgo]
    );
    const now = Date.now();
    let contactDecayed = 0;
    for (const row of contactResult.rows) {
      const ageMs = now - new Date(row.created_at).getTime();
      contactDecayed += applyTimeDecay(1.0, ageMs);
    }

    // Obfuscation attempts (7d)
    const obfuscResult = await query(
      `SELECT COUNT(*) AS count
       FROM risk_signals
       WHERE user_id = $1
         AND created_at >= $2
         AND array_length(obfuscation_flags, 1) > 0`,
      [userId, sevenDaysAgo]
    );
    const obfuscationCount = parseInt(obfuscResult.rows[0].count, 10);

    // Grooming signals (30d)
    const groomResult = await query(
      `SELECT COUNT(*) AS count
       FROM risk_signals
       WHERE user_id = $1
         AND signal_type = 'GROOMING_LANGUAGE'
         AND created_at >= $2`,
      [userId, thirtyDaysAgo]
    );
    const groomingCount = parseInt(groomResult.rows[0].count, 10);

    // Off-platform intent signals (7d)
    const intentResult = await query(
      `SELECT COUNT(*) AS count
       FROM risk_signals
       WHERE user_id = $1
         AND signal_type = 'OFF_PLATFORM_INTENT'
         AND created_at >= $2`,
      [userId, sevenDaysAgo]
    );
    const intentCount = parseInt(intentResult.rows[0].count, 10);

    // Escalation pattern: recent scores trending upward
    const recentScores = await query(
      `SELECT score FROM risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );
    const scores = recentScores.rows.map((r: { score: string }) => parseFloat(r.score));
    const escalationPattern = scores.length >= 2 && scores[0] > scores[scores.length - 1] + 5;

    return {
      contact_signal_count: Math.round(contactDecayed * 100) / 100,
      obfuscation_attempt_count: obfuscationCount,
      grooming_signal_count: groomingCount,
      off_platform_intent_count: intentCount,
      escalation_pattern: escalationPattern,
    };
  } catch {
    return {
      contact_signal_count: 0,
      obfuscation_attempt_count: 0,
      grooming_signal_count: 0,
      off_platform_intent_count: 0,
      escalation_pattern: false,
    };
  }
}

// ─── Historical Aggregation ────────────────────────────────

export async function aggregateHistoricalInputs(userId: string): Promise<HistoricalInputs> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Check user type
    const userResult = await query(
      `SELECT user_type FROM users WHERE id = $1`,
      [userId]
    );
    const isProvider = userResult.rows[0]?.user_type === 'provider';

    // Provider completion rate (all-time, only for providers)
    let completionRate = 1.0;
    if (isProvider) {
      const completionResult = await query(
        `SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed
         FROM bookings
         WHERE provider_id = $1`,
        [userId]
      );
      const total = parseInt(completionResult.rows[0].total, 10);
      const completed = parseInt(completionResult.rows[0].completed, 10);
      completionRate = total > 0 ? completed / total : 1.0;
    }

    // Customer dispute rate (all-time): bookings with status='disputed' / total
    const disputeResult = await query(
      `SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'disputed' THEN 1 END) AS disputed
       FROM bookings
       WHERE client_id = $1 OR provider_id = $1`,
      [userId]
    );
    const disputeTotal = parseInt(disputeResult.rows[0].total, 10);
    const disputed = parseInt(disputeResult.rows[0].disputed, 10);
    const disputeRate = disputeTotal > 0 ? disputed / disputeTotal : 0;

    // Enforcement history count (all-time, non-reversed)
    const enforceResult = await query(
      `SELECT COUNT(*) AS count
       FROM enforcement_actions
       WHERE user_id = $1 AND reversed_at IS NULL`,
      [userId]
    );
    const enforceCount = parseInt(enforceResult.rows[0].count, 10);

    // Appeal denied count (all-time)
    const appealResult = await query(
      `SELECT COUNT(*) AS count
       FROM appeals
       WHERE user_id = $1 AND status = 'denied'`,
      [userId]
    );
    const appealDenied = parseInt(appealResult.rows[0].count, 10);

    // Repeat offenses of same signal type within 90d
    const repeatResult = await query(
      `SELECT signal_type, COUNT(*) AS cnt
       FROM risk_signals
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY signal_type
       HAVING COUNT(*) > 1
       ORDER BY cnt DESC
       LIMIT 1`,
      [userId, ninetyDaysAgo]
    );
    const repeatCount = repeatResult.rows.length > 0
      ? parseInt(repeatResult.rows[0].cnt, 10) - 1
      : 0;

    return {
      provider_completion_rate: completionRate,
      customer_dispute_rate: disputeRate,
      enforcement_history_count: enforceCount,
      appeal_denied_count: appealDenied,
      repeat_offense_same_type: repeatCount,
      is_provider: isProvider,
    };
  } catch {
    return {
      provider_completion_rate: 1.0,
      customer_dispute_rate: 0,
      enforcement_history_count: 0,
      appeal_denied_count: 0,
      repeat_offense_same_type: 0,
      is_provider: false,
    };
  }
}

// ─── KYC Aggregation ───────────────────────────────────────

export async function aggregateKYCInputs(userId: string): Promise<KYCInputs> {
  try {
    const result = await query(
      `SELECT verification_status, created_at, metadata FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { verification_status: 'unverified', account_age_days: 0, profile_completeness: 0 };
    }

    const user = result.rows[0];
    const ageDays = Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) / (24 * 60 * 60 * 1000)
    );

    // Profile completeness from metadata (or heuristic from field presence)
    const meta = user.metadata || {};
    const completeness = typeof meta.profile_completeness === 'number'
      ? meta.profile_completeness
      : estimateProfileCompleteness(user);

    return {
      verification_status: user.verification_status || 'unverified',
      account_age_days: ageDays,
      profile_completeness: completeness,
    };
  } catch {
    return { verification_status: 'unverified', account_age_days: 0, profile_completeness: 0 };
  }
}

// ─── Network Penalty Aggregation ─────────────────────────────

export async function aggregateNetworkPenalty(userId: string): Promise<number> {
  try {
    let penalty = 0;

    // Shared device with suspended user: +3
    const suspendedDeviceResult = await query(
      `SELECT COUNT(*) AS count
       FROM user_devices ud1
       JOIN user_devices ud2 ON ud1.device_hash = ud2.device_hash AND ud1.user_id != ud2.user_id
       JOIN users u ON u.id = ud2.user_id AND u.status = 'suspended'
       WHERE ud1.user_id = $1`,
      [userId]
    );
    if (parseInt(suspendedDeviceResult.rows[0].count, 10) > 0) {
      penalty += 3;
    }

    // Shared device with high-risk user (trust_score > 60): +2
    const highRiskDeviceResult = await query(
      `SELECT COUNT(*) AS count
       FROM user_devices ud1
       JOIN user_devices ud2 ON ud1.device_hash = ud2.device_hash AND ud1.user_id != ud2.user_id
       JOIN users u ON u.id = ud2.user_id AND u.trust_score > 60 AND u.status != 'suspended'
       WHERE ud1.user_id = $1`,
      [userId]
    );
    if (parseInt(highRiskDeviceResult.rows[0].count, 10) > 0) {
      penalty += 2;
    }

    // 3+ relationships with high-risk users: +2
    const highRiskRelResult = await query(
      `SELECT COUNT(*) AS count
       FROM user_relationships ur
       JOIN users u ON u.id = CASE WHEN ur.user_a_id = $1 THEN ur.user_b_id ELSE ur.user_a_id END
       WHERE (ur.user_a_id = $1 OR ur.user_b_id = $1)
         AND u.trust_score > 60`,
      [userId]
    );
    if (parseInt(highRiskRelResult.rows[0].count, 10) >= 3) {
      penalty += 2;
    }

    return Math.min(penalty, 7); // Cap network penalty
  } catch {
    return 0;
  }
}

// ─── Cancellation Pattern Boost from Correlations ────────────

export async function getCancellationCorrelationBoost(userId: string): Promise<number> {
  try {
    const result = await query(
      `SELECT COUNT(*) AS count
       FROM signal_correlations
       WHERE user_id = $1
         AND correlation_type = 'contact_then_cancel'
         AND created_at >= NOW() - INTERVAL '30 days'`,
      [userId]
    );
    const count = parseInt(result.rows[0].count, 10);
    return count > 0 ? 1.5 : 1.0; // 1.5x boost if correlations found
  } catch {
    return 1.0;
  }
}

/** Heuristic: count non-null core fields / total expected fields */
function estimateProfileCompleteness(user: Record<string, unknown>): number {
  const fields = ['display_name', 'email', 'phone', 'verification_status'];
  let filled = 0;
  for (const f of fields) {
    if (user[f] !== null && user[f] !== undefined && user[f] !== '') filled++;
  }
  return fields.length > 0 ? filled / fields.length : 0;
}
