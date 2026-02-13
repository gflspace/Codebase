/**
 * E2E Test Suite — Setup Utilities
 *
 * Provides:
 * - Express server lifecycle management
 * - Admin user seeding
 * - HMAC signature generation helpers
 * - JWT token generation for admin authentication
 * - Test configuration
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import http from 'http';

// ─── Configuration ───────────────────────────────────────────────

export const E2E_CONFIG = {
  dbHost: 'localhost',
  dbPort: 5433,
  dbName: 'qwick_cis_test',
  dbUser: 'cis_test_user',
  dbPassword: 'cis_test_password',
  dbSsl: false,
  redisUrl: 'redis://localhost:6380',
  eventBusBackend: 'redis',
  jwtSecret: 'e2e-test-jwt-secret-minimum-32-chars!!',
  hmacSecret: 'e2e-test-hmac-secret-minimum-32-chars!!',
  webhookSecret: 'e2e-test-webhook-secret-min-32-chars!!',
  shadowMode: false,
  nodeEnv: 'test',
  logLevel: 'error',
  scoringModel: '5-component',
  port: 0, // Random available port
};

export const ADMIN_CREDENTIALS = {
  email: 'e2e-admin@qwickservices.test',
  password: 'E2ETestPass123!@#',
};

// ─── Database Connection ─────────────────────────────────────────

let testPool: Pool | null = null;

export function getTestPool(): Pool {
  if (!testPool) {
    testPool = new Pool({
      host: E2E_CONFIG.dbHost,
      port: E2E_CONFIG.dbPort,
      database: E2E_CONFIG.dbName,
      user: E2E_CONFIG.dbUser,
      password: E2E_CONFIG.dbPassword,
      ssl: E2E_CONFIG.dbSsl ? { rejectUnauthorized: false } : undefined,
    });
  }
  return testPool;
}

export async function closeTestPool(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

// ─── Admin User Seeding ──────────────────────────────────────────

export async function seedAdminUser(): Promise<void> {
  const pool = getTestPool();

  // Check if admin already exists
  const existingResult = await pool.query(
    'SELECT id FROM admin_users WHERE email = $1',
    [ADMIN_CREDENTIALS.email]
  );

  if (existingResult.rows.length > 0) {
    console.log('  Admin user already exists');
    return;
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(ADMIN_CREDENTIALS.password, 12);

  await pool.query(
    `INSERT INTO admin_users (
      email, password_hash, name, role, active, force_password_change, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [
      ADMIN_CREDENTIALS.email,
      passwordHash,
      'E2E Test Admin',
      'super_admin',
      true,
      false,
    ]
  );

  console.log('  ✓ Admin user created');
}

// ─── JWT Token Generation ────────────────────────────────────────

export function generateAdminToken(): string {
  return jwt.sign(
    {
      id: 1,
      email: ADMIN_CREDENTIALS.email,
      role: 'super_admin',
      permissions: ['*'], // Super admin has all permissions
    },
    E2E_CONFIG.jwtSecret,
    { expiresIn: '1h' }
  );
}

// ─── HMAC Signature Generation ───────────────────────────────────

interface HmacSignature {
  signature: string;
  timestamp: string;
}

export function signHmac(body: string, secret: string = E2E_CONFIG.hmacSecret): HmacSignature {
  const timestamp = Date.now().toString();
  const message = timestamp + '.' + body;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  return { signature, timestamp };
}

export function signWebhook(body: string, secret: string = E2E_CONFIG.webhookSecret): string {
  return crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
}

// ─── Server Lifecycle ────────────────────────────────────────────

let serverInstance: http.Server | null = null;
let serverPort: number | null = null;

export async function startTestServer(): Promise<{ server: http.Server; port: number; baseUrl: string }> {
  // Set environment variables for the test server
  process.env.DB_HOST = E2E_CONFIG.dbHost;
  process.env.DB_PORT = E2E_CONFIG.dbPort.toString();
  process.env.DB_NAME = E2E_CONFIG.dbName;
  process.env.DB_USER = E2E_CONFIG.dbUser;
  process.env.DB_PASSWORD = E2E_CONFIG.dbPassword;
  process.env.DB_SSL = E2E_CONFIG.dbSsl.toString();
  process.env.REDIS_URL = E2E_CONFIG.redisUrl;
  process.env.EVENT_BUS_BACKEND = E2E_CONFIG.eventBusBackend;
  process.env.JWT_SECRET = E2E_CONFIG.jwtSecret;
  process.env.HMAC_SECRET = E2E_CONFIG.hmacSecret;
  process.env.WEBHOOK_SECRET = E2E_CONFIG.webhookSecret;
  process.env.SHADOW_MODE = E2E_CONFIG.shadowMode.toString();
  process.env.NODE_ENV = E2E_CONFIG.nodeEnv;
  process.env.LOG_LEVEL = E2E_CONFIG.logLevel;
  process.env.SCORING_MODEL = E2E_CONFIG.scoringModel;
  process.env.PORT = E2E_CONFIG.port.toString();

  // Import the Express app (this triggers all initializations)
  // We need to clear the require cache to ensure fresh import with new env vars
  const indexPath = require.resolve('../../src/index');
  delete require.cache[indexPath];

  // Import will start the server
  const { server } = await import('../../src/index');

  // Wait for server to start
  await new Promise<void>((resolve) => {
    const checkServer = () => {
      if (server && server.listening) {
        resolve();
      } else {
        setTimeout(checkServer, 100);
      }
    };
    checkServer();
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get server port');
  }

  serverInstance = server;
  serverPort = address.port;

  const baseUrl = `http://localhost:${address.port}`;
  console.log(`  ✓ Test server started on port ${address.port}`);

  return { server, port: address.port, baseUrl };
}

export async function stopTestServer(): Promise<void> {
  if (serverInstance) {
    await new Promise<void>((resolve, reject) => {
      serverInstance!.close((err) => {
        if (err) reject(err);
        else resolve();
      });

      // Force close after 5 seconds
      setTimeout(() => {
        console.warn('  Force closing test server after timeout');
        resolve();
      }, 5000);
    });

    serverInstance = null;
    serverPort = null;
    console.log('  ✓ Test server stopped');
  }
}

export function getServerPort(): number {
  if (!serverPort) {
    throw new Error('Server not started');
  }
  return serverPort;
}

export function getBaseUrl(): string {
  return `http://localhost:${getServerPort()}`;
}

// ─── Database Cleanup ────────────────────────────────────────────

export async function cleanupDatabase(): Promise<void> {
  const pool = getTestPool();

  // Truncate all tables in reverse dependency order
  await pool.query(`
    TRUNCATE TABLE
      schema_migrations,
      webhook_events,
      evaluation_log,
      alert_subscriptions,
      alert_assignments,
      alerts,
      contagion_graph,
      device_fingerprints,
      relationship_graph,
      leakage_funnels,
      enforcement_actions,
      risk_scores,
      risk_signals,
      ratings,
      appeal_status_history,
      appeals,
      case_notes,
      case_assignments,
      cases,
      event_bus_pending,
      events,
      transactions,
      messages,
      users,
      admin_roles,
      admin_users,
      admin_rules
    RESTART IDENTITY CASCADE
  `);
}
