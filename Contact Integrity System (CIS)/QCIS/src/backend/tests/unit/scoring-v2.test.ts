import { describe, it, expect } from 'vitest';
import {
  computeBehavioralScoreV2,
  computeFinancialScore,
  computeCommunicationScore,
  computeHistoricalScore,
  computeKYCScore,
  calculateTrustScoreV2,
  type BehavioralInputsV2,
  type FinancialInputs,
  type CommunicationInputs,
  type HistoricalInputs,
  type KYCInputs,
  type TrustScoreFactorsV2,
} from '../../src/scoring/trust-score-v2';
import { assignTier, RiskTier } from '../../src/scoring/tiers';

// ─── Behavioral (0-25) ─────────────────────────────────────

describe('V2 Scoring: Behavioral Component', () => {
  const clean: BehavioralInputsV2 = {
    booking_cancellation_rate: 0,
    booking_time_anomaly_count: 0,
    dormant_reactivated: false,
    activity_burst_count: 0,
  };

  it('returns 0 for clean inputs', () => {
    expect(computeBehavioralScoreV2(clean)).toBe(0);
  });

  it('caps at 25', () => {
    const maxed: BehavioralInputsV2 = {
      booking_cancellation_rate: 1.0,
      booking_time_anomaly_count: 20,
      dormant_reactivated: true,
      activity_burst_count: 20,
    };
    expect(computeBehavioralScoreV2(maxed)).toBe(25);
  });

  it('cancellation rate contributes up to 12', () => {
    const score = computeBehavioralScoreV2({ ...clean, booking_cancellation_rate: 1.0 });
    expect(score).toBe(12);
  });

  it('time anomaly contributes up to 10', () => {
    const score = computeBehavioralScoreV2({ ...clean, booking_time_anomaly_count: 10 });
    expect(score).toBe(10);
  });

  it('dormant reactivation adds 5', () => {
    const score = computeBehavioralScoreV2({ ...clean, dormant_reactivated: true });
    expect(score).toBe(5);
  });

  it('activity burst contributes up to 8', () => {
    const score = computeBehavioralScoreV2({ ...clean, activity_burst_count: 10 });
    expect(score).toBe(8);
  });
});

// ─── Financial (0-25) ──────────────────────────────────────

describe('V2 Scoring: Financial Component', () => {
  const clean: FinancialInputs = {
    off_platform_payment_signals: 0,
    circular_payment_count: 0,
    rapid_topup_count: 0,
    split_transaction_count: 0,
    withdrawal_to_deposit_ratio: 0,
  };

  it('returns 0 for clean inputs', () => {
    expect(computeFinancialScore(clean)).toBe(0);
  });

  it('caps at 25', () => {
    const maxed: FinancialInputs = {
      off_platform_payment_signals: 10,
      circular_payment_count: 5,
      rapid_topup_count: 10,
      split_transaction_count: 10,
      withdrawal_to_deposit_ratio: 5,
    };
    expect(computeFinancialScore(maxed)).toBe(25);
  });

  it('circular detection contributes up to 8', () => {
    const score = computeFinancialScore({ ...clean, circular_payment_count: 5 });
    expect(score).toBe(8);
  });

  it('withdrawal ratio threshold at 2', () => {
    const below = computeFinancialScore({ ...clean, withdrawal_to_deposit_ratio: 1.9 });
    const above = computeFinancialScore({ ...clean, withdrawal_to_deposit_ratio: 2.1 });
    expect(below).toBe(0);
    expect(above).toBe(5);
  });

  it('off-platform signals contribute up to 10', () => {
    const score = computeFinancialScore({ ...clean, off_platform_payment_signals: 3 });
    expect(score).toBe(10); // min(3*5, 10) = 10
  });

  it('split transactions contribute up to 6', () => {
    const score = computeFinancialScore({ ...clean, split_transaction_count: 2 });
    expect(score).toBe(6); // min(2*4, 6) = 6
  });
});

// ─── Communication (0-20) ──────────────────────────────────

