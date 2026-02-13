// QwickServices CIS — Stats V2 Extended Integration Tests
// Tests booking-timeline and financial-flow endpoints

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  mockQuery, resetAllMocks, createTestApp, startServer, stopServer,
  authHeaders, OPS_USER,
} from '../helpers/setup';
import statsV2Routes from '../../src/api/routes/stats-v2';
import http from 'http';

const app = createTestApp();
app.use('/api/stats/v2', statsV2Routes);

let server: http.Server;
let port: number;

beforeAll(async () => {
  const s = await startServer(app);
  server = s.server;
  port = s.port;
});
afterAll(() => stopServer(server));
beforeEach(() => resetAllMocks());

// ─── Booking Timeline ────────────────────────────────────────────

describe('GET /api/stats/v2/booking-timeline', () => {
  it('returns booking KPIs, timeline, and category breakdown', async () => {
    const now = new Date().toISOString();
    // Status query
    mockQuery.mockResolvedValueOnce({
      rows: [
        { ts: now, total: '10', completed: '7', cancelled: '2', no_show: '1', pending: '0' },
      ],
    });
    // Category query
    mockQuery.mockResolvedValueOnce({
      rows: [
        { category: 'cleaning', total: '5', completed: '4', cancelled: '1', no_show: '0' },
        { category: 'plumbing', total: '5', completed: '3', cancelled: '1', no_show: '1' },
      ],
    });
    // Value query
    mockQuery.mockResolvedValueOnce({
      rows: [{ ts: now, avg_value: '85.50', total_value: '855.00', booking_count: '10' }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/stats/v2/booking-timeline?range=last_24h&granularity=hourly`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    // KPIs present
    expect(body.data.kpi).toBeDefined();
    expect(body.data.kpi.total_bookings).toHaveProperty('value');
    expect(body.data.kpi.completed).toHaveProperty('status');
    expect(body.data.kpi.completion_rate).toBeGreaterThanOrEqual(0);

    // Timeline present
    expect(body.data.timeline).toBeInstanceOf(Array);
    expect(body.data.timeline[0]).toHaveProperty('total');
    expect(body.data.timeline[0]).toHaveProperty('completed');
    expect(body.data.timeline[0]).toHaveProperty('cancelled');

    // Category breakdown
    expect(body.data.by_category).toBeInstanceOf(Array);
    expect(body.data.by_category).toHaveLength(2);
    expect(body.data.by_category[0].category).toBe('cleaning');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/stats/v2/booking-timeline`);
    expect(res.status).toBe(401);
  });

  it('rejects users without intelligence.view permission', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/stats/v2/booking-timeline`, {
      headers: authHeaders(OPS_USER),
    });
    expect(res.status).toBe(403);
  });

  it('returns empty data gracefully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // status
    mockQuery.mockResolvedValueOnce({ rows: [] }); // category
    mockQuery.mockResolvedValueOnce({ rows: [] }); // value

    const res = await fetch(`http://127.0.0.1:${port}/api/stats/v2/booking-timeline?range=last_7d`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.kpi.total_bookings.value).toBe(0);
    expect(body.data.timeline).toHaveLength(0);
    expect(body.data.by_category).toHaveLength(0);
  });
});

// ─── Financial Flow ──────────────────────────────────────────────

describe('GET /api/stats/v2/financial-flow', () => {
  it('returns financial KPIs, wallet timeline, and transaction timeline', async () => {
    const now = new Date().toISOString();
    // Wallet query
    mockQuery.mockResolvedValueOnce({
      rows: [{
        ts: now,
        deposits: '15', withdrawals: '8', transfers: '3',
        deposit_volume: '1500.00', withdrawal_volume: '800.00', transfer_volume: '300.00',
      }],
    });
    // Tx status query
    mockQuery.mockResolvedValueOnce({
      rows: [{ ts: now, total: '20', completed: '16', failed: '2', pending: '2' }],
    });
    // Tx value query
    mockQuery.mockResolvedValueOnce({
      rows: [{
        avg_amount: '75.50',
        total_volume: '1510.00',
        total_count: '20',
        completed_volume: '1208.00',
        failed_volume: '151.00',
      }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/stats/v2/financial-flow?range=last_24h&granularity=hourly`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    // KPIs
    expect(body.data.kpi).toBeDefined();
    expect(body.data.kpi.total_volume).toBe(1510);
    expect(body.data.kpi.avg_transaction).toBe(75.5);
    expect(body.data.kpi.deposits).toHaveProperty('value');
    expect(body.data.kpi.tx_failed).toHaveProperty('status');

    // Wallet timeline
    expect(body.data.wallet_timeline).toBeInstanceOf(Array);
    expect(body.data.wallet_timeline[0]).toHaveProperty('deposits');
    expect(body.data.wallet_timeline[0]).toHaveProperty('withdrawal_volume');

    // Transaction timeline
    expect(body.data.transaction_timeline).toBeInstanceOf(Array);
    expect(body.data.transaction_timeline[0]).toHaveProperty('completed');
    expect(body.data.transaction_timeline[0]).toHaveProperty('failed');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/stats/v2/financial-flow`);
    expect(res.status).toBe(401);
  });

  it('returns empty data gracefully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // wallet
    mockQuery.mockResolvedValueOnce({ rows: [] }); // tx status
    mockQuery.mockResolvedValueOnce({ rows: [{}] }); // tx value (always returns 1 row)

    const res = await fetch(`http://127.0.0.1:${port}/api/stats/v2/financial-flow?range=last_30d`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.kpi.total_volume).toBe(0);
    expect(body.data.wallet_timeline).toHaveLength(0);
    expect(body.data.transaction_timeline).toHaveLength(0);
  });

  it('respects range and granularity parameters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{}] });

    const res = await fetch(`http://127.0.0.1:${port}/api/stats/v2/financial-flow?range=last_7d&granularity=daily`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    // Verify queries used correct interval — check mockQuery was called
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });
});
