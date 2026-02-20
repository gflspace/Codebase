// QwickServices CIS — External Database Connection (Read-Only)
// Dual-driver adapter: MySQL (default for QwickServices/Laravel) with PostgreSQL fallback.
// Separate pool from CIS's own database — read-only queries only.
//
// Architecture spec compliance:
//   §2 — Read-Only Enforcement (session-level, verb guard, privilege check)
//   §3 — Real-Time Pull (query timeout, circuit breaker)
//   §4 — Security (SSL/TLS with cert validation)

import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { config } from '../config';

// ─── Unified query result ───────────────────────────────────

interface ExternalQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

// ─── Pool state ─────────────────────────────────────────────

let pgPool: PgPool | null = null;
let mysqlPool: mysql.Pool | null = null;

/**
 * Convert PostgreSQL-style `$1, $2, …` placeholders to MySQL-style `?`.
 * Safe because no sync query reuses parameters or has `$N` in string literals.
 */
export function convertPlaceholders(sql: string): string {
  return sql.replace(/\$\d+/g, '?');
}

// ─── Circuit Breaker ────────────────────────────────────────
// Spec §3: Circuit breaker with trip-after-N-failures,
// half-open probe, and automatic recovery.

const CIRCUIT_BREAKER_THRESHOLD = 5;    // consecutive failures to trip
const CIRCUIT_BREAKER_COOLDOWN_MS = 60_000; // 60s cooldown before half-open probe

interface CircuitBreakerState {
  consecutiveFailures: number;
  state: 'closed' | 'open' | 'half-open';
  openedAt: number;
  lastError: string;
}

const circuitBreaker: CircuitBreakerState = {
  consecutiveFailures: 0,
  state: 'closed',
  openedAt: 0,
  lastError: '',
};

export function getCircuitBreakerState(): Readonly<CircuitBreakerState> {
  return { ...circuitBreaker };
}

export function resetCircuitBreaker(): void {
  circuitBreaker.consecutiveFailures = 0;
  circuitBreaker.state = 'closed';
  circuitBreaker.openedAt = 0;
  circuitBreaker.lastError = '';
}

function recordSuccess(): void {
  circuitBreaker.consecutiveFailures = 0;
  circuitBreaker.state = 'closed';
  circuitBreaker.lastError = '';
}

function recordFailure(error: string): void {
  circuitBreaker.consecutiveFailures++;
  circuitBreaker.lastError = error;

  if (circuitBreaker.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.state = 'open';
    circuitBreaker.openedAt = Date.now();
    console.error(
      `[Sync:CircuitBreaker] OPEN after ${circuitBreaker.consecutiveFailures} consecutive failures. ` +
      `Last error: ${error}. Cooldown: ${CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s`
    );
  }
}

function checkCircuitBreaker(): void {
  if (circuitBreaker.state === 'closed') return;

  if (circuitBreaker.state === 'open') {
    const elapsed = Date.now() - circuitBreaker.openedAt;
    if (elapsed >= CIRCUIT_BREAKER_COOLDOWN_MS) {
      circuitBreaker.state = 'half-open';
      console.log('[Sync:CircuitBreaker] Transitioning to half-open — allowing probe query');
      return; // allow probe
    }
    throw new Error(
      `Circuit breaker OPEN: external DB unavailable after ${circuitBreaker.consecutiveFailures} failures. ` +
      `Retry in ${Math.ceil((CIRCUIT_BREAKER_COOLDOWN_MS - elapsed) / 1000)}s. ` +
      `Last error: ${circuitBreaker.lastError}`
    );
  }
  // half-open: allow the next query through as a probe
}

// ─── Static Query Allowlist ─────────────────────────────────
// Spec §2: Only pre-approved query templates may execute.
// Keyed by SHA-256 of the normalized query template.

const queryAllowlist = new Set<string>();

/**
 * Register a normalized query template as allowed.
 * Called at module load for each known sync query shape.
 */
export function registerAllowedQuery(template: string): void {
  const hash = hashQueryTemplate(template);
  queryAllowlist.add(hash);
}

/**
 * Normalize a query for allowlist matching:
 * - Collapse whitespace
 * - Lowercase
 * - Replace parameter placeholders ($1, $2, ?) with `?`
 */
