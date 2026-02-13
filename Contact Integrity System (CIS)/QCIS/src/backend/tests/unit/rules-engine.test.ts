// QwickServices CIS — Layer 9: Rules Engine Unit Tests
// Tests condition evaluator and rules engine core.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateConditions, evaluateSingleCondition, RuleContext } from '../../src/rules/conditions';

// ─── Test Context ──────────────────────────────────────────────

const BASE_CONTEXT: RuleContext = {
  score: 72,
  tier: 'high',
  signal_count_24h: 5,
  enforcement_count_30d: 2,
  user_type: 'client',
  service_category: 'cleaning',
  event_type: 'message.created',
  has_active_restriction: false,
  pattern_flags: ['ESCALATION_PATTERN', 'obfuscation_detected'],
  total_enforcement_actions: 3,
};

// ─── evaluateSingleCondition ────────────────────────────────────

describe('evaluateSingleCondition', () => {
  it('eq matches string equality', () => {
    expect(evaluateSingleCondition({ field: 'tier', operator: 'eq', value: 'high' }, BASE_CONTEXT)).toBe(true);
    expect(evaluateSingleCondition({ field: 'tier', operator: 'eq', value: 'low' }, BASE_CONTEXT)).toBe(false);
  });

  it('eq matches numeric equality', () => {
    expect(evaluateSingleCondition({ field: 'score', operator: 'eq', value: 72 }, BASE_CONTEXT)).toBe(true);
    expect(evaluateSingleCondition({ field: 'score', operator: 'eq', value: 50 }, BASE_CONTEXT)).toBe(false);
  });

  it('neq returns false on match', () => {
    expect(evaluateSingleCondition({ field: 'tier', operator: 'neq', value: 'high' }, BASE_CONTEXT)).toBe(false);
    expect(evaluateSingleCondition({ field: 'tier', operator: 'neq', value: 'low' }, BASE_CONTEXT)).toBe(true);
  });

  it('gt numeric comparison', () => {
    expect(evaluateSingleCondition({ field: 'score', operator: 'gt', value: 70 }, BASE_CONTEXT)).toBe(true);
    expect(evaluateSingleCondition({ field: 'score', operator: 'gt', value: 72 }, BASE_CONTEXT)).toBe(false);
    expect(evaluateSingleCondition({ field: 'score', operator: 'gt', value: 80 }, BASE_CONTEXT)).toBe(false);
  });

  it('gte numeric comparison', () => {
    expect(evaluateSingleCondition({ field: 'score', operator: 'gte', value: 72 }, BASE_CONTEXT)).toBe(true);
    expect(evaluateSingleCondition({ field: 'score', operator: 'gte', value: 73 }, BASE_CONTEXT)).toBe(false);
  });

  it('lt numeric comparison', () => {
    expect(evaluateSingleCondition({ field: 'score', operator: 'lt', value: 80 }, BASE_CONTEXT)).toBe(true);
    expect(evaluateSingleCondition({ field: 'score', operator: 'lt', value: 72 }, BASE_CONTEXT)).toBe(false);
  });

  it('lte numeric comparison', () => {
    expect(evaluateSingleCondition({ field: 'score', operator: 'lte', value: 72 }, BASE_CONTEXT)).toBe(true);
    expect(evaluateSingleCondition({ field: 'score', operator: 'lte', value: 71 }, BASE_CONTEXT)).toBe(false);
  });

  it('in operator with string array', () => {
    expect(evaluateSingleCondition({ field: 'tier', operator: 'in', value: ['high', 'critical'] }, BASE_CONTEXT)).toBe(true);
    expect(evaluateSingleCondition({ field: 'tier', operator: 'in', value: ['low', 'medium'] }, BASE_CONTEXT)).toBe(false);
  });

  it('not_in operator', () => {
    expect(evaluateSingleCondition({ field: 'tier', operator: 'not_in', value: ['low', 'medium'] }, BASE_CONTEXT)).toBe(true);
    expect(evaluateSingleCondition({ field: 'tier', operator: 'not_in', value: ['high', 'critical'] }, BASE_CONTEXT)).toBe(false);
  });

  it('contains operator (array field contains value)', () => {
    expect(evaluateSingleCondition({ field: 'pattern_flags', operator: 'contains', value: 'ESCALATION_PATTERN' }, BASE_CONTEXT)).toBe(true);
    expect(evaluateSingleCondition({ field: 'pattern_flags', operator: 'contains', value: 'unknown_flag' }, BASE_CONTEXT)).toBe(false);
  });

  it('unknown field returns false', () => {
    expect(evaluateSingleCondition({ field: 'nonexistent', operator: 'eq', value: 'anything' }, BASE_CONTEXT)).toBe(false);
  });

  it('unknown operator returns false', () => {
    expect(evaluateSingleCondition({ field: 'score', operator: 'regex' as any, value: '.*' }, BASE_CONTEXT)).toBe(false);
  });
});

