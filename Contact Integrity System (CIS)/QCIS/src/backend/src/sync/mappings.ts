// QwickServices CIS — Table/Field Mappings for Data Sync
// Defines how QwickServices MySQL tables map to CIS domain events.
// Column names match the ACTUAL QwickServices Laravel schema (verified 2026-02-16).

import { EventType } from '../events/types';

/**
 * Configuration for syncing a single QwickServices table.
 */
export interface TableMapping {
  /** QwickServices table name */
  sourceTable: string;
  /** Column used to track sync position (must be indexed, monotonically increasing) */
  cursorColumn: string;
  /** Column that identifies the primary key */
  primaryKeyColumn: string;
  /** SQL columns to SELECT (use aliases for normalization) */
  selectColumns: string;
  /** Which CIS event type(s) to emit for new/updated records */
  eventTypeMapping: (row: Record<string, unknown>) => EventType;
  /** Transform a database row into a CIS event payload */
  transformPayload: (row: Record<string, unknown>) => Record<string, unknown>;
  /** Extract the primary user ID for CIS user auto-provisioning */
  extractUserId: (row: Record<string, unknown>) => string | null;
  /** Optional: extract a counterparty user ID */
  extractCounterpartyId?: (row: Record<string, unknown>) => string | null;
  /** Optional WHERE clause filter (appended to sync query) */
  extraFilter?: string;
  /** Optional: expected column types for Phase 2 type-level drift verification */
  expectedColumnTypes?: Record<string, string[]>;
}

// ─── Mapping Definitions (Actual QwickServices Schema) ──────

