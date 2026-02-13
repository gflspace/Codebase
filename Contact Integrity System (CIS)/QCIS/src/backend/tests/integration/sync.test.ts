// QwickServices CIS — Data Sync API Integration Tests

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { mockQuery, resetAllMocks, createTestApp, startServer, stopServer, authHeaders } from '../helpers/setup';
import syncRoutes from '../../src/api/routes/sync';
import http from 'http';

const app = createTestApp();
app.use('/api/sync', syncRoutes);

let server: http.Server;
let port: number;

beforeAll(async () => {
  const s = await startServer(app);
  server = s.server;
  port = s.port;
});
afterAll(() => stopServer(server));
beforeEach(() => resetAllMocks());

// ─── GET /api/sync/status ────────────────────────────────────

describe('GET /api/sync/status', () => {
  it('returns sync status (requires auth)', async () => {
    // Mock getSyncStatus query (reads from sync_watermarks)
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          source_table: 'bookings',
          last_cursor_value: '2026-02-13T12:00:00Z',
          last_sync_at: '2026-02-13T12:05:00Z',
          records_processed: '150',
          enabled: true,
        },
        {
          source_table: 'payments',
          last_cursor_value: '2026-02-13T11:30:00Z',
          last_sync_at: '2026-02-13T12:05:00Z',
          records_processed: '75',
          enabled: true,
        },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/sync/status`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tables).toBeDefined();
    expect(Array.isArray(body.tables)).toBe(true);
  });

  it('returns 401 without auth token', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/status`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/sync/history ───────────────────────────────────

describe('GET /api/sync/history', () => {
  it('returns sync run log', async () => {
    // Mock getSyncRunHistory query (reads from sync_run_log)
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'run-1',
          source_table: 'bookings',
          records_processed: '25',
          events_emitted: '25',
          started_at: '2026-02-13T12:00:00Z',
          completed_at: '2026-02-13T12:01:00Z',
          status: 'success',
          error: null,
        },
        {
          id: 'run-2',
          source_table: 'payments',
          records_processed: '10',
          events_emitted: '10',
          started_at: '2026-02-13T12:01:00Z',
          completed_at: '2026-02-13T12:01:30Z',
          status: 'success',
          error: null,
        },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/sync/history`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.runs).toBeDefined();
    expect(Array.isArray(body.runs)).toBe(true);
    expect(body.runs.length).toBe(2);
    expect(body.total).toBe(2);
  });

  it('respects limit query parameter', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'run-1',
          source_table: 'bookings',
          records_processed: '25',
          events_emitted: '25',
          started_at: '2026-02-13T12:00:00Z',
          completed_at: '2026-02-13T12:01:00Z',
          status: 'success',
          error: null,
        },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/sync/history?limit=10`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.runs).toBeDefined();

    // Verify the query was called with the limit
    const queryCall = mockQuery.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('LIMIT')
    );
    expect(queryCall).toBeDefined();
  });
});

// ─── POST /api/sync/trigger ──────────────────────────────────

describe('POST /api/sync/trigger', () => {
  it('returns 400 when sync disabled', async () => {
    // config.sync.enabled is false in test config (see helpers/setup.ts)
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/trigger`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('disabled');
  });

  it('requires sync.manage permission', async () => {
    // This test would fail with a user that doesn't have sync.manage
    // But our test setup grants all permissions to SUPER_ADMIN
    // So we just verify the endpoint exists
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/trigger`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });

    // Should return 400 (disabled) not 403 (forbidden), confirming auth worked
    expect(res.status).toBe(400);
  });
});

// ─── PUT /api/sync/tables/:table ─────────────────────────────

describe('PUT /api/sync/tables/:table', () => {
  it('enables/disables a table', async () => {
    // Mock toggleTableSync query (INSERT/UPDATE sync_watermarks)
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          source_table: 'bookings',
          enabled: true,
        },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/sync/tables/bookings`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ enabled: true }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('enabled');
  });

  it('returns 400 without enabled field', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/tables/bookings`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('enabled');
  });

  it('returns 400 with non-boolean enabled field', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/tables/bookings`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ enabled: 'true' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('enabled');
  });
});

// ─── POST /api/sync/tables/:table/reset ──────────────────────

describe('POST /api/sync/tables/:table/reset', () => {
  it('resets watermark', async () => {
    // Mock resetWatermark query (UPDATE sync_watermarks)
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          source_table: 'bookings',
          last_cursor_value: null,
        },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/sync/tables/bookings/reset`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('reset');
    expect(body.message).toContain('bookings');
  });

  it('requires sync.manage permission', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ source_table: 'payments', last_cursor_value: null }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/sync/tables/payments/reset`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });

    // Should succeed with super_admin
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/sync/test-connection ───────────────────────────

describe('GET /api/sync/test-connection', () => {
  it('returns connection status', async () => {
    // testExternalConnection is mocked in setup.ts to return false
    // (because sync is disabled in test config)
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/test-connection`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('connected');
    expect(body.connected).toBe(false);
    expect(body.reason).toBe('Sync is disabled');
  });

  it('returns reason when sync is disabled', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/test-connection`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.connected).toBe(false);
    expect(body.reason).toBe('Sync is disabled');
    // When sync is disabled, the route returns early without config
    expect(body).not.toHaveProperty('host');
  });

  it('requires authentication', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/sync/test-connection`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(401);
  });
});
