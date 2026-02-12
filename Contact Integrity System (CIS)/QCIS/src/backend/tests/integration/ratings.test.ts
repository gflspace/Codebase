import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  mockQuery, resetAllMocks, createTestApp, startServer, stopServer,
  authHeaders, uuid, OPS_USER, mockEmitRatingSubmitted,
} from '../helpers/setup';
import ratingRoutes from '../../src/api/routes/ratings';
import http from 'http';

const app = createTestApp();
app.use('/api/ratings', ratingRoutes);

let server: http.Server;
let port: number;

beforeAll(async () => {
  const s = await startServer(app);
  server = s.server;
  port = s.port;
});
afterAll(() => stopServer(server));
beforeEach(() => resetAllMocks());

describe('POST /api/ratings', () => {
  it('creates a rating and emits RATING_SUBMITTED', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(1), client_id: uuid(2), provider_id: uuid(3), score: 5, comment: 'Great', metadata: '{}', created_at: new Date().toISOString() }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/ratings`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ client_id: uuid(2), provider_id: uuid(3), score: 5, comment: 'Great' }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.score).toBe(5);
    expect(mockEmitRatingSubmitted).toHaveBeenCalledOnce();
    expect(mockEmitRatingSubmitted.mock.calls[0][0]).toMatchObject({
      client_id: uuid(2),
      provider_id: uuid(3),
      score: 5,
    });
  });

  it('rejects invalid score (0)', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ratings`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ client_id: uuid(2), provider_id: uuid(3), score: 0 }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid score (6)', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ratings`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ client_id: uuid(2), provider_id: uuid(3), score: 6 }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing client_id', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ratings`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ provider_id: uuid(3), score: 4 }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: uuid(2), provider_id: uuid(3), score: 5 }),
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/ratings', () => {
  it('lists ratings with pagination', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(1), client_id: uuid(2), provider_id: uuid(3), score: 5 }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/ratings`, { headers: authHeaders() });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toMatchObject({ page: 1, limit: 20, total: 1, pages: 1 });
  });

  it('filters by provider_id', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await fetch(`http://127.0.0.1:${port}/api/ratings?provider_id=${uuid(3)}`, { headers: authHeaders() });

    expect(mockQuery.mock.calls[0][0]).toContain('provider_id = $');
  });
});
