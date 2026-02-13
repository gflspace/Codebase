// QwickServices CIS — Enforcement Engine
// Orchestrates trigger evaluation → action execution → notifications
// Hard constraints:
//   - No permanent bans without human approval
//   - Respects shadow mode and kill switch
//   - All actions are audited and explainable

import { DomainEvent, EventType } from '../events/types';
import { query } from '../database/connection';
import { evaluateTrigger, evaluateContextualTrigger, getEnforcementHistory, ActionType, EventContext, eventTypeToContext } from './triggers';
import { executeAction } from './actions';
import { notifyUser, createAdminAlert, createEscalationCase } from './notifications';
import { RiskTier } from '../scoring/tiers';
import { loadActiveRules, buildRuleContext, evaluateRules } from '../rules';
import { executeRuleSideEffects } from '../rules/actions';

/**
 * Process enforcement for a user based on their current risk score.
 */
export async function processEnforcement(userId: string, context?: EventContext, eventType?: string): Promise<void> {
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

  // Step 4: Evaluate triggers (context-aware when context is provided)
  let evaluation = context
    ? evaluateContextualTrigger(tier, history, patternFlags, context)
    : evaluateTrigger(tier, history, patternFlags);

  // Step 4.5: Evaluate admin rules (Layer 9)
  const resolvedEventType = eventType || (context ? `${context}.event` : 'general.event');
  try {
    const rules = await loadActiveRules(resolvedEventType);
    if (rules.length > 0) {
      const scoreResult2 = await query(
        'SELECT score FROM risk_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      const score = scoreResult2.rows.length > 0 ? parseFloat(scoreResult2.rows[0].score) : 0;
      const ruleContext = await buildRuleContext(userId, score, tier, history, patternFlags, resolvedEventType);
      const ruleResult = await evaluateRules(rules, ruleContext, userId);

      // If an enforcement_trigger rule matched, override the hardcoded evaluation
      if (ruleResult.enforcementOverride) {
        evaluation = ruleResult.enforcementOverride;
      }

      // Execute side-effects (alerts, score adjustments, signals)
      await executeRuleSideEffects(ruleResult, userId);
    }
  } catch (err) {
    console.error('[Enforcement] Rule evaluation error (non-fatal):', err);
  }

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

  // Step 8: Create admin alert (for medium+ risk, including context-aware types)
  const alertActionTypes = [
    'hard_warning', 'temporary_restriction', 'account_suspension',
    'booking_blocked', 'booking_flagged', 'payment_held', 'payment_blocked',
    'provider_demoted', 'provider_suspended', 'message_throttled', 'admin_escalation',
  ];
  if (alertActionTypes.includes(appliedAction.action_type)) {
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
      // Phase 3B — Expanded event coverage
      EventType.BOOKING_CREATED,
      EventType.BOOKING_UPDATED,
      EventType.BOOKING_COMPLETED,
      EventType.BOOKING_CANCELLED,
      EventType.BOOKING_NO_SHOW,
      EventType.WALLET_DEPOSIT,
      EventType.WALLET_WITHDRAWAL,
      EventType.WALLET_TRANSFER,
      EventType.PROVIDER_REGISTERED,
      EventType.PROVIDER_UPDATED,
      EventType.CONTACT_FIELD_CHANGED,
      EventType.RATING_SUBMITTED,
    ],
    handler: async (event: DomainEvent) => {
      // Extract userId — check sender_id, user_id, client_id, provider_id (follows scoring pattern)
      const payload = event.payload as Record<string, unknown>;
      const userId = (payload.sender_id as string)
        || (payload.user_id as string)
        || (payload.client_id as string)
        || (payload.provider_id as string);

      if (!userId) return;

      // Delay to let scoring complete first
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Derive context from event type
      const context = eventTypeToContext(event.type);
      await processEnforcement(userId, context, event.type);
    },
  });
}
