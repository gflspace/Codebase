// QwickServices CIS — Phase 3A: Intelligence API Integration Tests

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  mockQuery, resetAllMocks, createTestApp, startServer, stopServer,
  authHeaders, uuid, OPS_USER, mockResolvePermissions,
} from '../helpers/setup';
import intelligenceRoutes from '../../src/api/routes/intelligence';
import http from 'http';

const app = createTestApp();
app.use('/api/intelligence', intelligenceRoutes);

let server: http.Server;
let port: number;

beforeAll(async () => {
  const s = await startServer(app);
  server = s.server;
  port = s.port;
});
afterAll(() => stopServer(server));
beforeEach(() => resetAllMocks());

// ─── Leakage Tests ──────────────────────────────────────────────

describe('GET /api/intelligence/leakage', () => {
  it('lists with pagination', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { id: uuid(1), user_id: uuid(2), stage: 'signal', created_at: '2026-01-01T00:00:00Z' },
          { id: uuid(3), user_id: uuid(4), stage: 'attempt', created_at: '2026-01-02T00:00:00Z' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total: '2' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/leakage?page=1&limit=10`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
  });

  it('filters by stage', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(1), stage: 'leakage' }] })
      .mockResolvedValueOnce({ rows: [{ total: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/leakage?stage=leakage`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].stage).toBe('leakage');
  });

  it('filters by user_id', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/leakage?user_id=${uuid(5)}`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    // Verify user_id filter was passed as query param
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('user_id');
  });

  it('rejects unauthenticated', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/leakage`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/intelligence/leakage/funnel', () => {
  it('returns stage counts', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { stage: 'signal', count: '42' },
        { stage: 'attempt', count: '15' },
        { stage: 'confirmation', count: '5' },
        { stage: 'leakage', count: '2' },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/leakage/funnel?range=last_30d`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({
      signal: 42,
      attempt: 15,
      confirmation: 5,
      leakage: 2,
    });
  });
});

describe('GET /api/intelligence/leakage/destinations', () => {
  it('returns platform distribution', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { platform: 'messaging_app', count: '25' },
        { platform: 'phone', count: '10' },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/leakage/destinations`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toEqual({ platform: 'messaging_app', count: 25 });
  });
});

// ─── Network Tests ──────────────────────────────────────────────

describe('GET /api/intelligence/network/:userId', () => {
  it('returns nodes and edges', async () => {
    // BFS depth-1 query
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(10),
        user_a_id: uuid(1),
        user_b_id: uuid(2),
        relationship_type: 'messaged',
        interaction_count: '5',
        total_value: '0',
        strength_score: '0.537',
      }],
    });
    // Node details
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: uuid(1), display_name: 'Alice', user_type: 'customer', status: 'active', trust_score: '25' },
        { id: uuid(2), display_name: 'Bob', user_type: 'provider', status: 'active', trust_score: '60' },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/network/${uuid(1)}`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.nodes).toHaveLength(2);
    expect(body.data.edges).toHaveLength(1);
    expect(body.data.edges[0].relationship_type).toBe('messaged');
  });

  it('validates UUID param', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/network/not-a-uuid`, {
      headers: authHeaders(),
    });
    expect(res.status).toBe(400);
  });

  it('returns empty for user with no relationships', async () => {
    // BFS returns no edges
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Node details for just the queried user
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(1), display_name: 'Alice', user_type: 'customer', status: 'active', trust_score: null }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/network/${uuid(1)}`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.nodes).toHaveLength(1);
    expect(body.data.edges).toHaveLength(0);
  });
});

describe('GET /api/intelligence/network/:userId/clusters', () => {
  it('returns cluster info', async () => {
    // BFS iteration 1 — find neighbors
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_a_id: uuid(1), user_b_id: uuid(2) },
        { user_a_id: uuid(1), user_b_id: uuid(3) },
      ],
    });
    // BFS iteration 2 — no more neighbors
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Risk scores for cluster
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_id: uuid(1), score: '30', tier: 'low' },
        { user_id: uuid(2), score: '80', tier: 'high' },
        { user_id: uuid(3), score: '25', tier: 'low' },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/network/${uuid(1)}/clusters`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.cluster_size).toBe(3);
    expect(body.data.members).toContain(uuid(1));
    expect(body.data.members).toContain(uuid(2));
    expect(body.data.avg_trust_score).toBeGreaterThan(0);
    expect(body.data.risk_ratio).toBeCloseTo(0.333, 2);
  });

  it('returns empty cluster for isolated user', async () => {
    // BFS — no neighbors
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Risk scores
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/network/${uuid(1)}/clusters`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.cluster_size).toBe(1);
    expect(body.data.members).toEqual([uuid(1)]);
    expect(body.data.avg_trust_score).toBe(0);
  });
});

// ─── Device Tests ────────────────────────────────────────────────

describe('GET /api/intelligence/devices', () => {
  it('lists with pagination', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { id: uuid(1), user_id: uuid(2), device_hash: 'abc123', shared_user_count: '1' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/devices?page=1&limit=10`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
  });

  it('filters by user_id', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/devices?user_id=${uuid(5)}`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('user_id');
  });

  it('filters by device_hash', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/devices?device_hash=abc123`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('device_hash');
  });

  it('rejects without permission', async () => {
    mockResolvePermissions.mockResolvedValue(['overview.view']); // no intelligence.view

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/devices`, {
      headers: authHeaders(OPS_USER),
    });
    expect(res.status).toBe(403);
  });
});