describe('V2 Scoring: Communication Component', () => {
  const clean: CommunicationInputs = {
    contact_signal_count: 0,
    obfuscation_attempt_count: 0,
    grooming_signal_count: 0,
    off_platform_intent_count: 0,
    escalation_pattern: false,
  };

  it('returns 0 for clean inputs', () => {
    expect(computeCommunicationScore(clean)).toBe(0);
  });

  it('caps at 20', () => {
    const maxed: CommunicationInputs = {
      contact_signal_count: 10,
      obfuscation_attempt_count: 10,
      grooming_signal_count: 10,
      off_platform_intent_count: 10,
      escalation_pattern: true,
    };
    expect(computeCommunicationScore(maxed)).toBe(20);
  });

  it('escalation adds 4', () => {
    const without = computeCommunicationScore(clean);
    const with_ = computeCommunicationScore({ ...clean, escalation_pattern: true });
    expect(with_ - without).toBe(4);
  });

  it('obfuscation contributes up to 8', () => {
    const score = computeCommunicationScore({ ...clean, obfuscation_attempt_count: 3 });
    expect(score).toBe(8); // min(3*4, 8) = 8
  });

  it('grooming signals contribute up to 6', () => {
    const score = computeCommunicationScore({ ...clean, grooming_signal_count: 2 });
    expect(score).toBe(6); // min(2*3, 6) = 6
  });
});

// ─── Historical (0-20) ─────────────────────────────────────

describe('V2 Scoring: Historical Component', () => {
  const clean: HistoricalInputs = {
    provider_completion_rate: 1.0,
    customer_dispute_rate: 0,
    enforcement_history_count: 0,
    appeal_denied_count: 0,
    repeat_offense_same_type: 0,
    is_provider: false,
  };

  it('returns 0 for clean non-provider', () => {
    expect(computeHistoricalScore(clean)).toBe(0);
  });

  it('caps at 20', () => {
    const maxed: HistoricalInputs = {
      provider_completion_rate: 0,
      customer_dispute_rate: 1.0,
      enforcement_history_count: 10,
      appeal_denied_count: 10,
      repeat_offense_same_type: 10,
      is_provider: true,
    };
    expect(computeHistoricalScore(maxed)).toBe(20);
  });

  it('provider completion penalty applies only to providers', () => {
    const nonProvider = computeHistoricalScore({ ...clean, provider_completion_rate: 0.5, is_provider: false });
    const provider = computeHistoricalScore({ ...clean, provider_completion_rate: 0.5, is_provider: true });
    expect(nonProvider).toBe(0);
    expect(provider).toBe(5); // (1-0.5)*10 = 5
  });

  it('ignores completion rate for non-providers', () => {
    const score = computeHistoricalScore({ ...clean, provider_completion_rate: 0 });
    expect(score).toBe(0);
  });

  it('enforcement history contributes up to 8', () => {
    const score = computeHistoricalScore({ ...clean, enforcement_history_count: 5 });
    expect(score).toBe(8); // min(5*3, 8) = 8
  });
});

// ─── KYC (0-10, inverse) ───────────────────────────────────

describe('V2 Scoring: KYC Component', () => {
  it('returns 10 for unverified new account with empty profile', () => {
    const score = computeKYCScore({
      verification_status: 'unverified',
      account_age_days: 0,
      profile_completeness: 0,
    });
    expect(score).toBe(10);
  });

  it('returns 0 for verified, established, complete profile', () => {
    const score = computeKYCScore({
      verification_status: 'verified',
      account_age_days: 365,
      profile_completeness: 0.9,
    });
    expect(score).toBe(0);
  });

  it('pending verification reduces by 2', () => {
    const unverified = computeKYCScore({ verification_status: 'unverified', account_age_days: 0, profile_completeness: 0 });
    const pending = computeKYCScore({ verification_status: 'pending', account_age_days: 0, profile_completeness: 0 });
    expect(unverified - pending).toBe(2);
  });

  it('verified reduces by 5', () => {
    const unverified = computeKYCScore({ verification_status: 'unverified', account_age_days: 0, profile_completeness: 0 });
    const verified = computeKYCScore({ verification_status: 'verified', account_age_days: 0, profile_completeness: 0 });
    expect(unverified - verified).toBe(5);
  });

  it('account age >180 days reduces by 3', () => {
    const fresh = computeKYCScore({ verification_status: 'unverified', account_age_days: 5, profile_completeness: 0 });
    const old = computeKYCScore({ verification_status: 'unverified', account_age_days: 200, profile_completeness: 0 });
    expect(fresh - old).toBe(3);
  });

  it('account age 31-180 reduces by 1', () => {
    const fresh = computeKYCScore({ verification_status: 'unverified', account_age_days: 5, profile_completeness: 0 });
    const mid = computeKYCScore({ verification_status: 'unverified', account_age_days: 60, profile_completeness: 0 });
    expect(fresh - mid).toBe(1);
  });

  it('profile >0.8 completeness reduces by 2', () => {
    const incomplete = computeKYCScore({ verification_status: 'unverified', account_age_days: 0, profile_completeness: 0.5 });
    const complete = computeKYCScore({ verification_status: 'unverified', account_age_days: 0, profile_completeness: 0.9 });
    expect(incomplete - complete).toBe(2);
  });

  it('never goes below 0', () => {
    const score = computeKYCScore({
      verification_status: 'verified',
      account_age_days: 999,
      profile_completeness: 1.0,
    });
    expect(score).toBe(0);
  });
});

