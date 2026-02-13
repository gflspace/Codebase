// QwickServices CIS — E2E Pipeline Integration Tests
// Tests the full pipeline: event → detection → scoring → enforcement → alerting
// Uses mocked database but exercises the actual pipeline logic.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mock DB before imports ──────────────────────────────────────

const mockQuery = vi.fn();
vi.mock('../../src/database/connection', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: vi.fn(),
  testConnection: () => Promise.resolve(true),
  getPool: () => ({}),
  closePool: () => Promise.resolve(),
  getClient: vi.fn(),
}));

vi.mock('../../src/config', () => ({
  config: {
    port: 0,
    nodeEnv: 'test',
    apiBaseUrl: 'http://localhost:3099',
    db: { host: 'localhost', port: 5432, name: 'test', user: 'test', password: 'test', ssl: false },
    jwt: { secret: 'test-jwt-secret-32-chars-minimum!', expiresIn: '1h' },
    hmac: { secret: 'test-hmac-secret' },
    webhook: { secret: 'test-webhook-secret', allowedSources: ['qwickservices'] },
    shadowMode: false,
    enforcementKillSwitch: false,
    scoringModel: '5-component' as const,
    logLevel: 'error',
    dashboardUrl: 'http://localhost:3000',
    openai: { apiKey: '', model: 'gpt-4o-mini' },
    rateLimit: { windowMs: 60000, max: 10000, aiMax: 10000, writeMax: 10000 },
    redis: { url: '' },
    eventBusBackend: 'memory' as const,
  },
}));

vi.mock('../../src/events/redis', () => ({
  getRedisClient: vi.fn(),
  closeRedis: vi.fn().mockResolvedValue(undefined),
  isRedisAvailable: () => false,
  testRedisConnection: () => Promise.resolve(false),
}));

// ─── Imports ─────────────────────────────────────────────────────

import { evaluateConditions, RuleContext } from '../../src/rules/conditions';
import { evaluateRules, buildRuleContext, DetectionRule, RuleAction } from '../../src/rules';
import { evaluateTrigger, getEnforcementHistory, ActionType } from '../../src/enforcement/triggers';

beforeEach(() => {
  mockQuery.mockReset();
});

// ─── Pipeline Step 1: Condition Evaluation ──────────────────────

describe('Pipeline Step 1: Condition Evaluation', () => {
  const ctx: RuleContext = {
    score: 82,
    tier: 'high',
    signal_count_24h: 6,
    enforcement_count_30d: 1,
    user_type: 'client',
    service_category: 'cleaning',
    event_type: 'message.created',
    has_active_restriction: false,
    pattern_flags: ['ESCALATION_PATTERN', 'obfuscation_detected'],
    total_enforcement_actions: 2,
  };

  it('evaluates complex nested conditions for high-risk user', () => {
    const conditions = {
      all: [
        { field: 'score', operator: 'gte' as const, value: 70 },
        {
          any: [
            { field: 'signal_count_24h', operator: 'gte' as const, value: 5 },
            { field: 'pattern_flags', operator: 'contains' as const, value: 'ESCALATION_PATTERN' },
          ],
        },
        { field: 'has_active_restriction', operator: 'eq' as const, value: false },
      ],
    };
    expect(evaluateConditions(conditions, ctx)).toBe(true);
  });

  it('correctly rejects a low-risk user with same conditions', () => {
    const lowRiskCtx: RuleContext = {
      ...ctx,
      score: 25,
      tier: 'low',
      signal_count_24h: 1,
      pattern_flags: [],
    };
    const conditions = {
      all: [
        { field: 'score', operator: 'gte' as const, value: 70 },
        { field: 'signal_count_24h', operator: 'gte' as const, value: 5 },
      ],
    };
    expect(evaluateConditions(conditions, lowRiskCtx)).toBe(false);
  });
});

// ─── Pipeline Step 2: Trigger Evaluation ────────────────────────

describe('Pipeline Step 2: Trigger Evaluation', () => {
  it('evaluates enforcement trigger for high-risk tier', () => {
    const history = {
      totalActions: 1,
      recentActions: 1,
      lastActionType: 'soft_warning' as const,
      sameTypeViolations: 1,
      hasActiveRestriction: false,
    };

    const result = evaluateTrigger('high', history, ['ESCALATION_PATTERN']);
    // High tier + ESCALATION_PATTERN → evasion branch → temporary_restriction + admin review
    expect(result.action).toBe(ActionType.TEMPORARY_RESTRICTION);
    expect(result.requiresHumanApproval).toBe(true);
  });

  it('escalates to restriction for repeat offenders', () => {
    const history = {
      totalActions: 3,
      recentActions: 2,
      lastActionType: 'hard_warning' as const,
      sameTypeViolations: 2,
      hasActiveRestriction: false,
    };

    const result = evaluateTrigger('high', history, ['ESCALATION_PATTERN']);
    // High tier + ESCALATION_PATTERN + recentActions>=2 → evasion branch → admin review required
    expect(result.action).toBe(ActionType.TEMPORARY_RESTRICTION);
    expect(result.requiresHumanApproval).toBe(true);
  });
});

