// QwickServices CIS — Shared Test Helpers for Integration Tests
// Provides DB/config/event mocks, token generation, and Express app factory.
// Import this BEFORE importing any app modules.

import { vi } from 'vitest';
import jwt from 'jsonwebtoken';
import express, { Express } from 'express';
import http from 'http';

// ─── Constants ───────────────────────────────────────────────

export const TEST_JWT_SECRET = 'test-jwt-secret-32-chars-minimum!';

// ─── Mock Database ───────────────────────────────────────────

export const mockQuery = vi.fn();
export const mockTransaction = vi.fn();

vi.mock('../../src/database/connection', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (fn: (client: unknown) => Promise<unknown>) => mockTransaction(fn),
  testConnection: () => Promise.resolve(true),
  getPool: () => ({}),
  closePool: () => Promise.resolve(),
  getClient: vi.fn(),
}));

// ─── Mock Config ─────────────────────────────────────────────

vi.mock('../../src/config', () => ({
  config: {
    port: 0,
    nodeEnv: 'test',
    apiBaseUrl: 'http://localhost:3099',
    db: { host: 'localhost', port: 5432, name: 'test', user: 'test', password: 'test', ssl: false },
    jwt: { secret: 'test-jwt-secret-32-chars-minimum!', expiresIn: '1h' },
    hmac: { secret: 'test-hmac-secret' },
    webhook: { secret: 'test-webhook-secret', allowedSources: ['qwickservices'] },
    shadowMode: true,
    enforcementKillSwitch: false,
    scoringModel: '5-component' as const,
    logLevel: 'error',
    dashboardUrl: 'http://localhost:3000',
    openai: { apiKey: '', model: 'gpt-4o-mini' },
    rateLimit: { windowMs: 60000, max: 10000, aiMax: 10000, writeMax: 10000 },
    redis: { url: '' },
    eventBusBackend: 'memory' as const,
  },
}));

// ─── Mock Event Emission (fire-and-forget helpers) ───────────

export const mockEmitMessageCreated = vi.fn().mockResolvedValue(undefined);
export const mockEmitTransactionInitiated = vi.fn().mockResolvedValue(undefined);
export const mockEmitTransactionStatusChanged = vi.fn().mockResolvedValue(undefined);
export const mockEmitUserStatusChanged = vi.fn().mockResolvedValue(undefined);
export const mockEmitAppealSubmitted = vi.fn().mockResolvedValue(undefined);
export const mockEmitAppealResolved = vi.fn().mockResolvedValue(undefined);
export const mockEmitEnforcementReversed = vi.fn().mockResolvedValue(undefined);
export const mockEmitBookingCreated = vi.fn().mockResolvedValue(undefined);
export const mockEmitBookingUpdated = vi.fn().mockResolvedValue(undefined);
export const mockEmitBookingCompleted = vi.fn().mockResolvedValue(undefined);
export const mockEmitBookingCancelled = vi.fn().mockResolvedValue(undefined);
export const mockEmitWalletTransaction = vi.fn().mockResolvedValue(undefined);
export const mockEmitContactFieldChanged = vi.fn().mockResolvedValue(undefined);
export const mockEmitRatingSubmitted = vi.fn().mockResolvedValue(undefined);
export const mockEmitLeakageStageAdvanced = vi.fn().mockResolvedValue(undefined);
export const mockEmitRelationshipUpdated = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/events/emit', () => ({
  emitMessageCreated: (...a: unknown[]) => mockEmitMessageCreated(...a),
  emitMessageEdited: vi.fn().mockResolvedValue(undefined),
  emitTransactionInitiated: (...a: unknown[]) => mockEmitTransactionInitiated(...a),
  emitTransactionStatusChanged: (...a: unknown[]) => mockEmitTransactionStatusChanged(...a),
  emitUserStatusChanged: (...a: unknown[]) => mockEmitUserStatusChanged(...a),
  emitAppealSubmitted: (...a: unknown[]) => mockEmitAppealSubmitted(...a),
  emitAppealResolved: (...a: unknown[]) => mockEmitAppealResolved(...a),
  emitEnforcementReversed: (...a: unknown[]) => mockEmitEnforcementReversed(...a),
  emitBookingCreated: (...a: unknown[]) => mockEmitBookingCreated(...a),
  emitBookingUpdated: (...a: unknown[]) => mockEmitBookingUpdated(...a),
  emitBookingCompleted: (...a: unknown[]) => mockEmitBookingCompleted(...a),
  emitBookingCancelled: (...a: unknown[]) => mockEmitBookingCancelled(...a),
  emitWalletTransaction: (...a: unknown[]) => mockEmitWalletTransaction(...a),
  emitContactFieldChanged: (...a: unknown[]) => mockEmitContactFieldChanged(...a),
  emitRatingSubmitted: (...a: unknown[]) => mockEmitRatingSubmitted(...a),
  emitLeakageStageAdvanced: (...a: unknown[]) => mockEmitLeakageStageAdvanced(...a),
  emitRelationshipUpdated: (...a: unknown[]) => mockEmitRelationshipUpdated(...a),
}));

