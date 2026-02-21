// QwickServices CIS — Domain Persistence Consumer Unit Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockQuery, resetAllMocks, uuid } from '../helpers/setup';
import { EventType, DomainEvent } from '../../src/events/types';

function buildEvent(
  type: EventType,
  payload: Record<string, unknown>,
  id?: string
): DomainEvent {
  return {
    id: id ?? uuid(99),
    type,
    correlation_id: uuid(100),
    timestamp: new Date().toISOString(),
    version: 1,
    payload,
  };
}

describe('DomainPersistenceConsumer', () => {
  beforeEach(() => resetAllMocks());

  // ─── Booking Events ────────────────────────────────────────

  describe('handleBookingEvent', () => {
    it('persists BOOKING_CREATED with correct status mapping', async () => {
      const { handleBookingEvent } = await import('../../src/sync/consumers/domain-persistence');

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const event = buildEvent(EventType.BOOKING_CREATED, {
        booking_id: '123',
        client_id: uuid(1),
        provider_id: uuid(2),
        amount: 50.00,
        currency: 'USD',
        status: 'pending',
        scheduled_at: '2026-03-01T10:00:00Z',
        _source_id: '456',
      });

      await handleBookingEvent(event);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO bookings');
      expect(sql).toContain('ON CONFLICT (external_id) DO UPDATE');
      expect(params[1]).toBe('456'); // external_id = _source_id
      expect(params[2]).toBe(uuid(1)); // client_id
      expect(params[3]).toBe(uuid(2)); // provider_id
      expect(params[7]).toBe('pending'); // mapped status
    });

    it('maps accept → confirmed', async () => {
      const { handleBookingEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await handleBookingEvent(buildEvent(EventType.BOOKING_UPDATED, {
        _source_id: '789',
        client_id: uuid(1),
        provider_id: uuid(2),
        status: 'accept',
      }));

      expect(mockQuery.mock.calls[0][1][7]).toBe('confirmed');
    });

    it('maps on_going → in_progress', async () => {
      const { handleBookingEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await handleBookingEvent(buildEvent(EventType.BOOKING_UPDATED, {
        _source_id: '789',
        status: 'on_going',
      }));

      expect(mockQuery.mock.calls[0][1][7]).toBe('in_progress');
    });

    it('maps cancelled/rejected/failed → cancelled', async () => {
      const { handleBookingEvent } = await import('../../src/sync/consumers/domain-persistence');

      for (const status of ['cancelled', 'rejected', 'failed']) {
        mockQuery.mockReset();
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        await handleBookingEvent(buildEvent(EventType.BOOKING_CANCELLED, {
          _source_id: `id-${status}`,
          status,
        }));

        expect(mockQuery.mock.calls[0][1][7]).toBe('cancelled');
      }
    });

    it('maps completed → completed', async () => {
      const { handleBookingEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await handleBookingEvent(buildEvent(EventType.BOOKING_COMPLETED, {
        _source_id: '101',
        status: 'completed',
      }));

      expect(mockQuery.mock.calls[0][1][7]).toBe('completed');
    });

    it('skips when no external_id or booking_id', async () => {
      const { handleBookingEvent } = await import('../../src/sync/consumers/domain-persistence');

      await handleBookingEvent(buildEvent(EventType.BOOKING_CREATED, { status: 'pending' }));

      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  // ─── Transaction Events ────────────────────────────────────

  describe('handleTransactionEvent', () => {
    it('persists TRANSACTION_COMPLETED', async () => {
      const { handleTransactionEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const event = buildEvent(EventType.TRANSACTION_COMPLETED, {
        transaction_id: 'tx-1',
        user_id: uuid(3),
        amount: 100.00,
        currency: 'USD',
        payment_method: 'stripe',
        status: 'completed',
        _source_id: 'ext-tx-1',
      });

      await handleTransactionEvent(event);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO transactions');
      expect(sql).toContain('ON CONFLICT (external_ref) DO UPDATE');
      expect(params[1]).toBe('ext-tx-1'); // external_ref = _source_id
      expect(params[2]).toBe(uuid(3)); // user_id
      expect(params[3]).toBe(100.00); // amount
      expect(params[5]).toBe('stripe'); // payment_method
      expect(params[6]).toBe('completed'); // status
    });

    it('falls back to transaction_id when no _source_id', async () => {
      const { handleTransactionEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await handleTransactionEvent(buildEvent(EventType.TRANSACTION_INITIATED, {
        transaction_id: 'tx-fallback',
        user_id: uuid(5),
        amount: 25,
        status: 'initiated',
      }));

      expect(mockQuery.mock.calls[0][1][1]).toBe('tx-fallback');
    });
  });

  // ─── Wallet Events ─────────────────────────────────────────

  describe('handleWalletEvent', () => {
    it('persists WALLET_DEPOSIT with type mapping', async () => {
      const { handleWalletEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const event = buildEvent(EventType.WALLET_DEPOSIT, {
        wallet_tx_id: 'w-1',
        user_id: uuid(4),
        tx_type: 'credit',
        amount: 200,
        currency: 'USD',
        status: 'completed',
        _source_id: 'ext-w-1',
      });

      await handleWalletEvent(event);

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO wallet_transactions');
      expect(sql).toContain('ON CONFLICT (external_id) DO UPDATE');
      expect(params[1]).toBe('ext-w-1');
      expect(params[3]).toBe('deposit'); // credit → deposit
    });

    it('maps debit → withdrawal', async () => {
      const { handleWalletEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await handleWalletEvent(buildEvent(EventType.WALLET_WITHDRAWAL, {
        _source_id: 'w-2',
        user_id: uuid(4),
        tx_type: 'debit',
        amount: 50,
      }));

      expect(mockQuery.mock.calls[0][1][3]).toBe('withdrawal');
    });

    it('maps transfer → transfer', async () => {
      const { handleWalletEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await handleWalletEvent(buildEvent(EventType.WALLET_TRANSFER, {
        _source_id: 'w-3',
        user_id: uuid(4),
        tx_type: 'transfer',
        amount: 75,
      }));

      expect(mockQuery.mock.calls[0][1][3]).toBe('transfer');
    });
  });

  // ─── Rating Events ─────────────────────────────────────────

  describe('handleRatingEvent', () => {
    it('persists RATING_SUBMITTED', async () => {
      const { handleRatingEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const event = buildEvent(EventType.RATING_SUBMITTED, {
        rating_id: 'r-1',
        client_id: uuid(1),
        provider_id: uuid(2),
        booking_id: uuid(10),
        score: 4,
        comment: 'Great service',
        _source_id: 'ext-r-1',
      });

      await handleRatingEvent(event);

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO ratings');
      expect(sql).toContain('ON CONFLICT (external_id) DO UPDATE');
      expect(params[1]).toBe('ext-r-1');
      expect(params[2]).toBe(uuid(1)); // client_id
      expect(params[3]).toBe(uuid(2)); // provider_id
      expect(params[5]).toBe(4); // score
      expect(params[6]).toBe('Great service'); // comment
    });
  });

  // ─── Dispute Events ────────────────────────────────────────

  describe('handleDisputeEvent', () => {
    it('persists DISPUTE_OPENED', async () => {
      const { handleDisputeEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const event = buildEvent(EventType.DISPUTE_OPENED, {
        dispute_id: 'd-1',
        complainant_id: uuid(1),
        respondent_id: uuid(2),
        reason: 'Test reason',
        status: 'pending',
        _source_id: 'ext-d-1',
      });

      await handleDisputeEvent(event);

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO disputes');
      expect(sql).toContain('ON CONFLICT (external_id) DO UPDATE');
      expect(params[1]).toBe('ext-d-1');
      expect(params[7]).toBe('pending');
    });

    it('updates status on DISPUTE_RESOLVED', async () => {
      const { handleDisputeEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await handleDisputeEvent(buildEvent(EventType.DISPUTE_RESOLVED, {
        _source_id: 'ext-d-2',
        respondent_id: uuid(2),
        reason: 'Resolved reason',
        status: 'resolved',
      }));

      expect(mockQuery.mock.calls[0][1][7]).toBe('resolved');
    });
  });

  // ─── Unified Handler ───────────────────────────────────────

  describe('handleDomainEvent', () => {
    it('routes booking events to handleBookingEvent', async () => {
      const { handleDomainEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      for (const type of [EventType.BOOKING_CREATED, EventType.BOOKING_UPDATED, EventType.BOOKING_COMPLETED, EventType.BOOKING_CANCELLED]) {
        mockQuery.mockClear();
        await handleDomainEvent(buildEvent(type, { _source_id: 'b-1', status: 'pending' }));
        expect(mockQuery).toHaveBeenCalled();
        expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO bookings');
      }
    });

    it('routes transaction events to handleTransactionEvent', async () => {
      const { handleDomainEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      for (const type of [EventType.TRANSACTION_INITIATED, EventType.TRANSACTION_COMPLETED, EventType.TRANSACTION_FAILED, EventType.TRANSACTION_CANCELLED]) {
        mockQuery.mockClear();
        await handleDomainEvent(buildEvent(type, { _source_id: 't-1', amount: 10, status: 'completed' }));
        expect(mockQuery).toHaveBeenCalled();
        expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO transactions');
      }
    });

    it('routes wallet events to handleWalletEvent', async () => {
      const { handleDomainEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      for (const type of [EventType.WALLET_DEPOSIT, EventType.WALLET_WITHDRAWAL, EventType.WALLET_TRANSFER]) {
        mockQuery.mockClear();
        await handleDomainEvent(buildEvent(type, { _source_id: 'w-1', amount: 10, tx_type: 'deposit' }));
        expect(mockQuery).toHaveBeenCalled();
        expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO wallet_transactions');
      }
    });

    it('does not throw on query failure (graceful degradation)', async () => {
      const { handleDomainEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

      await expect(
        handleDomainEvent(buildEvent(EventType.BOOKING_CREATED, { _source_id: 'b-err', status: 'pending' }))
      ).resolves.toBeUndefined();
    });
  });

  // ─── Backfill Events ───────────────────────────────────────

  describe('backfill handling', () => {
    it('does NOT skip events with _sync_source = data_sync (backfill)', async () => {
      const { handleDomainEvent } = await import('../../src/sync/consumers/domain-persistence');
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await handleDomainEvent(buildEvent(EventType.BOOKING_CREATED, {
        _source_id: 'backfill-1',
        _sync_source: 'data_sync',
        status: 'completed',
      }));

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  // ─── Status Mapping Functions ──────────────────────────────

  describe('mapBookingStatus', () => {
    it('maps all known QwickServices statuses', async () => {
      const { mapBookingStatus } = await import('../../src/sync/consumers/domain-persistence');

      expect(mapBookingStatus('pending')).toBe('pending');
      expect(mapBookingStatus('pending_approval')).toBe('pending');
      expect(mapBookingStatus('waiting')).toBe('pending');
      expect(mapBookingStatus('hold')).toBe('pending');
      expect(mapBookingStatus('accept')).toBe('confirmed');
      expect(mapBookingStatus('on_going')).toBe('in_progress');
      expect(mapBookingStatus('in_progress')).toBe('in_progress');
      expect(mapBookingStatus('completed')).toBe('completed');
      expect(mapBookingStatus('cancelled')).toBe('cancelled');
      expect(mapBookingStatus('rejected')).toBe('cancelled');
      expect(mapBookingStatus('failed')).toBe('cancelled');
    });

    it('defaults unknown statuses to pending', async () => {
      const { mapBookingStatus } = await import('../../src/sync/consumers/domain-persistence');
      expect(mapBookingStatus('unknown_status')).toBe('pending');
    });
  });

  describe('mapWalletTxType', () => {
    it('maps all known QwickServices wallet types', async () => {
      const { mapWalletTxType } = await import('../../src/sync/consumers/domain-persistence');

      expect(mapWalletTxType('deposit')).toBe('deposit');
      expect(mapWalletTxType('credit')).toBe('deposit');
      expect(mapWalletTxType('withdraw')).toBe('withdrawal');
      expect(mapWalletTxType('debit')).toBe('withdrawal');
      expect(mapWalletTxType('transfer')).toBe('transfer');
    });

    it('defaults unknown types to deposit', async () => {
      const { mapWalletTxType } = await import('../../src/sync/consumers/domain-persistence');
      expect(mapWalletTxType('some_unknown')).toBe('deposit');
    });
  });

  // ─── Idempotency ──────────────────────────────────────────

  describe('idempotency (ON CONFLICT DO UPDATE)', () => {
    it('uses ON CONFLICT for all domain tables', async () => {
      const { handleBookingEvent, handleTransactionEvent, handleWalletEvent, handleRatingEvent, handleDisputeEvent } =
        await import('../../src/sync/consumers/domain-persistence');

      const handlers = [
        { handler: handleBookingEvent, type: EventType.BOOKING_CREATED, payload: { _source_id: '1', status: 'pending' }, conflict: 'external_id' },
        { handler: handleTransactionEvent, type: EventType.TRANSACTION_COMPLETED, payload: { _source_id: '2', amount: 10, status: 'completed' }, conflict: 'external_ref' },
        { handler: handleWalletEvent, type: EventType.WALLET_DEPOSIT, payload: { _source_id: '3', amount: 10, tx_type: 'deposit' }, conflict: 'external_id' },
        { handler: handleRatingEvent, type: EventType.RATING_SUBMITTED, payload: { _source_id: '4', score: 5 }, conflict: 'external_id' },
        { handler: handleDisputeEvent, type: EventType.DISPUTE_OPENED, payload: { _source_id: '5', status: 'pending' }, conflict: 'external_id' },
      ];

      for (const { handler, type, payload, conflict } of handlers) {
        mockQuery.mockReset();
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        await handler(buildEvent(type, payload));

        const sql = mockQuery.mock.calls[0][0] as string;
        expect(sql).toContain(`ON CONFLICT (${conflict}) DO UPDATE`);
      }
    });
  });
});
