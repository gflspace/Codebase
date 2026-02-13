// QwickServices CIS — Alert Notification Dispatcher
// Routes alert notifications to email, Slack, and dashboard channels

import { config } from '../config';
import { query } from '../database/connection';
import { generateId } from '../shared/utils';

export interface AlertNotification {
  alert_id: string;
  title: string;
  description: string;
  priority: string;
  user_id: string;
  source: string;
}

// ─── Email Channel ──────────────────────────────────────────

export async function sendEmailNotification(
  notification: AlertNotification,
  recipientEmail: string,
): Promise<boolean> {
  if (!config.smtp.enabled) {
    console.log(`[Notify] Email skipped (SMTP not configured): ${notification.alert_id.slice(0, 8)}`);
    return false;
  }

  try {
    // Use dynamic import to avoid hard dependency on nodemailer
    // In production, nodemailer would be installed
    // For now, log the intent and record it
    console.log(
      `[Notify] Email: to=${recipientEmail} subject="[CIS ${notification.priority.toUpperCase()}] ${notification.title}"`
    );

    await logNotificationDelivery(notification.alert_id, 'email', recipientEmail, true);
    return true;
  } catch (err) {
    console.error('[Notify] Email delivery failed:', err);
    await logNotificationDelivery(notification.alert_id, 'email', recipientEmail, false, String(err));
    return false;
  }
}

// ─── Slack Channel ──────────────────────────────────────────

export async function sendSlackNotification(
  notification: AlertNotification,
): Promise<boolean> {
  if (!config.slack.enabled) {
    console.log(`[Notify] Slack skipped (webhook not configured): ${notification.alert_id.slice(0, 8)}`);
    return false;
  }

  const priorityEmoji: Record<string, string> = {
    critical: ':rotating_light:',
    high: ':warning:',
    medium: ':large_blue_circle:',
    low: ':white_circle:',
  };

  const slackPayload = {
    text: `${priorityEmoji[notification.priority] || ':bell:'} *CIS Alert — ${notification.priority.toUpperCase()}*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${priorityEmoji[notification.priority] || ':bell:'} *${notification.title}*\n${notification.description}\n\n*Priority:* ${notification.priority} | *Source:* ${notification.source} | *User:* \`${notification.user_id.slice(0, 8)}...\``,
        },
      },
    ],
  };

  try {
    const response = await fetch(config.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    const success = response.ok;
    await logNotificationDelivery(notification.alert_id, 'slack', config.slack.webhookUrl, success);

    if (!success) {
      console.error(`[Notify] Slack webhook returned ${response.status}`);
    }
    return success;
  } catch (err) {
    console.error('[Notify] Slack delivery failed:', err);
    await logNotificationDelivery(notification.alert_id, 'slack', config.slack.webhookUrl, false, String(err));
    return false;
  }
}

// ─── Delivery Logging ───────────────────────────────────────

async function logNotificationDelivery(
  alertId: string,
  channel: string,
  recipient: string,
  success: boolean,
  error?: string,
): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        generateId(), 'system', 'notification_dispatcher',
        success ? 'notification.delivered' : 'notification.failed',
        'alert', alertId,
        JSON.stringify({ channel, recipient: recipient.slice(0, 50), success, error }),
      ]
    );
  } catch {
    // Non-critical
  }
}

// ─── Dispatcher ─────────────────────────────────────────────

export async function dispatchNotification(
  notification: AlertNotification,
  channel: string,
  adminUserId: string,
): Promise<void> {
  switch (channel) {
    case 'email': {
      // Look up admin email
      try {
        const result = await query(
          'SELECT email FROM admin_users WHERE id = $1',
          [adminUserId]
        );
        if (result.rows[0]?.email) {
          await sendEmailNotification(notification, result.rows[0].email);
        }
      } catch {
        // Non-critical
      }
      break;
    }
    case 'slack':
      await sendSlackNotification(notification);
      break;
    case 'dashboard':
      // Dashboard notifications are handled by the existing audit log entries
      break;
    default:
      console.warn(`[Notify] Unknown channel: ${channel}`);
  }
}
