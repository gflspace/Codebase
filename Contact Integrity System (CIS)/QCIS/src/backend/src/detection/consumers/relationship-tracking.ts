// QwickServices CIS — Phase 3A: Network Graph Relationship Consumer
// Builds and maintains user relationship edges for fraud ring detection.
// Listens to MESSAGE_CREATED, TRANSACTION_COMPLETED, BOOKING_COMPLETED, RATING_SUBMITTED

import {
  DomainEvent, EventType,
  MessageEventPayload, TransactionEventPayload,
  BookingEventPayload, RatingSubmittedPayload,
} from '../../events/types';
import { emitRelationshipUpdated } from '../../events/emit';
import { query } from '../../database/connection';

// ─── Helpers ────────────────────────────────────────────────────

function canonicalOrder(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

function computeStrengthScore(interactionCount: number): number {
  // Logarithmic scaling, caps at ~20 interactions → 1.0
  return Math.min(1.0, Math.round((Math.log(interactionCount + 1) / Math.log(20)) * 1000) / 1000);
}

// ─── Upsert Relationship ────────────────────────────────────────

async function upsertRelationship(
  userIdA: string,
  userIdB: string,
  relationshipType: string,
  value: number = 0
): Promise<void> {
  if (!userIdA || !userIdB || userIdA === userIdB) return;

  const [aId, bId] = canonicalOrder(userIdA, userIdB);

  try {
    const result = await query(
      `INSERT INTO user_relationships (id, user_a_id, user_b_id, relationship_type, interaction_count, total_value, strength_score)
       VALUES (uuid_generate_v4(), $1, $2, $3, 1, $4, $5)
       ON CONFLICT (user_a_id, user_b_id, relationship_type)
       DO UPDATE SET
         interaction_count = user_relationships.interaction_count + 1,
         total_value = user_relationships.total_value + $4,
         last_interaction_at = NOW(),
         strength_score = LEAST(1.0, ROUND(CAST(LN(user_relationships.interaction_count + 2) / LN(20) AS NUMERIC), 3))
       RETURNING id, interaction_count`,
      [aId, bId, relationshipType, value, computeStrengthScore(1)]
    );

    if (result.rows[0]) {
      await emitRelationshipUpdated({
        relationship_id: result.rows[0].id,
        user_a_id: aId,
        user_b_id: bId,
        relationship_type: relationshipType,
        interaction_count: parseInt(result.rows[0].interaction_count, 10),
      });
    }
  } catch (err) {
    console.error('[RelationshipTracking] upsertRelationship error:', err);
  }
}

// ─── Event Handlers ─────────────────────────────────────────────

async function handleRelationshipEvent(event: DomainEvent): Promise<void> {
  switch (event.type) {
    case EventType.MESSAGE_CREATED: {
      const p = event.payload as unknown as MessageEventPayload;
      if (!p.sender_id || !p.receiver_id) return;
      await upsertRelationship(p.sender_id, p.receiver_id, 'messaged', 0);
      break;
    }

    case EventType.TRANSACTION_COMPLETED: {
      const p = event.payload as unknown as TransactionEventPayload;
      if (!p.user_id || !p.counterparty_id) return;
      await upsertRelationship(p.user_id, p.counterparty_id, 'transacted', p.amount || 0);
      break;
    }

    case EventType.BOOKING_COMPLETED: {
      const p = event.payload as unknown as BookingEventPayload;
      if (!p.client_id || !p.provider_id) return;
      await upsertRelationship(p.client_id, p.provider_id, 'booked', p.amount || 0);
      break;
    }

    case EventType.RATING_SUBMITTED: {
      const p = event.payload as unknown as RatingSubmittedPayload;
      if (!p.client_id || !p.provider_id) return;
      await upsertRelationship(p.client_id, p.provider_id, 'rated', 0);
      break;
    }
  }
}

// ─── Consumer Registration ──────────────────────────────────────

export function registerRelationshipConsumer(): void {
  const { getEventBus } = require('../../events/bus');
  const bus = getEventBus();

  bus.registerConsumer({
    name: 'relationship-tracking',
    eventTypes: [
      EventType.MESSAGE_CREATED,
      EventType.TRANSACTION_COMPLETED,
      EventType.BOOKING_COMPLETED,
      EventType.RATING_SUBMITTED,
    ],
    handler: handleRelationshipEvent,
  });
}

// Export internals for testing
export {
  handleRelationshipEvent,
  upsertRelationship,
  canonicalOrder,
  computeStrengthScore,
};
