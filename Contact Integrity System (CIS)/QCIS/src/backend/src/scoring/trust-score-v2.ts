// QwickServices CIS — Five-Component Additive Trust Score (V2)
// CIS_Trust_Score = Behavioral(0-25) + Financial(0-25) + Communication(0-20)
//                 + Historical(0-20) + KYC(0-10) = 0-100
// All functions are pure (no DB calls) for easy unit testing.
// Higher score = more risk (same semantics as V1).

import { clamp } from '../shared/utils';

// ─── Generic Component Wrapper ──────────────────────────────

export interface ComponentScore<T> {
  score: number;
  inputs: T;
}

// ─── Aggregate Result ───────────────────────────────────────

export interface TrustScoreFactorsV2 {
  behavioral: ComponentScore<BehavioralInputsV2>;
  financial: ComponentScore<FinancialInputs>;
  communication: ComponentScore<CommunicationInputs>;
  historical: ComponentScore<HistoricalInputs>;
  kyc: ComponentScore<KYCInputs>;
}

export interface TrustScoreResultV2 {
  score: number;
  factors: TrustScoreFactorsV2;
}

// ─── Behavioral (0-25) ─────────────────────────────────────

export interface BehavioralInputsV2 {
  /** Booking cancellation rate over 30d (0-1) */
  booking_cancellation_rate: number;
  /** Booking time anomaly count over 7d */
  booking_time_anomaly_count: number;
  /** Whether a dormant account reactivated recently */
  dormant_reactivated: boolean;
  /** Activity burst count over 7d */
  activity_burst_count: number;
}

export function computeBehavioralScoreV2(inputs: BehavioralInputsV2): number {
  const cancel = Math.min(inputs.booking_cancellation_rate * 25, 12);
  const anomaly = Math.min(inputs.booking_time_anomaly_count * 3, 10);
  const dormant = inputs.dormant_reactivated ? 5 : 0;
  const burst = Math.min(inputs.activity_burst_count * 3, 8);
  return clamp(Math.round((cancel + anomaly + dormant + burst) * 100) / 100, 0, 25);
}

// ─── Financial (0-25) ──────────────────────────────────────

export interface FinancialInputs {
  /** Off-platform payment signals over 30d */
  off_platform_payment_signals: number;
  /** Circular payment count over 30d */
  circular_payment_count: number;
  /** Rapid top-up count over 7d */
  rapid_topup_count: number;
  /** Split transaction count over 30d */
  split_transaction_count: number;
  /** Withdrawal-to-deposit ratio over 30d */
  withdrawal_to_deposit_ratio: number;
}

export function computeFinancialScore(inputs: FinancialInputs): number {
  const offPlat = Math.min(inputs.off_platform_payment_signals * 5, 10);
  const circular = Math.min(inputs.circular_payment_count * 8, 8);
  const topup = Math.min(inputs.rapid_topup_count * 3, 6);
  const split = Math.min(inputs.split_transaction_count * 4, 6);
  const ratio = inputs.withdrawal_to_deposit_ratio > 2 ? 5 : 0;
  return clamp(Math.round((offPlat + circular + topup + split + ratio) * 100) / 100, 0, 25);
}

// ─── Communication (0-20) ──────────────────────────────────

export interface CommunicationInputs {
  /** Contact signal count over 7d (time-decayed) */
  contact_signal_count: number;
  /** Obfuscation attempt count over 7d */
  obfuscation_attempt_count: number;
  /** Grooming signal count over 30d */
  grooming_signal_count: number;
  /** Off-platform intent signal count over 7d */
  off_platform_intent_count: number;
  /** Whether an escalation pattern is detected */
  escalation_pattern: boolean;
}

export function computeCommunicationScore(inputs: CommunicationInputs): number {
  const contact = Math.min(inputs.contact_signal_count * 3, 8);
  const obfusc = Math.min(inputs.obfuscation_attempt_count * 4, 8);
  const groom = Math.min(inputs.grooming_signal_count * 3, 6);
  const intent = Math.min(inputs.off_platform_intent_count * 3, 6);
  const escal = inputs.escalation_pattern ? 4 : 0;
  return clamp(Math.round((contact + obfusc + groom + intent + escal) * 100) / 100, 0, 20);
}

// ─── Historical (0-20) ─────────────────────────────────────

export interface HistoricalInputs {
  /** Provider completion rate all-time (0-1, providers only) */
  provider_completion_rate: number;
  /** Customer dispute rate all-time (0-1) */
  customer_dispute_rate: number;
  /** Enforcement history count all-time */
  enforcement_history_count: number;
  /** Appeal denied count all-time */
  appeal_denied_count: number;
  /** Repeat offense of same type within 90d */
  repeat_offense_same_type: number;
  /** Whether this user is a provider */
  is_provider: boolean;
}

export function computeHistoricalScore(inputs: HistoricalInputs): number {
  const completion = inputs.is_provider ? (1 - inputs.provider_completion_rate) * 10 : 0;
  const dispute = Math.min(inputs.customer_dispute_rate * 15, 8);
  const enforce = Math.min(inputs.enforcement_history_count * 3, 8);
  const appeal = Math.min(inputs.appeal_denied_count * 4, 6);
  const repeat = Math.min(inputs.repeat_offense_same_type * 3, 6);
  return clamp(Math.round((completion + dispute + enforce + appeal + repeat) * 100) / 100, 0, 20);
}

// ─── KYC (0-10, inverse: starts at 10, reduces with trust) ─

export interface KYCInputs {
  /** Verification status: unverified | pending | verified */
  verification_status: string;
  /** Account age in days */
  account_age_days: number;
  /** Profile completeness 0-1 */
  profile_completeness: number;
}

export function computeKYCScore(inputs: KYCInputs): number {
  const verifiedReduction =
    inputs.verification_status === 'verified' ? 5 :
    inputs.verification_status === 'pending' ? 2 : 0;
  const ageReduction =
    inputs.account_age_days > 180 ? 3 :
    inputs.account_age_days > 30 ? 1 : 0;
  const completenessReduction = inputs.profile_completeness > 0.8 ? 2 : 0;
  return clamp(10 - verifiedReduction - ageReduction - completenessReduction, 0, 10);
}

// ─── Master Calculator ─────────────────────────────────────

export function calculateTrustScoreV2(factors: TrustScoreFactorsV2): TrustScoreResultV2 {
  const score =
    factors.behavioral.score +
    factors.financial.score +
    factors.communication.score +
    factors.historical.score +
    factors.kyc.score;
  return { score: Math.round(score * 100) / 100, factors };
}
