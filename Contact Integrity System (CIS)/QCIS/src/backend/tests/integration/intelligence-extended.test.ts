// QwickServices CIS — Phase 3A: Intelligence Extended API Integration Tests
// Tests for /clusters and /path endpoints

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

// ─── Clusters Tests ─────────────────────────────────────────────

describe('GET /api/intelligence/clusters', () => {
  it('returns clusters with risk metrics', async () => {
    // All edges query
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_a_id: uuid(1), user_b_id: uuid(2), relationship_type: 'messaged' },
        { user_a_id: uuid(2), user_b_id: uuid(3), relationship_type: 'transacted' },
        { user_a_id: uuid(4), user_b_id: uuid(5), relationship_type: 'messaged' },
        { user_a_id: uuid(5), user_b_id: uuid(6), relationship_type: 'messaged' },
      ],
    });
    // Risk scores query
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_id: uuid(1), score: '30', tier: 'low' },
        { user_id: uuid(2), score: '80', tier: 'high' },
        { user_id: uuid(3), score: '25', tier: 'low' },
        { user_id: uuid(4), score: '60', tier: 'medium' },
        { user_id: uuid(5), score: '90', tier: 'critical' },
        { user_id: uuid(6), score: '70', tier: 'high' },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/clusters?min_size=3`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toBeInstanceOf(Array);
    // Should have 2 clusters: [1,2,3] and [4,5,6]
    expect(body.data.length).toBe(2);

    // Verify cluster structure
    const cluster = body.data[0];
    expect(cluster).toHaveProperty('cluster_id');
    expect(cluster).toHaveProperty('members');
    expect(cluster).toHaveProperty('cluster_size');
    expect(cluster).toHaveProperty('avg_trust_score');
    expect(cluster).toHaveProperty('risk_ratio');
    expect(cluster).toHaveProperty('risk_score');
    expect(cluster).toHaveProperty('relationship_types');

    // Verify cluster size
    expect(cluster.cluster_size).toBeGreaterThanOrEqual(3);
    expect(cluster.members.length).toBe(cluster.cluster_size);

    // Verify risk metrics
    expect(cluster.avg_trust_score).toBeGreaterThan(0);
    expect(cluster.risk_ratio).toBeGreaterThanOrEqual(0);
    expect(cluster.risk_ratio).toBeLessThanOrEqual(1);
    expect(cluster.risk_score).toBeGreaterThan(0);
  });

  it('respects min_size parameter', async () => {
    // All edges query
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_a_id: uuid(1), user_b_id: uuid(2), relationship_type: 'messaged' },
        { user_a_id: uuid(3), user_b_id: uuid(4), relationship_type: 'messaged' },
        { user_a_id: uuid(4), user_b_id: uuid(5), relationship_type: 'messaged' },
        { user_a_id: uuid(5), user_b_id: uuid(6), relationship_type: 'messaged' },
      ],
    });
    // Risk scores query
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_id: uuid(3), score: '30', tier: 'low' },
        { user_id: uuid(4), score: '40', tier: 'low' },
        { user_id: uuid(5), score: '50', tier: 'medium' },
        { user_id: uuid(6), score: '60', tier: 'medium' },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/clusters?min_size=4`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    // Should only return cluster [3,4,5,6] with size 4
    expect(body.data.length).toBe(1);
    expect(body.data[0].cluster_size).toBe(4);
  });

  it('returns empty when no relationships exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/clusters`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it('returns empty when no clusters meet min_size', async () => {
    // All edges query — only pairs
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_a_id: uuid(1), user_b_id: uuid(2), relationship_type: 'messaged' },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/clusters?min_size=3`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it('sorts by risk_score descending', async () => {
    // Create two clusters with different risk profiles
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_a_id: uuid(1), user_b_id: uuid(2), relationship_type: 'messaged' },
        { user_a_id: uuid(2), user_b_id: uuid(3), relationship_type: 'messaged' },
        { user_a_id: uuid(4), user_b_id: uuid(5), relationship_type: 'messaged' },
        { user_a_id: uuid(5), user_b_id: uuid(6), relationship_type: 'messaged' },
      ],
    });
    // Cluster 2 has higher scores (higher risk)
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_id: uuid(1), score: '20', tier: 'low' },
        { user_id: uuid(2), score: '30', tier: 'low' },
        { user_id: uuid(3), score: '25', tier: 'low' },
        { user_id: uuid(4), score: '90', tier: 'critical' },
        { user_id: uuid(5), score: '85', tier: 'high' },
        { user_id: uuid(6), score: '88', tier: 'critical' },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/clusters?min_size=3`, {
      headers: authHeaders(),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(2);
    // First cluster should have higher risk_score
    expect(body.data[0].risk_score).toBeGreaterThan(body.data[1].risk_score);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/clusters`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('rejects without intelligence.view permission', async () => {
    mockResolvePermissions.mockResolvedValue(['overview.view']);

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/clusters`, {
      headers: authHeaders(OPS_USER),
    });
    expect(res.status).toBe(403);
  });
});

