// QwickServices CIS — Enforcement Engine
// Orchestrates trigger evaluation → action execution → notifications
// Hard constraints:
//   - No permanent bans without human approval
//   - Respects shadow mode and kill switch
//   - All actions are audited and explainable

import { DomainEvent, EventType } from '../events/types';
import { query } from '../database/connection';
import { evaluateTrigger, getEnforcementHistory, ActionType } from './triggers';
import { executeAction } from './actions';
import { notifyUser, createAdminAlert, createEscalationCase } from './notifications';
import { RiskTier } from '../scoring/tiers';

/**
 * Process enforcement for a user based on their current risk score.
 */
export async function processEnforcement(userId: string): Promise<void> {
  // Step 1: Get latest risk score
  let tier: RiskTier;
  let riskScoreId: string | undefined;
  let patternFlags: string[] = [];

  try {
    const scoreResult = await query(
      'SELECT id, tier, factors FROM risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (scoreResult.rows.length === 0) return; // No score yet

    const score = scoreResult.rows[0];
    tier = score.tier as RiskTier;
    riskScoreId = score.id;
  } catch {
    return;
  }

  // Step 2: Get recent signal pattern flags
  try {
    const signalResult = await query(
      `SELECT pattern_flags FROM risk_signals
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    for (const row of signalResult.rows) {
      if (row.pattern_flags) {
        patternFlags.push(...row.pattern_flags);
      }
    }
    patternFlags = [...new Set(patternFlags)];
  } catch {
    // Non-fatal
  }

  // Step 3: Get enforcement history
  const history = await getEnforcementHistory(userId);

  // Skip if already has active restriction (avoid stacking)
  if (history.hasActiveRestriction) {
    return;
  }

  // Step 4: Evaluate triggers
  const evaluation = evaluateTrigger(tier, history, patternFlags);

  if (!evaluation.action) return;

  // Step 5: Get triggering signal IDs
  let triggeringSignalIds: string[] = [];
  try {
    const signalResult = await query(
      `SELECT id FROM risk_signals
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );
    triggeringSignalIds = signalResult.rows.map((r: { id: string }) => r.id);
  } catch {
    // Non-fatal
  }

  // Step 6: Execute the action
  const appliedAction = await executeAction(userId, evaluation, triggeringSignalIds, riskScoreId);

  if (!appliedAction) return;

  // Step 7: Send notifications
  await notifyUser(appliedAction);

  // Step 8: Create admin alert (for medium+ risk)
  if (['hard_warning', 'temporary_restriction', 'account_suspension'].includes(appliedAction.action_type)) {
    const alertId = await createAdminAlert(appliedAction);

    // Create escalation case for high/critical
    if (evaluation.requiresHumanApproval && alertId) {
      await createEscalationCase(appliedAction, alertId);
    }
  }
}

/**
 * Register the enforcement engine as an event bus consumer.
 * Triggers after scoring is complete.
 */
export function registerEnforcementConsumer(): void {
  const { getEventBus } = require('../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'enforcement-engine',
    eventTypes: [
      EventType.MESSAGE_CREATED,
      EventType.MESSAGE_EDITED,
      EventType.TRANSACTION_INITIATED,
      EventType.TRANSACTION_COMPLETED,
      EventType.TRANSACTION_FAILED,
    ],
    handler: async (event: DomainEvent) => {
      const userId = (event.payload as { sender_id?: string; user_id?: string }).sender_id
        || (event.payload as { user_id?: string }).user_id;

      if (!userId) return;

      // Delay to let scoring complete first
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await processEnforcement(userId);
    },
  });
}
