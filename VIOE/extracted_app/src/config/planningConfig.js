/**
 * Planning Configuration
 *
 * PCE COMPLIANCE: This file contains values derived from the Planning Layer.
 * These values are the authoritative source of truth for business rules.
 *
 * SOURCE DOCUMENTS:
 * - planning/prioritization.md - Ownership confidence thresholds, SLA rules
 * - planning/risk_model.md - Severity mappings, risk score calculations
 * - planning/automation.md - Automation boundaries and levels
 * - planning/compliance.md - Compliance framework mappings
 *
 * CHANGE CONTROL:
 * - Changes to these values MUST be reflected in the source planning documents first
 * - See planning/history.md for change log
 * - Approval required per planning/README.md Section "Change Control Process"
 */

/**
 * Ownership Confidence Thresholds
 * Source: planning/prioritization.md Section 2.1 "AI Assignment Confidence Levels"
 */
export const CONFIDENCE_THRESHOLDS = {
  // >= 90%: High confidence - Auto-assign to team; no review required
  HIGH: 90,

  // 70% - 89%: Medium confidence - Assign with "Needs Review" flag
  MEDIUM: 70,

  // 50% - 69%: Low confidence - Queue for manual triage
  LOW: 50,

  // < 50%: Very Low - Reject auto-assignment; manual required
  VERY_LOW: 50,
};

/**
 * Confidence Level Definitions
 * Source: planning/prioritization.md Section 2.1
 */
export const CONFIDENCE_LEVELS = {
  HIGH: {
    min: CONFIDENCE_THRESHOLDS.HIGH,
    max: 100,
    label: 'High',
    color: 'green',
    badge: 'bg-green-500/10 text-green-400 border-green-500/20',
    action: 'Auto-assign to team; no review required',
  },
  MEDIUM: {
    min: CONFIDENCE_THRESHOLDS.MEDIUM,
    max: CONFIDENCE_THRESHOLDS.HIGH - 1,
    label: 'Medium',
    color: 'yellow',
    badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    action: 'Assign with "Needs Review" flag',
  },
  LOW: {
    min: CONFIDENCE_THRESHOLDS.LOW,
    max: CONFIDENCE_THRESHOLDS.MEDIUM - 1,
    label: 'Low',
    color: 'orange',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    action: 'Queue for manual triage',
  },
  VERY_LOW: {
    min: 0,
    max: CONFIDENCE_THRESHOLDS.VERY_LOW - 1,
    label: 'Very Low',
    color: 'red',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    action: 'Reject auto-assignment; manual required',
  },
  UNASSIGNED: {
    min: null,
    max: null,
    label: 'Unassigned',
    color: 'gray',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    action: 'Immediate triage queue',
  },
};

/**
 * SLA Definitions by Severity
 * Source: planning/prioritization.md Section 4.1 "Remediation SLA by Severity"
 */
export const SLA_BY_SEVERITY = {
  critical: {
    targetDays: 7,
    warningHours: 48,
    gracePeriodHours: 0,
    label: 'Critical',
  },
  high: {
    targetDays: 30,
    warningHours: 72,
    gracePeriodHours: 24,
    label: 'High',
  },
  medium: {
    targetDays: 60,
    warningDays: 7,
    gracePeriodHours: 48,
    label: 'Medium',
  },
  low: {
    targetDays: 90,
    warningDays: 14,
    gracePeriodDays: 7,
    label: 'Low',
  },
  info: {
    targetDays: null, // No SLA
    warningDays: null,
    gracePeriodDays: null,
    label: 'Info',
  },
};

/**
 * Severity Display Configuration
 * Source: planning/risk_model.md Section 2 "CVSS TO SEVERITY MAPPING"
 */
export const SEVERITY_CONFIG = {
  critical: {
    cvssMin: 9.0,
    cvssMax: 10.0,
    color: '#EF4444',
    priorityOrder: 1,
    label: 'Critical',
  },
  high: {
    cvssMin: 7.0,
    cvssMax: 8.9,
    color: '#F97316',
    priorityOrder: 2,
    label: 'High',
  },
  medium: {
    cvssMin: 4.0,
    cvssMax: 6.9,
    color: '#EAB308',
    priorityOrder: 3,
    label: 'Medium',
  },
  low: {
    cvssMin: 0.1,
    cvssMax: 3.9,
    color: '#3B82F6',
    priorityOrder: 4,
    label: 'Low',
  },
  info: {
    cvssMin: 0.0,
    cvssMax: 0.0,
    color: '#6B7280',
    priorityOrder: 5,
    label: 'Info',
  },
};

/**
 * Risk Score Multipliers
 * Source: planning/risk_model.md Section 4.2 and 5.2
 */
export const RISK_MULTIPLIERS = {
  assetCriticality: {
    critical: 2.0,
    high: 1.5,
    medium: 1.0,
    low: 0.5,
  },
  environment: {
    production: 1.5,
    staging: 1.0,
    development: 0.5,
  },
};

/**
 * EPSS Thresholds
 * Source: planning/risk_model.md Section 3.1 "EPSS (Exploit Prediction Scoring System)"
 */
export const EPSS_THRESHOLDS = {
  IMMEDIATE_TRIAGE: 0.9,  // +2 priority levels
  EXPEDITED: 0.7,         // +1 priority level
  STANDARD: 0.4,          // No modifier
  // Below 0.4: -1 priority level (min: Low)
};

/**
 * Automation Levels
 * Source: planning/automation.md Section 2.2 "Automation Levels"
 */
