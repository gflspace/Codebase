// QwickServices CIS — Phase 3B: Contextual Trigger Evaluation Unit Tests

import { describe, it, expect } from 'vitest';
import {
  evaluateTrigger,
  evaluateContextualTrigger,
  eventTypeToContext,
  ActionType,
  EnforcementHistory,
  EventContext,
} from '../../src/enforcement/triggers';
import { RiskTier } from '../../src/scoring/tiers';

// ─── Test Fixtures ──────────────────────────────────────────────

const NO_HISTORY: EnforcementHistory = {
  totalActions: 0,
  recentActions: 0,
  lastActionType: null,
  sameTypeViolations: 0,
  hasActiveRestriction: false,
};

const REPEAT_HISTORY: EnforcementHistory = {
  totalActions: 3,
  recentActions: 3,
  lastActionType: 'hard_warning',
  sameTypeViolations: 2,
  hasActiveRestriction: false,
};

const SINGLE_HISTORY: EnforcementHistory = {
  totalActions: 1,
  recentActions: 1,
  lastActionType: 'soft_warning',
  sameTypeViolations: 0,
  hasActiveRestriction: false,
};

// ─── eventTypeToContext ─────────────────────────────────────────

describe('eventTypeToContext', () => {
  it('maps booking events to booking context', () => {
    expect(eventTypeToContext('booking.created')).toBe('booking');
    expect(eventTypeToContext('booking.cancelled')).toBe('booking');
    expect(eventTypeToContext('booking.no_show')).toBe('booking');
  });

  it('maps wallet and transaction events to payment context', () => {
    expect(eventTypeToContext('wallet.deposit')).toBe('payment');
    expect(eventTypeToContext('wallet.withdrawal')).toBe('payment');
    expect(eventTypeToContext('transaction.initiated')).toBe('payment');
    expect(eventTypeToContext('transaction.completed')).toBe('payment');
  });

  it('maps provider events to provider context', () => {
    expect(eventTypeToContext('provider.registered')).toBe('provider');
    expect(eventTypeToContext('provider.updated')).toBe('provider');
  });

  it('maps message events to message context', () => {
    expect(eventTypeToContext('message.created')).toBe('message');
    expect(eventTypeToContext('message.edited')).toBe('message');
  });

  it('maps unknown events to general context', () => {
    expect(eventTypeToContext('rating.submitted')).toBe('general');
    expect(eventTypeToContext('user.contact_field_changed')).toBe('general');
    expect(eventTypeToContext('unknown.event')).toBe('general');
  });
});

// ─── General context (backward compatibility) ───────────────────

describe('evaluateContextualTrigger — general context', () => {
  it('returns same result as base evaluateTrigger for general context', () => {
    const base = evaluateTrigger(RiskTier.MEDIUM, REPEAT_HISTORY, []);
    const contextual = evaluateContextualTrigger(RiskTier.MEDIUM, REPEAT_HISTORY, [], 'general');
    expect(contextual).toEqual(base);
  });

  it('returns null action for MONITOR tier regardless of context', () => {
    const contexts: EventContext[] = ['booking', 'payment', 'provider', 'message', 'general'];
    for (const ctx of contexts) {
      const result = evaluateContextualTrigger(RiskTier.MONITOR, REPEAT_HISTORY, [], ctx);
      expect(result.action).toBeNull();
    }
  });
});

// ─── Booking context ────────────────────────────────────────────

describe('evaluateContextualTrigger — booking context', () => {
  it('maps HARD_WARNING to BOOKING_FLAGGED', () => {
    // Medium tier, first offense = hard_warning
    const result = evaluateContextualTrigger(RiskTier.MEDIUM, NO_HISTORY, [], 'booking');
    expect(result.action).toBe(ActionType.BOOKING_FLAGGED);
  });

  it('maps TEMPORARY_RESTRICTION to BOOKING_BLOCKED', () => {
    // Medium tier, 3+ offenses = temporary_restriction
    const result = evaluateContextualTrigger(RiskTier.MEDIUM, REPEAT_HISTORY, [], 'booking');
    expect(result.action).toBe(ActionType.BOOKING_BLOCKED);
  });

  it('maps ACCOUNT_SUSPENSION to BOOKING_BLOCKED', () => {
    // Critical tier = account_suspension
    const result = evaluateContextualTrigger(RiskTier.CRITICAL, NO_HISTORY, [], 'booking');
    expect(result.action).toBe(ActionType.BOOKING_BLOCKED);
  });

  it('preserves SOFT_WARNING unchanged in booking context', () => {
    // Low tier, first offense = soft_warning
    const result = evaluateContextualTrigger(RiskTier.LOW, NO_HISTORY, [], 'booking');
    expect(result.action).toBe(ActionType.SOFT_WARNING);
  });
});

// ─── Payment context ────────────────────────────────────────────

