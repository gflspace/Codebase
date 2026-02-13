// QwickServices CIS — Leakage Alert Consumer (Layer 8)
// Fires alerts when a leakage event reaches the 'confirmation' stage.

import { DomainEvent, EventType, LeakageStageAdvancedPayload } from '../../events/types';
import { createAlert } from '../index';

/**
 * Handle a LEAKAGE_STAGE_ADVANCED event.
 * Creates an alert only when the stage reaches 'confirmation'.
 */
export async function handleLeakageAlert(event: DomainEvent): Promise<void> {
  const payload = event.payload as unknown as LeakageStageAdvancedPayload;

  if (payload.new_stage !== 'confirmation') return;
  if (!payload.user_id) return;

  await createAlert({
    user_id: payload.user_id,
    priority: 'high',
    title: `Leakage Confirmed: User ${payload.user_id.slice(0, 8)} — off-platform activity detected`,
    description: `Off-platform leakage confirmed for user. Stage advanced from "${payload.previous_stage}" to "confirmation".`,
    source: 'leakage',
    metadata: {
      leakage_event_id: payload.leakage_event_id,
      counterparty_id: payload.counterparty_id,
      platform_destination: payload.platform_destination,
      previous_stage: payload.previous_stage,
    },
  });
}

/**
 * Register the leakage alert consumer on the event bus.
 */
export function registerLeakageAlertConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'alerting-leakage',
    eventTypes: [EventType.LEAKAGE_STAGE_ADVANCED],
    handler: handleLeakageAlert,
  });
}