// ─── evaluateConditions (groups) ────────────────────────────────

describe('evaluateConditions', () => {
  it('all group requires ALL conditions true', () => {
    const conditions = {
      all: [
        { field: 'score', operator: 'gte' as const, value: 70 },
        { field: 'tier', operator: 'eq' as const, value: 'high' },
      ],
    };
    expect(evaluateConditions(conditions, BASE_CONTEXT)).toBe(true);
  });

  it('all group fails when any condition is false', () => {
    const conditions = {
      all: [
        { field: 'score', operator: 'gte' as const, value: 70 },
        { field: 'tier', operator: 'eq' as const, value: 'critical' }, // false
      ],
    };
    expect(evaluateConditions(conditions, BASE_CONTEXT)).toBe(false);
  });

  it('any group requires ANY condition true', () => {
    const conditions = {
      any: [
        { field: 'tier', operator: 'eq' as const, value: 'critical' }, // false
        { field: 'score', operator: 'gte' as const, value: 70 }, // true
      ],
    };
    expect(evaluateConditions(conditions, BASE_CONTEXT)).toBe(true);
  });

  it('any group fails when all conditions are false', () => {
    const conditions = {
      any: [
        { field: 'tier', operator: 'eq' as const, value: 'critical' },
        { field: 'score', operator: 'lt' as const, value: 10 },
      ],
    };
    expect(evaluateConditions(conditions, BASE_CONTEXT)).toBe(false);
  });

  it('nested groups: all containing any', () => {
    const conditions = {
      all: [
        {
          any: [
            { field: 'tier', operator: 'eq' as const, value: 'critical' }, // false
            { field: 'tier', operator: 'eq' as const, value: 'high' }, // true → any = true
          ],
        },
        { field: 'signal_count_24h', operator: 'gte' as const, value: 3 }, // true
      ],
    };
    expect(evaluateConditions(conditions, BASE_CONTEXT)).toBe(true);
  });

  it('nested groups: all fails when nested any is false', () => {
    const conditions = {
      all: [
        {
          any: [
            { field: 'tier', operator: 'eq' as const, value: 'critical' },
            { field: 'tier', operator: 'eq' as const, value: 'monitor' },
          ],
        }, // any = false
        { field: 'signal_count_24h', operator: 'gte' as const, value: 3 },
      ],
    };
    expect(evaluateConditions(conditions, BASE_CONTEXT)).toBe(false);
  });

  it('single field condition (no group)', () => {
    const conditions = { field: 'score', operator: 'gte' as const, value: 50 };
    expect(evaluateConditions(conditions, BASE_CONTEXT)).toBe(true);
  });

  it('boolean field evaluation', () => {
    const conditions = { field: 'has_active_restriction', operator: 'eq' as const, value: false };
    expect(evaluateConditions(conditions, BASE_CONTEXT)).toBe(true);
  });

  it('null field matching', () => {
    const ctx = { ...BASE_CONTEXT, user_type: null };
    const conditions = { field: 'user_type', operator: 'eq' as const, value: null as any };
    // null === null is true in JS
    expect(evaluateConditions(conditions, ctx)).toBe(true);
  });
});

// ─── Rules Engine (evaluateRules) ────────────────────────────────

// Mock database for rules engine tests
vi.mock('../../src/database/connection', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
  testConnection: () => Promise.resolve(true),
  getPool: () => ({}),
  closePool: () => Promise.resolve(),
}));

import { query as mockQueryFn } from '../../src/database/connection';
import { evaluateRules, buildRuleContext, DetectionRule, RuleAction } from '../../src/rules';
import { ActionType } from '../../src/enforcement/triggers';

const mockQuery = mockQueryFn as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockQuery.mockReset();
});

function makeRule(overrides: Partial<DetectionRule> = {}): DetectionRule {
  return {
    id: '00000000-0000-4000-8000-000000000100',
    name: 'Test Rule',
    description: 'A test rule',
    rule_type: 'enforcement_trigger',
    trigger_event_types: ['message.created'],
    conditions: { all: [{ field: 'score', operator: 'gte', value: 50 }] } as any,
    actions: [{ type: 'create_enforcement', action_type: 'temporary_restriction' }] as RuleAction[],
    priority: 100,
    enabled: true,
    dry_run: false,
    created_by: '00000000-0000-4000-8000-000000000001',
    version: 1,
    previous_version_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('buildRuleContext', () => {
  it('returns correct shape with queried data', async () => {
    // signal count query
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '7' }] });
    // user query
    mockQuery.mockResolvedValueOnce({ rows: [{ user_type: 'provider', service_category: 'plumbing' }] });

    const ctx = await buildRuleContext(
      '00000000-0000-4000-8000-000000000010',
      65, 'medium',
      { totalActions: 2, recentActions: 1, lastActionType: 'soft_warning', sameTypeViolations: 0, hasActiveRestriction: false },
      ['PATTERN_1'],
      'booking.created',
    );

    expect(ctx.score).toBe(65);
    expect(ctx.tier).toBe('medium');
    expect(ctx.signal_count_24h).toBe(7);
    expect(ctx.enforcement_count_30d).toBe(1);
    expect(ctx.user_type).toBe('provider');
    expect(ctx.service_category).toBe('plumbing');
    expect(ctx.event_type).toBe('booking.created');
    expect(ctx.has_active_restriction).toBe(false);
    expect(ctx.pattern_flags).toEqual(['PATTERN_1']);
    expect(ctx.total_enforcement_actions).toBe(2);
  });
});

