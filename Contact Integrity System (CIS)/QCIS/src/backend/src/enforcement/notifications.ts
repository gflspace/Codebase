// QwickServices CIS — Notification Service
// Generates user notifications and admin alerts from enforcement actions

import { query } from '../database/connection';
import { generateId } from '../shared/utils';
import { createAlert } from '../alerting';
import { AppliedAction } from './actions';

// ─── Reason Code to User-Facing Message Map ──────────────────

const USER_MESSAGES: Record<string, { title: string; body: string }> = {
  LOW_RISK_FIRST_OFFENSE: {
    title: 'Community Guidelines Reminder',
    body: 'We noticed activity that may conflict with our community guidelines. Please review our policies to ensure a safe experience for everyone.',
  },
  LOW_RISK_REPEAT: {
    title: 'Community Guidelines Warning',
    body: 'We have detected repeated behavior that may violate our policies. Continued violations may result in restrictions.',
  },
  MEDIUM_RISK_FIRST: {
    title: 'Policy Violation Warning',
    body: 'Your account has been flagged for behavior that violates our platform policies. This warning has been recorded.',
  },
  MEDIUM_RISK_SECOND: {
    title: 'Second Policy Violation',
    body: 'This is your second policy violation. Further violations will result in temporary restrictions on your account.',
  },
  MEDIUM_RISK_REPEATED: {
    title: 'Temporary Account Restriction',
    body: 'Due to repeated policy violations, your account has been temporarily restricted. You may appeal this decision.',
  },
  HIGH_RISK_EVASION: {
    title: 'Account Restriction — Pending Review',
    body: 'Your account has been restricted due to detected policy violations. An administrator will review your account.',
  },
  HIGH_RISK_ESCALATION: {
    title: 'Account Under Review',
    body: 'Your account is being reviewed by our Trust & Safety team. You will be notified of the outcome.',
  },
  CRITICAL_RISK_SUSPEND: {
    title: 'Account Suspended',
    body: 'Your account has been suspended due to serious policy violations. An administrator will review your case.',
  },
  // Phase 3B — Context-aware action messages
  BOOKING_BLOCKED: {
    title: 'Booking Blocked',
    body: 'Your booking request has been blocked due to elevated risk on your account. Please contact support.',
  },
  BOOKING_FLAGGED: {
    title: 'Booking Under Review',
    body: 'Your booking has been flagged for manual review. You will be notified once it is approved.',
  },
  PAYMENT_HELD: {
    title: 'Payment Held for Review',
    body: 'Your payment is being held for additional verification. This is a standard security measure.',
  },
  PAYMENT_BLOCKED: {
    title: 'Payment Blocked',
    body: 'Your payment has been blocked due to elevated risk. Please contact support for assistance.',
  },
  PROVIDER_DEMOTED: {
    title: 'Provider Status Downgraded',
    body: 'Your provider status has been downgraded due to detected policy concerns. Please review our guidelines.',
  },
  PROVIDER_SUSPENDED: {
    title: 'Provider Account Suspended',
    body: 'Your provider account has been suspended pending review. An administrator will review your case.',
  },
  MESSAGE_THROTTLED: {
    title: 'Messaging Rate Limited',
    body: 'Your messaging rate has been temporarily limited due to detected activity patterns.',
  },
};

const APPEAL_LINK = '/appeals/submit'; // Relative path for user notification

/**
 * Generate a user notification for an enforcement action.
 */
export async function notifyUser(action: AppliedAction): Promise<void> {
  if (action.shadow_mode) return; // No user notifications in shadow mode

  const message = USER_MESSAGES[action.reason_code] || {
    title: 'Account Notice',
    body: action.reason,
  };

  // In a real system, this would send an in-app notification, email, or push notification.
  // For standalone mode, we log it.
  console.log(`[Notification:User] ${action.user_id.slice(0, 8)}: ${message.title}`);

  // Persist notification intent to audit log
  try {
    await query(
      `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        generateId(), 'system', 'notification_service', 'notification.user_sent',
        'user', action.user_id,
        JSON.stringify({
          action_id: action.id,
          title: message.title,
          reason_code: action.reason_code,
          appeal_link: APPEAL_LINK,
        }),
      ]
    );
  } catch {
    // Non-critical
  }
}

/**
 * Generate an admin alert for enforcement actions that require human review.
 * Uses centralized createAlert() for SLA deadlines and subscription matching.
 */
export async function createAdminAlert(action: AppliedAction): Promise<string | null> {
  // Determine priority from action type
  let priority: string;
  if (['account_suspension', 'payment_blocked', 'provider_suspended'].includes(action.action_type)) {
    priority = 'critical';
  } else if (['booking_blocked', 'payment_held'].includes(action.action_type)) {
    priority = 'high';
  } else if (['booking_flagged', 'provider_demoted', 'message_throttled'].includes(action.action_type)) {
    priority = 'medium';
  } else if (action.reason_code.startsWith('HIGH_RISK')) {
    priority = 'high';
  } else if (action.reason_code.startsWith('MEDIUM_RISK')) {
    priority = 'medium';
  } else {
    priority = 'low';
  }

  const alertId = await createAlert({
    user_id: action.user_id,
    priority,
    title: `Enforcement: ${action.reason_code}`,
    description: `Automated enforcement action (${action.action_type}) applied. Reason: ${action.reason}. ${action.shadow_mode ? '[SHADOW MODE]' : ''}`,
    source: 'enforcement',
    metadata: {
      action_id: action.id,
      action_type: action.action_type,
      reason_code: action.reason_code,
      shadow_mode: action.shadow_mode,
    },
  });

  if (alertId) {
    console.log(`[Notification:Admin] Alert created: ${alertId.slice(0, 8)} (priority: ${priority})`);
  }

  return alertId;
}

/**
 * Create an admin case for high/critical escalations.
 */
export async function createEscalationCase(
  action: AppliedAction,
  alertId?: string
): Promise<string | null> {
  const caseId = generateId();

  try {
    await query(
      `INSERT INTO cases (id, user_id, status, title, description, alert_ids)
       VALUES ($1, $2, 'open', $3, $4, $5)`,
      [
        caseId,
        action.user_id,
        `Escalation: ${action.reason_code}`,
        `User escalated for admin review. Action: ${action.action_type}. Reason: ${action.reason}`,
        alertId ? [alertId] : [],
      ]
    );

    console.log(`[Notification:Admin] Case created: ${caseId.slice(0, 8)} for user ${action.user_id.slice(0, 8)}`);
    return caseId;
  } catch (err) {
    console.error('[Notification] Failed to create escalation case:', err);
    return null;
  }
}
