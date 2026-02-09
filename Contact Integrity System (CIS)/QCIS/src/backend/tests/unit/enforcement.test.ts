import { describe, it, expect } from 'vitest';
import { evaluateTrigger, ActionType } from '../../src/enforcement/triggers';
import { RiskTier } from '../../src/scoring/tiers';

describe('Enforcement: Trigger Evaluation', () => {
  const emptyHistory = {
    totalActions: 0,
    recentActions: 0,
    lastActionType: null,
    sameTypeViolations: 0,
    hasActiveRestriction: false,
  };

  describe('Monitor Tier', () => {
    it('takes no action for monitor tier', () => {
      const result = evaluateTrigger(RiskTier.MONITOR, emptyHistory, []);
      expect(result.action).toBeNull();
    });
  });

  describe('Low Tier', () => {
    it('issues soft warning for first offense', () => {
      const result = evaluateTrigger(RiskTier.LOW, emptyHistory, []);
      expect(result.action).toBe(ActionType.SOFT_WARNING);
      expect(result.requiresHumanApproval).toBe(false);
    });

    it('issues hard warning for repeat offenses', () => {
      const result = evaluateTrigger(RiskTier.LOW, {
        ...emptyHistory, recentActions: 1, totalActions: 1,
      }, []);
      expect(result.action).toBe(ActionType.HARD_WARNING);
    });
  });

  describe('Medium Tier', () => {
    it('issues hard warning for first medium violation', () => {
      const result = evaluateTrigger(RiskTier.MEDIUM, emptyHistory, []);
      expect(result.action).toBe(ActionType.HARD_WARNING);
      expect(result.requiresHumanApproval).toBe(false);
    });

    it('issues temporary restriction for 3rd+ violation', () => {
      const result = evaluateTrigger(RiskTier.MEDIUM, {
        ...emptyHistory, recentActions: 2, totalActions: 3,
      }, []);
      expect(result.action).toBe(ActionType.TEMPORARY_RESTRICTION);
      expect(result.effectiveDurationHours).toBe(24);
    });
  });

  describe('High Tier', () => {
    it('escalates to admin for first high-tier offense', () => {
      const result = evaluateTrigger(RiskTier.HIGH, emptyHistory, []);
      expect(result.action).toBe(ActionType.ADMIN_ESCALATION);
      expect(result.requiresHumanApproval).toBe(true);
    });

    it('applies temporary restriction with evasion pattern', () => {
      const result = evaluateTrigger(RiskTier.HIGH, emptyHistory, ['ESCALATION_PATTERN']);
      expect(result.action).toBe(ActionType.TEMPORARY_RESTRICTION);
      expect(result.requiresHumanApproval).toBe(true);
      expect(result.effectiveDurationHours).toBe(72);
    });
  });

  describe('Critical Tier', () => {
    it('suspends account with human review requirement', () => {
      const result = evaluateTrigger(RiskTier.CRITICAL, emptyHistory, []);
      expect(result.action).toBe(ActionType.ACCOUNT_SUSPENSION);
      expect(result.requiresHumanApproval).toBe(true);
    });

    it('NEVER issues permanent ban automatically', () => {
      const result = evaluateTrigger(RiskTier.CRITICAL, {
        ...emptyHistory, totalActions: 10, recentActions: 5,
      }, ['ESCALATION_PATTERN']);
      // Should be suspension, NOT permanent ban
      expect(result.action).toBe(ActionType.ACCOUNT_SUSPENSION);
      expect(result.action).not.toBe('permanent_ban');
    });
  });

  describe('Hard Constraints', () => {
    it('all high/critical actions require human approval', () => {
      for (const tier of [RiskTier.HIGH, RiskTier.CRITICAL]) {
        const result = evaluateTrigger(tier, emptyHistory, []);
        expect(result.requiresHumanApproval).toBe(true);
      }
    });

    it('all actions include a reason code', () => {
      for (const tier of [RiskTier.LOW, RiskTier.MEDIUM, RiskTier.HIGH, RiskTier.CRITICAL]) {
        const result = evaluateTrigger(tier, emptyHistory, []);
        expect(result.reasonCode).toBeTruthy();
        expect(result.reason).toBeTruthy();
      }
    });
  });
});
