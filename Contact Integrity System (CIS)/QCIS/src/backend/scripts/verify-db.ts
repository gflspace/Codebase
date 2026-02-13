#!/usr/bin/env node
/**
 * QwickServices CIS — Database Verification Script
 *
 * Verifies that the database is properly initialized with all migrations
 * and critical tables are present and accessible.
 *
 * Checks performed:
 *   1. Database connection
 *   2. All migrations applied (29 expected)
 *   3. Critical tables exist with expected structure
 *   4. Row counts for key tables
 *   5. Index presence
 *
 * Usage:
 *   npx tsx scripts/verify-db.ts
 *
 * Exit codes:
 *   0 = Database verified successfully
 *   1 = Verification failed
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── Configuration ───────────────────────────────────────────────

interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

function getConfigFromEnv(): DBConfig {
  const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!, 10),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    ssl: process.env.DB_SSL === 'true',
  };
}

// ─── Verification Logic ──────────────────────────────────────────

const MIGRATIONS_DIR = path.resolve(__dirname, '../src/database/migrations');
const EXPECTED_MIGRATION_COUNT = 29;

// Critical tables that must exist
const CRITICAL_TABLES = [
  'users',
  'messages',
  'transactions',
  'risk_signals',
  'risk_scores',
  'enforcement_actions',
  'audit_logs',
  'alerts',
  'cases',
  'appeals',
  'webhook_events',
  'bookings',
  'wallet_transactions',
  'trust_history',
  'provider_metrics',
  'ratings',
  'leakage_events',
  'user_relationships',
  'user_devices',
  'enforcement_config',
  'enforcement_logs',
  'enforcement_shadow_log',
  'alert_subscriptions',
  'alert_deliveries',
  'schema_migrations'
];

interface TableInfo {
  table_name: string;
  column_count: number;
}

interface CountResult {
  count: string;
}

interface MigrationRecord {
  filename: string;
  applied_at: Date;
}

async function verifyDatabaseConnection(pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log(`✓ Database connection successful (${result.rows[0].current_time})`);
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

async function verifyMigrations(pool: Pool): Promise<boolean> {
  try {
    // Check if schema_migrations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'schema_migrations'
      ) as exists
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('✗ schema_migrations table does not exist');
      console.error('  Run migrations first: npm run migrate');
      return false;
    }

    // Get applied migrations
    const result = await pool.query<MigrationRecord>(
      'SELECT filename, applied_at FROM schema_migrations ORDER BY id'
    );

    const appliedMigrations = result.rows;
    console.log(`✓ Migrations applied: ${appliedMigrations.length} / ${EXPECTED_MIGRATION_COUNT}`);

    if (appliedMigrations.length < EXPECTED_MIGRATION_COUNT) {
      console.error(`✗ Missing migrations. Expected ${EXPECTED_MIGRATION_COUNT}, found ${appliedMigrations.length}`);

      // List applied migrations
      console.error('\n  Applied migrations:');
      appliedMigrations.forEach((m, i) => {
        console.error(`    ${i + 1}. ${m.filename} (${m.applied_at.toISOString()})`);
      });

      // List missing migrations
      const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();

      const appliedNames = new Set(appliedMigrations.map(m => m.filename));
      const missingMigrations = migrationFiles.filter(f => !appliedNames.has(f));

      if (missingMigrations.length > 0) {
        console.error('\n  Missing migrations:');
        missingMigrations.forEach(m => {
          console.error(`    - ${m}`);
        });
      }

      return false;
    }

    if (appliedMigrations.length > EXPECTED_MIGRATION_COUNT) {
      console.warn(`⚠ More migrations than expected (${appliedMigrations.length} > ${EXPECTED_MIGRATION_COUNT})`);
      console.warn('  This is normal if new migrations have been added.');
    }

    return true;
  } catch (error) {
    console.error('✗ Migration verification failed:', error);
    return false;
  }
}

async function verifyTables(pool: Pool): Promise<boolean> {
  try {
    // Get all tables
    const result = await pool.query<TableInfo>(`
      SELECT
        table_name,
        COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_schema = 'public'
      GROUP BY table_name
      ORDER BY table_name
    `);

    const existingTables = new Map(result.rows.map(r => [r.table_name, parseInt(r.column_count as any, 10)]));

    console.log(`✓ Tables found: ${existingTables.size}`);

    // Check critical tables
    const missingTables = CRITICAL_TABLES.filter(t => !existingTables.has(t));

    if (missingTables.length > 0) {
      console.error(`✗ Missing critical tables (${missingTables.length}):`);
      missingTables.forEach(t => {
        console.error(`    - ${t}`);
      });
      return false;
    }

    console.log(`✓ All ${CRITICAL_TABLES.length} critical tables exist`);

    // Show column counts for critical tables
    console.log('\n  Table structure:');
    CRITICAL_TABLES.slice(0, 10).forEach(tableName => {
      const colCount = existingTables.get(tableName);
      console.log(`    ${tableName}: ${colCount} columns`);
    });
    if (CRITICAL_TABLES.length > 10) {
      console.log(`    ... and ${CRITICAL_TABLES.length - 10} more tables`);
    }

    return true;
  } catch (error) {
    console.error('✗ Table verification failed:', error);
    return false;
  }
}

async function verifyRowCounts(pool: Pool): Promise<boolean> {
  try {
    console.log('\n  Row counts:');

    const tablesToCount = [
      'users',
      'risk_scores',
      'risk_signals',
      'enforcement_actions',
      'messages',
      'transactions',
      'audit_logs',
      'alerts',
      'cases'
    ];

    for (const tableName of tablesToCount) {
      try {
        const result = await pool.query<CountResult>(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        const count = parseInt(result.rows[0].count, 10);
        console.log(`    ${tableName}: ${count.toLocaleString()} rows`);
      } catch (error) {
        console.error(`    ${tableName}: ERROR - ${(error as Error).message}`);
      }
    }

    return true;
  } catch (error) {
    console.error('✗ Row count verification failed:', error);
    return false;
  }
}

async function verifyIndexes(pool: Pool): Promise<boolean> {
  try {
    // Count indexes
    const result = await pool.query<CountResult>(`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE schemaname = 'public'
    `);

    const indexCount = parseInt(result.rows[0].count, 10);
    console.log(`\n✓ Database indexes: ${indexCount}`);

    // Check for critical indexes on frequently queried tables
    const criticalIndexes = await pool.query(`
      SELECT
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('users', 'risk_scores', 'enforcement_actions', 'messages')
      ORDER BY tablename, indexname
    `);

    if (criticalIndexes.rows.length > 0) {
      console.log(`  Critical table indexes: ${criticalIndexes.rows.length}`);
    }

    return true;
  } catch (error) {
    console.error('✗ Index verification failed:', error);
    return false;
  }
}

// ─── Main Verification Flow ──────────────────────────────────────

async function verifyDatabase(): Promise<void> {
  const config = getConfigFromEnv();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  QwickServices CIS — Database Verification');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Database: ${config.database}@${config.host}:${config.port}`);
  console.log(`SSL: ${config.ssl ? 'enabled' : 'disabled'}`);
  console.log('───────────────────────────────────────────────────────────');

  const pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const results = {
      connection: await verifyDatabaseConnection(pool),
      migrations: await verifyMigrations(pool),
      tables: await verifyTables(pool),
      rowCounts: await verifyRowCounts(pool),
      indexes: await verifyIndexes(pool),
    };

    console.log('───────────────────────────────────────────────────────────');

    const allPassed = Object.values(results).every(r => r === true);

    if (allPassed) {
      console.log('✓ Database verification PASSED');
      console.log('═══════════════════════════════════════════════════════════');
      process.exit(0);
    } else {
      console.error('✗ Database verification FAILED');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('\nFailed checks:');
      Object.entries(results).forEach(([check, passed]) => {
        if (!passed) {
          console.error(`  - ${check}`);
        }
      });
      process.exit(1);
    }
  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('✗ Database Verification Error');
    console.error('═══════════════════════════════════════════════════════════');
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// ─── Entry Point ─────────────────────────────────────────────────

if (require.main === module) {
  verifyDatabase().catch((error) => {
    console.error('');
    console.error('Verification process terminated with errors.');
    process.exit(1);
  });
}

export { verifyDatabase };