function normalizeQuery(sql: string): string {
  return sql
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\$\d+/g, '?');
}

function hashQueryTemplate(sql: string): string {
  return crypto.createHash('sha256').update(normalizeQuery(sql)).digest('hex').slice(0, 16);
}

/**
 * Validate a query against the allowlist.
 * If the allowlist is empty (no queries registered), skip allowlist check
 * but still enforce the verb guard — this allows the system to work before
 * mappings are loaded (e.g., schema validation queries).
 */
function validateQueryAllowlist(sql: string): void {
  if (queryAllowlist.size === 0) return; // no templates registered yet
  const hash = hashQueryTemplate(sql);
  if (!queryAllowlist.has(hash)) {
    const preview = sql.replace(/\s+/g, ' ').trim().substring(0, 60);
    console.error(`[SECURITY] Query not in allowlist: hash=${hash} preview="${preview}"`);
    throw new Error(
      `QUERY ALLOWLIST VIOLATION: Query template not recognized. ` +
      `Only pre-registered query patterns are permitted. Hash: ${hash}`
    );
  }
}

// Register known safe query templates (INFORMATION_SCHEMA, polling, ping)
registerAllowedQuery('SELECT 1');
registerAllowedQuery('SELECT 1 AS ok');
registerAllowedQuery('SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION');
registerAllowedQuery('SELECT column_name, data_type FROM information_schema.columns WHERE table_catalog = ? AND table_schema = ? AND table_name = ? ORDER BY ordinal_position');

// ─── MySQL path ─────────────────────────────────────────────

const MYSQL_QUERY_TIMEOUT_MS = 15_000; // 15s per-query timeout

function getMysqlPool(): mysql.Pool {
  if (!mysqlPool) {
    if (!config.sync.enabled) {
      throw new Error('Data sync is disabled — set SYNC_ENABLED=true and configure SYNC_DB_* variables');
    }

    // Spec §2: SSL/TLS with certificate validation
    const sslConfig = config.sync.db.ssl
      ? {
          rejectUnauthorized: config.nodeEnv === 'production',
          ...(process.env.SYNC_DB_CA_CERT ? { ca: process.env.SYNC_DB_CA_CERT } : {}),
        }
      : undefined;

    mysqlPool = mysql.createPool({
      host: config.sync.db.host,
      port: config.sync.db.port,
      database: config.sync.db.name,
      user: config.sync.db.user,
      password: config.sync.db.password,
      ssl: sslConfig,
      connectionLimit: config.sync.db.poolMax,
      connectTimeout: 5000,
      waitForConnections: true,
      enableKeepAlive: false, // Spec §7: no persistent connections
    });
  }
  return mysqlPool;
}

async function mysqlQuery(text: string, params?: unknown[]): Promise<ExternalQueryResult> {
  const pool = getMysqlPool();
  const mysqlText = convertPlaceholders(text);
  const start = Date.now();

  // Spec §3: Per-query timeout via AbortController
  const conn = await pool.getConnection();
  try {
    // Spec §2: Session-level read-only enforcement
    await conn.query('SET SESSION TRANSACTION READ ONLY');

    // Spec §3: MySQL query timeout
    await conn.query(`SET SESSION MAX_EXECUTION_TIME = ${MYSQL_QUERY_TIMEOUT_MS}`);

    const [rows] = await conn.query(mysqlText, params);
    const duration = Date.now() - start;

    const resultRows = Array.isArray(rows) ? rows as Record<string, unknown>[] : [];

    if (config.logLevel === 'debug') {
      console.log('[Sync:DB:mysql]', { text: mysqlText.substring(0, 80), duration, rows: resultRows.length });
    }

    return { rows: resultRows, rowCount: resultRows.length };
  } finally {
    conn.release();
  }
}

async function testMysqlConnection(): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const conn = await pool.getConnection();
    try {
      await conn.ping();

      // Spec §2: Session-level read-only enforcement verification
      await conn.query('SET SESSION TRANSACTION READ ONLY');
    } finally {
      conn.release();
    }
    return true;
  } catch (error) {
    console.error('[Sync] MySQL connection test failed:', error);
    return false;
  }
}

