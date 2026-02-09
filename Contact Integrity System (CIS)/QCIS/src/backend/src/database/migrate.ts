import fs from 'fs';
import path from 'path';
import { getPool, closePool } from './connection';

const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const pool = getPool();
  const result = await pool.query('SELECT filename FROM schema_migrations ORDER BY id');
  return new Set(result.rows.map((r: { filename: string }) => r.filename));
}

async function runMigrations(): Promise<void> {
  console.log('Starting database migrations...');

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const pool = getPool();
  let count = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  [skip] ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      console.log(`  [done] ${file}`);
      count++;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`  [FAIL] ${file}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  console.log(`Migrations complete. ${count} new migration(s) applied.`);
}

// Run if called directly
runMigrations()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    closePool().then(() => process.exit(1));
  });

export { runMigrations };
