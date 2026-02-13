// QwickServices CIS — Phase 3C: Alerting Engine Integration Tests

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  mockQuery, resetAllMocks, createTestApp, startServer, stopServer,
  authHeaders, OPS_USER, uuid,
} from '../helpers/setup';
import alertSubscriptionRoutes from '../../src/api/routes/alert-subscriptions';
import statsV2Routes from '../../src/api/routes/stats-v2';
import http from 'http';

const app = createTestApp();
app.use('/api/alert-subscriptions', alertSubscriptionRoutes);
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

const SUB_BODY = {
  name: 'Critical enforcement alerts',
  filter_criteria: {
    priority: ['critical', 'high'],
    source: ['enforcement'],
  },
  channels: ['dashboard', 'email'],
  enabled: true,
};

// ─── Subscription CRUD ──────────────────────────────────────

describe('POST /api/alert-subscriptions', () => {
  it('creates a subscription', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(10),
        admin_user_id: uuid(1),
        name: SUB_BODY.name,
        filter_criteria: SUB_BODY.filter_criteria,
        channels: SUB_BODY.channels,
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/alert-subscriptions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(SUB_BODY),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe(SUB_BODY.name);
    expect(body.data.channels).toEqual(['dashboard', 'email']);
  });

  it('validates required name field', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/alert-subscriptions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ filter_criteria: {} }),
    });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/alert-subscriptions', () => {
  it('lists subscriptions for current admin', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: uuid(10), admin_user_id: uuid(1), name: 'Sub 1', filter_criteria: {}, channels: ['dashboard'], enabled: true },
        { id: uuid(11), admin_user_id: uuid(1), name: 'Sub 2', filter_criteria: { priority: ['critical'] }, channels: ['email'], enabled: false },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/alert-subscriptions`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
  });
});

describe('PATCH /api/alert-subscriptions/:id', () => {
  it('updates a subscription', async () => {
    // Verify ownership
    mockQuery.mockResolvedValueOnce({ rows: [{ id: uuid(10) }] });
    // UPDATE
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(10), name: 'Updated name', filter_criteria: {}, channels: ['dashboard'], enabled: false }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/alert-subscriptions/${uuid(10)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ name: 'Updated name', enabled: false }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Updated name');
  });

  it('returns 404 for non-existent subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/alert-subscriptions/${uuid(99)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ name: 'Updated' }),
    });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/alert-subscriptions/:id', () => {
  it('deletes a subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: uuid(10) }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/alert-subscriptions/${uuid(10)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it('returns 404 for non-existent subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/alert-subscriptions/${uuid(99)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    expect(res.status).toBe(404);
  });
});

// ─── Auth Required ──────────────────────────────────────────

describe('Auth enforcement', () => {
  it('rejects unauthenticated GET request', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/alert-subscriptions`);
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated POST request', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/alert-subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SUB_BODY),
    });
    expect(res.status).toBe(401);
  });

  it('rejects ops user without alerts.action for POST', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/alert-subscriptions`, {
      method: 'POST',
      headers: authHeaders(OPS_USER),
      body: JSON.stringify(SUB_BODY),
    });
    expect(res.status).toBe(403);
  });
});

// ─── Alert Stats Endpoint ───────────────────────────────────

describe('GET /api/stats/v2/alert-stats', () => {
  it('returns alert stats response shape', async () => {
    // by_source
    mockQuery.mockResolvedValueOnce({
      rows: [
        { source: 'enforcement', cnt: '5' },
        { source: 'threshold', cnt: '3' },
      ],
    });
    // by_priority
    mockQuery.mockResolvedValueOnce({
      rows: [
        { priority: 'critical', cnt: '2' },
        { priority: 'high', cnt: '4' },
      ],
    });
    // status counts
    mockQuery.mockResolvedValueOnce({
      rows: [{ open_count: '6', resolved_count: '2', total: '8' }],
    });
    // avg resolution
    mockQuery.mockResolvedValueOnce({
      rows: [{ avg_seconds: '7200' }],
    });
    // SLA breach
    mockQuery.mockResolvedValueOnce({
      rows: [{ breached: '1', total: '8' }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/stats/v2/alert-stats?range=last_24h`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.by_source).toBeDefined();
    expect(body.data.by_source.enforcement).toBe(5);
    expect(body.data.by_source.threshold).toBe(3);
    expect(body.data.by_priority).toBeDefined();
    expect(body.data.open_count).toBe(6);
    expect(body.data.resolved_count).toBe(2);
    expect(body.data.total).toBe(8);
    expect(body.data.avg_resolution_hours).toBe(2);
    expect(body.data.sla_breach_count).toBe(1);
    expect(body.data.sla_breach_rate).toBeGreaterThan(0);
  });
});