async function closeMysqlPool(): Promise<void> {
  if (mysqlPool) {
    await mysqlPool.end();
    mysqlPool = null;
  }
}

// ─── PostgreSQL path (fallback) ─────────────────────────────

function getPgPool(): PgPool {
  if (!pgPool) {
    if (!config.sync.enabled) {
      throw new Error('Data sync is disabled — set SYNC_ENABLED=true and configure SYNC_DB_* variables');
    }

    // Spec §2: SSL/TLS with certificate validation
    const sslConfig = config.sync.db.ssl
      ? {
          rejectUnauthorized: config.nodeEnv === 'production',
          ...(process.env.SYNC_DB_CA_CERT ? { ca: process.env.SYNC_DB_CA_CERT } : {}),
        }
      : false;

    pgPool = new PgPool({
      host: config.sync.db.host,
      port: config.sync.db.port,
      database: config.sync.db.name,
      user: config.sync.db.user,
      password: config.sync.db.password,
      ssl: sslConfig,
      min: 0, // Spec §7: no persistent connections (min=0 allows full drain)
      max: config.sync.db.poolMax,
      idleTimeoutMillis: 10000, // Release idle connections faster
      connectionTimeoutMillis: 5000,
      query_timeout: 15000,
    });

    pgPool.on('error', (err) => {
      console.error('[Sync] External PG pool error:', err.message);
    });
  }
  return pgPool;
}

async function pgQuery(text: string, params?: unknown[]): Promise<ExternalQueryResult> {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    // Spec §2: Session-level read-only enforcement
    await client.query('SET default_transaction_read_only = on');

    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;

    if (config.logLevel === 'debug') {
      console.log('[Sync:DB:pg]', { text: text.substring(0, 80), duration, rows: result.rowCount });
    }

    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

async function testPgConnection(): Promise<boolean> {
  try {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');

      // Spec §2: Session-level read-only enforcement verification
      await client.query('SET default_transaction_read_only = on');
    } finally {
      client.release();
    }
    return true;
  } catch (error) {
    console.error('[Sync] PostgreSQL connection test failed:', error);
    return false;
  }
}

async function closePgPool(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}

// ─── Runtime Privilege Verification ─────────────────────────
// Spec §2: Verify at startup that the DB user has SELECT-only privileges.
// Refuse to start sync if write privileges are detected.

const DANGEROUS_PRIVILEGES = [
  'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP',
  'GRANT', 'TRIGGER', 'EXECUTE', 'ALL PRIVILEGES', 'SUPER',
  'ALL',
];

export async function verifyReadOnlyPrivileges(): Promise<{ safe: boolean; grants: string[] }> {
  const grants: string[] = [];

  try {
    if (config.sync.db.driver === 'mysql') {
      const pool = getMysqlPool();
      const conn = await pool.getConnection();
      try {
        const [rows] = await conn.query('SHOW GRANTS FOR CURRENT_USER()');
        const grantRows = rows as Record<string, unknown>[];
        for (const row of grantRows) {
          const grantStr = String(Object.values(row)[0] || '');
          grants.push(grantStr);
        }
      } finally {
        conn.release();
      }
    } else {
      const pool = getPgPool();
      const client = await pool.connect();
      try {
        // Check table-level privileges
        const result = await client.query(
          `SELECT privilege_type FROM information_schema.table_privileges
           WHERE grantee = current_user AND table_schema = 'public'
           GROUP BY privilege_type`
        );
        for (const row of result.rows) {
          grants.push(String(row.privilege_type));
        }
      } finally {
        client.release();
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Sync:Security] Failed to verify privileges:', msg);
    // Fail-closed: treat failure to verify as unsafe
    return { safe: false, grants: [`VERIFICATION_FAILED: ${msg}`] };
  }

  // Check for dangerous privileges
  const upperGrants = grants.map(g => g.toUpperCase());
  const foundDangerous: string[] = [];
  for (const priv of DANGEROUS_PRIVILEGES) {
    if (upperGrants.some(g => g.includes(priv))) {
      foundDangerous.push(priv);
    }
  }

  if (foundDangerous.length > 0) {
    console.error(
      `[SECURITY] External DB user has dangerous privileges: [${foundDangerous.join(', ')}]. ` +
      `Sync should only use a SELECT-only role. Grants: ${grants.join(' | ')}`
    );
    return { safe: false, grants };
  }

  console.log('[Sync:Security] Privilege verification passed — SELECT-only confirmed');
  return { safe: true, grants };
}

// ─── Auth Failure Detection ─────────────────────────────────
// Spec §6: Authentication failure → immediate halt + alert

function isAuthError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  const code = (err as Record<string, unknown>).code;
  // MySQL: ER_ACCESS_DENIED_ERROR (1045), ER_DBACCESS_DENIED_ERROR (1044)
  if (code === 'ER_ACCESS_DENIED_ERROR' || code === 1045 || code === 'ER_DBACCESS_DENIED_ERROR' || code === 1044) return true;
  // PostgreSQL: 28P01 (invalid_password), 28000 (invalid_authorization_specification)
  if (code === '28P01' || code === '28000') return true;
  // Generic patterns
  if (msg.includes('access denied') || msg.includes('authentication failed') || msg.includes('password authentication failed')) return true;
  return false;
}

