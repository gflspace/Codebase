// QwickServices CIS — Domain Persistence Consumer
// Bridges the gap between sync events and CIS PostgreSQL domain tables.
// Listens for domain events emitted by the sync poller and UPSERTs records
// into bookings, transactions, wallet_transactions, ratings, and disputes.

import { getEventBus } from '../../events/bus';
import { EventType, DomainEvent } from '../../events/types';
import { query } from '../../database/connection';
import { generateId } from '../../shared/utils';

// ─── Status Mappings (QwickServices → CIS) ────────────────────

const BOOKING_STATUS_MAP: Record<string, string> = {
  pending: 'pending',
  pending_approval: 'pending',
  waiting: 'pending',
  hold: 'pending',
  accept: 'confirmed',
  on_going: 'in_progress',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
  rejected: 'cancelled',
  failed: 'cancelled',
};

const WALLET_TX_TYPE_MAP: Record<string, string> = {
  deposit: 'deposit',
  credit: 'deposit',
  withdraw: 'withdrawal',
  withdrawal: 'withdrawal',
  debit: 'withdrawal',
  transfer: 'transfer',
};

function mapBookingStatus(raw: string): string {
  return BOOKING_STATUS_MAP[raw.toLowerCase()] || 'pending';
}

function mapWalletTxType(raw: string): string {
  return WALLET_TX_TYPE_MAP[raw.toLowerCase()] || 'deposit';
}

// ─── Event Handlers ───────────────────────────────────────────

async function handleBookingEvent(event: DomainEvent): Promise<void> {
  const p = event.payload;
  const externalId = (p._source_id as string) || (p.booking_id as string);
  if (!externalId) return;

  const rawStatus = (p.status as string) || 'pending';
  const cisStatus = mapBookingStatus(rawStatus);

  await query(
    `INSERT INTO bookings (id, external_id, client_id, provider_id, service_category, amount, currency, status, scheduled_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     ON CONFLICT (external_id) DO UPDATE SET
       client_id = EXCLUDED.client_id,
       provider_id = EXCLUDED.provider_id,
       service_category = EXCLUDED.service_category,
       amount = EXCLUDED.amount,
       status = EXCLUDED.status,
       scheduled_at = EXCLUDED.scheduled_at,
       updated_at = NOW()`,
    [
      generateId(),
      externalId,
      (p.client_id as string) || null,
      (p.provider_id as string) || null,
      (p.service_category as string) || (p.category_id as string) || null,
      typeof p.amount === 'number' ? p.amount : null,
      (p.currency as string) || 'USD',
      cisStatus,
      (p.scheduled_at as string) || null,
    ]
  );
}

async function handleTransactionEvent(event: DomainEvent): Promise<void> {
  const p = event.payload;
  const externalRef = (p._source_id as string) || (p.transaction_id as string);
  if (!externalRef) return;

  const status = (p.status as string) || 'initiated';

  await query(
    `INSERT INTO transactions (id, external_ref, user_id, amount, currency, payment_method, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (external_ref) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       amount = EXCLUDED.amount,
       payment_method = EXCLUDED.payment_method,
       status = EXCLUDED.status,
       updated_at = NOW()`,
    [
      generateId(),
      externalRef,
      (p.user_id as string) || null,
      typeof p.amount === 'number' ? p.amount : null,
      (p.currency as string) || 'USD',
      (p.payment_method as string) || 'unknown',
      status,
    ]
  );
}

async function handleWalletEvent(event: DomainEvent): Promise<void> {
  const p = event.payload;
  const externalId = (p._source_id as string) || (p.wallet_tx_id as string);
  if (!externalId) return;

  const rawType = (p.tx_type as string) || 'deposit';
  const cisType = mapWalletTxType(rawType);

  await query(
    `INSERT INTO wallet_transactions (id, external_id, user_id, tx_type, amount, currency, payment_method, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT (external_id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       tx_type = EXCLUDED.tx_type,
       amount = EXCLUDED.amount,
       status = EXCLUDED.status,
       updated_at = NOW()`,
    [
      generateId(),
      externalId,
      (p.user_id as string) || null,
      cisType,
      typeof p.amount === 'number' ? p.amount : null,
      (p.currency as string) || 'USD',
      (p.payment_method as string) || null,
      (p.status as string) || 'completed',
    ]
  );
}

