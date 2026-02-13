#!/usr/bin/env node
/**
 * QwickServices CIS — Standalone Database Migration Runner
 *
 * This script reads database configuration directly from environment variables
 * and applies all pending SQL migrations in sequential order.
 *
 * Usage:
 *   npx tsx src/backend/scripts/migrate.ts
 *
 * Environment Variables Required:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL
 */

import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── Configuration ───────────────────────────────────────────────

interface MigrationConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

function getConfigFromEnv(): MigrationConfig {
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

// ─── Migration Logic ─────────────────────────────────────────────

const MIGRATIONS_DIR = path.resolve(__dirname, '../src/database/migrations');

interface MigrationRecord {
  filename: string;
}

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client: PoolClient): Promise<Set<string>> {
  const result = await client.query<MigrationRecord>(
    'SELECT filename FROM schema_migrations ORDER BY id'
  );
  return new Set(result.rows.map(r => r.filename));
}

async function getMigrationFiles(): Promise<string[]> {
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR);
    return files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Lexicographic sort ensures proper ordering (001_, 002_, etc.)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    }
    throw error;
  }
}

async function applyMigration(
  client: PoolClient,
  filename: string
): Promise<void> {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf-8');

  try {
    await client.query('BEGIN');

    // Execute the migration SQL
    await client.query(sql);

    // Record the migration as applied
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );

    await client.query('COMMIT');
    console.log(`  ✓ Applied: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`  ✗ Failed: ${filename}`);
    throw error;
  }
}

async function runMigrations(): Promise<void> {
  const config = getConfigFromEnv();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  QwickServices CIS — Database Migration Runner');
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

  const client = await pool.connect();

  try {
    // Ensure migrations tracking table exists
    await ensureMigrationsTable(client);

    // Get list of already applied migrations
    const appliedMigrations = await getAppliedMigrations(client);
    console.log(`Applied migrations: ${appliedMigrations.size}`);

    // Get all migration files
    const allMigrationFiles = await getMigrationFiles();
    console.log(`Total migrations: ${allMigrationFiles.length}`);
    console.log('───────────────────────────────────────────────────────────');

    // Filter to pending migrations
    const pendingMigrations = allMigrationFiles.filter(
      f => !appliedMigrations.has(f)
    );

    if (pendingMigrations.length === 0) {
      console.log('✓ All migrations are up to date. No pending migrations.');
      return;
    }

    console.log(`Pending migrations: ${pendingMigrations.length}`);
    console.log('');

    // Apply each pending migration in order
    for (const filename of pendingMigrations) {
      await applyMigration(client, filename);
    }

    console.log('───────────────────────────────────────────────────────────');
    console.log(`✓ Successfully applied ${pendingMigrations.length} migration(s)`);
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('✗ Migration Failed');
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
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// ─── Entry Point ─────────────────────────────────────────────────

if (require.main === module) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      console.error('Migration process terminated with errors.');
      process.exit(1);
    });
}

export { runMigrations };
