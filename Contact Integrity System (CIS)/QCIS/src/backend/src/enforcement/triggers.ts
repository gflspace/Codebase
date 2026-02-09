// QwickServices CIS — Enforcement Trigger Evaluation
// Maps risk tiers + history to enforcement actions
// Hard constraints:
//   - Automation NEVER permanently bans users
//   - High-risk actions require human review
//   - All actions must be explainable and reversible where possible

import { query } from '../database/connection';
import { RiskTier, tierSeverity } from '../scoring/tiers';

export enum ActionType {
  SOFT_WARNING = 'soft_warning',
  HARD_WARNING = 'hard_warning',
  TEMPORARY_RESTRICTION = 'temporary_restriction',
  ACCOUNT_SUSPENSION = 'account_suspension',
  ADMIN_ESCALATION = 'admin_escalation', // Not a direct action; creates a case
}

export interface TriggerEvaluation {
  action: ActionType | null;
  requiresHumanApproval: boolean;
  reason: string;
  reasonCode: string;
  effectiveDurationHours: number | null;
  metadata: Record<string, unknown>;
}

export interface EnforcementHistory {
  totalActions: number;
  recentActions: number; // last 30 days
  lastActionType: string | null;
  sameTypeViolations: number;
  hasActiveRestriction: boolean;
}

/**
 * Get enforcement history for a user.
 */
export async function getEnforcementHistory(userId: string): Promise<EnforcementHistory> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const totalResult = await query(
      'SELECT COUNT(*) FROM enforcement_actions WHERE user_id = $1',
      [userId]
    );

    const recentResult = await query(
      'SELECT COUNT(*) FROM enforcement_actions WHERE user_id = $1 AND created_at >= $2',
      [userId, thirtyDaysAgo]
    );

    const lastResult = await query(
      'SELECT action_type FROM enforcement_actions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    const activeResult = await query(
      `SELECT COUNT(*) FROM enforcement_actions
       WHERE user_id = $1 AND reversed_at IS NULL
       AND action_type IN ('temporary_restriction', 'account_suspension')
       AND (effective_until IS NULL OR effective_until > NOW())`,
      [userId]
    );

    return {
      totalActions: parseInt(totalResult.rows[0].count, 10),
      recentActions: parseInt(recentResult.rows[0].count, 10),
      lastActionType: lastResult.rows[0]?.action_type || null,
      sameTypeViolations: 0, // Simplified
      hasActiveRestriction: parseInt(activeResult.rows[0].count, 10) > 0,
    };
  } catch {
    return {
      totalActions: 0,
      recentActions: 0,
      lastActionType: null,
      sameTypeViolations: 0,
      hasActiveRestriction: false,
    };
  }
}

/**
 * Evaluate what enforcement action to take based on risk tier and history.
 */
export function evaluateTrigger(
  tier: RiskTier,
  history: EnforcementHistory,
  patternFlags: string[]
): TriggerEvaluation {
  const severity = tierSeverity(tier);

  // Monitor tier: no action
  if (severity === 0) {
    return {
      action: null,
      requiresHumanApproval: false,
      reason: 'User is in monitor tier; no action required.',
      reasonCode: 'MONITOR_ONLY',
      effectiveDurationHours: null,
      metadata: { tier },
    };
  }

  // Low tier: first offense = soft warning
  if (severity === 1) {
    if (history.recentActions === 0) {
      return {
        action: ActionType.SOFT_WARNING,
        requiresHumanApproval: false,
        reason: 'Low-risk behavior detected. This is an informational warning.',
        reasonCode: 'LOW_RISK_FIRST_OFFENSE',
        effectiveDurationHours: null,
        metadata: { tier, historyCount: history.totalActions },
      };
    }
    // Repeat low-tier: hard warning
    return {
      action: ActionType.HARD_WARNING,
      requiresHumanApproval: false,
      reason: 'Repeated low-risk behavior detected. This warning is logged.',
      reasonCode: 'LOW_RISK_REPEAT',
      effectiveDurationHours: null,
      metadata: { tier, historyCount: history.totalActions },
    };
  }

  // Medium tier
  if (severity === 2) {
    if (history.recentActions === 0) {
      return {
        action: ActionType.HARD_WARNING,
        requiresHumanApproval: false,
        reason: 'Medium-risk behavior detected. This warning is logged.',
        reasonCode: 'MEDIUM_RISK_FIRST',
        effectiveDurationHours: null,
        metadata: { tier, historyCount: history.totalActions },
      };
    }
    if (history.recentActions === 1) {
      return {
        action: ActionType.HARD_WARNING,
        requiresHumanApproval: false,
        reason: 'Second medium-risk violation detected.',
        reasonCode: 'MEDIUM_RISK_SECOND',
        effectiveDurationHours: null,
        metadata: { tier, historyCount: history.totalActions },
      };
    }
    // Third+ medium violation: temporary restriction
    return {
      action: ActionType.TEMPORARY_RESTRICTION,
      requiresHumanApproval: false,
      reason: 'Multiple medium-risk violations detected. Temporary restriction applied.',
      reasonCode: 'MEDIUM_RISK_REPEATED',
      effectiveDurationHours: 24, // 24-hour restriction
      metadata: { tier, historyCount: history.totalActions },
    };
  }

  // High tier: always escalate to admin
  if (severity === 3) {
    const hasEvasion = patternFlags.includes('ESCALATION_PATTERN') ||
      patternFlags.some((f) => f.includes('obfuscation'));

    if (hasEvasion || history.recentActions >= 2) {
      return {
        action: ActionType.TEMPORARY_RESTRICTION,
        requiresHumanApproval: true,
        reason: 'High-risk behavior with evasion/escalation pattern detected. Admin review required.',
        reasonCode: 'HIGH_RISK_EVASION',
        effectiveDurationHours: 72,
        metadata: { tier, historyCount: history.totalActions, patternFlags },
      };
    }

    return {
      action: ActionType.ADMIN_ESCALATION,
      requiresHumanApproval: true,
      reason: 'High-risk behavior detected. Escalated for admin review.',
      reasonCode: 'HIGH_RISK_ESCALATION',
      effectiveDurationHours: null,
      metadata: { tier, historyCount: history.totalActions },
    };
  }

  // Critical tier: suspend + mandatory human review
  // NEVER permanently ban automatically
  return {
    action: ActionType.ACCOUNT_SUSPENSION,
    requiresHumanApproval: true,
    reason: 'Critical-risk behavior detected. Account suspended pending admin review.',
    reasonCode: 'CRITICAL_RISK_SUSPEND',
    effectiveDurationHours: null, // Until admin resolves
    metadata: { tier, historyCount: history.totalActions, patternFlags },
  };
}