async function handleRatingEvent(event: DomainEvent): Promise<void> {
  const p = event.payload;
  const externalId = (p._source_id as string) || (p.rating_id as string);
  if (!externalId) return;

  await query(
    `INSERT INTO ratings (id, external_id, client_id, provider_id, booking_id, score, comment, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (external_id) DO UPDATE SET
       score = EXCLUDED.score,
       comment = EXCLUDED.comment,
       updated_at = NOW()`,
    [
      generateId(),
      externalId,
      (p.client_id as string) || null,
      (p.provider_id as string) || null,
      (p.booking_id as string) || null,
      typeof p.score === 'number' ? p.score : 5,
      (p.comment as string) || null,
    ]
  );
}

async function handleDisputeEvent(event: DomainEvent): Promise<void> {
  const p = event.payload;
  const externalId = (p._source_id as string) || (p.dispute_id as string);
  if (!externalId) return;

  const status = (p.status as string) || 'pending';

  await query(
    `INSERT INTO disputes (id, external_id, booking_id, complainant_id, respondent_id, dispute_type, reason, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT (external_id) DO UPDATE SET
       status = EXCLUDED.status,
       reason = EXCLUDED.reason,
       updated_at = NOW()`,
    [
      generateId(),
      externalId,
      (p.booking_id as string) || null,
      (p.complainant_id as string) || null,
      (p.respondent_id as string) || null,
      (p.dispute_type as string) || 'general',
      (p.reason as string) || '',
      status,
    ]
  );
}

// ─── Unified Handler ──────────────────────────────────────────

async function handleDomainEvent(event: DomainEvent): Promise<void> {
  try {
    switch (event.type) {
      case EventType.BOOKING_CREATED:
      case EventType.BOOKING_UPDATED:
      case EventType.BOOKING_COMPLETED:
      case EventType.BOOKING_CANCELLED:
        await handleBookingEvent(event);
        break;

      case EventType.TRANSACTION_INITIATED:
      case EventType.TRANSACTION_COMPLETED:
      case EventType.TRANSACTION_FAILED:
      case EventType.TRANSACTION_CANCELLED:
        await handleTransactionEvent(event);
        break;

      case EventType.WALLET_DEPOSIT:
      case EventType.WALLET_WITHDRAWAL:
      case EventType.WALLET_TRANSFER:
        await handleWalletEvent(event);
        break;

      case EventType.RATING_SUBMITTED:
        await handleRatingEvent(event);
        break;

      case EventType.DISPUTE_OPENED:
      case EventType.DISPUTE_RESOLVED:
        await handleDisputeEvent(event);
        break;
    }
  } catch (err) {
    console.error(`[DomainPersistence] Failed to persist ${event.type}:`, err);
  }
}

// ─── Registration ─────────────────────────────────────────────

export function registerDomainPersistenceConsumer(): void {
  const bus = getEventBus();
  bus.registerConsumer({
    name: 'domain-persistence',
    eventTypes: [
      EventType.BOOKING_CREATED,
      EventType.BOOKING_UPDATED,
      EventType.BOOKING_COMPLETED,
      EventType.BOOKING_CANCELLED,
      EventType.TRANSACTION_INITIATED,
      EventType.TRANSACTION_COMPLETED,
      EventType.TRANSACTION_FAILED,
      EventType.TRANSACTION_CANCELLED,
      EventType.WALLET_DEPOSIT,
      EventType.WALLET_WITHDRAWAL,
      EventType.WALLET_TRANSFER,
      EventType.RATING_SUBMITTED,
      EventType.DISPUTE_OPENED,
      EventType.DISPUTE_RESOLVED,
    ],
    handler: handleDomainEvent,
  });
}

// Export handlers for unit testing
export {
  handleBookingEvent,
  handleTransactionEvent,
  handleWalletEvent,
  handleRatingEvent,
  handleDisputeEvent,
  handleDomainEvent,
  mapBookingStatus,
  mapWalletTxType,
};
