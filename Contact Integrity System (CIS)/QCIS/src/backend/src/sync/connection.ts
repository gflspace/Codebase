// QwickServices CIS — External Database Connection (Read-Only)
// Connects to QwickServices' PostgreSQL database for data sync.
// Separate pool from CIS's own database — read-only queries only.

import { Pool } from 'pg';
import { config } from '../config';

let externalPool: Pool | null = null;

export function getExternalPool(): Pool {
  if (!externalPool) {
    if (!config.sync.enabled) {
      throw new Error('Data sync is disabled — set SYNC_ENABLED=true and configure SYNC_DB_* variables');
    }

    externalPool = new Pool({
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

    externalPool.on('error', (err) => {
      console.error('[Sync] External DB pool error:', err.message);
    });
  }
  return externalPool;
}

export async function externalQuery(text: string, params?: unknown[]) {
  const pool = getExternalPool();
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (config.logLevel === 'debug') {
    console.log('[Sync:DB]', { text: text.substring(0, 80), duration, rows: result.rowCount });
  }
  return result;
}

export async function testExternalConnection(): Promise<boolean> {
  try {
    const pool = getExternalPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('[Sync] External database connection test failed:', error);
    return false;
  }
}

export async function closeExternalPool(): Promise<void> {
  if (externalPool) {
    await externalPool.end();
    externalPool = null;
  }
}