// ─── Pipeline Step 3: Rules Engine ──────────────────────────────

describe('Pipeline Step 3: Rules Engine Integration', () => {
  const baseContext: RuleContext = {
    score: 82,
    tier: 'high',
    signal_count_24h: 6,
    enforcement_count_30d: 1,
    user_type: 'client',
    service_category: 'cleaning',
    event_type: 'message.created',
    has_active_restriction: false,
    pattern_flags: ['ESCALATION_PATTERN'],
    total_enforcement_actions: 2,
  };

  function makeRule(overrides: Partial<DetectionRule> = {}): DetectionRule {
    return {
      id: '00000000-0000-4000-8000-000000000100',
      name: 'Test Rule',
      description: 'Test',
      rule_type: 'enforcement_trigger',
      trigger_event_types: ['message.created'],
      conditions: { all: [{ field: 'score', operator: 'gte', value: 50 }] } as unknown,
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

  it('enforcement rule overrides hardcoded trigger', async () => {
    const rule = makeRule({
      actions: [{ type: 'create_enforcement', action_type: 'account_suspension' }],
    });
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules([rule], baseContext, '00000000-0000-4000-8000-000000000010');
    expect(result.enforcementOverride).not.toBeNull();
    expect(result.enforcementOverride!.action).toBe('account_suspension');
  });

  it('dry-run rule does not override', async () => {
    const rule = makeRule({ dry_run: true });
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules([rule], baseContext, '00000000-0000-4000-8000-000000000010');
    expect(result.enforcementOverride).toBeNull();
    expect(result.dryRunMatches).toContain(rule.id);
  });

  it('alert rule queues alert creation', async () => {
    const alertRule = makeRule({
      rule_type: 'alert_threshold',
      actions: [{ type: 'create_alert', priority: 'high' }],
    });
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules([alertRule], baseContext, '00000000-0000-4000-8000-000000000010');
    expect(result.alertsToCreate).toHaveLength(1);
    expect(result.alertsToCreate[0].priority).toBe('high');
  });

  it('scoring rule queues adjustment', async () => {
    const scoreRule = makeRule({
      rule_type: 'scoring_adjustment',
      actions: [{ type: 'adjust_score', delta: 15 }],
    });
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules([scoreRule], baseContext, '00000000-0000-4000-8000-000000000010');
    expect(result.scoreAdjustments).toEqual([15]);
  });

  it('detection rule queues signal', async () => {
    const detRule = makeRule({
      rule_type: 'detection',
      actions: [{ type: 'create_signal', signal_type: 'CUSTOM_ESCALATION' }],
    });
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules([detRule], baseContext, '00000000-0000-4000-8000-000000000010');
    expect(result.signalsToCreate).toHaveLength(1);
    expect(result.signalsToCreate[0].signal_type).toBe('CUSTOM_ESCALATION');
  });
});

// ─── Pipeline Step 4: buildRuleContext ──────────────────────────

describe('Pipeline Step 4: buildRuleContext', () => {
  it('builds context from pipeline data + DB queries', async () => {
    // signal count query
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '12' }] });
    // user data query
    mockQuery.mockResolvedValueOnce({ rows: [{ user_type: 'provider', service_category: 'electrical' }] });

    const ctx = await buildRuleContext(
      '00000000-0000-4000-8000-000000000010',
      78,
      'high',
      {
        totalActions: 3,
        recentActions: 2,
        lastActionType: 'hard_warning',
        sameTypeViolations: 1,
        hasActiveRestriction: false,
      },
      ['PATTERN_A', 'PATTERN_B'],
      'booking.created',
    );

    expect(ctx.score).toBe(78);
    expect(ctx.tier).toBe('high');
    expect(ctx.signal_count_24h).toBe(12);
    expect(ctx.enforcement_count_30d).toBe(2);
    expect(ctx.user_type).toBe('provider');
    expect(ctx.service_category).toBe('electrical');
    expect(ctx.event_type).toBe('booking.created');
    expect(ctx.has_active_restriction).toBe(false);
    expect(ctx.pattern_flags).toEqual(['PATTERN_A', 'PATTERN_B']);
    expect(ctx.total_enforcement_actions).toBe(3);
  });
});

// ─── Pipeline E2E: Full Sequence ─────────────────────────────────

