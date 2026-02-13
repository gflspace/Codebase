// QwickServices CIS — SLA Escalation Service (Layer 8)
// Periodic job that escalates alerts whose SLA deadlines have been breached.

import { query } from '../database/connection';
import { generateId } from '../shared/utils';
import { createAlert, escalatePriority, computeSlaDeadline } from './index';

const SLA_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let escalationTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Check for and escalate alerts with breached SLA deadlines.
 */
export async function runSlaEscalation(): Promise<number> {
  try {
    const result = await query(
      `SELECT id, user_id, priority, status, title, escalation_count
       FROM alerts
       WHERE sla_deadline < NOW()
         AND status IN ('open', 'assigned', 'in_progress')
         AND priority != 'critical'
       ORDER BY sla_deadline ASC
       LIMIT 50`
    );

    let escalated = 0;

    for (const alert of result.rows) {
      const oldPriority = alert.priority;
      const newPriority = escalatePriority(oldPriority);
      const newDeadline = computeSlaDeadline(newPriority);
      const newEscalationCount = (parseInt(alert.escalation_count) || 0) + 1;

      try {
        // Update the original alert
        await query(
          `UPDATE alerts
           SET priority = $1,
               sla_deadline = $2,
               escalation_count = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [newPriority, newDeadline.toISOString(), newEscalationCount, alert.id]
        );

        // Create a child escalation alert
        await createAlert({
          user_id: alert.user_id,
          priority: newPriority,
          title: `SLA Breach: Alert ${alert.id.slice(0, 8)} escalated from ${oldPriority} to ${newPriority}`,
          description: `Alert "${alert.title}" breached its SLA deadline. Priority escalated from ${oldPriority} to ${newPriority}. Escalation #${newEscalationCount}.`,
          source: 'sla',
          parent_alert_id: alert.id,
          metadata: {
            original_alert_id: alert.id,
            old_priority: oldPriority,
            new_priority: newPriority,
            escalation_count: newEscalationCount,
          },
        });

        // Audit log
        await query(
          `INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            generateId(), 'system', 'sla_escalation', 'alert.sla_breached',
            'alert', alert.id,
            JSON.stringify({
              old_priority: oldPriority,
              new_priority: newPriority,
              escalation_count: newEscalationCount,
            }),
          ]
        );

        escalated++;
      } catch (err) {
        console.error(`[SLA] Failed to escalate alert ${alert.id}:`, err);
      }
    }

    if (escalated > 0) {
      console.log(`[SLA] Escalated ${escalated} alert(s) with breached SLA deadlines`);
    }

    return escalated;
  } catch (err) {
    console.error('[SLA] Escalation check failed:', err);
    return 0;
  }
}

/**
 * Start the periodic SLA escalation job.
 */
export function startSlaEscalation(): void {
  if (escalationTimer) return;
  escalationTimer = setInterval(runSlaEscalation, SLA_CHECK_INTERVAL_MS);
  console.log('[SLA] Escalation service started (interval: 5m)');
}

/**
 * Stop the periodic SLA escalation job.
 */
export function stopSlaEscalation(): void {
  if (escalationTimer) {
    clearInterval(escalationTimer);
    escalationTimer = null;
    console.log('[SLA] Escalation service stopped');
  }
}