// ─── SQL Verb Validation Guard ──────────────────────────────
// Per master_claude.md §11.2 — Only SELECT statements are permitted.
// Zero tolerance: any non-SELECT verb triggers immediate rejection.

const ALLOWED_SQL_VERBS = new Set(['SELECT']);

/**
 * Validates that a SQL statement is a read-only SELECT query.
 * Rejects all DML (INSERT, UPDATE, DELETE), DDL (CREATE, ALTER, DROP),
 * DCL (GRANT, REVOKE), and procedural (CALL, EXECUTE) statements.
 * On violation: logs the attempt and throws immediately.
 */
export function validateReadOnlyQuery(sql: string): void {
  const trimmed = sql.trimStart();
  // Extract the first word (SQL verb) — case-insensitive
  const match = trimmed.match(/^(\w+)/);
  const verb = match ? match[1].toUpperCase() : '';

  if (!ALLOWED_SQL_VERBS.has(verb)) {
    const violation = {
      timestamp: new Date().toISOString(),
      verb,
      query_preview: trimmed.substring(0, 40).replace(/\s+/g, ' '),
      action: 'BLOCKED — connection will be terminated',
    };
    console.error('[SECURITY] Write suppression guard triggered:', JSON.stringify(violation));

    // Terminate the external pool immediately on policy breach
    closeExternalPool().catch(() => {});

    throw new Error(
      `READ-ONLY POLICY VIOLATION: SQL verb "${verb}" is not permitted. ` +
      `Only SELECT queries are allowed on the Qwickservices data source. ` +
      `Connection terminated. This incident has been logged.`
    );
  }
}

// ─── Public API (driver-agnostic) ───────────────────────────

export async function externalQuery(text: string, params?: unknown[]): Promise<ExternalQueryResult> {
  // §2 — Validate SQL verb before execution (fail-closed)
  validateReadOnlyQuery(text);

  // §2 — Validate against static query allowlist
  validateQueryAllowlist(text);

  // §3 — Circuit breaker check
  checkCircuitBreaker();

  try {
    const result = config.sync.db.driver === 'mysql'
      ? await mysqlQuery(text, params)
      : await pgQuery(text, params);

    recordSuccess();
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // §6 — Auth failure → immediate halt
    if (isAuthError(err)) {
      console.error(`[SECURITY] Authentication failure on external DB — halting sync immediately`);
      await closeExternalPool().catch(() => {});
      circuitBreaker.state = 'open';
      circuitBreaker.openedAt = Date.now();
      circuitBreaker.consecutiveFailures = CIRCUIT_BREAKER_THRESHOLD;
    }

    recordFailure(errorMsg);
    throw err;
  }
}

export async function testExternalConnection(): Promise<boolean> {
  if (config.sync.db.driver === 'mysql') {
    return testMysqlConnection();
  }
  return testPgConnection();
}

export async function closeExternalPool(): Promise<void> {
  if (config.sync.db.driver === 'mysql') {
    return closeMysqlPool();
  }
  return closePgPool();
}