// ─── Master Calculator ─────────────────────────────────────

describe('V2 Scoring: Master Calculator', () => {
  function makeFactors(overrides?: Partial<Record<keyof TrustScoreFactorsV2, number>>): TrustScoreFactorsV2 {
    return {
      behavioral: {
        score: overrides?.behavioral ?? 0,
        inputs: { booking_cancellation_rate: 0, booking_time_anomaly_count: 0, dormant_reactivated: false, activity_burst_count: 0 },
      },
      financial: {
        score: overrides?.financial ?? 0,
        inputs: { off_platform_payment_signals: 0, circular_payment_count: 0, rapid_topup_count: 0, split_transaction_count: 0, withdrawal_to_deposit_ratio: 0 },
      },
      communication: {
        score: overrides?.communication ?? 0,
        inputs: { contact_signal_count: 0, obfuscation_attempt_count: 0, grooming_signal_count: 0, off_platform_intent_count: 0, escalation_pattern: false },
      },
      historical: {
        score: overrides?.historical ?? 0,
        inputs: { provider_completion_rate: 1, customer_dispute_rate: 0, enforcement_history_count: 0, appeal_denied_count: 0, repeat_offense_same_type: 0, is_provider: false },
      },
      kyc: {
        score: overrides?.kyc ?? 0,
        inputs: { verification_status: 'verified', account_age_days: 365, profile_completeness: 1 },
      },
    };
  }

  it('all components sum to max 100', () => {
    const factors = makeFactors({ behavioral: 25, financial: 25, communication: 20, historical: 20, kyc: 10 });
    const result = calculateTrustScoreV2(factors);
    expect(result.score).toBe(100);
  });

  it('returns 0 when all components are 0', () => {
    const factors = makeFactors();
    const result = calculateTrustScoreV2(factors);
    expect(result.score).toBe(0);
  });

  it('partial sums are correct', () => {
    const factors = makeFactors({ behavioral: 10, financial: 5, communication: 3, historical: 2, kyc: 7 });
    const result = calculateTrustScoreV2(factors);
    expect(result.score).toBe(27);
  });

  it('preserves factors in result', () => {
    const factors = makeFactors({ behavioral: 12 });
    const result = calculateTrustScoreV2(factors);
    expect(result.factors.behavioral.score).toBe(12);
  });
});

// ─── Tier Assignment (unchanged thresholds) ────────────────

describe('V2 Scoring: Tier Assignment', () => {
  it('V2 score 15 → monitor tier', () => {
    expect(assignTier(15)).toBe(RiskTier.MONITOR);
  });

  it('V2 score 35 → low tier', () => {
    expect(assignTier(35)).toBe(RiskTier.LOW);
  });

  it('V2 score 55 → medium tier', () => {
    expect(assignTier(55)).toBe(RiskTier.MEDIUM);
  });

  it('V2 score 75 → high tier', () => {
    expect(assignTier(75)).toBe(RiskTier.HIGH);
  });

  it('V2 score 90 → critical tier', () => {
    expect(assignTier(90)).toBe(RiskTier.CRITICAL);
  });
});
