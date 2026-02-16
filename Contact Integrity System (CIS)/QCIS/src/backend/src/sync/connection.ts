// QwickServices CIS — External Database Connection (Read-Only)
// Dual-driver adapter: MySQL (default for QwickServices/Laravel) with PostgreSQL fallback.
// Separate pool from CIS's own database — read-only queries only.

import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';
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

// ─── MySQL path ─────────────────────────────────────────────

function getMysqlPool(): mysql.Pool {
  if (!mysqlPool) {
    if (!config.sync.enabled) {
      throw new Error('Data sync is disabled — set SYNC_ENABLED=true and configure SYNC_DB_* variables');
    }

    mysqlPool = mysql.createPool({
      host: config.sync.db.host,
      port: config.sync.db.port,
      database: config.sync.db.name,
      user: config.sync.db.user,
      password: config.sync.db.password,
      ssl: config.sync.db.ssl ? { rejectUnauthorized: false } : undefined,
      connectionLimit: config.sync.db.poolMax,
      connectTimeout: 5000,
      waitForConnections: true,
      enableKeepAlive: true,
    });
  }
  return mysqlPool;
}

async function mysqlQuery(text: string, params?: unknown[]): Promise<ExternalQueryResult> {
  const pool = getMysqlPool();
  const mysqlText = convertPlaceholders(text);
  const start = Date.now();
  const [rows] = await pool.query(mysqlText, params);
  const duration = Date.now() - start;

  const resultRows = Array.isArray(rows) ? rows as Record<string, unknown>[] : [];

  if (config.logLevel === 'debug') {
    console.log('[Sync:DB:mysql]', { text: mysqlText.substring(0, 80), duration, rows: resultRows.length });
  }

  return { rows: resultRows, rowCount: resultRows.length };
}

async function testMysqlConnection(): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
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

    pgPool = new PgPool({
      host: config.sync.db.host,
      port: config.sync.db.port,
      database: config.sync.db.name,
      user: config.sync.db.user,
      password: config.sync.db.password,
      ssl: config.sync.db.ssl ? { rejectUnauthorized: false } : false,
      min: 1,
      max: config.sync.db.poolMax,
      idleTimeoutMillis: 30000,
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
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (config.logLevel === 'debug') {
    console.log('[Sync:DB:pg]', { text: text.substring(0, 80), duration, rows: result.rowCount });
  }

  return { rows: result.rows, rowCount: result.rowCount ?? 0 };
}

async function testPgConnection(): Promise<boolean> {
  try {
    const pool = getPgPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
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
  // §11.2 — Validate SQL verb before execution (fail-closed)
  validateReadOnlyQuery(text);

  if (config.sync.db.driver === 'mysql') {
    return mysqlQuery(text, params);
  }
  return pgQuery(text, params);
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
