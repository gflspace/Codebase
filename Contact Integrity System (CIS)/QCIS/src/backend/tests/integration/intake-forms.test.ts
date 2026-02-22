import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  mockQuery, resetAllMocks, createTestApp, startServer, stopServer,
  authHeaders, uuid, OPS_USER,
} from '../helpers/setup';
import intakeFormRoutes from '../../src/api/routes/intake-forms';
import http from 'http';

const app = createTestApp();
app.use('/api/intake-form', intakeFormRoutes);

let server: http.Server;
let port: number;

beforeAll(async () => {
  const s = await startServer(app);
  server = s.server;
  port = s.port;
});
afterAll(() => stopServer(server));
beforeEach(() => resetAllMocks());

const VALID_FORM = {
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  phone: '555-0101',
  service_category: 'Cleaning',
  service_description: 'Deep clean for 3-bedroom house',
  preferred_date: '2026-03-15',
  preferred_time: '10:00 AM',
  referral_source: 'google',
};

const NOW = new Date().toISOString();

// ─── POST /api/intake-form (public) ─────────────────────────

describe('POST /api/intake-form', () => {
  it('creates an intake form without authentication', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(1),
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        service_category: 'Cleaning',
        status: 'new',
        created_at: NOW,
      }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_FORM),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.first_name).toBe('Jane');
    expect(body.data.status).toBe('new');

    // Verify INSERT query was called with correct params
    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO intake_forms');
    expect(params[1]).toBe('Jane');      // first_name
    expect(params[2]).toBe('Doe');       // last_name
    expect(params[3]).toBe('jane@example.com'); // email
    expect(params[4]).toBe('555-0101'); // phone
    expect(params[5]).toBe('Cleaning'); // service_category
  });

  it('creates with minimal fields (only required)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(2),
        first_name: 'John',
        last_name: 'Smith',
        email: 'john@example.com',
        service_category: null,
        status: 'new',
        created_at: NOW,
      }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'John', last_name: 'Smith', email: 'john@example.com' }),
    });

    expect(res.status).toBe(201);

    const params = mockQuery.mock.calls[0][1];
    expect(params[4]).toBeNull();  // phone
    expect(params[5]).toBeNull();  // service_category
    expect(params[6]).toBeNull();  // service_description
  });

  it('rejects missing first_name', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ last_name: 'Doe', email: 'jane@example.com' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('rejects missing email', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'Jane', last_name: 'Doe' }),
    });

    expect(res.status).toBe(400);
  });

  it('rejects invalid email format', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'Jane', last_name: 'Doe', email: 'not-an-email' }),
    });

    expect(res.status).toBe(400);
  });

  it('rejects invalid preferred_date format', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_FORM, preferred_date: '15/03/2026' }),
    });

    expect(res.status).toBe(400);
  });

  it('stores metadata as JSON', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: uuid(3), first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', service_category: null, status: 'new', created_at: NOW }],
    });

    await fetch(`http://127.0.0.1:${port}/api/intake-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_FORM, metadata: { utm_source: 'facebook', campaign: 'spring2026' } }),
    });

    const params = mockQuery.mock.calls[0][1];
    expect(params[12]).toBe(JSON.stringify({ utm_source: 'facebook', campaign: 'spring2026' }));
  });
});

// ─── GET /api/intake-form (authenticated) ───────────────────

describe('GET /api/intake-form', () => {
  it('lists intake forms with pagination', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { id: uuid(1), first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', status: 'new', created_at: NOW, updated_at: NOW },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form`, { headers: authHeaders() });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toMatchObject({ page: 1, limit: 20, total: 1, pages: 1 });
  });

  it('filters by status', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await fetch(`http://127.0.0.1:${port}/api/intake-form?status=contacted`, { headers: authHeaders() });

    expect(mockQuery.mock.calls[0][0]).toContain('status = $');
    expect(mockQuery.mock.calls[0][1][0]).toBe('contacted');
  });

  it('filters by email', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await fetch(`http://127.0.0.1:${port}/api/intake-form?email=jane@example.com`, { headers: authHeaders() });

    expect(mockQuery.mock.calls[0][0]).toContain('email = $');
  });

  it('filters by service_category', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await fetch(`http://127.0.0.1:${port}/api/intake-form?service_category=Cleaning`, { headers: authHeaders() });

    expect(mockQuery.mock.calls[0][0]).toContain('service_category = $');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/intake-form/:id (authenticated) ──────────────

describe('GET /api/intake-form/:id', () => {
  it('returns a single intake form by ID', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(1), first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com',
        phone: '555-0101', service_category: 'Cleaning', status: 'new',
        ip_address: '192.168.1.1', user_agent: 'TestAgent/1.0',
        metadata: '{}', notes: null, created_at: NOW, updated_at: NOW,
      }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form/${uuid(1)}`, { headers: authHeaders() });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.first_name).toBe('Jane');
    expect(body.data.ip_address).toBe('192.168.1.1');
  });

  it('returns 404 for non-existent form', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form/${uuid(99)}`, { headers: authHeaders() });

    expect(res.status).toBe(404);
  });

  it('rejects invalid UUID', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form/not-a-uuid`, { headers: authHeaders() });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('UUID');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form/${uuid(1)}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/intake-form/:id (authenticated) ────────────

describe('PATCH /api/intake-form/:id', () => {
  it('updates status', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(1), first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com',
        status: 'contacted', notes: null, updated_at: NOW,
      }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form/${uuid(1)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'contacted' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('contacted');

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('UPDATE intake_forms');
    expect(sql).toContain('status = $');
  });

  it('updates notes', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(1), first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com',
        status: 'new', notes: 'Called, left voicemail.', updated_at: NOW,
      }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form/${uuid(1)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ notes: 'Called, left voicemail.' }),
    });

    expect(res.status).toBe(200);
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('notes = $');
  });

  it('updates both status and notes', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: uuid(1), first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com',
        status: 'converted', notes: 'Booking confirmed.', updated_at: NOW,
      }],
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form/${uuid(1)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'converted', notes: 'Booking confirmed.' }),
    });

    expect(res.status).toBe(200);
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('status = $');
    expect(sql).toContain('notes = $');
    expect(sql).toContain('updated_at = NOW()');
  });

  it('rejects empty update body', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form/${uuid(1)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it('rejects invalid status value', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form/${uuid(1)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'invalid_status' }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent form', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form/${uuid(99)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'contacted' }),
    });

    expect(res.status).toBe(404);
  });

  it('rejects invalid UUID', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form/not-a-uuid`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'contacted' }),
    });

    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/intake-form/${uuid(1)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'contacted' }),
    });

    expect(res.status).toBe(401);
  });
});
