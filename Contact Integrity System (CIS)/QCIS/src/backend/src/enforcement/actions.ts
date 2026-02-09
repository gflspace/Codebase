// QwickServices CIS — Enforcement Action Execution
// Applies enforcement actions and persists to database

import { query } from '../database/connection';
import { generateId } from '../shared/utils';
import { config } from '../config';
import { ActionType, TriggerEvaluation } from './triggers';

export interface AppliedAction {
  id: string;
  user_id: string;
  action_type: string;
  reason: string;
  reason_code: string;
  effective_until: string | null;
  automated: boolean;
  shadow_mode: boolean;
}

/**
 * Execute an enforcement action.
 * Respects shadow mode and kill switch.
 */
export async function executeAction(
  userId: string,
  evaluation: TriggerEvaluation,
  triggeringSignalIds: string[],
  riskScoreId?: string
): Promise<AppliedAction | null> {
  if (!evaluation.action) return null;

  // Kill switch: disable all automated enforcement
  if (config.enforcementKillSwitch) {
    console.log(`[Enforcement] Kill switch active — skipping action for user ${userId.slice(0, 8)}`);
    return null;
  }

  const isShadowMode = config.shadowMode;

  // Map action type for database
  const dbActionType = evaluation.action === ActionType.ADMIN_ESCALATION
    ? 'hard_warning'
    : evaluation.action;

  const actionId = generateId();
  const effectiveUntil = evaluation.effectiveDurationHours
    ? new Date(Date.now() + evaluation.effectiveDurationHours * 60 * 60 * 1000).toISOString()
    : null;

  if (isShadowMode) {
    // Shadow mode: log but don't actually enforce
    console.log(
      `[Enforcement:SHADOW] Would apply ${evaluation.action} to user ${userId.slice(0, 8)}: ${evaluation.reasonCode}`
    );

    // Still persist for analysis, but mark as shadow
    try {
      await query(
        `INSERT INTO enforcement_actions (id, user_id, action_type, reason, reason_code, triggering_signal_ids, risk_score_id, effective_until, automated, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          actionId, userId, dbActionType, evaluation.reason, evaluation.reasonCode,
          triggeringSignalIds, riskScoreId || null, effectiveUntil, true,
          JSON.stringify({ ...evaluation.metadata, shadow_mode: true }),
        ]
      );
      // Audit log for shadow mode (critical for observability)
      await query(
        `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          generateId(), 'system', 'enforcement_engine', `enforcement.shadow.${evaluation.action}`,
          'user', userId,
          JSON.stringify({
            action_id: actionId,
            reason_code: evaluation.reasonCode,
            shadow_mode: true,
            automated: true,
          }),
        ]
      );
    } catch (err) {
      console.error('[Enforcement] Failed to persist shadow action:', err);
    }

    return {
      id: actionId,
      user_id: userId,
      action_type: dbActionType,
      reason: evaluation.reason,
      reason_code: evaluation.reasonCode,
      effective_until: effectiveUntil,
      automated: true,
      shadow_mode: true,
    };
  }

  // Active mode: actually enforce
  try {
    // Persist the action
    await query(
      `INSERT INTO enforcement_actions (id, user_id, action_type, reason, reason_code, triggering_signal_ids, risk_score_id, effective_until, automated, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        actionId, userId, dbActionType, evaluation.reason, evaluation.reasonCode,
        triggeringSignalIds, riskScoreId || null, effectiveUntil, !evaluation.requiresHumanApproval,
        JSON.stringify(evaluation.metadata),
      ]
    );

    // Apply user status changes based on action type
    if (evaluation.action === ActionType.TEMPORARY_RESTRICTION) {
      await query(
        "UPDATE users SET status = 'restricted' WHERE id = $1",
        [userId]
      );
    } else if (evaluation.action === ActionType.ACCOUNT_SUSPENSION) {
      await query(
        "UPDATE users SET status = 'suspended' WHERE id = $1",
        [userId]
      );
    }

    // Audit log
    await query(
      `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        generateId(), 'system', 'enforcement_engine', `enforcement.${evaluation.action}`,
        'user', userId,
        JSON.stringify({
          action_id: actionId,
          reason_code: evaluation.reasonCode,
          automated: !evaluation.requiresHumanApproval,
          requires_approval: evaluation.requiresHumanApproval,
        }),
      ]
    );

    console.log(
      `[Enforcement] Applied ${evaluation.action} to user ${userId.slice(0, 8)}: ${evaluation.reasonCode}`
    );

    return {
      id: actionId,
      user_id: userId,
      action_type: dbActionType,
      reason: evaluation.reason,
      reason_code: evaluation.reasonCode,
      effective_until: effectiveUntil,
      automated: !evaluation.requiresHumanApproval,
      shadow_mode: false,
    };
  } catch (err) {
    console.error('[Enforcement] Failed to execute action:', err);
    return null;
  }
}
