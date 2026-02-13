// QwickServices CIS — Layer 9: Rules Engine Core
// Loads active rules, builds evaluation context, evaluates rules,
// and returns structured results for the enforcement pipeline.

import { query } from '../database/connection';
import { evaluateConditions, RuleConditions, RuleContext } from './conditions';
import { ActionType, TriggerEvaluation, EnforcementHistory } from '../enforcement/triggers';
import { CreateAlertParams } from '../alerting/index';
import { generateId } from '../shared/utils';

// ─── Types ────────────────────────────────────────────────────

export interface DetectionRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: 'enforcement_trigger' | 'alert_threshold' | 'scoring_adjustment' | 'detection';
  trigger_event_types: string[];
  conditions: RuleConditions;
  actions: RuleAction[];
  priority: number;
  enabled: boolean;
  dry_run: boolean;
  created_by: string;
  version: number;
  previous_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuleAction {
  type: 'create_enforcement' | 'create_alert' | 'adjust_score' | 'create_signal';
  action_type?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  delta?: number;
  signal_type?: string;
}

export interface SignalParams {
  signal_type: string;
  user_id: string;
  confidence: number;
}

export interface RuleEvaluationResult {
  enforcementOverride: TriggerEvaluation | null;
  alertsToCreate: CreateAlertParams[];
  scoreAdjustments: number[];
  signalsToCreate: SignalParams[];
  matchedRules: string[];
  dryRunMatches: string[];
}

// ─── Load Active Rules ────────────────────────────────────────

export async function loadActiveRules(eventType: string): Promise<DetectionRule[]> {
  try {
    const result = await query(
      `SELECT id, name, description, rule_type, trigger_event_types, conditions, actions,
              priority, enabled, dry_run, created_by, version, previous_version_id,
              created_at, updated_at
       FROM detection_rules
       WHERE enabled = TRUE AND $1 = ANY(trigger_event_types)
       ORDER BY priority ASC`,
      [eventType]
    );
    return result.rows as DetectionRule[];
  } catch (err) {
    console.error('[RulesEngine] Failed to load active rules:', err);
    return [];
  }
}

// ─── Build Rule Context ───────────────────────────────────────

export async function buildRuleContext(
  userId: string,
  score: number,
  tier: string,
  history: EnforcementHistory,
  patternFlags: string[],
  eventType: string,
): Promise<RuleContext> {
  // Query signal count in the last 24h
  let signalCount24h = 0;
  let userType: string | null = null;
  let serviceCategory: string | null = null;

  try {
    const [signalResult, userResult] = await Promise.all([
      query(
        `SELECT COUNT(*) FROM risk_signals
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
        [userId]
      ),
      query(
        'SELECT user_type, service_category FROM users WHERE id = $1',
        [userId]
      ),
    ]);

    signalCount24h = parseInt(signalResult.rows[0]?.count || '0', 10);
    if (userResult.rows.length > 0) {
      userType = userResult.rows[0].user_type || null;
      serviceCategory = userResult.rows[0].service_category || null;
    }
  } catch {
    // Non-fatal — proceed with defaults
  }

  return {
    score,
    tier,
    signal_count_24h: signalCount24h,
    enforcement_count_30d: history.recentActions,
    user_type: userType,
    service_category: serviceCategory,
    event_type: eventType,
    has_active_restriction: history.hasActiveRestriction,
    pattern_flags: patternFlags,
    total_enforcement_actions: history.totalActions,
  };
}

// ─── Rule Match Logging ───────────────────────────────────────

export async function logRuleMatch(
  ruleId: string,
  userId: string,
  eventType: string,
  matched: boolean,
  dryRun: boolean,
  context: RuleContext,
  actionsExecuted: RuleAction[] | null,
): Promise<void> {
  try {
    await query(
      `INSERT INTO rule_match_log (id, rule_id, user_id, event_type, matched, dry_run, context_snapshot, actions_executed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        generateId(), ruleId, userId, eventType, matched, dryRun,
        JSON.stringify(context),
        actionsExecuted ? JSON.stringify(actionsExecuted) : null,
      ]
    );
  } catch (err) {
    console.error('[RulesEngine] Failed to log rule match:', err);
  }
}

// ─── Map Rule Action to TriggerEvaluation ─────────────────────

function ruleToTriggerEvaluation(rule: DetectionRule, action: RuleAction): TriggerEvaluation {
  const actionType = (action.action_type || 'admin_escalation') as ActionType;
  const requiresApproval = [
    ActionType.ACCOUNT_SUSPENSION,
    ActionType.ADMIN_ESCALATION,
    ActionType.PROVIDER_SUSPENDED,
  ].includes(actionType);

  return {
    action: actionType,
    requiresHumanApproval: requiresApproval,
    reason: `Rule "${rule.name}" triggered: ${rule.description || 'no description'}`,
    reasonCode: `RULE_${rule.id.slice(0, 8).toUpperCase()}`,
    effectiveDurationHours: actionType === ActionType.TEMPORARY_RESTRICTION ? 24 : null,
    metadata: { ruleId: rule.id, ruleName: rule.name, ruleVersion: rule.version },
  };
}

// ─── Evaluate Rules ───────────────────────────────────────────

export async function evaluateRules(
  rules: DetectionRule[],
  context: RuleContext,
  userId: string,
): Promise<RuleEvaluationResult> {
  const result: RuleEvaluationResult = {
    enforcementOverride: null,
    alertsToCreate: [],
    scoreAdjustments: [],
    signalsToCreate: [],
    matchedRules: [],
    dryRunMatches: [],
  };

  for (const rule of rules) {
    const matched = evaluateConditions(rule.conditions, context);

    if (!matched) {
      await logRuleMatch(rule.id, userId, context.event_type, false, rule.dry_run, context, null);
      continue;
    }

    // Rule matched
    const actions = Array.isArray(rule.actions) ? rule.actions : [rule.actions];
    await logRuleMatch(rule.id, userId, context.event_type, true, rule.dry_run, context, actions);

    if (rule.dry_run) {
      result.dryRunMatches.push(rule.id);
      console.log(`[RulesEngine] DRY RUN match: rule "${rule.name}" (${rule.id.slice(0, 8)}) for user ${userId.slice(0, 8)}`);
      continue;
    }

    result.matchedRules.push(rule.id);

    // Process each action in the rule
    for (const action of actions) {
      switch (action.type) {
        case 'create_enforcement':
          // First enforcement_trigger rule wins (highest priority)
          if (!result.enforcementOverride && rule.rule_type === 'enforcement_trigger') {
            result.enforcementOverride = ruleToTriggerEvaluation(rule, action);
          }
          break;

        case 'create_alert':
          result.alertsToCreate.push({
            user_id: userId,
            priority: action.priority || 'medium',
            title: `Rule triggered: ${rule.name}`,
            description: rule.description || `Detection rule "${rule.name}" matched`,
            source: 'rule_engine',
            auto_generated: true,
            metadata: { rule_id: rule.id, rule_name: rule.name },
          });
          break;

        case 'adjust_score':
          if (typeof action.delta === 'number') {
            result.scoreAdjustments.push(action.delta);
          }
          break;

        case 'create_signal':
          if (action.signal_type) {
            result.signalsToCreate.push({
              signal_type: action.signal_type,
              user_id: userId,
              confidence: 0.8,
            });
          }
          break;
      }
    }
  }

  return result;
}