// ─── Path Tests ─────────────────────────────────────────────────

describe('POST /api/intelligence/path', () => {
  it('finds shortest path between connected users', async () => {
    const sourceId = uuid(1);
    const targetId = uuid(4);

    // BFS iteration 1: source -> neighbors
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: uuid(10), user_a_id: uuid(1), user_b_id: uuid(2), relationship_type: 'messaged' },
      ],
    });
    // BFS iteration 2: depth-2 neighbors
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: uuid(11), user_a_id: uuid(2), user_b_id: uuid(3), relationship_type: 'transacted' },
      ],
    });
    // BFS iteration 3: find target
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: uuid(12), user_a_id: uuid(3), user_b_id: uuid(4), relationship_type: 'messaged' },
      ],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/path`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        source_user_id: sourceId,
        target_user_id: targetId,
        max_depth: 5,
      }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.found).toBe(true);
    expect(body.data.path).toEqual([uuid(1), uuid(2), uuid(3), uuid(4)]);
    expect(body.data.path_length).toBe(3);
    expect(body.data.edges).toHaveLength(3);
    expect(body.data.edges[0].relationship_type).toBe('messaged');
  });

  it('returns found=false for disconnected users', async () => {
    const sourceId = uuid(1);
    const targetId = uuid(99);

    // BFS iteration 1: source has no neighbors
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/path`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        source_user_id: sourceId,
        target_user_id: targetId,
        max_depth: 5,
      }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.found).toBe(false);
    expect(body.data.path).toEqual([]);
    expect(body.data.edges).toEqual([]);
    expect(body.data.path_length).toBe(0);
  });

  it('respects max_depth limit', async () => {
    const sourceId = uuid(1);
    const targetId = uuid(5);

    // BFS iteration 1
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(10), user_a_id: uuid(1), user_b_id: uuid(2), relationship_type: 'messaged' }],
    });
    // BFS iteration 2 (max_depth=2, stop here)
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(11), user_a_id: uuid(2), user_b_id: uuid(3), relationship_type: 'messaged' }],
    });
    // No more iterations because max_depth=2

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/path`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        source_user_id: sourceId,
        target_user_id: targetId,
        max_depth: 2,
      }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    // Target not reached within max_depth
    expect(body.data.found).toBe(false);
  });

  it('validates UUID format for source_user_id', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/path`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        source_user_id: 'not-a-uuid',
        target_user_id: uuid(2),
        max_depth: 5,
      }),
    });

    expect(res.status).toBe(400);
  });

  it('validates UUID format for target_user_id', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/path`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        source_user_id: uuid(1),
        target_user_id: 'invalid-uuid',
        max_depth: 5,
      }),
    });

    expect(res.status).toBe(400);
  });

  it('uses default max_depth if not provided', async () => {
    const sourceId = uuid(1);
    const targetId = uuid(2);

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(10), user_a_id: uuid(1), user_b_id: uuid(2), relationship_type: 'messaged' }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/path`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        source_user_id: sourceId,
        target_user_id: targetId,
        // max_depth not provided, should default to 5
      }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.found).toBe(true);
  });

  it('finds direct connection (path_length=1)', async () => {
    const sourceId = uuid(1);
    const targetId = uuid(2);

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(10), user_a_id: uuid(1), user_b_id: uuid(2), relationship_type: 'messaged' }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/path`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        source_user_id: sourceId,
        target_user_id: targetId,
      }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.found).toBe(true);
    expect(body.data.path).toEqual([uuid(1), uuid(2)]);
    expect(body.data.path_length).toBe(1);
    expect(body.data.edges).toHaveLength(1);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/path`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_user_id: uuid(1),
        target_user_id: uuid(2),
      }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects without intelligence.view permission', async () => {
    mockResolvePermissions.mockResolvedValue(['overview.view']);

    const res = await fetch(`http://127.0.0.1:${port}/api/intelligence/path`, {
      method: 'POST',
      headers: authHeaders(OPS_USER),
      body: JSON.stringify({
        source_user_id: uuid(1),
        target_user_id: uuid(2),
      }),
    });
    expect(res.status).toBe(403);
  });
});
