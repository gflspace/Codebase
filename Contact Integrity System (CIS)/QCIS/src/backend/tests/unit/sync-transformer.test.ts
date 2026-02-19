// QwickServices CIS — Sync Transformer Unit Tests
// Aligned to ACTUAL QwickServices MySQL schema (verified 2026-02-16).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock database ───────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock('../../src/database/connection', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('../../src/events/bus', () => ({
  getEventBus: () => ({ emit: vi.fn().mockResolvedValue(undefined), registerConsumer: vi.fn(), subscribe: vi.fn() }),
}));

// ─── Imports (after mocks) ───────────────────────────────────

import { transformRow, ensureUserExists, ensureCategoryExists, detectContactFieldChanges } from '../../src/sync/transformer';
import { getMappingForTable, TABLE_MAPPINGS } from '../../src/sync/mappings';
import { EventType } from '../../src/events/types';

beforeEach(() => {
  mockQuery.mockReset();
});

// ─── transformRow ────────────────────────────────────────────

describe('transformRow', () => {
  it('converts a booking row to BOOKING_CREATED event', () => {
    const mapping = getMappingForTable('bookings')!;
    const row = {
      id: 1,
      booking_uid: 'BK-001',
      user_id: 3,
      provider_id: 5,
      service_id: 10,
      category_id: 2,
      status: 'pending',
      total_amount: '150.00',
      date: '2026-02-15T10:00:00',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.BOOKING_CREATED);
    expect(event.payload.booking_id).toBe('1');
    expect(event.payload.client_id).toBe('3');
    expect(event.payload.provider_id).toBe('5');
    expect(event.payload.category_id).toBe('2');
    expect(event.payload.amount).toBe(150);
    expect(event.payload.status).toBe('pending');
  });

  it('converts a cancelled booking to BOOKING_CANCELLED event', () => {
    const mapping = getMappingForTable('bookings')!;
    const row = {
      id: 2,
      user_id: 4,
      provider_id: 6,
      status: 'cancelled',
      total_amount: '200.00',
      date: '2026-02-20T14:00:00',
      created_at: '2026-02-13T09:00:00Z',
      updated_at: '2026-02-14T10:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.BOOKING_CANCELLED);
    expect(event.payload.status).toBe('cancelled');
  });

  it('converts a payment row to TRANSACTION_INITIATED event', () => {
    const mapping = getMappingForTable('payments')!;
    const row = {
      id: 1,
      booking_id: 2,
      user_id: 3,
      total_amount: 150.00,
      payment_type: 'credit_card',
      payment_status: 'pending',
      transaction_fee: 3.50,
      created_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.TRANSACTION_INITIATED);
    expect(event.payload.transaction_id).toBe('1');
    expect(event.payload.user_id).toBe('3');
    expect(event.payload.amount).toBe(150);
    expect(event.payload.payment_method).toBe('credit_card');
    expect(event.payload.transaction_fee).toBe(3.5);
    expect(event.payload.status).toBe('pending');
  });

  it('converts a completed payment to TRANSACTION_COMPLETED event', () => {
    const mapping = getMappingForTable('payments')!;
    const row = {
      id: 2,
      user_id: 4,
      total_amount: 200.00,
      payment_type: 'bank_transfer',
      payment_status: 'paid',
      created_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.TRANSACTION_COMPLETED);
    expect(event.payload.status).toBe('paid');
  });

  it('converts a notification row to MESSAGE_CREATED event', () => {
    const mapping = getMappingForTable('notifications')!;
    const row = {
      id: 'abc-123-def',
      type: 'App\\Notifications\\BookingCreated',
      notifiable_type: 'App\\Models\\User',
      notifiable_id: 5,
      data: '{"booking_id":1}',
      read_at: null,
      created_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.MESSAGE_CREATED);
    expect(event.payload.message_id).toBe('abc-123-def');
    expect(event.payload.receiver_id).toBe('5');
    expect(event.payload.sender_id).toBe('system');
    expect(event.payload.message_type).toBe('notification');
  });

  it('converts a rating row to RATING_SUBMITTED event', () => {
    const mapping = getMappingForTable('ratings')!;
    const row = {
      id: 1,
      customer_id: 3,
      provider_id: 5,
      booking_id: 2,
      rating: 5,
      review: 'Great service!',
      status: 1,
      created_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.RATING_SUBMITTED);
    expect(event.payload.rating_id).toBe('1');
    expect(event.payload.client_id).toBe('3');
    expect(event.payload.provider_id).toBe('5');
    expect(event.payload.booking_id).toBe('2');
    expect(event.payload.score).toBe(5);
    expect(event.payload.comment).toBe('Great service!');
  });

  it('converts a user row with provider type to PROVIDER_REGISTERED event (new)', () => {
    const mapping = getMappingForTable('users')!;
    const now = '2026-02-13T12:00:00Z';
    const row = {
      id: 10,
      first_name: 'Jane',
      last_name: 'Provider',
      email: 'jane@provider.com',
      phone_number: '+1555000',
      user_type: 'provider',
      is_active: 1,
      is_email_verified: 1,
      is_phone_verified: 1,
      is_kyc_verified: 1,
      wallet_balance: '200',
      created_at: now,
      updated_at: now,
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.PROVIDER_REGISTERED);
    expect(event.payload.user_id).toBe('10');
    expect(event.payload.user_type).toBe('provider');
    const meta = event.payload.metadata as Record<string, unknown>;
    expect(meta.is_kyc_verified).toBe(true);
    expect(meta.wallet_balance).toBe(200);
  });

  it('converts a user row with provider type to PROVIDER_UPDATED event (updated)', () => {
    const mapping = getMappingForTable('users')!;
    const row = {
      id: 11,
      user_type: 'provider',
      is_active: 1,
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T14:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.PROVIDER_UPDATED);
    expect(event.payload.user_id).toBe('11');
  });

  it('converts a category row to CATEGORY_CREATED event', () => {
    const mapping = getMappingForTable('categories')!;
    const now = '2026-02-14T12:00:00Z';
    const row = {
      id: 1,
      name: 'Plumbing',
      is_featured: 0,
      status: 1,
      created_at: now,
      updated_at: now,
    };

    const event = transformRow(row, mapping);

    expect(event.type).toBe(EventType.CATEGORY_CREATED);
    expect(event.payload.category_id).toBe('1');
    expect(event.payload.name).toBe('Plumbing');
    expect(event.payload.status).toBe('active');
  });

  it('includes _sync_source metadata in payload', () => {
    const mapping = getMappingForTable('bookings')!;
    const row = {
      id: 3,
      user_id: 7,
      provider_id: 8,
      status: 'pending',
      total_amount: '300.00',
      date: '2026-02-16T09:00:00',
      created_at: '2026-02-13T12:00:00Z',
      updated_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    expect(event.payload._sync_source).toBe('data_sync');
    expect(event.payload._source_table).toBe('bookings');
    expect(event.payload._source_id).toBe('3');
  });
});

// ─── ensureUserExists ────────────────────────────────────────

describe('ensureUserExists', () => {
  it('creates user when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'user-new' }] });

    const userId = await ensureUserExists('user-new');

    expect(userId).toBe('user-new');
    expect(mockQuery).toHaveBeenCalledTimes(2);

    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO users');
    expect(insertCall[1][0]).toBe('user-new');
    expect(insertCall[1][1]).toBe('user-new');
  });

  it('returns existing user ID when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'user-existing' }] });

    const userId = await ensureUserExists('user-existing');

    expect(userId).toBe('user-existing');
    expect(mockQuery).toHaveBeenCalledTimes(1);

    const queries = mockQuery.mock.calls.map(c => c[0]);
    expect(queries.every(q => !q.includes('INSERT'))).toBe(true);
  });
});

