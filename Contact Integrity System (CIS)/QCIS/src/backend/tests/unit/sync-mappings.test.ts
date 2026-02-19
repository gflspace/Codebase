// QwickServices CIS — Sync Mappings Validation Tests
// Validates each mapping has correct structure, event types, and transform functions.
// Aligned to ACTUAL QwickServices MySQL schema (verified 2026-02-16).

import { describe, it, expect } from 'vitest';
import { TABLE_MAPPINGS, getMappingForTable } from '../../src/sync/mappings';
import { EventType } from '../../src/events/types';

// ─── Structural Validation ──────────────────────────────────

describe('TABLE_MAPPINGS structure', () => {
  it('has 10 mappings (actual QwickServices tables)', () => {
    expect(TABLE_MAPPINGS.length).toBe(10);
  });

  it('all mappings have required fields', () => {
    for (const m of TABLE_MAPPINGS) {
      expect(m.sourceTable).toBeTruthy();
      expect(m.cursorColumn).toBeTruthy();
      expect(m.primaryKeyColumn).toBeTruthy();
      expect(m.selectColumns).toBeTruthy();
      expect(typeof m.eventTypeMapping).toBe('function');
      expect(typeof m.transformPayload).toBe('function');
      expect(typeof m.extractUserId).toBe('function');
    }
  });

  it('each sourceTable is unique', () => {
    const tables = TABLE_MAPPINGS.map(m => m.sourceTable);
    expect(new Set(tables).size).toBe(tables.length);
  });

  it('selectColumns include the primaryKeyColumn', () => {
    for (const m of TABLE_MAPPINGS) {
      expect(m.selectColumns).toContain(m.primaryKeyColumn);
    }
  });

  it('selectColumns include the cursorColumn', () => {
    for (const m of TABLE_MAPPINGS) {
      expect(m.selectColumns).toContain(m.cursorColumn);
    }
  });

  it('all PKs are "id" (actual QwickServices schema uses bigint auto-increment)', () => {
    for (const m of TABLE_MAPPINGS) {
      expect(m.primaryKeyColumn).toBe('id');
    }
  });
});

// ─── Categories Mapping ─────────────────────────────────────

describe('categories mapping', () => {
  const mapping = getMappingForTable('categories')!;

  it('exists and uses correct columns', () => {
    expect(mapping).toBeDefined();
    expect(mapping.primaryKeyColumn).toBe('id');
    expect(mapping.cursorColumn).toBe('updated_at');
    expect(mapping.extraFilter).toContain('status = 1');
  });

  it('emits CATEGORY_CREATED for new rows', () => {
    const now = '2026-02-14T12:00:00Z';
    const row = { id: 1, name: 'Plumbing', created_at: now, updated_at: now, status: 1 };
    expect(mapping.eventTypeMapping(row)).toBe(EventType.CATEGORY_CREATED);
  });

  it('emits CATEGORY_UPDATED for updated rows', () => {
    const row = {
      id: 1, name: 'Plumbing',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-14T12:00:00Z',
      status: 1,
    };
    expect(mapping.eventTypeMapping(row)).toBe(EventType.CATEGORY_UPDATED);
  });

  it('transforms payload correctly', () => {
    const row = { id: 42, name: 'Electrical', is_featured: 1, status: 1 };
    const payload = mapping.transformPayload(row);
    expect(payload.category_id).toBe('42');
    expect(payload.name).toBe('Electrical');
    expect(payload.is_featured).toBe(true);
    expect(payload.status).toBe('active');
  });

  it('extractUserId returns null (categories have no user)', () => {
    expect(mapping.extractUserId({ id: 1 })).toBeNull();
  });
});

// ─── Users Mapping (customers + providers) ──────────────────