describe('evaluateRules', () => {
  it('enforcement_trigger rule produces enforcementOverride when conditions match', async () => {
    const rule = makeRule();
    // logRuleMatch insert
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules([rule], BASE_CONTEXT, '00000000-0000-4000-8000-000000000010');
    expect(result.enforcementOverride).not.toBeNull();
    expect(result.enforcementOverride!.action).toBe(ActionType.TEMPORARY_RESTRICTION);
    expect(result.matchedRules).toContain(rule.id);
  });

  it('non-matching conditions return null', async () => {
    const rule = makeRule({
      conditions: { all: [{ field: 'score', operator: 'gte', value: 99 }] } as any,
    });
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules([rule], BASE_CONTEXT, '00000000-0000-4000-8000-000000000010');
    expect(result.enforcementOverride).toBeNull();
    expect(result.matchedRules).toHaveLength(0);
  });

  it('multiple rules evaluated in priority order (first enforcement_trigger wins)', async () => {
    const rule1 = makeRule({ id: '00000000-0000-4000-8000-000000000101', priority: 10, actions: [{ type: 'create_enforcement', action_type: 'hard_warning' }] });
    const rule2 = makeRule({ id: '00000000-0000-4000-8000-000000000102', priority: 20, actions: [{ type: 'create_enforcement', action_type: 'account_suspension' }] });
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules([rule1, rule2], BASE_CONTEXT, '00000000-0000-4000-8000-000000000010');
    expect(result.enforcementOverride!.action).toBe('hard_warning');
    expect(result.matchedRules).toHaveLength(2);
  });

  it('dry-run rule logs match but does not execute', async () => {
    const rule = makeRule({ dry_run: true });
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules([rule], BASE_CONTEXT, '00000000-0000-4000-8000-000000000010');
    expect(result.enforcementOverride).toBeNull();
    expect(result.dryRunMatches).toContain(rule.id);
    expect(result.matchedRules).toHaveLength(0);
  });

  it('alert_threshold rule queues alert creation', async () => {
    const rule = makeRule({
      rule_type: 'alert_threshold',
      actions: [{ type: 'create_alert', priority: 'high' }],
    });
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules([rule], BASE_CONTEXT, '00000000-0000-4000-8000-000000000010');
    expect(result.alertsToCreate).toHaveLength(1);
    expect(result.alertsToCreate[0].priority).toBe('high');
    expect(result.alertsToCreate[0].source).toBe('rule_engine');
  });

  it('scoring_adjustment rule queues score delta', async () => {
    const rule = makeRule({
      rule_type: 'scoring_adjustment',
      actions: [{ type: 'adjust_score', delta: 10 }],
    });
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules([rule], BASE_CONTEXT, '00000000-0000-4000-8000-000000000010');
    expect(result.scoreAdjustments).toEqual([10]);
  });

  it('detection rule queues signal creation', async () => {
    const rule = makeRule({
      rule_type: 'detection',
      actions: [{ type: 'create_signal', signal_type: 'CUSTOM_RULE_SIGNAL' }],
    });
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules([rule], BASE_CONTEXT, '00000000-0000-4000-8000-000000000010');
    expect(result.signalsToCreate).toHaveLength(1);
    expect(result.signalsToCreate[0].signal_type).toBe('CUSTOM_RULE_SIGNAL');
  });

  it('mixed rule types produce all result categories', async () => {
    const rules = [
      makeRule({ id: '00000000-0000-4000-8000-000000000201', rule_type: 'enforcement_trigger', priority: 10, actions: [{ type: 'create_enforcement', action_type: 'hard_warning' }] }),
      makeRule({ id: '00000000-0000-4000-8000-000000000202', rule_type: 'alert_threshold', priority: 20, actions: [{ type: 'create_alert', priority: 'medium' }] }),
      makeRule({ id: '00000000-0000-4000-8000-000000000203', rule_type: 'scoring_adjustment', priority: 30, actions: [{ type: 'adjust_score', delta: 5 }] }),
    ];
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules(rules, BASE_CONTEXT, '00000000-0000-4000-8000-000000000010');
    expect(result.enforcementOverride).not.toBeNull();
    expect(result.alertsToCreate).toHaveLength(1);
    expect(result.scoreAdjustments).toEqual([5]);
    expect(result.matchedRules).toHaveLength(3);
  });
});