// ─── Mock Event Normalizer ───────────────────────────────────

export const mockNormalizeWebhookEvent = vi.fn();

vi.mock('../../src/events/normalizer', () => ({
  normalizeWebhookEvent: (...a: unknown[]) => mockNormalizeWebhookEvent(...a),
  mapEventType: vi.fn(),
  mapBookingPayload: vi.fn(),
  mapWalletPayload: vi.fn(),
  mapProviderPayload: vi.fn(),
  resolveOrCreateUser: vi.fn(),
}));

// ─── Mock Event Bus ──────────────────────────────────────────

vi.mock('../../src/events/bus', () => ({
  getEventBus: () => ({ emit: vi.fn().mockResolvedValue(undefined), registerConsumer: vi.fn(), subscribe: vi.fn() }),
  resetEventBus: vi.fn(),
  EventBus: vi.fn(),
}));

// ─── Mock Redis ──────────────────────────────────────────────

vi.mock('../../src/events/redis', () => ({
  getRedisClient: vi.fn(),
  closeRedis: vi.fn().mockResolvedValue(undefined),
  isRedisAvailable: () => false,
  testRedisConnection: () => Promise.resolve(false),
}));

// ─── Mock Permissions ────────────────────────────────────────

const ALL_PERMISSIONS = [
  'overview.view', 'alerts.view', 'alerts.action', 'cases.view', 'cases.create',
  'cases.action', 'enforcement.view', 'enforcement.reverse', 'risk.view',
  'appeals.view', 'appeals.resolve', 'audit_logs.view', 'settings.view',
  'settings.manage_admins', 'settings.manage_roles', 'intelligence.view',
  'category.view', 'system_health.view', 'messages.view',
  'rules.view', 'rules.manage',
];

export const mockResolvePermissions = vi.fn().mockResolvedValue(ALL_PERMISSIONS);

vi.mock('../../src/api/middleware/permissions', () => ({
  resolvePermissions: (...a: unknown[]) => mockResolvePermissions(...a),
}));

// ─── Token Helpers ───────────────────────────────────────────

export interface TokenUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

export const SUPER_ADMIN: TokenUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'admin@test.com',
  role: 'super_admin',
  permissions: ALL_PERMISSIONS,
};

export const OPS_USER: TokenUser = {
  id: '00000000-0000-4000-8000-000000000002',
  email: 'ops@test.com',
  role: 'ops_monitor',
  permissions: ['overview.view'],
};

export function generateTestToken(user: TokenUser = SUPER_ADMIN): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, permissions: user.permissions },
    TEST_JWT_SECRET,
    { expiresIn: '1h' },
  );
}

// ─── Server Helpers ──────────────────────────────────────────

export function createTestApp(): Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  return app;
}

export async function startServer(app: Express): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      resolve({ server, port });
    });
  });
}

export async function stopServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

// ─── Request Helpers ─────────────────────────────────────────

export function authHeaders(user: TokenUser = SUPER_ADMIN): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${generateTestToken(user)}`,
  };
}

// ─── UUID Helpers ────────────────────────────────────────────

export function uuid(n: number = 1): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

// ─── Reset All Mocks ─────────────────────────────────────────

export function resetAllMocks(): void {
  mockQuery.mockReset();
  mockTransaction.mockReset();
  mockEmitMessageCreated.mockClear();
  mockEmitTransactionInitiated.mockClear();
  mockEmitTransactionStatusChanged.mockClear();
  mockEmitUserStatusChanged.mockClear();
  mockEmitAppealSubmitted.mockClear();
  mockEmitAppealResolved.mockClear();
  mockEmitEnforcementReversed.mockClear();
  mockEmitBookingCreated.mockClear();
  mockEmitBookingUpdated.mockClear();
  mockEmitBookingCompleted.mockClear();
  mockEmitBookingCancelled.mockClear();
  mockEmitWalletTransaction.mockClear();
  mockEmitContactFieldChanged.mockClear();
  mockEmitRatingSubmitted.mockClear();
  mockEmitLeakageStageAdvanced.mockClear();
  mockEmitRelationshipUpdated.mockClear();
  mockNormalizeWebhookEvent.mockClear();
  mockResolvePermissions.mockClear();
  mockResolvePermissions.mockResolvedValue(ALL_PERMISSIONS);
}