export const AUTOMATION_LEVELS = {
  L0: {
    name: 'Fully Automatic',
    description: 'No approval required',
    examples: ['Triage', 'Assign', 'Notify'],
  },
  L1: {
    name: 'Notify & Proceed',
    description: 'Notify then execute',
    examples: ['Create Jira ticket'],
  },
  L2: {
    name: 'Approval Required',
    description: 'Wait for explicit approval',
    examples: ['Apply auto-fix'],
  },
  L3: {
    name: 'Manual Only',
    description: 'Human must perform action',
    examples: ['Production deployment'],
  },
};

/**
 * Bulk Operation Limits
 * Source: planning/automation.md Section 3.2 "Bulk Triage Limits"
 */
export const BULK_OPERATION_LIMITS = {
  maxItemsPerBatch: 100,
  rateLimitSeconds: 60,
  failureThresholdPercent: 10,
  autoPauseConsecutiveFailures: 5,
};

/**
 * Auto-Fix Confidence Requirements
 * Source: planning/automation.md Section 4.1 "Auto-Fix Eligibility"
 */
export const AUTO_FIX_CONFIDENCE = {
  dependencyUpgrade: 80,
  securityHeader: 90,
  hardcodedSecret: 90,
  sqlInjection: 95,
  xss: 95,
};

/**
 * Compliance Score Thresholds
 * Source: planning/compliance.md Section 7.2 "Score Interpretation"
 */
export const COMPLIANCE_SCORE_THRESHOLDS = {
  COMPLIANT: 90,           // 90-100: Audit-ready
  MOSTLY_COMPLIANT: 75,    // 75-89: Minor gaps
  PARTIALLY_COMPLIANT: 60, // 60-74: Significant work needed
  NON_COMPLIANT: 40,       // 40-59: Major remediation required
  // Below 40: Critical Non-Compliance
};

/**
 * Helper Functions
 */

/**
 * Determine confidence level for a given confidence score
 * @param {number|null} confidence - The confidence score (0-100) or null if unassigned
 * @returns {object} The confidence level configuration
 */
export function getConfidenceLevel(confidence) {
  if (confidence === null || confidence === undefined) {
    return CONFIDENCE_LEVELS.UNASSIGNED;
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return CONFIDENCE_LEVELS.HIGH;
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return CONFIDENCE_LEVELS.MEDIUM;
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.LOW) {
    return CONFIDENCE_LEVELS.LOW;
  }
  return CONFIDENCE_LEVELS.VERY_LOW;
}

/**
 * Check if a vulnerability needs review based on confidence
 * Source: planning/prioritization.md Section 2.1
 * @param {object} vulnerability - The vulnerability object
 * @returns {boolean} True if needs review
 */
export function needsReview(vulnerability) {
  // Unassigned vulnerabilities always need review
  if (!vulnerability.assigned_team) {
    return true;
  }
  // Vulnerabilities below high confidence threshold need review
  if (vulnerability.ownership_confidence < CONFIDENCE_THRESHOLDS.HIGH) {
    return true;
  }
  return false;
}

/**
 * Check if confidence is high (no review needed)
 * @param {number} confidence - The confidence score
 * @returns {boolean} True if high confidence
 */
export function isHighConfidence(confidence) {
  return confidence >= CONFIDENCE_THRESHOLDS.HIGH;
}

/**
 * Check if confidence is medium (needs review flag)
 * @param {number} confidence - The confidence score
 * @returns {boolean} True if medium confidence
 */
export function isMediumConfidence(confidence) {
  return confidence >= CONFIDENCE_THRESHOLDS.MEDIUM && confidence < CONFIDENCE_THRESHOLDS.HIGH;
}

/**
 * Check if confidence is low (manual triage queue)
 * @param {number} confidence - The confidence score
 * @returns {boolean} True if low confidence
 */
export function isLowConfidence(confidence) {
  return confidence < CONFIDENCE_THRESHOLDS.MEDIUM;
}

/**
 * Get SLA for a given severity
 * @param {string} severity - The severity level
 * @returns {object} The SLA configuration
 */
export function getSLA(severity) {
  return SLA_BY_SEVERITY[severity?.toLowerCase()] || SLA_BY_SEVERITY.info;
}

/**
 * Calculate risk score
 * Source: planning/risk_model.md Section 6.1
 * @param {object} params - Parameters for calculation
 * @returns {number} The calculated risk score (0-100)
 */
export function calculateRiskScore({
  criticalCount = 0,
  highCount = 0,
  mediumCount = 0,
  lowCount = 0,
  assetCriticality = 'medium',
  environment = 'staging'
}) {
  const baseScore = (criticalCount * 25) + (highCount * 15) + (mediumCount * 5) + (lowCount * 1);
  const assetMultiplier = RISK_MULTIPLIERS.assetCriticality[assetCriticality] || 1.0;
  const envMultiplier = RISK_MULTIPLIERS.environment[environment] || 1.0;

  const score = baseScore * assetMultiplier * envMultiplier;
  return Math.min(100, Math.round(score)); // Cap at 100
}

export default {
  CONFIDENCE_THRESHOLDS,
  CONFIDENCE_LEVELS,
  SLA_BY_SEVERITY,
  SEVERITY_CONFIG,
  RISK_MULTIPLIERS,
  EPSS_THRESHOLDS,
  AUTOMATION_LEVELS,
  BULK_OPERATION_LIMITS,
  AUTO_FIX_CONFIDENCE,
  COMPLIANCE_SCORE_THRESHOLDS,
  getConfidenceLevel,
  needsReview,
  isHighConfidence,
  isMediumConfidence,
  isLowConfidence,
  getSLA,
  calculateRiskScore,
};