// ─── ensureCategoryExists ────────────────────────────────────

describe('ensureCategoryExists', () => {
  it('creates category when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'cat-uuid' }] });

    const id = await ensureCategoryExists('ext-cat-1', 'Plumbing', null, 'active');

    expect(id).toBeTruthy();
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO categories');
  });

  it('updates existing category', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-cat-uuid' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const id = await ensureCategoryExists('ext-cat-1', 'Updated Name', null, 'active');

    expect(id).toBe('existing-cat-uuid');
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const updateCall = mockQuery.mock.calls[1];
    expect(updateCall[0]).toContain('UPDATE categories');
  });
});

// ─── getMappingForTable ──────────────────────────────────────

describe('getMappingForTable', () => {
  it('returns correct mapping for bookings', () => {
    const mapping = getMappingForTable('bookings');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('bookings');
    expect(mapping?.cursorColumn).toBe('updated_at');
    expect(mapping?.primaryKeyColumn).toBe('id');
  });

  it('returns correct mapping for payments (actual table name)', () => {
    const mapping = getMappingForTable('payments');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('payments');
    expect(mapping?.primaryKeyColumn).toBe('id');
  });

  it('returns undefined for old "transactions" blueprint name', () => {
    expect(getMappingForTable('transactions')).toBeUndefined();
  });

  it('returns correct mapping for notifications (replaces messages)', () => {
    const mapping = getMappingForTable('notifications');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('notifications');
    expect(mapping?.cursorColumn).toBe('created_at');
  });

  it('returns undefined for old "messages" blueprint name', () => {
    expect(getMappingForTable('messages')).toBeUndefined();
  });

  it('returns correct mapping for categories', () => {
    const mapping = getMappingForTable('categories');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('categories');
    expect(mapping?.primaryKeyColumn).toBe('id');
  });

  it('returns correct mapping for ratings', () => {
    const mapping = getMappingForTable('ratings');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('ratings');
    expect(mapping?.cursorColumn).toBe('created_at');
  });

  it('returns undefined for old "providers" blueprint name (merged into users)', () => {
    expect(getMappingForTable('providers')).toBeUndefined();
  });

  it('returns correct mapping for suspicious_activities (replaces disputes)', () => {
    const mapping = getMappingForTable('suspicious_activities');
    expect(mapping).toBeDefined();
    expect(mapping?.sourceTable).toBe('suspicious_activities');
    expect(mapping?.primaryKeyColumn).toBe('id');
  });

  it('returns correct mapping for new tables', () => {
    expect(getMappingForTable('booking_activities')).toBeDefined();
    expect(getMappingForTable('wallet_histories')).toBeDefined();
    expect(getMappingForTable('login_activities')).toBeDefined();
  });

  it('returns undefined for unknown table', () => {
    const mapping = getMappingForTable('unknown_table');
    expect(mapping).toBeUndefined();
  });
});