describe('users mapping', () => {
  const mapping = getMappingForTable('users')!;

  it('uses id as primary key', () => {
    expect(mapping.primaryKeyColumn).toBe('id');
  });

  it('filters to active non-deleted users', () => {
    expect(mapping.extraFilter).toContain('is_active = 1');
    expect(mapping.extraFilter).toContain('deleted_at IS NULL');
  });

  it('emits USER_REGISTERED for customer rows', () => {
    expect(mapping.eventTypeMapping({ user_type: 'customer' })).toBe(EventType.USER_REGISTERED);
  });

  it('emits PROVIDER_REGISTERED for new provider rows', () => {
    const now = '2026-02-14T12:00:00Z';
    expect(mapping.eventTypeMapping({ user_type: 'provider', created_at: now, updated_at: now }))
      .toBe(EventType.PROVIDER_REGISTERED);
  });

  it('emits PROVIDER_UPDATED for updated provider rows', () => {
    expect(mapping.eventTypeMapping({
      user_type: 'provider',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-14T12:00:00Z',
    })).toBe(EventType.PROVIDER_UPDATED);
  });

  it('transforms payload with phone_number (not phone)', () => {
    const row = {
      id: 1, first_name: 'John', last_name: 'Doe',
      email: 'test@test.com', phone_number: '+1234567890',
      user_type: 'customer',
      is_email_verified: 1, is_phone_verified: 0, is_kyc_verified: 0,
      wallet_balance: '100.50',
    };
    const payload = mapping.transformPayload(row);
    expect(payload.user_id).toBe('1');
    expect(payload.email).toBe('test@test.com');
    expect(payload.phone).toBe('+1234567890');
    expect(payload.user_type).toBe('customer');
    const meta = payload.metadata as Record<string, unknown>;
    expect(meta.wallet_balance).toBe(100.5);
    expect(meta.is_email_verified).toBe(true);
    expect(meta.first_name).toBe('John');
  });
});

// ─── Payments Mapping (was "transactions" in blueprint) ─────

describe('payments mapping', () => {
  const mapping = getMappingForTable('payments')!;

  it('uses id as primary key', () => {
    expect(mapping.primaryKeyColumn).toBe('id');
  });

  it('uses created_at as cursor', () => {
    expect(mapping.cursorColumn).toBe('created_at');
  });

  it('filters out soft-deleted records', () => {
    expect(mapping.extraFilter).toContain('deleted_at IS NULL');
  });

  it('emits correct event types by payment_status', () => {
    expect(mapping.eventTypeMapping({ payment_status: 'pending' })).toBe(EventType.TRANSACTION_INITIATED);
    expect(mapping.eventTypeMapping({ payment_status: 'paid' })).toBe(EventType.TRANSACTION_COMPLETED);
    expect(mapping.eventTypeMapping({ payment_status: 'completed' })).toBe(EventType.TRANSACTION_COMPLETED);
    expect(mapping.eventTypeMapping({ payment_status: 'failed' })).toBe(EventType.TRANSACTION_FAILED);
    expect(mapping.eventTypeMapping({ payment_status: 'cancelled' })).toBe(EventType.TRANSACTION_CANCELLED);
  });

  it('transforms payload with actual column names', () => {
    const row = {
      id: 1, booking_id: 2, user_id: 3,
      total_amount: 150.00, payment_type: 'credit_card',
      payment_status: 'paid', transaction_fee: 3.50,
    };
    const payload = mapping.transformPayload(row);
    expect(payload.transaction_id).toBe('1');
    expect(payload.user_id).toBe('3');
    expect(payload.amount).toBe(150);
    expect(payload.payment_method).toBe('credit_card');
    expect(payload.transaction_fee).toBe(3.5);
  });
});

// ─── Bookings Mapping ───────────────────────────────────────

