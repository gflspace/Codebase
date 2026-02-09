// QwickServices CIS — Three-Layer Trust Score
// CIS_Trust_Score(u) = 0.30 * Operational + 0.40 * Behavioral + 0.30 * Network
// Hard constraint: scoring NEVER reads raw content

export interface TrustScoreFactors {
  operational: number;  // 0-100
  behavioral: number;   // 0-100
  network: number;      // 0-100
}

export interface TrustScoreResult {
  score: number;        // 0-100 (inverted: higher = more risk)
  factors: TrustScoreFactors;
}

const WEIGHTS = {
  operational: 0.30,
  behavioral: 0.40,
  network: 0.30,
} as const;

/**
 * Calculate the composite trust score from three layers.
 * Score is inverted: 0 = fully trusted, 100 = maximum risk.
 */
export function calculateTrustScore(factors: TrustScoreFactors): TrustScoreResult {
  const score =
    WEIGHTS.operational * factors.operational +
    WEIGHTS.behavioral * factors.behavioral +
    WEIGHTS.network * factors.network;

  return {
    score: Math.round(score * 100) / 100,
    factors,
  };
}

// ─── Layer 1: Operational Integrity (30%) ─────────────────────
// Signals: Escrow avoidance, delivery timing, cancellation frequency, payment channel

export interface OperationalInputs {
  /** Ratio of transactions that used platform escrow (0.0-1.0) */
  escrowUsageRatio: number;
  /** Number of cancellations in last 30 days */
  recentCancellations: number;
  /** Total transactions in last 30 days */
  recentTransactions: number;
  /** Whether the user has used non-platform payment channels */
  offPlatformPaymentAttempts: number;
}

export function computeOperationalScore(inputs: OperationalInputs): number {
  let score = 0;

  // Escrow avoidance: lower usage = higher risk
  if (inputs.recentTransactions > 0) {
    const avoidanceRisk = (1 - inputs.escrowUsageRatio) * 40;
    score += avoidanceRisk;
  }

  // Cancellation rate
  if (inputs.recentTransactions > 0) {
    const cancelRate = inputs.recentCancellations / inputs.recentTransactions;
    score += cancelRate * 30;
  }

  // Off-platform payment attempts
  score += Math.min(inputs.offPlatformPaymentAttempts * 10, 30);

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ─── Layer 2: Behavioral Trajectory (40%) ─────────────────────
// Signals: Repeated pairing, escalating private comms, pattern over time

export interface BehavioralInputs {
  /** Total risk signals in last 7 days */
  recentSignalCount: number;
  /** Number of unique signal types detected */
  uniqueSignalTypes: number;
  /** Whether signals are escalating over time */
  isEscalating: boolean;
  /** Number of repeated violations of same type */
  repeatedViolationCount: number;
  /** Number of obfuscation attempts detected */
  obfuscationAttempts: number;
}

export function computeBehavioralScore(inputs: BehavioralInputs): number {
  let score = 0;

  // Signal volume
  score += Math.min(inputs.recentSignalCount * 5, 25);

  // Diversity of signals (multiple types = higher intent)
  score += Math.min(inputs.uniqueSignalTypes * 8, 25);

  // Escalation pattern
  if (inputs.isEscalating) {
    score += 20;
  }

  // Repeated same-type violations
  score += Math.min(inputs.repeatedViolationCount * 7, 15);

  // Obfuscation attempts (strong intent signal)
  score += Math.min(inputs.obfuscationAttempts * 10, 15);

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ─── Layer 3: Network Corroboration (30%) ─────────────────────
// Signals: Shared endpoints, device/IP clusters, coordinated patterns

export interface NetworkInputs {
  /** Number of unique counterparties with signals */
  flaggedCounterparties: number;
  /** Whether user shares payment endpoints with flagged users */
  sharedPaymentEndpoints: boolean;
  /** Number of users with similar behavioral patterns (potential Sybil) */
  similarPatternUsers: number;
  /** Whether user is part of a flagged IP/device cluster */
  inDeviceCluster: boolean;
}

export function computeNetworkScore(inputs: NetworkInputs): number {
  let score = 0;

  // Multiple flagged counterparties
  score += Math.min(inputs.flaggedCounterparties * 10, 30);

  // Shared payment endpoints
  if (inputs.sharedPaymentEndpoints) {
    score += 25;
  }

  // Similar pattern users (Sybil indicator)
  score += Math.min(inputs.similarPatternUsers * 8, 25);

  // Device cluster
  if (inputs.inDeviceCluster) {
    score += 20;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}
