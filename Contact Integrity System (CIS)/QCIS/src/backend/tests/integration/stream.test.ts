// QwickServices CIS — SSE Stream Integration Tests

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  resetAllMocks, createTestApp, startServer, stopServer,
  generateTestToken, SUPER_ADMIN, OPS_USER,
} from '../helpers/setup';
import streamRoutes from '../../src/api/routes/stream';
import http from 'http';

const app = createTestApp();
app.use('/api/stream', streamRoutes);

let server: http.Server;
let port: number;

beforeAll(async () => {
  const s = await startServer(app);
  server = s.server;
  port = s.port;
});
afterAll(() => stopServer(server));
beforeEach(() => resetAllMocks());

describe('GET /api/stream', () => {
  it('rejects requests without token', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/stream`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Token required');
  });

  it('rejects invalid token', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/stream?token=invalid`);
    expect(res.status).toBe(401);
  });

  it('rejects token without required permissions', async () => {
    const token = generateTestToken(OPS_USER);
    const res = await fetch(`http://127.0.0.1:${port}/api/stream?token=${token}`);
    expect(res.status).toBe(403);
  });

  it('accepts valid token and returns SSE headers', async () => {
    const token = generateTestToken(SUPER_ADMIN);
    const controller = new AbortController();

    const res = await fetch(`http://127.0.0.1:${port}/api/stream?token=${token}`, {
      signal: controller.signal,
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    expect(res.headers.get('cache-control')).toBe('no-cache');

    // Read first chunk (connection event)
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain('"type":"connected"');

    // Clean up
    controller.abort();
    reader.releaseLock();
  });
});
