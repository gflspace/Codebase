// QwickServices CIS — Webhook Event Normalizer
// Maps QwickServices Laravel webhook payloads → CIS DomainEvent format.
// Handles field renaming, event type mapping, and lazy user resolution.

import {
  EventType, DomainEvent, BookingEventPayload, WalletEventPayload, ProviderEventPayload,
  DisputeEventPayload, RefundEventPayload, ProfileUpdatedPayload,
} from './types';
import { generateId, nowISO } from '../shared/utils';
import { query } from '../database/connection';

export interface WebhookIngestPayload {
  event_id: string;
  event_type: string;
  timestamp: string;
  source: string;
  payload: Record<string, unknown>;
}

// ─── Event Type Mapping ─────────────────────────────────────

const LARAVEL_TO_CIS_EVENT: Record<string, EventType> = {
  // Booking events
  'booking-save': EventType.BOOKING_CREATED,
  'booking-create': EventType.BOOKING_CREATED,
  'booking-update': EventType.BOOKING_UPDATED,
  'booking-complete': EventType.BOOKING_COMPLETED,
  'booking-cancel': EventType.BOOKING_CANCELLED,
  'booking-no-show': EventType.BOOKING_NO_SHOW,

  // Wallet/payment events
  'save-payment': EventType.WALLET_DEPOSIT,
  'payment-deposit': EventType.WALLET_DEPOSIT,
  'payment-withdrawal': EventType.WALLET_WITHDRAWAL,
  'payment-transfer': EventType.WALLET_TRANSFER,

  // Provider events
  'provider-register': EventType.PROVIDER_REGISTERED,
  'provider-update': EventType.PROVIDER_UPDATED,

  // User events
  'user-register': EventType.USER_REGISTERED,
  'user-create': EventType.USER_REGISTERED,

  // Dispute events
  'dispute.filed': EventType.DISPUTE_OPENED,
  'dispute-create': EventType.DISPUTE_OPENED,
  'dispute.resolved': EventType.DISPUTE_RESOLVED,
  'dispute-resolve': EventType.DISPUTE_RESOLVED,

  // Refund events
  'payment.refunded': EventType.REFUND_PROCESSED,
  'refund-process': EventType.REFUND_PROCESSED,

  // Profile events
  'user.profile_updated': EventType.PROFILE_UPDATED,
  'profile-update': EventType.PROFILE_UPDATED,

  // Chat events (alternative naming from QwickServices)
  'chat.message_sent': EventType.MESSAGE_CREATED,
  'chat.message_edited': EventType.MESSAGE_EDITED,

  // Rating events (alternative naming)
  'rating.submitted': EventType.RATING_SUBMITTED,

  // Contact change events (alternative naming)
  'contact.field_changed': EventType.CONTACT_FIELD_CHANGED,

  // Category events
  'category-create': EventType.CATEGORY_CREATED,
  'category-update': EventType.CATEGORY_UPDATED,
};

export function mapEventType(laravelEventType: string): EventType | null {
  return LARAVEL_TO_CIS_EVENT[laravelEventType] || null;
}

// ─── Payload Mappers ────────────────────────────────────────

export function mapBookingPayload(raw: Record<string, unknown>): BookingEventPayload {
  return {
    booking_id: String(raw.booking_id || raw.id || ''),
    client_id: String(raw.customer_id || raw.client_id || ''),
    provider_id: String(raw.provider_id || raw.seller_id || ''),
    service_category: raw.service_category as string | undefined,
    amount: raw.amount != null ? Number(raw.amount) : undefined,
    currency: (raw.currency as string) || 'USD',
    status: String(raw.status || 'pending'),
    scheduled_at: raw.scheduled_at as string | undefined,
  };
}

export function mapWalletPayload(raw: Record<string, unknown>): WalletEventPayload {
  return {
    wallet_tx_id: String(raw.transaction_id || raw.id || ''),
    user_id: String(raw.user_id || raw.customer_id || ''),
    counterparty_id: raw.counterparty_id ? String(raw.counterparty_id) : undefined,
    tx_type: String(raw.tx_type || raw.type || 'deposit'),
    amount: Number(raw.amount || 0),
    currency: String(raw.currency || 'USD'),
    payment_method: raw.payment_method as string | undefined,
    status: String(raw.status || 'pending'),
  };
}

export function mapProviderPayload(raw: Record<string, unknown>): ProviderEventPayload {
  return {
    provider_id: String(raw.provider_id || raw.id || ''),
    user_id: String(raw.user_id || raw.provider_id || raw.id || ''),
    service_category: raw.service_category as string | undefined,
    metadata: (raw.metadata as Record<string, unknown>) || undefined,
  };
}

export function mapDisputePayload(raw: Record<string, unknown>): DisputeEventPayload {
  return {
    dispute_id: String(raw.dispute_id || raw.id || ''),
    booking_id: String(raw.booking_id || ''),
    complainant_id: String(raw.complainant_id || raw.user_id || raw.client_id || ''),
    respondent_id: String(raw.respondent_id || raw.provider_id || ''),
    dispute_type: String(raw.dispute_type || raw.type || 'other'),
    reason: String(raw.reason || ''),
    status: String(raw.status || 'open'),
  };
}

