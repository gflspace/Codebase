// QwickServices CIS — Alerting Engine (Layer 8)
// Centralized alert creation with SLA deadlines, source tagging,
// subscription matching, and audit logging.

import { query } from '../database/connection';
import { generateId } from '../shared/utils';

// ─── SLA Deadline Configuration ───────────────────────────────

/** SLA deadlines in hours by priority level */
export const SLA_DEADLINES: Record<string, number> = {
  critical: 1,
  high: 4,
  medium: 24,
  low: 72,
};

/** Compute an SLA deadline timestamp from a priority level. */
export function computeSlaDeadline(priority: string): Date {
  const hours = SLA_DEADLINES[priority] ?? SLA_DEADLINES.medium;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

// ─── Priority Escalation ──────────────────────────────────────

const PRIORITY_ORDER = ['low', 'medium', 'high', 'critical'];

export function escalatePriority(current: string): string {
  const idx = PRIORITY_ORDER.indexOf(current);
  if (idx < 0 || idx >= PRIORITY_ORDER.length - 1) return 'critical';
  return PRIORITY_ORDER[idx + 1];
}

// ─── Subscription Matching ────────────────────────────────────

export interface AlertSubscription {
  id: string;
  admin_user_id: string;
  name: string;
  filter_criteria: {
    priority?: string[];
    source?: string[];
    category?: string[];
    user_type?: string[];
  };
  channels: string[];
  enabled: boolean;
}

/**
 * Find alert subscriptions that match a given alert.
 * Matches on priority, source, category, and user_type filters.
 */
export async function matchSubscriptions(alert: {
  priority: string;
  source: string;
  category?: string;
  user_type?: string;
}): Promise<AlertSubscription[]> {
  try {
    const result = await query(
      `SELECT id, admin_user_id, name, filter_criteria, channels, enabled
       FROM alert_subscriptions
       WHERE enabled = TRUE`
    );

    return result.rows.filter((sub: AlertSubscription) => {
      const criteria = sub.filter_criteria || {};

      if (criteria.priority && criteria.priority.length > 0 && !criteria.priority.includes(alert.priority)) {
        return false;
      }
      if (criteria.source && criteria.source.length > 0 && !criteria.source.includes(alert.source)) {
        return false;
      }
      if (criteria.category && criteria.category.length > 0 && alert.category && !criteria.category.includes(alert.category)) {
        return false;
      }
      if (criteria.user_type && criteria.user_type.length > 0 && alert.user_type && !criteria.user_type.includes(alert.user_type)) {
        return false;
      }

      return true;
    });
  } catch (err) {
    console.error('[Alerting] matchSubscriptions error:', err);
    return [];
  }
}

/**
 * Notify matched subscribers. Dashboard notifications are always logged.
 * Email/Slack are logged as intent for future integration.
 */
export async function notifySubscribers(
  alertId: string,
  subscriptions: AlertSubscription[]
): Promise<void> {
  for (const sub of subscriptions) {
    for (const channel of sub.channels) {
      try {
        await query(
          `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            generateId(), 'system', 'alerting_engine', 'alert.notification_sent',
            'alert', alertId,
            JSON.stringify({
              subscription_id: sub.id,
              admin_user_id: sub.admin_user_id,
              channel,
              subscription_name: sub.name,
            }),
          ]
        );
      } catch {
        // Non-critical
      }
    }
  }
}

// ─── Centralized Alert Creation ───────────────────────────────

export interface CreateAlertParams {
  user_id: string;
  priority: string;
  title: string;
  description: string;
  source: string;
  risk_signal_ids?: string[];
  auto_generated?: boolean;
  metadata?: Record<string, unknown>;
  parent_alert_id?: string;
  category?: string;
  user_type?: string;
}

/**
 * Create an alert with SLA deadline, source tagging, subscription matching,
 * and audit logging. Returns the alert ID or null on failure.
 */
export async function createAlert(params: CreateAlertParams): Promise<string | null> {
  const alertId = generateId();
  const slaDeadline = computeSlaDeadline(params.priority);

  try {
    await query(
      `INSERT INTO alerts (id, user_id, priority, status, title, description, source, sla_deadline, risk_signal_ids, auto_generated, metadata, parent_alert_id)
       VALUES ($1, $2, $3, 'open', $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        alertId,
        params.user_id,
        params.priority,
        params.title,
        params.description,
        params.source,
        slaDeadline.toISOString(),
        params.risk_signal_ids || [],
        params.auto_generated !== false,
        JSON.stringify(params.metadata || {}),
        params.parent_alert_id || null,
      ]
    );

    console.log(`[Alerting] Alert created: ${alertId.slice(0, 8)} (source: ${params.source}, priority: ${params.priority})`);

    // Match subscriptions and notify
    const subscriptions = await matchSubscriptions({
      priority: params.priority,
      source: params.source,
      category: params.category,
      user_type: params.user_type,
    });

    if (subscriptions.length > 0) {
      await notifySubscribers(alertId, subscriptions);
      console.log(`[Alerting] Notified ${subscriptions.length} subscription(s) for alert ${alertId.slice(0, 8)}`);
    }

    // Audit log
    try {
      await query(
        `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          generateId(), 'system', 'alerting_engine', 'alert.created',
          'alert', alertId,
          JSON.stringify({
            source: params.source,
            priority: params.priority,
            user_id: params.user_id,
            sla_deadline: slaDeadline.toISOString(),
          }),
        ]
      );
    } catch {
      // Non-critical
    }

    return alertId;
  } catch (err) {
    console.error('[Alerting] Failed to create alert:', err);
    return null;
  }
}
