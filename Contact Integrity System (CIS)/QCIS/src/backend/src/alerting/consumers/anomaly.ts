// QwickServices CIS — Anomaly Alert Consumer (Layer 8)
// Fires alerts when metrics deviate >2σ from category baseline.

import { DomainEvent, EventType } from '../../events/types';
import { query } from '../../database/connection';
import { createAlert } from '../index';
import { generateId } from '../../shared/utils';

export interface AnomalyResult {
  anomaly_type: string;
  severity: string;
  metric_name: string;
  expected_value: number;
  actual_value: number;
  deviation_sigma: number;
}

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
 * Check if an anomaly alert already exists for this user within 24h.
 */
async function hasRecentAnomalyAlert(userId: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT id FROM alerts
       WHERE user_id = $1
         AND source = 'anomaly'
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
 * Detect score spike anomaly: current score - previous score > 15 points.
 */
export async function detectScoreSpike(userId: string): Promise<AnomalyResult | null> {
  try {
    const result = await query(
      `SELECT score FROM risk_scores
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 2`,
      [userId]
    );

    if (result.rows.length < 2) return null;

    const currentScore = parseFloat(result.rows[0].score);
    const previousScore = parseFloat(result.rows[1].score);
    const spike = currentScore - previousScore;

    if (spike > 15) {
      return {
        anomaly_type: 'score_spike',
        severity: 'medium',
        metric_name: 'risk_score',
        expected_value: previousScore,
        actual_value: currentScore,
        deviation_sigma: spike / 7.5, // Rough 2σ approximation (15/7.5=2)
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect signal burst anomaly: > 5 signals in the last 1 hour.
 */
export async function detectSignalBurst(userId: string): Promise<AnomalyResult | null> {
  try {
    const result = await query(
      `SELECT COUNT(*) AS cnt FROM risk_signals
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '1 hour'`,
      [userId]
    );

    const count = parseInt(result.rows[0]?.cnt || '0', 10);

    if (count > 5) {
      return {
        anomaly_type: 'signal_burst',
        severity: 'high',
        metric_name: 'signal_count_1h',
        expected_value: 2.5, // Typical baseline
        actual_value: count,
        deviation_sigma: (count - 2.5) / 1.25, // Rough 2σ approximation
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect financial anomaly: single transaction > 2x user's average.
 * (Implementation placeholder - requires transaction history analysis)
 */
async function detectFinancialAnomaly(userId: string): Promise<AnomalyResult | null> {
  try {
    // Get last transaction and average of previous transactions
    const result = await query(
      `SELECT amount FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    if (result.rows.length < 2) return null;

    const latestAmount = parseFloat(result.rows[0].amount);
    const previousAmounts = result.rows.slice(1).map((r: { amount: string }) => parseFloat(r.amount));
    const avgAmount = previousAmounts.reduce((sum, amt) => sum + amt, 0) / previousAmounts.length;

    if (latestAmount > 2 * avgAmount && avgAmount > 0) {
      return {
        anomaly_type: 'financial_anomaly',
        severity: 'high',
        metric_name: 'transaction_amount',
        expected_value: avgAmount,
        actual_value: latestAmount,
        deviation_sigma: (latestAmount - avgAmount) / (avgAmount / 2), // Rough 2σ
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Log an anomaly to the anomaly_logs table.
 */
async function logAnomaly(userId: string, anomaly: AnomalyResult): Promise<void> {
  try {
    await query(
      `INSERT INTO anomaly_logs (id, user_id, anomaly_type, severity, metric_name, expected_value, actual_value, deviation_sigma, context)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        generateId(),
        userId,
        anomaly.anomaly_type,
        anomaly.severity,
        anomaly.metric_name,
        anomaly.expected_value,
        anomaly.actual_value,
        anomaly.deviation_sigma,
        JSON.stringify({ detected_at: new Date().toISOString() }),
      ]
    );
  } catch (err) {
    console.error('[Anomaly] Failed to log anomaly:', err);
  }
}

/**
 * Handle an event by checking for anomalies.
 */
export async function handleAnomalyCheck(event: DomainEvent): Promise<void> {
  const userId = extractUserId(event.payload);
  if (!userId) return;

  // Delay to let scoring complete first
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Check for dedup first
  const exists = await hasRecentAnomalyAlert(userId);
  if (exists) return;

  // Check all anomaly types
  const anomalies = await Promise.all([
    detectScoreSpike(userId),
    detectSignalBurst(userId),
    detectFinancialAnomaly(userId),
  ]);

  // Process the first detected anomaly
  const anomaly = anomalies.find((a) => a !== null);
  if (!anomaly) return;

  // Log the anomaly
  await logAnomaly(userId, anomaly);

  // Create alert
  await createAlert({
    user_id: userId,
    priority: anomaly.severity,
    title: `Anomaly Detected: ${anomaly.metric_name} deviated by ${anomaly.deviation_sigma.toFixed(2)}σ`,
    description: `${anomaly.anomaly_type.replace(/_/g, ' ')} detected: ${anomaly.metric_name} = ${anomaly.actual_value} (expected: ${anomaly.expected_value}, deviation: ${anomaly.deviation_sigma.toFixed(2)}σ)`,
    source: 'anomaly',
    metadata: {
      anomaly_type: anomaly.anomaly_type,
      metric_name: anomaly.metric_name,
      expected_value: anomaly.expected_value,
      actual_value: anomaly.actual_value,
      deviation_sigma: anomaly.deviation_sigma,
    },
  });
}

/**
 * Register the anomaly alert consumer on the event bus.
 */
export function registerAnomalyAlertConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'alerting-anomaly',
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
    handler: handleAnomalyCheck,
  });
}