export function mapRefundPayload(raw: Record<string, unknown>): RefundEventPayload {
  return {
    refund_id: String(raw.refund_id || raw.id || ''),
    transaction_id: String(raw.transaction_id || raw.payment_id || ''),
    user_id: String(raw.user_id || raw.customer_id || ''),
    amount: Number(raw.amount || 0),
    currency: String(raw.currency || 'USD'),
    reason: String(raw.reason || ''),
    status: String(raw.status || 'processed'),
  };
}

export function mapProfileUpdatedPayload(raw: Record<string, unknown>): ProfileUpdatedPayload {
  return {
    user_id: String(raw.user_id || raw.id || ''),
    fields_changed: Array.isArray(raw.fields_changed)
      ? (raw.fields_changed as string[])
      : (raw.changed_fields ? (raw.changed_fields as string[]) : []),
    metadata: (raw.metadata as Record<string, unknown>) || undefined,
  };
}

function mapUserRegisteredPayload(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    user_id: String(raw.user_id || raw.id || ''),
    external_id: raw.external_id ? String(raw.external_id) : undefined,
    display_name: raw.display_name || raw.name || undefined,
    email: raw.email || undefined,
    user_type: raw.user_type || raw.type || undefined,
  };
}

// ─── User Resolution ────────────────────────────────────────

export async function resolveOrCreateUser(externalId: string): Promise<string> {
  // Look up existing user by external_id
  const existing = await query(
    'SELECT id FROM users WHERE external_id = $1 LIMIT 1',
    [externalId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Auto-create CIS user record for unrecognized external IDs
  const newId = generateId();
  await query(
    `INSERT INTO users (id, external_id, status, created_at, updated_at)
     VALUES ($1, $2, 'active', NOW(), NOW())`,
    [newId, externalId]
  );

  console.log(`[Normalizer] Auto-created CIS user for external_id=${externalId} → ${newId}`);
  return newId;
}

// ─── Main Normalizer ────────────────────────────────────────

export async function normalizeWebhookEvent(
  webhookPayload: WebhookIngestPayload
): Promise<DomainEvent> {
  const eventType = mapEventType(webhookPayload.event_type);

  if (!eventType) {
    throw new Error(`Unknown webhook event type: ${webhookPayload.event_type}`);
  }

  let payload: Record<string, unknown>;

  // Map payload based on event category
  if (eventType.startsWith('booking.')) {
    const mapped = mapBookingPayload(webhookPayload.payload);

    // Resolve external IDs to CIS user IDs
    if (mapped.client_id && !isUUID(mapped.client_id)) {
      mapped.client_id = await resolveOrCreateUser(mapped.client_id);
    }
    if (mapped.provider_id && !isUUID(mapped.provider_id)) {
      mapped.provider_id = await resolveOrCreateUser(mapped.provider_id);
    }

    payload = mapped as unknown as Record<string, unknown>;
  } else if (eventType.startsWith('wallet.')) {
    const mapped = mapWalletPayload(webhookPayload.payload);

    if (mapped.user_id && !isUUID(mapped.user_id)) {
      mapped.user_id = await resolveOrCreateUser(mapped.user_id);
    }
    if (mapped.counterparty_id && !isUUID(mapped.counterparty_id)) {
      mapped.counterparty_id = await resolveOrCreateUser(mapped.counterparty_id);
    }

    payload = mapped as unknown as Record<string, unknown>;
  } else if (eventType.startsWith('provider.')) {
    const mapped = mapProviderPayload(webhookPayload.payload);

    if (mapped.user_id && !isUUID(mapped.user_id)) {
      mapped.user_id = await resolveOrCreateUser(mapped.user_id);
    }

    payload = mapped as unknown as Record<string, unknown>;
  } else if (eventType.startsWith('dispute.')) {
    const mapped = mapDisputePayload(webhookPayload.payload);

    if (mapped.complainant_id && !isUUID(mapped.complainant_id)) {
      mapped.complainant_id = await resolveOrCreateUser(mapped.complainant_id);
    }
    if (mapped.respondent_id && !isUUID(mapped.respondent_id)) {
      mapped.respondent_id = await resolveOrCreateUser(mapped.respondent_id);
    }

    payload = mapped as unknown as Record<string, unknown>;
  } else if (eventType === EventType.REFUND_PROCESSED) {
    const mapped = mapRefundPayload(webhookPayload.payload);

    if (mapped.user_id && !isUUID(mapped.user_id)) {
      mapped.user_id = await resolveOrCreateUser(mapped.user_id);
    }

    payload = mapped as unknown as Record<string, unknown>;
  } else if (eventType === EventType.PROFILE_UPDATED) {
    const mapped = mapProfileUpdatedPayload(webhookPayload.payload);

    if (mapped.user_id && !isUUID(mapped.user_id)) {
      mapped.user_id = await resolveOrCreateUser(mapped.user_id);
    }

    payload = mapped as unknown as Record<string, unknown>;
  } else {
    // user.registered and other events — pass through with basic mapping
    payload = mapUserRegisteredPayload(webhookPayload.payload);
  }

  return {
    id: generateId(),
    type: eventType,
    correlation_id: generateId(),
    timestamp: webhookPayload.timestamp || nowISO(),
    version: 1,
    payload,
  };
}

// ─── Helpers ────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(value: string): boolean {
  return UUID_RE.test(value);
}