describe('bookings mapping', () => {
  const mapping = getMappingForTable('bookings')!;

  it('uses id as primary key', () => {
    expect(mapping.primaryKeyColumn).toBe('id');
  });

  it('no extra filter (no archived status in actual schema)', () => {
    // Actual schema uses enum statuses, not an 'archived' status
    expect(mapping.extraFilter).toBeUndefined();
  });

  it('emits correct event types by status enum', () => {
    expect(mapping.eventTypeMapping({ status: 'pending' })).toBe(EventType.BOOKING_CREATED);
    expect(mapping.eventTypeMapping({ status: 'accept' })).toBe(EventType.BOOKING_UPDATED);
    expect(mapping.eventTypeMapping({ status: 'on_going' })).toBe(EventType.BOOKING_UPDATED);
    expect(mapping.eventTypeMapping({ status: 'in_progress' })).toBe(EventType.BOOKING_UPDATED);
    expect(mapping.eventTypeMapping({ status: 'completed' })).toBe(EventType.BOOKING_COMPLETED);
    expect(mapping.eventTypeMapping({ status: 'cancelled' })).toBe(EventType.BOOKING_CANCELLED);
    expect(mapping.eventTypeMapping({ status: 'rejected' })).toBe(EventType.BOOKING_CANCELLED);
  });

  it('transforms payload with actual column names (date, completed_at)', () => {
    const row = {
      id: 1, booking_uid: 'BK-001', user_id: 3, provider_id: 5,
      service_id: 10, category_id: 2, status: 'pending',
      total_amount: '200.00', date: '2026-03-01T10:00:00',
    };
    const payload = mapping.transformPayload(row);
    expect(payload.booking_id).toBe('1');
    expect(payload.booking_uid).toBe('BK-001');
    expect(payload.client_id).toBe('3');
    expect(payload.provider_id).toBe('5');
    expect(payload.amount).toBe(200);
  });

  it('extracts user_id and provider_id', () => {
    const row = { id: 1, user_id: 3, provider_id: 5 };
    expect(mapping.extractUserId(row)).toBe('3');
    expect(mapping.extractCounterpartyId!(row)).toBe('5');
  });
});

// ─── Notifications Mapping (replaces messages) ──────────────

describe('notifications mapping', () => {
  const mapping = getMappingForTable('notifications')!;

  it('uses id as primary key (UUID char(36))', () => {
    expect(mapping.primaryKeyColumn).toBe('id');
  });

  it('uses created_at as cursor', () => {
    expect(mapping.cursorColumn).toBe('created_at');
  });

  it('emits MESSAGE_CREATED', () => {
    expect(mapping.eventTypeMapping({})).toBe(EventType.MESSAGE_CREATED);
  });

  it('transforms payload with notification fields', () => {
    const row = {
      id: 'abc-123', type: 'App\\Notifications\\BookingCreated',
      notifiable_type: 'App\\Models\\User', notifiable_id: 5,
      data: '{"booking_id":1}', read_at: null,
    };
    const payload = mapping.transformPayload(row);
    expect(payload.message_id).toBe('abc-123');
    expect(payload.receiver_id).toBe('5');
    expect(payload.sender_id).toBe('system');
    expect(payload.message_type).toBe('notification');
  });
});

// ─── Ratings Mapping ────────────────────────────────────────

describe('ratings mapping', () => {
  const mapping = getMappingForTable('ratings')!;

  it('exists with correct cursor', () => {
    expect(mapping).toBeDefined();
    expect(mapping.cursorColumn).toBe('created_at');
    expect(mapping.primaryKeyColumn).toBe('id');
  });

  it('emits RATING_SUBMITTED', () => {
    expect(mapping.eventTypeMapping({})).toBe(EventType.RATING_SUBMITTED);
  });

  it('transforms with customer_id/provider_id (actual column names)', () => {
    const row = { id: 1, customer_id: 3, provider_id: 5, rating: 4, booking_id: 2, review: 'Great!' };
    const payload = mapping.transformPayload(row);
    expect(payload.client_id).toBe('3');
    expect(payload.provider_id).toBe('5');
    expect(payload.score).toBe(4);
    expect(payload.comment).toBe('Great!');
  });
});

// ─── Suspicious Activities Mapping (replaces disputes) ──────

describe('suspicious_activities mapping', () => {
  const mapping = getMappingForTable('suspicious_activities')!;

  it('exists with correct columns', () => {
    expect(mapping).toBeDefined();
    expect(mapping.cursorColumn).toBe('updated_at');
    expect(mapping.primaryKeyColumn).toBe('id');
  });

  it('emits DISPUTE_OPENED for pending status', () => {
    expect(mapping.eventTypeMapping({ status: 'pending' })).toBe(EventType.DISPUTE_OPENED);
  });

  it('emits DISPUTE_RESOLVED for resolved/cleared status', () => {
    expect(mapping.eventTypeMapping({ status: 'resolved' })).toBe(EventType.DISPUTE_RESOLVED);
    expect(mapping.eventTypeMapping({ status: 'dismissed' })).toBe(EventType.DISPUTE_RESOLVED);
    expect(mapping.eventTypeMapping({ status: 'cleared' })).toBe(EventType.DISPUTE_RESOLVED);
  });

  it('transforms payload with user_id and device_id', () => {
    const row = { id: 1, user_id: 5, device_id: 'dev-abc', description: 'Multiple accounts', status: 'pending' };
    const payload = mapping.transformPayload(row);
    expect(payload.dispute_id).toBe('1');
    expect(payload.respondent_id).toBe('5');
    expect(payload.device_id).toBe('dev-abc');
    expect(payload.reason).toBe('Multiple accounts');
  });
});