describe('Pipeline E2E: Complete Flow', () => {
  it('full cycle: context → conditions → rules → results', async () => {
    // 1. Build context
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '8' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ user_type: 'client', service_category: 'cleaning' }] });

    const ctx = await buildRuleContext(
      '00000000-0000-4000-8000-000000000010',
      85,
      'critical',
      {
        totalActions: 5,
        recentActions: 3,
        lastActionType: 'temporary_restriction',
        sameTypeViolations: 2,
        hasActiveRestriction: false,
      },
      ['ESCALATION_PATTERN', 'obfuscation_detected'],
      'message.created',
    );

    // 2. Verify context
    expect(ctx.score).toBe(85);
    expect(ctx.tier).toBe('critical');

    // 3. Define rules (enforcement + alert + scoring)
    const rules: DetectionRule[] = [
      {
        id: '00000000-0000-4000-8000-000000000301',
        name: 'Critical enforcement',
        description: '',
        rule_type: 'enforcement_trigger',
        trigger_event_types: ['message.created'],
        conditions: {
          all: [
            { field: 'tier', operator: 'in', value: ['critical', 'high'] },
            { field: 'score', operator: 'gte', value: 80 },
          ],
        } as unknown,
        actions: [{ type: 'create_enforcement', action_type: 'account_suspension' }] as RuleAction[],
        priority: 10,
        enabled: true,
        dry_run: false,
        created_by: '00000000-0000-4000-8000-000000000001',
        version: 1,
        previous_version_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '00000000-0000-4000-8000-000000000302',
        name: 'High risk alert',
        description: '',
        rule_type: 'alert_threshold',
        trigger_event_types: ['message.created'],
        conditions: { all: [{ field: 'score', operator: 'gte', value: 70 }] } as unknown,
        actions: [{ type: 'create_alert', priority: 'critical' }] as RuleAction[],
        priority: 20,
        enabled: true,
        dry_run: false,
        created_by: '00000000-0000-4000-8000-000000000001',
        version: 1,
        previous_version_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '00000000-0000-4000-8000-000000000303',
        name: 'Score bump',
        description: '',
        rule_type: 'scoring_adjustment',
        trigger_event_types: ['message.created'],
        conditions: {
          all: [
            { field: 'pattern_flags', operator: 'contains', value: 'ESCALATION_PATTERN' },
          ],
        } as unknown,
        actions: [{ type: 'adjust_score', delta: 10 }] as RuleAction[],
        priority: 30,
        enabled: true,
        dry_run: false,
        created_by: '00000000-0000-4000-8000-000000000001',
        version: 1,
        previous_version_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // 4. Evaluate rules (logRuleMatch inserts)
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules(rules, ctx, '00000000-0000-4000-8000-000000000010');

    // 5. Verify complete result
    expect(result.matchedRules).toHaveLength(3);

    // Enforcement override from first rule
    expect(result.enforcementOverride).not.toBeNull();
    expect(result.enforcementOverride!.action).toBe('account_suspension');

    // Alert from second rule
    expect(result.alertsToCreate).toHaveLength(1);
    expect(result.alertsToCreate[0].priority).toBe('critical');
    expect(result.alertsToCreate[0].source).toBe('rule_engine');

    // Score adjustment from third rule
    expect(result.scoreAdjustments).toEqual([10]);

    // No dry runs
    expect(result.dryRunMatches).toHaveLength(0);
  });

  it('mixed active and dry-run rules process correctly', async () => {
    const ctx: RuleContext = {
      score: 60,
      tier: 'medium',
      signal_count_24h: 3,
      enforcement_count_30d: 0,
      user_type: 'provider',
      service_category: null,
      event_type: 'booking.created',
      has_active_restriction: false,
      pattern_flags: [],
      total_enforcement_actions: 0,
    };

    const rules: DetectionRule[] = [
      {
        id: '00000000-0000-4000-8000-000000000401',
        name: 'Active rule',
        description: '',
        rule_type: 'alert_threshold',
        trigger_event_types: ['booking.created'],
        conditions: { all: [{ field: 'score', operator: 'gte', value: 50 }] } as unknown,
        actions: [{ type: 'create_alert', priority: 'medium' }] as RuleAction[],
        priority: 10,
        enabled: true,
        dry_run: false,
        created_by: '00000000-0000-4000-8000-000000000001',
        version: 1,
        previous_version_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '00000000-0000-4000-8000-000000000402',
        name: 'Dry-run enforcement',
        description: '',
        rule_type: 'enforcement_trigger',
        trigger_event_types: ['booking.created'],
        conditions: { all: [{ field: 'score', operator: 'gte', value: 50 }] } as unknown,
        actions: [{ type: 'create_enforcement', action_type: 'hard_warning' }] as RuleAction[],
        priority: 20,
        enabled: true,
        dry_run: true,
        created_by: '00000000-0000-4000-8000-000000000001',
        version: 1,
        previous_version_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockQuery.mockResolvedValue({ rows: [] });

    const result = await evaluateRules(rules, ctx, '00000000-0000-4000-8000-000000000010');

    // Active rule matched
    expect(result.matchedRules).toHaveLength(1);
    expect(result.alertsToCreate).toHaveLength(1);

    // Dry-run rule matched but did not execute
    expect(result.dryRunMatches).toHaveLength(1);
    expect(result.dryRunMatches[0]).toBe('00000000-0000-4000-8000-000000000402');

    // No enforcement override (dry-run rule doesn't execute)
    expect(result.enforcementOverride).toBeNull();
  });
});
