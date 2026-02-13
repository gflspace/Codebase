import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  mockQuery, resetAllMocks, createTestApp, startServer, stopServer,
  authHeaders, uuid, mockEmitMessageCreated,
} from '../helpers/setup';
import messageRoutes from '../../src/api/routes/messages';
import http from 'http';

const app = createTestApp();
app.use('/api/messages', messageRoutes);

let server: http.Server;
let port: number;

beforeAll(async () => { const s = await startServer(app); server = s.server; port = s.port; });
afterAll(() => stopServer(server));
beforeEach(() => resetAllMocks());

describe('GET /api/messages', () => {
  it('lists messages with pagination', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(1), content: 'Hello' }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/messages`, { headers: authHeaders() });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
  });

  it('filters by sender_id', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await fetch(`http://127.0.0.1:${port}/api/messages?sender_id=${uuid(2)}`, { headers: authHeaders() });
    expect(mockQuery.mock.calls[0][0]).toContain('sender_id = $');
  });
});

describe('GET /api/messages/:id', () => {
  it('returns 404 for non-existent message', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/messages/${uuid(999)}`, { headers: authHeaders() });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/messages', () => {
  it('creates a message and emits event', async () => {
    const msg = { id: uuid(5), sender_id: uuid(1), receiver_id: uuid(2), content: 'test' };
    mockQuery.mockResolvedValueOnce({ rows: [msg] });

    const res = await fetch(`http://127.0.0.1:${port}/api/messages`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ sender_id: uuid(1), receiver_id: uuid(2), content: 'test' }),
    });

    expect(res.status).toBe(201);
    expect(mockEmitMessageCreated).toHaveBeenCalledOnce();
  });

  it('rejects empty content', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/messages`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ sender_id: uuid(1), receiver_id: uuid(2), content: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing sender_id', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/messages`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ receiver_id: uuid(2), content: 'hello' }),
    });
    expect(res.status).toBe(400);
  });
});