// ─── Booking Activities Mapping ─────────────────────────────

describe('booking_activities mapping', () => {
  const mapping = getMappingForTable('booking_activities')!;

  it('exists and uses created_at cursor', () => {
    expect(mapping).toBeDefined();
    expect(mapping.cursorColumn).toBe('created_at');
  });

  it('emits BOOKING_UPDATED', () => {
    expect(mapping.eventTypeMapping({})).toBe(EventType.BOOKING_UPDATED);
  });

  it('filters out soft-deleted records', () => {
    expect(mapping.extraFilter).toContain('deleted_at IS NULL');
  });
});

// ─── Wallet Histories Mapping ───────────────────────────────

describe('wallet_histories mapping', () => {
  const mapping = getMappingForTable('wallet_histories')!;

  it('exists and uses created_at cursor', () => {
    expect(mapping).toBeDefined();
    expect(mapping.cursorColumn).toBe('created_at');
  });

  it('emits wallet event types based on activity', () => {
    expect(mapping.eventTypeMapping({ activity_type: 'deposit' })).toBe(EventType.WALLET_DEPOSIT);
    expect(mapping.eventTypeMapping({ activity_type: 'withdrawal' })).toBe(EventType.WALLET_WITHDRAWAL);
    expect(mapping.eventTypeMapping({ activity_type: 'transfer' })).toBe(EventType.WALLET_TRANSFER);
  });

  it('transforms payload with sender/receiver', () => {
    const row = { id: 1, user_id: 3, sender_id: 3, receiver_id: 5, amount: '50.00', balance: '150.00', activity_type: 'transfer' };
    const payload = mapping.transformPayload(row);
    expect(payload.user_id).toBe('3');
    expect(payload.sender_id).toBe('3');
    expect(payload.receiver_id).toBe('5');
    expect(payload.amount).toBe(50);
    expect(payload.balance).toBe(150);
  });
});

// ─── Login Activities Mapping ───────────────────────────────

describe('login_activities mapping', () => {
  const mapping = getMappingForTable('login_activities')!;

  it('exists and uses created_at cursor', () => {
    expect(mapping).toBeDefined();
    expect(mapping.cursorColumn).toBe('created_at');
  });

  it('emits USER_LOGGED_IN', () => {
    expect(mapping.eventTypeMapping({})).toBe(EventType.USER_LOGGED_IN);
  });

  it('transforms payload with device/IP info', () => {
    const row = { id: 1, user_id: 3, ip_address: '192.168.1.1', device_type: 'mobile', browser: 'Chrome' };
    const payload = mapping.transformPayload(row);
    expect(payload.user_id).toBe('3');
    expect(payload.ip_address).toBe('192.168.1.1');
    expect(payload.device_type).toBe('mobile');
  });
});

// ─── getMappingForTable ─────────────────────────────────────

describe('getMappingForTable', () => {
  it('returns mapping for each actual QwickServices table', () => {
    for (const table of [
      'categories', 'users', 'payments', 'bookings', 'notifications',
      'ratings', 'suspicious_activities', 'booking_activities',
      'wallet_histories', 'login_activities',
    ]) {
      expect(getMappingForTable(table)).toBeDefined();
    }
  });

  it('returns undefined for old blueprint table names', () => {
    expect(getMappingForTable('providers')).toBeUndefined();
    expect(getMappingForTable('transactions')).toBeUndefined();
    expect(getMappingForTable('messages')).toBeUndefined();
    expect(getMappingForTable('disputes')).toBeUndefined();
  });

  it('returns undefined for unknown table', () => {
    expect(getMappingForTable('nonexistent')).toBeUndefined();
  });
});
