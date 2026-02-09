import { describe, it, expect } from 'vitest';
import {
  calculateTrustScore,
  computeOperationalScore,
  computeBehavioralScore,
  computeNetworkScore,
} from '../../src/scoring/trust-score';
import { assignTier, determineTrend, RiskTier, TrendDirection } from '../../src/scoring/tiers';
import { applyTimeDecay } from '../../src/scoring/aggregator';

describe('Scoring: Trust Score', () => {
  it('calculates weighted trust score', () => {
    const result = calculateTrustScore({
      operational: 50,
      behavioral: 50,
      network: 50,
    });
    // 0.30*50 + 0.40*50 + 0.30*50 = 50
    expect(result.score).toBe(50);
  });

  it('weights behavioral higher than operational/network', () => {
    const high_behavioral = calculateTrustScore({
      operational: 0, behavioral: 100, network: 0,
    });
    const high_operational = calculateTrustScore({
      operational: 100, behavioral: 0, network: 0,
    });
    // behavioral: 0.40*100 = 40, operational: 0.30*100 = 30
    expect(high_behavioral.score).toBeGreaterThan(high_operational.score);
  });

  it('returns 0 when all inputs are 0', () => {
    const result = calculateTrustScore({ operational: 0, behavioral: 0, network: 0 });
    expect(result.score).toBe(0);
  });

  it('returns 100 when all inputs are 100', () => {
    const result = calculateTrustScore({ operational: 100, behavioral: 100, network: 100 });
    expect(result.score).toBe(100);
  });
});

describe('Scoring: Operational Score', () => {
  it('returns 0 for clean user with full escrow usage', () => {
    const score = computeOperationalScore({
      escrowUsageRatio: 1.0,
      recentCancellations: 0,
      recentTransactions: 10,
      offPlatformPaymentAttempts: 0,
    });
    expect(score).toBe(0);
  });

  it('increases with escrow avoidance', () => {
    const score = computeOperationalScore({
      escrowUsageRatio: 0.0,
      recentCancellations: 0,
      recentTransactions: 10,
      offPlatformPaymentAttempts: 0,
    });
    expect(score).toBeGreaterThan(0);
  });

  it('increases with off-platform payment attempts', () => {
    const score = computeOperationalScore({
      escrowUsageRatio: 1.0,
      recentCancellations: 0,
      recentTransactions: 10,
      offPlatformPaymentAttempts: 3,
    });
    expect(score).toBeGreaterThan(0);
  });
});

describe('Scoring: Behavioral Score', () => {
  it('returns 0 for user with no signals', () => {
    const score = computeBehavioralScore({
      recentSignalCount: 0,
      uniqueSignalTypes: 0,
      isEscalating: false,
      repeatedViolationCount: 0,
      obfuscationAttempts: 0,
    });
    expect(score).toBe(0);
  });

  it('increases with obfuscation attempts', () => {
    const clean = computeBehavioralScore({
      recentSignalCount: 1, uniqueSignalTypes: 1,
      isEscalating: false, repeatedViolationCount: 0, obfuscationAttempts: 0,
    });
    const obfuscated = computeBehavioralScore({
      recentSignalCount: 1, uniqueSignalTypes: 1,
      isEscalating: false, repeatedViolationCount: 0, obfuscationAttempts: 3,
    });
    expect(obfuscated).toBeGreaterThan(clean);
  });

  it('escalation pattern adds significant risk', () => {
    const stable = computeBehavioralScore({
      recentSignalCount: 3, uniqueSignalTypes: 2,
      isEscalating: false, repeatedViolationCount: 0, obfuscationAttempts: 0,
    });
    const escalating = computeBehavioralScore({
      recentSignalCount: 3, uniqueSignalTypes: 2,
      isEscalating: true, repeatedViolationCount: 0, obfuscationAttempts: 0,
    });
    expect(escalating).toBeGreaterThan(stable);
  });
});

describe('Scoring: Risk Tier Assignment', () => {
  it('assigns monitor tier for low scores', () => {
    expect(assignTier(10)).toBe(RiskTier.MONITOR);
  });

  it('assigns low tier for scores 20-39', () => {
    expect(assignTier(25)).toBe(RiskTier.LOW);
  });

  it('assigns medium tier for scores 40-59', () => {
    expect(assignTier(50)).toBe(RiskTier.MEDIUM);
  });

  it('assigns high tier for scores 60-79', () => {
    expect(assignTier(70)).toBe(RiskTier.HIGH);
  });

  it('assigns critical tier for scores 80+', () => {
    expect(assignTier(90)).toBe(RiskTier.CRITICAL);
  });
});

describe('Scoring: Trend Detection', () => {
  it('detects escalating trend', () => {
    expect(determineTrend([20, 30, 45])).toBe(TrendDirection.ESCALATING);
  });

  it('detects decaying trend', () => {
    expect(determineTrend([60, 45, 30])).toBe(TrendDirection.DECAYING);
  });

  it('detects stable trend', () => {
    expect(determineTrend([50, 51, 50])).toBe(TrendDirection.STABLE);
  });

  it('returns stable for single score', () => {
    expect(determineTrend([50])).toBe(TrendDirection.STABLE);
  });
});

describe('Scoring: Time Decay', () => {
  it('returns full value for recent signal', () => {
    const value = applyTimeDecay(1.0, 0);
    expect(value).toBeCloseTo(1.0);
  });

  it('decays to ~0.5 at half-life', () => {
    const halfLifeMs = 14 * 24 * 60 * 60 * 1000; // 14 days
    const value = applyTimeDecay(1.0, halfLifeMs);
    expect(value).toBeCloseTo(0.5, 1);
  });

  it('decays significantly after 30 days', () => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const value = applyTimeDecay(1.0, thirtyDaysMs);
    expect(value).toBeLessThan(0.3);
  });
});
