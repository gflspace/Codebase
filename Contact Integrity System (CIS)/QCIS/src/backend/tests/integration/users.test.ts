import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  mockQuery, resetAllMocks, createTestApp, startServer, stopServer,
  authHeaders, uuid, SUPER_ADMIN, OPS_USER, mockEmitUserStatusChanged, mockEmitContactFieldChanged,
} from '../helpers/setup';
import userRoutes from '../../src/api/routes/users';
import http from 'http';

const app = createTestApp();
app.use('/api/users', userRoutes);

let server: http.Server;
let port: number;

beforeAll(async () => {
  const s = await startServer(app);
  server = s.server;
  port = s.port;
});
afterAll(() => stopServer(server));
beforeEach(() => resetAllMocks());

describe('GET /api/users', () => {
  it('lists users with pagination', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: uuid(1), display_name: 'Alice' }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/users`, { headers: authHeaders() });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toMatchObject({ page: 1, limit: 20, total: 1, pages: 1 });
  });

  it('filters by status', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await fetch(`http://127.0.0.1:${port}/api/users?status=suspended`, { headers: authHeaders() });

    expect(mockQuery.mock.calls[0][0]).toContain('status = $');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/users`);
    expect(res.status).toBe(401);
  });

  it('rejects users without overview.view', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/users`, {
      headers: authHeaders({ ...OPS_USER, permissions: [] }),
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/users/:id', () => {
  it('returns a single user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: uuid(1), display_name: 'Alice' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/users/${uuid(1)}`, { headers: authHeaders() });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(uuid(1));
  });

  it('returns 404 for non-existent user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/users/${uuid(999)}`, { headers: authHeaders() });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid UUID', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/users/not-a-uuid`, { headers: authHeaders() });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/users', () => {
  it('creates a user and returns 201', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: uuid(10), display_name: 'Bob', email: 'bob@test.com' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/users`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ display_name: 'Bob', email: 'bob@test.com' }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.display_name).toBe('Bob');
  });
});

describe('PATCH /api/users/:id', () => {
  it('updates user status and emits event', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'active' }] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(1), status: 'restricted' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/users/${uuid(1)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'restricted' }),
    });

    expect(res.status).toBe(200);
    expect(mockEmitUserStatusChanged).toHaveBeenCalledOnce();
  });

  it('returns 400 with empty body', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/users/${uuid(1)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('emits CONTACT_FIELD_CHANGED when phone changes', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'active', phone: '+15550000000', email: 'old@test.com' }] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(1), phone: '+15551111111', status: 'active' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/users/${uuid(1)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ phone: '+15551111111' }),
    });

    expect(res.status).toBe(200);
    expect(mockEmitContactFieldChanged).toHaveBeenCalledOnce();
    expect(mockEmitContactFieldChanged.mock.calls[0][0]).toMatchObject({
      user_id: uuid(1),
      field: 'phone',
      old_value: '+15550000000',
      new_value: '+15551111111',
    });
  });

  it('emits CONTACT_FIELD_CHANGED when email changes', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'active', phone: '+15550000000', email: 'old@test.com' }] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(1), email: 'new@test.com', status: 'active' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/users/${uuid(1)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ email: 'new@test.com' }),
    });

    expect(res.status).toBe(200);
    expect(mockEmitContactFieldChanged).toHaveBeenCalledOnce();
    expect(mockEmitContactFieldChanged.mock.calls[0][0]).toMatchObject({
      user_id: uuid(1),
      field: 'email',
      old_value: 'old@test.com',
      new_value: 'new@test.com',
    });
  });

  it('does NOT emit CONTACT_FIELD_CHANGED when phone is unchanged', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'active', phone: '+15550000000', email: 'old@test.com' }] })
      .mockResolvedValueOnce({ rows: [{ id: uuid(1), phone: '+15550000000', status: 'active' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/users/${uuid(1)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ phone: '+15550000000' }),
    });

    expect(res.status).toBe(200);
    expect(mockEmitContactFieldChanged).not.toHaveBeenCalled();
  });
});