// ─── detectContactFieldChanges ──────────────────────────────

describe('detectContactFieldChanges', () => {
  it('emits CONTACT_FIELD_CHANGED for email change', async () => {
    const mapping = getMappingForTable('users')!;
    // First call: SELECT existing user → has old email
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: '1', email: 'old@test.com', metadata: { phone_number: '+1111' } }],
    });
    // Second call: UPDATE user with new contact info
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const row = {
      id: 1, email: 'new@test.com', phone_number: '+1111',
      user_type: 'customer', updated_at: '2026-02-16T12:00:00Z',
    };

    const events = await detectContactFieldChanges(row, mapping);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(EventType.CONTACT_FIELD_CHANGED);
    expect(events[0].payload.field).toBe('email');
    expect(events[0].payload.old_value).toBe('old@test.com');
    expect(events[0].payload.new_value).toBe('new@test.com');
  });

  it('emits CONTACT_FIELD_CHANGED for phone change', async () => {
    const mapping = getMappingForTable('users')!;
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: '1', email: 'test@test.com', metadata: { phone_number: '+1111' } }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const row = {
      id: 1, email: 'test@test.com', phone_number: '+2222',
      user_type: 'customer', updated_at: '2026-02-16T12:00:00Z',
    };

    const events = await detectContactFieldChanges(row, mapping);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(EventType.CONTACT_FIELD_CHANGED);
    expect(events[0].payload.field).toBe('phone');
    expect(events[0].payload.old_value).toBe('+1111');
    expect(events[0].payload.new_value).toBe('+2222');
  });

  it('emits two events when both email and phone change', async () => {
    const mapping = getMappingForTable('users')!;
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: '1', email: 'old@test.com', metadata: { phone_number: '+1111' } }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const row = {
      id: 1, email: 'new@test.com', phone_number: '+9999',
      user_type: 'customer', updated_at: '2026-02-16T12:00:00Z',
    };

    const events = await detectContactFieldChanges(row, mapping);

    expect(events).toHaveLength(2);
    const fields = events.map(e => e.payload.field);
    expect(fields).toContain('email');
    expect(fields).toContain('phone');
  });

  it('emits nothing when contact fields unchanged', async () => {
    const mapping = getMappingForTable('users')!;
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: '1', email: 'same@test.com', metadata: { phone_number: '+1111' } }],
    });

    const row = {
      id: 1, email: 'same@test.com', phone_number: '+1111',
      user_type: 'customer', updated_at: '2026-02-16T12:00:00Z',
    };

    const events = await detectContactFieldChanges(row, mapping);

    expect(events).toHaveLength(0);
    // Should NOT have called UPDATE
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('emits nothing for new users (no existing CIS record)', async () => {
    const mapping = getMappingForTable('users')!;
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const row = {
      id: 999, email: 'brand-new@test.com', phone_number: '+3333',
      user_type: 'customer', updated_at: '2026-02-16T12:00:00Z',
    };

    const events = await detectContactFieldChanges(row, mapping);

    expect(events).toHaveLength(0);
  });

  it('skips non-users tables', async () => {
    const mapping = getMappingForTable('bookings')!;
    const events = await detectContactFieldChanges({ id: 1 }, mapping);
    expect(events).toHaveLength(0);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

// ─── Backfill flag propagation ──────────────────────────────

describe('backfill flag', () => {
  it('transformRow output can be tagged with _backfill flag', () => {
    const mapping = getMappingForTable('bookings')!;
    const row = {
      id: 1, user_id: 3, provider_id: 5, status: 'pending',
      total_amount: '100', date: '2026-03-01T10:00:00',
      created_at: '2026-02-13T12:00:00Z', updated_at: '2026-02-13T12:00:00Z',
    };

    const event = transformRow(row, mapping);

    // Simulate sync service tagging during backfill
    event.payload._backfill = true;

    expect(event.payload._backfill).toBe(true);
    expect(event.payload._sync_source).toBe('data_sync');
    expect(event.type).toBe(EventType.BOOKING_CREATED);
  });
});
