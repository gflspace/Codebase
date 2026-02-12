// QwickServices CIS — Webhook Event Normalizer
// Maps QwickServices Laravel webhook payloads → CIS DomainEvent format.
// Handles field renaming, event type mapping, and lazy user resolution.

import { EventType, DomainEvent, BookingEventPayload, WalletEventPayload, ProviderEventPayload } from './types';
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
