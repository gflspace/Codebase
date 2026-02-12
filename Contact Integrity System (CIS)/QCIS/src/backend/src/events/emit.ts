// QwickServices CIS — Domain Event Emission Helpers
// Fire-and-forget convenience functions for emitting events from CRUD routes.
// Errors are logged but never block the caller.

import { getEventBus } from './bus';
import { EventType, DomainEvent } from './types';
import { generateId, nowISO } from '../shared/utils';

function buildEvent(type: EventType, payload: Record<string, unknown>): DomainEvent {
  return {
    id: generateId(),
    type,
    correlation_id: generateId(),
    timestamp: nowISO(),
    version: 1,
    payload,
  };
}

async function safeEmit(event: DomainEvent): Promise<void> {
  try {
    await getEventBus().emit(event);
    console.log(`[emit] ${event.type} emitted (id=${event.id})`);
  } catch (err) {
    console.error(`[emit] Failed to emit ${event.type}:`, err);
  }
}

// ─── Message Events ──────────────────────────────────────────

export async function emitMessageCreated(message: {
  id: string;
  sender_id: string;
  receiver_id: string;
  conversation_id?: string;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const event = buildEvent(EventType.MESSAGE_CREATED, {
    message_id: message.id,
    sender_id: message.sender_id,
    receiver_id: message.receiver_id,
    conversation_id: message.conversation_id,
    content: message.content,
    metadata: message.metadata,
  });
  await safeEmit(event);
}

export async function emitMessageEdited(message: {
  id: string;
  sender_id: string;
  receiver_id: string;
  conversation_id?: string;
  content: string;
  previous_content: string;
}): Promise<void> {
  const event = buildEvent(EventType.MESSAGE_EDITED, {
    message_id: message.id,
    sender_id: message.sender_id,
    receiver_id: message.receiver_id,
    conversation_id: message.conversation_id,
    content: message.content,
    previous_content: message.previous_content,
  });
  await safeEmit(event);
}

// ─── Transaction Events ──────────────────────────────────────

export async function emitTransactionInitiated(tx: {
  id: string;
  user_id: string;
  counterparty_id?: string;
  amount: number;
  currency: string;
  payment_method?: string;
  status: string;
}): Promise<void> {
  const event = buildEvent(EventType.TRANSACTION_INITIATED, {
    transaction_id: tx.id,
    user_id: tx.user_id,
    counterparty_id: tx.counterparty_id,
    amount: tx.amount,
    currency: tx.currency,
    payment_method: tx.payment_method,
    status: tx.status,
  });
  await safeEmit(event);
}

export async function emitTransactionStatusChanged(tx: {
  id: string;
  user_id: string;
  counterparty_id?: string;
  amount: number;
  currency: string;
  payment_method?: string;
  status: string;
}): Promise<void> {
  const statusToEvent: Record<string, EventType> = {
    completed: EventType.TRANSACTION_COMPLETED,
    failed: EventType.TRANSACTION_FAILED,
    cancelled: EventType.TRANSACTION_CANCELLED,
  };
  const eventType = statusToEvent[tx.status] || EventType.TRANSACTION_COMPLETED;

  const event = buildEvent(eventType, {
    transaction_id: tx.id,
    user_id: tx.user_id,
    counterparty_id: tx.counterparty_id,
    amount: tx.amount,
    currency: tx.currency,
    payment_method: tx.payment_method,
    status: tx.status,
  });
  await safeEmit(event);
}

// ─── User Events ─────────────────────────────────────────────

export async function emitUserStatusChanged(user: {
  id: string;
  previous_status: string;
  new_status: string;
  reason?: string;
}): Promise<void> {
  const event = buildEvent(EventType.USER_STATUS_CHANGED, {
    user_id: user.id,
    previous_status: user.previous_status,
    new_status: user.new_status,
    reason: user.reason,
  });
  await safeEmit(event);
}

// ─── Appeal Events ───────────────────────────────────────────

export async function emitAppealSubmitted(appeal: {
  id: string;
  enforcement_action_id: string;
  user_id: string;
  reason: string;
}): Promise<void> {
  const event = buildEvent(EventType.APPEAL_SUBMITTED, {
    appeal_id: appeal.id,
    enforcement_action_id: appeal.enforcement_action_id,
    user_id: appeal.user_id,
    status: 'submitted',
    reason: appeal.reason,
  });
  await safeEmit(event);
}

export async function emitAppealResolved(appeal: {
  id: string;
  enforcement_action_id: string;
  user_id: string;
  status: string;
  resolution_notes?: string;
}): Promise<void> {
  const event = buildEvent(EventType.APPEAL_RESOLVED, {
    appeal_id: appeal.id,
    enforcement_action_id: appeal.enforcement_action_id,
    user_id: appeal.user_id,
    status: appeal.status,
    reason: appeal.resolution_notes,
  });
  await safeEmit(event);
}

// ─── Booking Events ─────────────────────────────────────────

export async function emitBookingCreated(booking: {
  id: string;
  client_id: string;
  provider_id: string;
  service_category?: string;
  amount?: number;
  currency?: string;
  status: string;
  scheduled_at?: string;
}): Promise<void> {
  const event = buildEvent(EventType.BOOKING_CREATED, {
    booking_id: booking.id,
    client_id: booking.client_id,
    provider_id: booking.provider_id,
    service_category: booking.service_category,
    amount: booking.amount,
    currency: booking.currency,
    status: booking.status,
    scheduled_at: booking.scheduled_at,
  });
  await safeEmit(event);
}

export async function emitBookingUpdated(booking: {
  id: string;
  client_id: string;
  provider_id: string;
  service_category?: string;
  amount?: number;
  currency?: string;
  status: string;
  scheduled_at?: string;
}): Promise<void> {
  const event = buildEvent(EventType.BOOKING_UPDATED, {
    booking_id: booking.id,
    client_id: booking.client_id,
    provider_id: booking.provider_id,
    service_category: booking.service_category,
    amount: booking.amount,
    currency: booking.currency,
    status: booking.status,
    scheduled_at: booking.scheduled_at,
  });
  await safeEmit(event);
}

export async function emitBookingCompleted(booking: {
  id: string;
  client_id: string;
  provider_id: string;
  service_category?: string;
  amount?: number;
  currency?: string;
  status: string;
}): Promise<void> {
  const event = buildEvent(EventType.BOOKING_COMPLETED, {
    booking_id: booking.id,
    client_id: booking.client_id,
    provider_id: booking.provider_id,
    service_category: booking.service_category,
    amount: booking.amount,
    currency: booking.currency,
    status: booking.status,
  });
  await safeEmit(event);
}

export async function emitBookingCancelled(booking: {
  id: string;
  client_id: string;
  provider_id: string;
  service_category?: string;
  amount?: number;
  currency?: string;
  status: string;
}): Promise<void> {
  const event = buildEvent(EventType.BOOKING_CANCELLED, {
    booking_id: booking.id,
    client_id: booking.client_id,
    provider_id: booking.provider_id,
    service_category: booking.service_category,
    amount: booking.amount,
    currency: booking.currency,
    status: booking.status,
  });
  await safeEmit(event);
}

// ─── Wallet Events ──────────────────────────────────────────

export async function emitWalletTransaction(tx: {
  id: string;
  user_id: string;
  counterparty_id?: string;
  tx_type: string;
  amount: number;
  currency: string;
  payment_method?: string;
  status: string;
}): Promise<void> {
  const txTypeToEvent: Record<string, EventType> = {
    deposit: EventType.WALLET_DEPOSIT,
    withdrawal: EventType.WALLET_WITHDRAWAL,
    transfer: EventType.WALLET_TRANSFER,
  };
  const eventType = txTypeToEvent[tx.tx_type] || EventType.WALLET_DEPOSIT;

  const event = buildEvent(eventType, {
    wallet_tx_id: tx.id,
    user_id: tx.user_id,
    counterparty_id: tx.counterparty_id,
    tx_type: tx.tx_type,
    amount: tx.amount,
    currency: tx.currency,
    payment_method: tx.payment_method,
    status: tx.status,
  });
  await safeEmit(event);
}

// ─── Contact & Rating Events (Phase 2C) ────────────────────

export async function emitContactFieldChanged(change: {
  user_id: string;
  field: 'phone' | 'email';
  old_value?: string;
  new_value: string;
}): Promise<void> {
  const event = buildEvent(EventType.CONTACT_FIELD_CHANGED, {
    user_id: change.user_id,
    field: change.field,
    old_value: change.old_value,
    new_value: change.new_value,
  });
  await safeEmit(event);
}

export async function emitRatingSubmitted(rating: {
  id: string;
  client_id: string;
  provider_id: string;
  booking_id?: string;
  score: number;
  comment?: string;
}): Promise<void> {
  const event = buildEvent(EventType.RATING_SUBMITTED, {
    rating_id: rating.id,
    client_id: rating.client_id,
    provider_id: rating.provider_id,
    booking_id: rating.booking_id,
    score: rating.score,
    comment: rating.comment,
  });
  await safeEmit(event);
}

// ─── Enforcement Events ──────────────────────────────────────

export async function emitEnforcementReversed(action: {
  id: string;
  user_id: string;
  action_type: string;
  reversal_reason: string;
}): Promise<void> {
  const event = buildEvent(EventType.ENFORCEMENT_ACTION_REVERSED, {
    action_id: action.id,
    user_id: action.user_id,
    action_type: action.action_type,
    reason: action.reversal_reason,
    reason_code: 'manual_reversal',
    signal_ids: [],
  });
  await safeEmit(event);
}