describe('evaluateContextualTrigger — payment context', () => {
  it('maps HARD_WARNING to PAYMENT_HELD', () => {
    const result = evaluateContextualTrigger(RiskTier.MEDIUM, NO_HISTORY, [], 'payment');
    expect(result.action).toBe(ActionType.PAYMENT_HELD);
  });

  it('maps TEMPORARY_RESTRICTION to PAYMENT_BLOCKED', () => {
    const result = evaluateContextualTrigger(RiskTier.MEDIUM, REPEAT_HISTORY, [], 'payment');
    expect(result.action).toBe(ActionType.PAYMENT_BLOCKED);
  });

  it('maps ACCOUNT_SUSPENSION to PAYMENT_BLOCKED', () => {
    const result = evaluateContextualTrigger(RiskTier.CRITICAL, NO_HISTORY, [], 'payment');
    expect(result.action).toBe(ActionType.PAYMENT_BLOCKED);
  });
});

// ─── Provider context ───────────────────────────────────────────

describe('evaluateContextualTrigger — provider context', () => {
  it('maps HARD_WARNING to PROVIDER_DEMOTED', () => {
    const result = evaluateContextualTrigger(RiskTier.MEDIUM, NO_HISTORY, [], 'provider');
    expect(result.action).toBe(ActionType.PROVIDER_DEMOTED);
  });

  it('maps TEMPORARY_RESTRICTION to PROVIDER_SUSPENDED', () => {
    const result = evaluateContextualTrigger(RiskTier.MEDIUM, REPEAT_HISTORY, [], 'provider');
    expect(result.action).toBe(ActionType.PROVIDER_SUSPENDED);
  });

  it('maps ACCOUNT_SUSPENSION to PROVIDER_SUSPENDED', () => {
    const result = evaluateContextualTrigger(RiskTier.CRITICAL, NO_HISTORY, [], 'provider');
    expect(result.action).toBe(ActionType.PROVIDER_SUSPENDED);
  });
});

// ─── Message context ────────────────────────────────────────────

describe('evaluateContextualTrigger — message context', () => {
  it('maps repeat HARD_WARNING to MESSAGE_THROTTLED', () => {
    // Low tier, repeat offense = hard_warning with history > 0
    const result = evaluateContextualTrigger(RiskTier.LOW, SINGLE_HISTORY, [], 'message');
    expect(result.action).toBe(ActionType.MESSAGE_THROTTLED);
  });

  it('keeps first-offense HARD_WARNING unchanged (no repeat)', () => {
    // Medium tier, first offense = hard_warning, but metadata.historyCount = 0
    const result = evaluateContextualTrigger(RiskTier.MEDIUM, NO_HISTORY, [], 'message');
    // First hard_warning in message context stays hard_warning (no repeat)
    expect(result.action).toBe(ActionType.HARD_WARNING);
  });

  it('preserves TEMPORARY_RESTRICTION in message context (no override)', () => {
    // Medium tier, 3+ offenses
    const result = evaluateContextualTrigger(RiskTier.MEDIUM, REPEAT_HISTORY, [], 'message');
    expect(result.action).toBe(ActionType.TEMPORARY_RESTRICTION);
  });
});

// ─── Hard constraints ───────────────────────────────────────────

describe('hard constraints', () => {
  it('never produces permanent_ban from automated evaluation', () => {
    const allContexts: EventContext[] = ['booking', 'payment', 'provider', 'message', 'general'];
    const allTiers = [RiskTier.MONITOR, RiskTier.LOW, RiskTier.MEDIUM, RiskTier.HIGH, RiskTier.CRITICAL];

    for (const ctx of allContexts) {
      for (const tier of allTiers) {
        const result = evaluateContextualTrigger(tier, REPEAT_HISTORY, ['ESCALATION_PATTERN'], ctx);
        expect(result.action).not.toBe('permanent_ban');
      }
    }
  });

  it('high tier actions require human approval', () => {
    const result = evaluateContextualTrigger(RiskTier.HIGH, NO_HISTORY, [], 'general');
    expect(result.requiresHumanApproval).toBe(true);
  });

  it('critical tier actions require human approval', () => {
    const result = evaluateContextualTrigger(RiskTier.CRITICAL, NO_HISTORY, [], 'general');
    expect(result.requiresHumanApproval).toBe(true);
  });

  it('MONITOR tier always returns null action regardless of history', () => {
    const result = evaluateContextualTrigger(RiskTier.MONITOR, REPEAT_HISTORY, ['ESCALATION_PATTERN', 'obfuscation'], 'booking');
    expect(result.action).toBeNull();
    expect(result.reasonCode).toBe('MONITOR_ONLY');
  });
});

// ─── Reason and metadata preservation ───────────────────────────

describe('metadata preservation', () => {
  it('preserves reason but overrides reasonCode for context-specific actions', () => {
    const base = evaluateTrigger(RiskTier.MEDIUM, NO_HISTORY, []);
    const contextual = evaluateContextualTrigger(RiskTier.MEDIUM, NO_HISTORY, [], 'booking');
    expect(contextual.reason).toBe(base.reason);
    // Context override sets context-specific reasonCode so notifications map correctly
    expect(contextual.reasonCode).toBe('BOOKING_FLAGGED');
    expect(contextual.metadata).toEqual(base.metadata);
  });

  it('preserves effectiveDurationHours from base evaluation', () => {
    const base = evaluateTrigger(RiskTier.MEDIUM, REPEAT_HISTORY, []);
    const contextual = evaluateContextualTrigger(RiskTier.MEDIUM, REPEAT_HISTORY, [], 'payment');
    expect(contextual.effectiveDurationHours).toBe(base.effectiveDurationHours);
  });
});
