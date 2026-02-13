// QwickServices CIS — Layer 9: Rule Action Executor
// Executes side-effects from rule matches: alerts, score adjustments, signals.
// Enforcement actions are NOT executed here — they're returned as enforcementOverride
// and handled by the existing processEnforcement() pipeline.

import { query } from '../database/connection';
import { createAlert } from '../alerting/index';
import { generateId } from '../shared/utils';
import { RuleEvaluationResult } from './index';

/**
 * Execute all side-effects from rule evaluation results.
 * Called after rule evaluation completes — not during iteration.
 */
export async function executeRuleSideEffects(
  result: RuleEvaluationResult,
  userId: string,
): Promise<void> {
  // 1. Create alerts from alert_threshold rules
  for (const alertParams of result.alertsToCreate) {
    await createAlert(alertParams);
  }

  // 2. Apply score adjustments from scoring_adjustment rules
  if (result.scoreAdjustments.length > 0) {
    await executeScoreAdjustments(result.scoreAdjustments, userId);
  }

  // 3. Create signals from detection rules
  for (const signal of result.signalsToCreate) {
    await executeSignalCreation(signal.signal_type, signal.user_id);
  }
}

/**
 * Apply score adjustments by creating a new risk_scores entry.
 */
async function executeScoreAdjustments(adjustments: number[], userId: string): Promise<void> {
  try {
    // Get current score
    const scoreResult = await query(
      'SELECT score, tier, factors FROM risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (scoreResult.rows.length === 0) return;

    const currentScore = parseFloat(scoreResult.rows[0].score);
    const totalDelta = adjustments.reduce((sum, d) => sum + d, 0);
    const newScore = Math.max(0, Math.min(100, currentScore + totalDelta));

    // Determine new tier
    const newTier = newScore >= 85 ? 'critical'
      : newScore >= 65 ? 'high'
      : newScore >= 40 ? 'medium'
      : newScore >= 15 ? 'low'
      : 'monitor';

    await query(
      `INSERT INTO risk_scores (id, user_id, score, tier, model_version, factors)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        generateId(), userId, newScore, newTier, 'rule-adjustment',
        JSON.stringify({
          source: 'rule_engine',
          previous_score: currentScore,
          delta: totalDelta,
          adjustments,
        }),
      ]
    );

    console.log(`[RulesEngine] Score adjusted for user ${userId.slice(0, 8)}: ${currentScore} → ${newScore} (delta: ${totalDelta})`);
  } catch (err) {
    console.error('[RulesEngine] Failed to execute score adjustment:', err);
  }
}

/**
 * Create a risk signal from a detection rule match.
 */
async function executeSignalCreation(signalType: string, userId: string): Promise<void> {
  try {
    await query(
      `INSERT INTO risk_signals (id, source_event_id, user_id, signal_type, confidence, evidence, pattern_flags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        generateId(), generateId(), userId, signalType, 0.8,
        JSON.stringify({ source: 'rule_engine', message_ids: [], timestamps: [] }),
        ['RULE_ENGINE_GENERATED'],
      ]
    );

    console.log(`[RulesEngine] Signal created for user ${userId.slice(0, 8)}: ${signalType}`);
  } catch (err) {
    console.error('[RulesEngine] Failed to create signal:', err);
  }
}