export const TABLE_MAPPINGS: TableMapping[] = [
  // ─── Categories ────────────────────────────────────────────
  // PK: id (bigint unsigned), status: tinyint (1=active, 0=inactive)
  {
    sourceTable: 'categories',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id, name, description, is_featured, status, created_at, updated_at
    `,
    extraFilter: `status = 1`,
    eventTypeMapping: (row) => {
      if (row.created_at && row.updated_at) {
        const created = new Date(String(row.created_at)).getTime();
        const updated = new Date(String(row.updated_at)).getTime();
        if (updated - created <= 1000) return EventType.CATEGORY_CREATED;
      }
      return EventType.CATEGORY_UPDATED;
    },
    transformPayload: (row) => ({
      category_id: String(row.id),
      name: String(row.name || ''),
      is_featured: row.is_featured === 1 || row.is_featured === true,
      status: row.status === 1 || row.status === true ? 'active' : 'inactive',
    }),
    extractUserId: () => null, // Categories have no user
  },

  // ─── Users (Customers) ────────────────────────────────────
  // PK: id (bigint unsigned). user_type distinguishes customers from providers.
  // phone_number (not phone), wallet_balance is varchar.
  {
    sourceTable: 'users',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id, first_name, last_name, email, user_type, phone_number,
      is_active, is_email_verified, is_phone_verified, is_kyc_verified,
      wallet_balance, created_at, updated_at
    `,
    extraFilter: `is_active = 1 AND deleted_at IS NULL`,
    eventTypeMapping: (row) => {
      const userType = String(row.user_type || '').toLowerCase();
      if (userType === 'provider' || userType === 'handyman') {
        if (row.created_at && row.updated_at) {
          const created = new Date(String(row.created_at)).getTime();
          const updated = new Date(String(row.updated_at)).getTime();
          if (updated - created <= 1000) return EventType.PROVIDER_REGISTERED;
        }
        return EventType.PROVIDER_UPDATED;
      }
      return EventType.USER_REGISTERED;
    },
    transformPayload: (row) => ({
      user_id: String(row.id),
      external_id: String(row.id),
      email: row.email || null,
      phone: row.phone_number || null,
      user_type: String(row.user_type || 'customer'),
      metadata: {
        first_name: row.first_name || null,
        last_name: row.last_name || null,
        is_email_verified: row.is_email_verified === 1 || row.is_email_verified === true,
        is_phone_verified: row.is_phone_verified === 1 || row.is_phone_verified === true,
        is_kyc_verified: row.is_kyc_verified === 1 || row.is_kyc_verified === true,
        wallet_balance: row.wallet_balance != null ? parseFloat(String(row.wallet_balance)) : 0,
      },
    }),
    extractUserId: (row) => row.id ? String(row.id) : null,
  },

  // ─── Payments (was "transactions" in blueprint) ───────────
  // PK: id (bigint unsigned). Actual table is `payments`.
  // user_id = payer, booking_id links to booking, payment_type = method.
  {
    sourceTable: 'payments',
    cursorColumn: 'created_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id, user_id, booking_id, total_amount, payment_type, txn_id,
      payment_status, transaction_fee, refund_id, refund_amount,
      created_at, updated_at
    `,
    extraFilter: `deleted_at IS NULL`,
    eventTypeMapping: (row) => {
      const status = String(row.payment_status || '').toLowerCase();
      if (status === 'paid' || status === 'completed' || status === 'success') return EventType.TRANSACTION_COMPLETED;
      if (status === 'failed' || status === 'rejected') return EventType.TRANSACTION_FAILED;
      if (status === 'cancelled' || status === 'refunded') return EventType.TRANSACTION_CANCELLED;
      return EventType.TRANSACTION_INITIATED;
    },
    transformPayload: (row) => ({
      transaction_id: String(row.id),
      user_id: String(row.user_id),
      booking_id: row.booking_id ? String(row.booking_id) : undefined,
      amount: parseFloat(String(row.total_amount || 0)),
      currency: 'USD',
      payment_method: String(row.payment_type || 'unknown'),
      txn_id: row.txn_id ? String(row.txn_id) : undefined,
      transaction_fee: row.transaction_fee ? parseFloat(String(row.transaction_fee)) : 0,
      status: String(row.payment_status || 'pending'),
      refund_id: row.refund_id ? String(row.refund_id) : undefined,
      refund_amount: row.refund_amount ? parseFloat(String(row.refund_amount)) : 0,
    }),
    extractUserId: (row) => row.user_id ? String(row.user_id) : null,
  },

  // ─── Bookings ──────────────────────────────────────────────
  // PK: id (bigint unsigned). booking_uid is unique identifier.
  // date = scheduled time, completed_at = completion time.
  // status enum: pending, accept, on_going, in_progress, hold, cancelled,
  //   rejected, failed, completed, pending_approval, waiting
  {
    sourceTable: 'bookings',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id, booking_uid, user_id, provider_id, service_id, category_id,
      status, total_amount, date, completed_at, cancelled_at,
      created_at, updated_at
    `,
    eventTypeMapping: (row) => {
      const status = String(row.status || '').toLowerCase();
      if (status === 'cancelled' || status === 'rejected') return EventType.BOOKING_CANCELLED;
      if (status === 'completed') return EventType.BOOKING_COMPLETED;
      if (status === 'failed') return EventType.BOOKING_CANCELLED;
      if (status === 'accept' || status === 'on_going' || status === 'in_progress') return EventType.BOOKING_UPDATED;
      return EventType.BOOKING_CREATED;
    },
    transformPayload: (row) => ({
      booking_id: String(row.id),
      booking_uid: row.booking_uid ? String(row.booking_uid) : undefined,
      client_id: String(row.user_id),
      provider_id: row.provider_id ? String(row.provider_id) : undefined,
      service_id: row.service_id ? String(row.service_id) : undefined,
      category_id: row.category_id ? String(row.category_id) : undefined,
      amount: parseFloat(String(row.total_amount || 0)),
      currency: 'USD',
      status: String(row.status || 'pending'),
      scheduled_at: row.date ? new Date(String(row.date)).toISOString() : undefined,
      completed_at: row.completed_at ? new Date(String(row.completed_at)).toISOString() : undefined,
      cancelled_at: row.cancelled_at ? new Date(String(row.cancelled_at)).toISOString() : undefined,
    }),
    extractUserId: (row) => row.user_id ? String(row.user_id) : null,
    extractCounterpartyId: (row) => row.provider_id ? String(row.provider_id) : null,
  },

  // ─── Notifications (replaces "messages" from blueprint) ───
  // PK: id (char(36) UUID). Laravel notification table.
  // notifiable_type + notifiable_id = recipient, data = JSON payload.
  {
    sourceTable: 'notifications',
    cursorColumn: 'created_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id, type, notifiable_type, notifiable_id, data, read_at,
      created_at, updated_at
    `,
    eventTypeMapping: () => EventType.MESSAGE_CREATED,
    transformPayload: (row) => ({
      message_id: String(row.id),
      receiver_id: String(row.notifiable_id),
      sender_id: 'system', // Laravel notifications are system-generated
      notification_type: String(row.type || ''),
      message_type: 'notification',
      read_at: row.read_at ? String(row.read_at) : null,
      data: row.data ? String(row.data) : '{}',
    }),
    extractUserId: (row) => row.notifiable_id ? String(row.notifiable_id) : null,
  },

  // ─── Ratings ──────────────────────────────────────────────
  // PK: id (bigint unsigned). customer_id + provider_id (not reviewer/reviewee).
  // review (not comment), rating is tinyint unsigned.
  {
    sourceTable: 'ratings',
    cursorColumn: 'created_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id, booking_id, provider_id, customer_id, rating, review, status,
      created_at, updated_at
    `,
    eventTypeMapping: () => EventType.RATING_SUBMITTED,
    transformPayload: (row) => ({
      rating_id: String(row.id),
      client_id: String(row.customer_id),
      provider_id: String(row.provider_id),
      booking_id: row.booking_id ? String(row.booking_id) : undefined,
      score: parseInt(String(row.rating || 5), 10),
      comment: row.review ? String(row.review) : undefined,
      status: row.status === 1 || row.status === true ? 'active' : 'hidden',
    }),
    extractUserId: (row) => row.customer_id ? String(row.customer_id) : null,
    extractCounterpartyId: (row) => row.provider_id ? String(row.provider_id) : null,
  },

  // ─── Suspicious Activities (replaces "disputes" from blueprint) ─
  // PK: id (bigint unsigned). user_id = reported user.
  // device_id, description, status (default 'pending'), admin_notes.
  {
    sourceTable: 'suspicious_activities',
    cursorColumn: 'updated_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id, user_id, device_id, description, status, admin_notes,
      created_at, updated_at
    `,
    eventTypeMapping: (row) => {
      const status = String(row.status || '').toLowerCase();
      if (status === 'resolved' || status === 'dismissed' || status === 'cleared')
        return EventType.DISPUTE_RESOLVED;
      return EventType.DISPUTE_OPENED;
    },
    transformPayload: (row) => ({
      dispute_id: String(row.id),
      complainant_id: 'system', // System-detected suspicious activity
      respondent_id: String(row.user_id),
      device_id: row.device_id ? String(row.device_id) : undefined,
      reason: row.description ? String(row.description) : '',
      status: String(row.status || 'pending'),
      admin_notes: row.admin_notes ? String(row.admin_notes) : undefined,
    }),
    extractUserId: (row) => row.user_id ? String(row.user_id) : null,
  },

  // ─── Booking Activities (status change history) ───────────
  // PK: id (bigint unsigned). Tracks every booking status transition.
  {
    sourceTable: 'booking_activities',
    cursorColumn: 'created_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id, booking_id, datetime, activity_type, activity_message,
      created_at, updated_at
    `,
    extraFilter: `deleted_at IS NULL`,
    eventTypeMapping: () => EventType.BOOKING_UPDATED,
    transformPayload: (row) => ({
      activity_id: String(row.id),
      booking_id: row.booking_id ? String(row.booking_id) : undefined,
      activity_type: row.activity_type ? String(row.activity_type) : 'status_change',
      activity_message: row.activity_message ? String(row.activity_message) : '',
      datetime: row.datetime ? String(row.datetime) : undefined,
    }),
    extractUserId: () => null, // Booking activities don't directly reference a user
  },

  // ─── Wallet Histories (financial flows) ───────────────────
  // PK: id (bigint unsigned). sender_id/receiver_id for transfers.
  {
    sourceTable: 'wallet_histories',
    cursorColumn: 'created_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id, user_id, transaction_id, sender_id, receiver_id,
      type, amount, balance, activity_type, activity_message,
      created_at, updated_at
    `,
    eventTypeMapping: (row) => {
      const actType = String(row.activity_type || row.type || '').toLowerCase();
      if (actType.includes('deposit') || actType.includes('credit')) return EventType.WALLET_DEPOSIT;
      if (actType.includes('withdraw') || actType.includes('debit')) return EventType.WALLET_WITHDRAWAL;
      if (actType.includes('transfer')) return EventType.WALLET_TRANSFER;
      return EventType.WALLET_DEPOSIT;
    },
    transformPayload: (row) => ({
      wallet_tx_id: String(row.id),
      user_id: String(row.user_id),
      sender_id: row.sender_id ? String(row.sender_id) : undefined,
      receiver_id: row.receiver_id ? String(row.receiver_id) : undefined,
      tx_type: String(row.activity_type || row.type || 'unknown'),
      amount: parseFloat(String(row.amount || 0)),
      balance: parseFloat(String(row.balance || 0)),
      currency: 'USD',
      status: 'completed',
    }),
    extractUserId: (row) => row.user_id ? String(row.user_id) : null,
    extractCounterpartyId: (row) => row.receiver_id ? String(row.receiver_id) : null,
  },

  // ─── Login Activities (device/IP tracking) ────────────────
  // PK: id (bigint unsigned). Critical for device fingerprinting.
  {
    sourceTable: 'login_activities',
    cursorColumn: 'created_at',
    primaryKeyColumn: 'id',
    selectColumns: `
      id, user_id, ip_address, device_type, browser, location,
      created_at, updated_at
    `,
    eventTypeMapping: () => EventType.USER_LOGGED_IN,
    transformPayload: (row) => ({
      login_id: String(row.id),
      user_id: String(row.user_id),
      ip_address: row.ip_address ? String(row.ip_address) : undefined,
      device_type: row.device_type ? String(row.device_type) : undefined,
      browser: row.browser ? String(row.browser) : undefined,
      location: row.location ? String(row.location) : undefined,
    }),
    extractUserId: (row) => row.user_id ? String(row.user_id) : null,
  },
];

/**
 * Get mapping for a specific table.
 */
export function getMappingForTable(sourceTable: string): TableMapping | undefined {
  return TABLE_MAPPINGS.find(m => m.sourceTable === sourceTable);
}
