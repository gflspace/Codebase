// QwickServices CIS — Risk Tier Assignment
// Maps trust scores to risk tiers with trend tracking

export enum RiskTier {
  MONITOR = 'monitor',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TrendDirection {
  STABLE = 'stable',
  ESCALATING = 'escalating',
  DECAYING = 'decaying',
}

export interface TierAssignment {
  tier: RiskTier;
  trend: TrendDirection;
}

// ─── Tier Thresholds ──────────────────────────────────────────

const TIER_THRESHOLDS = {
  monitor: { min: 0, max: 20 },
  low: { min: 20, max: 40 },
  medium: { min: 40, max: 60 },
  high: { min: 60, max: 80 },
  critical: { min: 80, max: 100 },
} as const;

/**
 * Assign risk tier based on score.
 */
export function assignTier(score: number): RiskTier {
  if (score >= TIER_THRESHOLDS.critical.min) return RiskTier.CRITICAL;
  if (score >= TIER_THRESHOLDS.high.min) return RiskTier.HIGH;
  if (score >= TIER_THRESHOLDS.medium.min) return RiskTier.MEDIUM;
  if (score >= TIER_THRESHOLDS.low.min) return RiskTier.LOW;
  return RiskTier.MONITOR;
}

/**
 * Determine trend direction from recent score history.
 * @param scores Array of recent scores, oldest first
 */
export function determineTrend(scores: number[]): TrendDirection {
  if (scores.length < 2) return TrendDirection.STABLE;

  const recent = scores.slice(-3); // Last 3 scores
  const diffs: number[] = [];

  for (let i = 1; i < recent.length; i++) {
    diffs.push(recent[i] - recent[i - 1]);
  }

  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;

  if (avgDiff > 5) return TrendDirection.ESCALATING;
  if (avgDiff < -5) return TrendDirection.DECAYING;
  return TrendDirection.STABLE;
}

/**
 * Full tier assignment with trend.
 */
export function assignTierWithTrend(
  currentScore: number,
  recentScores: number[]
): TierAssignment {
  return {
    tier: assignTier(currentScore),
    trend: determineTrend([...recentScores, currentScore]),
  };
}

/**
 * Get tier severity level (for ordering/comparison).
 */
export function tierSeverity(tier: RiskTier): number {
  const levels: Record<RiskTier, number> = {
    [RiskTier.MONITOR]: 0,
    [RiskTier.LOW]: 1,
    [RiskTier.MEDIUM]: 2,
    [RiskTier.HIGH]: 3,
    [RiskTier.CRITICAL]: 4,
  };
  return levels[tier];
}
