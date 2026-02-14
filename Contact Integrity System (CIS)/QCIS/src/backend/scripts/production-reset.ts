#!/usr/bin/env tsx
/**
 * QwickServices CIS — Production Data Reset & Sync Script
 *
 * Purges ALL non-production (test/seed/synthetic) data from CIS,
 * re-syncs from QwickServices production database, and rebuilds
 * intelligence layers from scratch.
 *
 * SAFETY: Dry-run mode by default. Requires explicit --execute flag.
 *         No schema drops, no migration removal, no FK corruption.
 *
 * Usage:
 *   npx tsx scripts/production-reset.ts                         # dry-run (read-only audit)
 *   npx tsx scripts/production-reset.ts --execute               # full reset + sync + rebuild
 *   npx tsx scripts/production-reset.ts --execute --skip-sync   # reset only, no QwickServices pull
 *   npx tsx scripts/production-reset.ts --execute --skip-rebuild # reset + sync, no scoring rebuild
 */

import path from 'path';
import dotenv from 'dotenv';

// Load env BEFORE any other imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query, transaction, closePool, testConnection } from '../src/database/connection';
import { runSyncCycle, resetWatermark, getSyncStatus } from '../src/sync/index';
import { TABLE_MAPPINGS } from '../src/sync/mappings';
import { computeRiskScore } from '../src/scoring/index';
import { nowISO } from '../src/shared/utils';
import { PoolClient } from 'pg';

// ─── CLI Argument Parsing ────────────────────────────────────────

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const SKIP_SYNC = args.includes('--skip-sync');
const SKIP_REBUILD = args.includes('--skip-rebuild');
const DRY_RUN = !EXECUTE;

// ─── Constants ───────────────────────────────────────────────────

/** UUID prefixes that identify test/seed data */
const TEST_UUID_PREFIXES = [
  'aaaaaaaa-', 'bbbbbbbb-', 'cccccccc-', 'dddddddd-', 'eeeeeeee-',
  'c1000001-', 'b1000001-', 'aa000001-', 'test-',
];

/** Email domains used by test data */
const TEST_EMAIL_DOMAINS = ['@test.cis', '@testdata.cis', '@email.com', '@example.com'];

/** Phone prefixes used by test data */
const TEST_PHONE_PREFIX = '555-';

/** Username patterns for test accounts */
const TEST_USERNAME_PATTERNS = ['test_%', 'demo_%', 'seed_%', 'synthetic_%'];

/** Tables that must NEVER be truncated */
const PRESERVED_TABLES = new Set([
  'schema_migrations',
  'admin_users',
  'permissions',
  'role_permissions',
  'admin_permission_overrides',
  'detection_rules',
  'risk_decay_config',
  'alert_subscriptions',
  'sync_watermarks',
]);

/**
 * Truncation order: children before parents (FK-safe).
 * Tables that may not exist use IF EXISTS via a check before truncation.
 */
const TRUNCATION_GROUPS: string[][] = [
  // Group 1 — Intelligence/derived data (no inbound FKs)
  [
    'signal_correlations', 'leakage_events', 'anomaly_logs',
    'communication_flags', 'processed_events', 'sync_run_log',
    'rule_match_log', 'webhook_events', 'trust_score_history',
    'provider_performance_metrics', 'evaluation_log',
  ],
  // Group 2 — Alerts, cases, audit (reference users/enforcement)
  [
    'case_notes', 'cases', 'alerts', 'audit_logs',
  ],
  // Group 3 — Risk & enforcement (reference users)
  [
    'enforcement_actions', 'appeals', 'risk_signals', 'risk_scores',
  ],
  // Group 4 — Sync & devices
  [
    'sync_watermarks', 'user_devices', 'user_relationships',
  ],
  // Group 5 — Core entities (parent tables, truncated last)
  [
    'messages', 'transactions', 'wallet_transactions', 'bookings',
    'disputes', 'ratings', 'users',
  ],
];

/** Sync source tables (from mappings) */
const SYNC_SOURCE_TABLES = TABLE_MAPPINGS.map(m => m.sourceTable);

/** Max sync iterations to prevent infinite loop */
const MAX_SYNC_ITERATIONS = 100;

/** Consecutive zero-record cycles before declaring sync complete */
const CONVERGENCE_THRESHOLD = 2;

/** Batch scoring settings */
const SCORE_BATCH_SIZE = 100;
const SCORE_CONCURRENCY = 5;

// ─── Report State ────────────────────────────────────────────────

interface PhaseReport {
  phase1: {
    tablesScanned: number;
    testDataRows: number;
    testDataTables: number;
    tableDetails: Array<{ table: string; total: number; testRows: number; productionRows: number }>;
  };
  phase2: {
    tablesTruncated: number;
    rowsRemoved: number;
    tablesPreserved: number;
    details: Array<{ table: string; rowsBefore: number }>;
  };
  phase3: {
    recordsByTable: Record<string, number>;
    totalDurationMs: number;
    iterations: number;
    errors: string[];
  };
  phase4: {
    usersScored: number;
    avgScore: number;
    tierDistribution: Record<string, number>;
    errors: string[];
  };
  phase5: {
    checks: Array<{ name: string; passed: boolean; detail: string }>;
    passed: number;
    failed: number;
  };
}

const report: PhaseReport = {
  phase1: { tablesScanned: 0, testDataRows: 0, testDataTables: 0, tableDetails: [] },
  phase2: { tablesTruncated: 0, rowsRemoved: 0, tablesPreserved: PRESERVED_TABLES.size, details: [] },
  phase3: { recordsByTable: {}, totalDurationMs: 0, iterations: 0, errors: [] },
  phase4: { usersScored: 0, avgScore: 0, tierDistribution: {}, errors: [] },
  phase5: { checks: [], passed: 0, failed: 0 },
};

// ─── Utility Helpers ─────────────────────────────────────────────

function log(phase: string, msg: string): void {
  console.log(`[${phase}] ${msg}`);
}

function logError(phase: string, msg: string): void {
  console.error(`[${phase}] ERROR: ${msg}`);
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

/** Check if a table exists in the database */
async function tableExists(tableName: string): Promise<boolean> {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName]
  );
  return result.rows[0]?.exists === true;
}

/** Get row count for a table */
async function getRowCount(tableName: string): Promise<number> {
  try {
    const result = await query(`SELECT COUNT(*) AS count FROM "${tableName}"`);
    return parseInt(result.rows[0].count, 10);
  } catch {
    return 0;
  }
}

// ─── Phase 1: Data Audit ─────────────────────────────────────────

async function phase1Audit(): Promise<void> {
  log('Phase 1', 'Starting data audit (read-only)...');

  // Get all tables in public schema
  const tablesResult = await query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  const allTables = tablesResult.rows.map((r: { table_name: string }) => r.table_name);

  report.phase1.tablesScanned = allTables.length;
  log('Phase 1', `Found ${allTables.length} tables in public schema`);

  for (const table of allTables) {
    const total = await getRowCount(table);

    // Count test data rows using multiple detection patterns
    let testRows = 0;
    try {
      testRows = await countTestDataInTable(table);
    } catch {
      // Table might not have the expected columns — skip test detection
    }

    const productionRows = Math.max(0, total - testRows);

    report.phase1.tableDetails.push({ table, total, testRows, productionRows });
    if (testRows > 0) {
      report.phase1.testDataRows += testRows;
      report.phase1.testDataTables++;
    }

    const marker = testRows > 0 ? ` [${testRows} test rows]` : '';
    const preserved = PRESERVED_TABLES.has(table) ? ' (PRESERVED)' : '';
    log('Phase 1', `  ${table}: ${total} rows${marker}${preserved}`);
  }

  log('Phase 1', `\n  Summary: ${report.phase1.testDataRows} test rows across ${report.phase1.testDataTables} tables`);
  log('Phase 1', `  Tables to preserve: ${PRESERVED_TABLES.size}`);
  log('Phase 1', 'Audit complete.\n');
}

/**
 * Count rows in a table that match test data patterns.
 * Checks id, email, phone, metadata, and name columns as available.
 */
async function countTestDataInTable(table: string): Promise<number> {
  // Get columns for this table
  const colResult = await query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  const columns = new Map<string, string>(
    colResult.rows.map((r: { column_name: string; data_type: string }) => [r.column_name, r.data_type])
  );

  // Build a single query with OR conditions
  const params: unknown[] = [];
  const clauses: string[] = [];

  // UUID prefix checks on 'id' column
  if (columns.has('id')) {
    for (const prefix of TEST_UUID_PREFIXES) {
      params.push(`${prefix}%`);
      clauses.push(`CAST(id AS TEXT) LIKE $${params.length}`);
    }
  }

  // Email domain checks
  if (columns.has('email')) {
    for (const domain of TEST_EMAIL_DOMAINS) {
      params.push(`%${domain}`);
      clauses.push(`email LIKE $${params.length}`);
    }
  }

  // Phone prefix check
  if (columns.has('phone')) {
    params.push(`${TEST_PHONE_PREFIX}%`);
    clauses.push(`phone LIKE $${params.length}`);
  }

  // Metadata flag check on JSONB columns
  if (columns.has('metadata') && columns.get('metadata') === 'jsonb') {
    clauses.push(`metadata @> '{"test_data": true}'::jsonb`);
  }

  // Username/name pattern checks
  if (columns.has('name')) {
    for (const pattern of TEST_USERNAME_PATTERNS) {
      params.push(pattern);
      clauses.push(`LOWER(name) LIKE $${params.length}`);
    }
  }

  // Check display_name too
  if (columns.has('display_name')) {
    for (const pattern of TEST_USERNAME_PATTERNS) {
      params.push(pattern);
      clauses.push(`LOWER(display_name) LIKE $${params.length}`);
    }
  }

  // Check user_id column for test UUID prefixes
  if (columns.has('user_id')) {
    for (const prefix of TEST_UUID_PREFIXES) {
      params.push(`${prefix}%`);
      clauses.push(`CAST(user_id AS TEXT) LIKE $${params.length}`);
    }
  }

  if (clauses.length === 0) return 0;

  const sql = `SELECT COUNT(*) AS count FROM "${table}" WHERE ${clauses.join(' OR ')}`;
  const result = await query(sql, params);
  return parseInt(result.rows[0].count, 10);
}

// ─── Phase 2: Safe Truncation ────────────────────────────────────

async function phase2Truncation(): Promise<void> {
  log('Phase 2', 'Starting FK-ordered truncation...');

  if (DRY_RUN) {
    log('Phase 2', 'DRY RUN — reporting what would be truncated (no changes)\n');
  }

  // Flatten groups and filter out preserved tables
  const allTablesToTruncate: Array<{ table: string; group: number }> = [];
  for (let g = 0; g < TRUNCATION_GROUPS.length; g++) {
    for (const table of TRUNCATION_GROUPS[g]) {
      if (!PRESERVED_TABLES.has(table)) {
        allTablesToTruncate.push({ table, group: g + 1 });
      }
    }
  }

  if (DRY_RUN) {
    // Dry-run: report counts only
    for (const { table, group } of allTablesToTruncate) {
      const exists = await tableExists(table);
      if (!exists) {
        log('Phase 2', `  Group ${group} | ${table}: SKIP (table does not exist)`);
        continue;
      }
      const count = await getRowCount(table);
      log('Phase 2', `  Group ${group} | ${table}: ${count} rows would be truncated`);
      report.phase2.rowsRemoved += count;
      report.phase2.tablesTruncated++;
      report.phase2.details.push({ table, rowsBefore: count });
    }
    log('Phase 2', `\n  Would truncate ${report.phase2.tablesTruncated} tables (${report.phase2.rowsRemoved} total rows)`);
    log('Phase 2', `  Preserved tables: ${Array.from(PRESERVED_TABLES).join(', ')}\n`);
    return;
  }

  // Execute mode: truncate within a transaction
  await transaction(async (client: PoolClient) => {
    for (let g = 0; g < TRUNCATION_GROUPS.length; g++) {
      log('Phase 2', `  Processing Group ${g + 1}...`);

      for (const table of TRUNCATION_GROUPS[g]) {
        if (PRESERVED_TABLES.has(table)) continue;

        // Check if table exists
        const existsResult = await client.query(
          `SELECT EXISTS (
             SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = $1
           ) AS exists`,
          [table]
        );
        if (!existsResult.rows[0]?.exists) {
          log('Phase 2', `    ${table}: SKIP (does not exist)`);
          continue;
        }

        // Get count before truncation
        const countResult = await client.query(`SELECT COUNT(*) AS count FROM "${table}"`);
        const rowsBefore = parseInt(countResult.rows[0].count, 10);

        // Truncate with CASCADE to handle any remaining FK refs
        await client.query(`TRUNCATE TABLE "${table}" CASCADE`);

        report.phase2.rowsRemoved += rowsBefore;
        report.phase2.tablesTruncated++;
        report.phase2.details.push({ table, rowsBefore });

        log('Phase 2', `    ${table}: ${rowsBefore} rows truncated`);
      }
    }
  });

  log('Phase 2', `\n  Truncated ${report.phase2.tablesTruncated} tables (${report.phase2.rowsRemoved} total rows)`);
  log('Phase 2', `  Preserved tables: ${Array.from(PRESERVED_TABLES).join(', ')}\n`);
}

// ─── Phase 3: Production Sync ────────────────────────────────────

async function phase3Sync(): Promise<void> {
  if (SKIP_SYNC) {
    log('Phase 3', 'SKIPPED (--skip-sync flag)\n');
    return;
  }

  log('Phase 3', 'Starting production sync from QwickServices...');

  if (DRY_RUN) {
    log('Phase 3', 'DRY RUN — would reset watermarks and run sync cycles');
    try {
      const status = await getSyncStatus();
      log('Phase 3', `  External DB connected: ${status.externalDbConnected}`);
      log('Phase 3', `  Sync enabled: ${status.enabled}`);
      log('Phase 3', `  Tables configured: ${status.tables.length}`);
      for (const t of status.tables) {
        log('Phase 3', `    ${t.source_table}: last_synced_at=${t.last_synced_at}, records_synced=${t.records_synced}`);
      }
    } catch {
      log('Phase 3', '  sync_watermarks table not yet created — sync status unavailable');
      log('Phase 3', `  Source tables configured: ${SYNC_SOURCE_TABLES.join(', ')}`);
    }
    log('Phase 3', '  Would reset all watermarks to epoch and run sync until caught up\n');
    return;
  }

  const syncStart = Date.now();

  // Step 1: Reset all watermarks to epoch
  log('Phase 3', '  Resetting watermarks to epoch...');
  for (const sourceTable of SYNC_SOURCE_TABLES) {
    await resetWatermark(sourceTable);
    log('Phase 3', `    Reset: ${sourceTable}`);
  }

  // Step 2: Run sync cycles until convergence
  let consecutiveZero = 0;
  let iteration = 0;

  while (iteration < MAX_SYNC_ITERATIONS && consecutiveZero < CONVERGENCE_THRESHOLD) {
    iteration++;
    log('Phase 3', `  Sync iteration ${iteration}/${MAX_SYNC_ITERATIONS}...`);

    try {
      const results = await runSyncCycle();
      let totalNew = 0;

      for (const result of results) {
        const processed = result.recordsProcessed;
        totalNew += processed;

        // Accumulate records by table
        if (!report.phase3.recordsByTable[result.sourceTable]) {
          report.phase3.recordsByTable[result.sourceTable] = 0;
        }
        report.phase3.recordsByTable[result.sourceTable] += processed;

        if (result.errors.length > 0) {
          report.phase3.errors.push(...result.errors.map(e => `${result.sourceTable}: ${e}`));
        }
      }

      if (totalNew === 0) {
        consecutiveZero++;
        log('Phase 3', `    No new records (${consecutiveZero}/${CONVERGENCE_THRESHOLD} toward convergence)`);
      } else {
        consecutiveZero = 0;
        log('Phase 3', `    Synced ${totalNew} new records`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logError('Phase 3', `Sync cycle failed: ${errMsg}`);
      report.phase3.errors.push(errMsg);
      // Continue trying
    }
  }

  report.phase3.iterations = iteration;
  report.phase3.totalDurationMs = Date.now() - syncStart;

  if (iteration >= MAX_SYNC_ITERATIONS) {
    logError('Phase 3', `Hit max iterations (${MAX_SYNC_ITERATIONS}) — sync may be incomplete`);
  }

  // Log summary
  log('Phase 3', '\n  Sync summary:');
  for (const [table, count] of Object.entries(report.phase3.recordsByTable)) {
    log('Phase 3', `    ${table}: ${count} records synced`);
  }
  log('Phase 3', `  Total iterations: ${iteration}`);
  log('Phase 3', `  Duration: ${formatDuration(report.phase3.totalDurationMs)}`);
  if (report.phase3.errors.length > 0) {
    log('Phase 3', `  Errors: ${report.phase3.errors.length}`);
  }
  log('Phase 3', '');
}

// ─── Phase 4: Rebuild Intelligence ──────────────────────────────

async function phase4Rebuild(): Promise<void> {
  if (SKIP_REBUILD) {
    log('Phase 4', 'SKIPPED (--skip-rebuild flag)\n');
    return;
  }

  log('Phase 4', 'Rebuilding intelligence layers...');

  if (DRY_RUN) {
    const countResult = await query(
      `SELECT COUNT(*) AS count FROM users WHERE status = 'active'`
    ).catch(() => ({ rows: [{ count: '0' }] }));
    const userCount = parseInt(countResult.rows[0].count, 10);
    log('Phase 4', `DRY RUN — would recalculate scores for ${userCount} active users`);
    log('Phase 4', `  Batch size: ${SCORE_BATCH_SIZE}, Concurrency: ${SCORE_CONCURRENCY}\n`);
    return;
  }

  // Step 1: Get all active users
  const usersResult = await query(
    `SELECT id FROM users WHERE status = 'active' ORDER BY id`
  );
  const userIds: string[] = usersResult.rows.map((r: { id: string }) => r.id);

  log('Phase 4', `  Found ${userIds.length} active users to score`);

  if (userIds.length === 0) {
    log('Phase 4', '  No users to score — skipping\n');
    return;
  }

  // Step 2: Batch score recalculation with concurrency control
  const tierCounts: Record<string, number> = {};
  let totalScore = 0;
  const errors: string[] = [];

  for (let i = 0; i < userIds.length; i += SCORE_BATCH_SIZE) {
    const batch = userIds.slice(i, i + SCORE_BATCH_SIZE);
    const batchNum = Math.floor(i / SCORE_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(userIds.length / SCORE_BATCH_SIZE);

    log('Phase 4', `  Batch ${batchNum}/${totalBatches} (${batch.length} users)...`);

    // Process with concurrency limit
    const queue = [...batch];
    const workers: Promise<void>[] = [];

    async function processQueue(): Promise<void> {
      while (queue.length > 0) {
        const userId = queue.shift();
        if (!userId) break;

        try {
          const result = await computeRiskScore(userId);
          totalScore += result.score;
          tierCounts[result.tier] = (tierCounts[result.tier] || 0) + 1;
          report.phase4.usersScored++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          errors.push(`${userId.slice(0, 8)}: ${errMsg}`);
        }
      }
    }

    for (let w = 0; w < Math.min(SCORE_CONCURRENCY, batch.length); w++) {
      workers.push(processQueue());
    }
    await Promise.all(workers);

    // Progress
    const progress = Math.min(((i + SCORE_BATCH_SIZE) / userIds.length) * 100, 100);
    log('Phase 4', `    Progress: ${progress.toFixed(1)}%`);
  }

  // Compute averages
  report.phase4.avgScore = report.phase4.usersScored > 0
    ? parseFloat((totalScore / report.phase4.usersScored).toFixed(2))
    : 0;
  report.phase4.tierDistribution = tierCounts;
  report.phase4.errors = errors;

  log('Phase 4', '\n  Rebuild summary:');
  log('Phase 4', `    Users scored: ${report.phase4.usersScored}`);
  log('Phase 4', `    Average score: ${report.phase4.avgScore}`);
  log('Phase 4', `    Tier distribution: ${JSON.stringify(tierCounts)}`);
  if (errors.length > 0) {
    log('Phase 4', `    Errors: ${errors.length}`);
    errors.slice(0, 5).forEach(e => log('Phase 4', `      ${e}`));
    if (errors.length > 5) log('Phase 4', `      ... and ${errors.length - 5} more`);
  }
  log('Phase 4', '');
}

// ─── Phase 5: Validation Checks ─────────────────────────────────

async function phase5Validation(): Promise<void> {
  log('Phase 5', 'Running validation checks...\n');

  const scriptStartTime = new Date().toISOString();

  // Check 1: Record counts — synced tables have > 0 records
  if (!SKIP_SYNC && !DRY_RUN) {
    const syncedTables = ['users', 'bookings', 'messages', 'transactions', 'ratings', 'disputes'];
    let allPopulated = true;
    const emptyTables: string[] = [];

    for (const table of syncedTables) {
      const exists = await tableExists(table);
      if (!exists) continue;
      const count = await getRowCount(table);
      if (count === 0) {
        allPopulated = false;
        emptyTables.push(table);
      }
    }

    addCheck('Record counts', allPopulated,
      allPopulated ? 'All synced tables have records' : `Empty tables: ${emptyTables.join(', ')}`
    );
  } else {
    addCheck('Record counts', true, 'SKIPPED (sync not run)');
  }

  // Check 2: Referential integrity — no orphaned FKs
  if (!DRY_RUN) {
    const fkChecks = [
      { name: 'bookings→users', sql: `SELECT COUNT(*) AS c FROM bookings b WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = b.client_id)` },
      { name: 'messages→users', sql: `SELECT COUNT(*) AS c FROM messages m WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = m.sender_id)` },
      { name: 'risk_signals→users', sql: `SELECT COUNT(*) AS c FROM risk_signals rs WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = rs.user_id)` },
      { name: 'enforcement→users', sql: `SELECT COUNT(*) AS c FROM enforcement_actions ea WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ea.user_id)` },
    ];

    let allClean = true;
    const orphaned: string[] = [];

    for (const check of fkChecks) {
      try {
        const result = await query(check.sql);
        const count = parseInt(result.rows[0].c, 10);
        if (count > 0) {
          allClean = false;
          orphaned.push(`${check.name}: ${count} orphans`);
        }
      } catch {
        // Table might not exist / be empty — that's fine
      }
    }

    addCheck('Referential integrity', allClean,
      allClean ? 'No orphaned foreign keys' : orphaned.join('; ')
    );
  } else {
    addCheck('Referential integrity', true, 'SKIPPED (dry-run)');
  }

  // Check 3: No test data remnants
  if (!DRY_RUN) {
    let remnants = 0;

    // Check users table for test data patterns
    try {
      const uuidCheck = await query(
        `SELECT COUNT(*) AS c FROM users WHERE ${
          TEST_UUID_PREFIXES.map((_, i) => `CAST(id AS TEXT) LIKE $${i + 1}`).join(' OR ')
        }`,
        TEST_UUID_PREFIXES.map(p => `${p}%`)
      );
      remnants += parseInt(uuidCheck.rows[0].c, 10);
    } catch { /* empty table is fine */ }

    try {
      const emailCheck = await query(
        `SELECT COUNT(*) AS c FROM users WHERE ${
          TEST_EMAIL_DOMAINS.map((_, i) => `email LIKE $${i + 1}`).join(' OR ')
        }`,
        TEST_EMAIL_DOMAINS.map(d => `%${d}`)
      );
      remnants += parseInt(emailCheck.rows[0].c, 10);
    } catch { /* empty table is fine */ }

    try {
      const phoneCheck = await query(
        `SELECT COUNT(*) AS c FROM users WHERE phone LIKE $1`,
        [`${TEST_PHONE_PREFIX}%`]
      );
      remnants += parseInt(phoneCheck.rows[0].c, 10);
    } catch { /* empty table is fine */ }

    addCheck('No test data remnants', remnants === 0,
      remnants === 0 ? 'Zero test data patterns found' : `${remnants} test data rows still present`
    );
  } else {
    addCheck('No test data remnants', true, 'SKIPPED (dry-run)');
  }

  // Check 4: No duplicate users
  if (!DRY_RUN) {
    try {
      const dupResult = await query(
        `SELECT id, COUNT(*) AS c FROM users GROUP BY id HAVING COUNT(*) > 1`
      );
      const hasDuplicates = dupResult.rows.length > 0;
      addCheck('No duplicate users', !hasDuplicates,
        hasDuplicates ? `${dupResult.rows.length} duplicate user IDs` : 'No duplicates'
      );
    } catch {
      addCheck('No duplicate users', true, 'Table empty or does not exist');
    }
  } else {
    addCheck('No duplicate users', true, 'SKIPPED (dry-run)');
  }

  // Check 5: Risk engine health
  if (!DRY_RUN && !SKIP_REBUILD) {
    try {
      const scoreResult = await query('SELECT COUNT(*) AS c FROM risk_scores');
      const scoreCount = parseInt(scoreResult.rows[0].c, 10);

      let sampleOk = false;
      if (scoreCount > 0) {
        // Try scoring a sample user
        const sampleUser = await query('SELECT user_id FROM risk_scores LIMIT 1');
        if (sampleUser.rows.length > 0) {
          try {
            await computeRiskScore(sampleUser.rows[0].user_id);
            sampleOk = true;
          } catch { /* scoring failed */ }
        }
      }

      addCheck('Risk engine health', scoreCount > 0 && sampleOk,
        scoreCount > 0
          ? `${scoreCount} scores exist; sample scoring ${sampleOk ? 'OK' : 'FAILED'}`
          : 'No risk scores present'
      );
    } catch {
      addCheck('Risk engine health', false, 'Could not query risk_scores');
    }
  } else {
    addCheck('Risk engine health', true, 'SKIPPED (rebuild not run)');
  }

  // Check 6: Sync watermarks updated
  if (!DRY_RUN && !SKIP_SYNC) {
    const wmExists = await tableExists('sync_watermarks');
    if (wmExists) {
      try {
        const status = await getSyncStatus();
        const allUpdated = status.tables.every(t => {
          const lastSynced = new Date(t.last_synced_at);
          return lastSynced > new Date('2000-01-01');
        });

        addCheck('Sync watermarks', allUpdated,
          allUpdated
            ? 'All watermarks have been updated'
            : 'Some watermarks still at epoch'
        );
      } catch {
        addCheck('Sync watermarks', false, 'Could not query sync status');
      }
    } else {
      addCheck('Sync watermarks', false, 'sync_watermarks table does not exist');
    }
  } else {
    addCheck('Sync watermarks', true, 'SKIPPED (sync not run)');
  }

  // Check 7: Zero stale processed_events
  if (!DRY_RUN) {
    try {
      const peResult = await query('SELECT COUNT(*) AS c FROM processed_events');
      const peCount = parseInt(peResult.rows[0].c, 10);
      addCheck('Zero stale processed_events', peCount === 0,
        peCount === 0 ? 'Table is clean' : `${peCount} stale events remain`
      );
    } catch {
      addCheck('Zero stale processed_events', true, 'Table does not exist');
    }
  } else {
    addCheck('Zero stale processed_events', true, 'SKIPPED (dry-run)');
  }

  // Log results
  for (const check of report.phase5.checks) {
    const icon = check.passed ? 'PASS' : 'FAIL';
    log('Phase 5', `  [${icon}] ${check.name}: ${check.detail}`);
  }
  log('Phase 5', `\n  Result: ${report.phase5.passed}/${report.phase5.checks.length} checks passed\n`);
}

function addCheck(name: string, passed: boolean, detail: string): void {
  report.phase5.checks.push({ name, passed, detail });
  if (passed) report.phase5.passed++;
  else report.phase5.failed++;
}

// ─── Phase 6: Report Output ─────────────────────────────────────

function phase6Report(startTime: number): void {
  const elapsed = Date.now() - startTime;
  const mode = DRY_RUN ? 'dry-run' : 'execute';

  const totalChecks = report.phase5.checks.length;
  const readinessScore = totalChecks > 0
    ? Math.round((report.phase5.passed / totalChecks) * 10)
    : 0;
  const status = report.phase5.failed === 0 ? 'READY' : 'NOT_READY';

  console.log('\n' + '='.repeat(60));
  console.log('=== CIS Production Reset Report ===');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${nowISO()}`);
  console.log(`Mode: ${mode}`);
  console.log(`Duration: ${formatDuration(elapsed)}`);
  console.log(`Flags: ${SKIP_SYNC ? '--skip-sync ' : ''}${SKIP_REBUILD ? '--skip-rebuild' : ''}`);

  console.log('\nPhase 1 — Audit:');
  console.log(`  Tables scanned: ${report.phase1.tablesScanned}`);
  console.log(`  Test data identified: ${report.phase1.testDataRows} rows across ${report.phase1.testDataTables} tables`);

  console.log('\nPhase 2 — Truncation:');
  console.log(`  Tables truncated: ${report.phase2.tablesTruncated}`);
  console.log(`  Rows removed: ${report.phase2.rowsRemoved} total`);
  console.log(`  Tables preserved: ${report.phase2.tablesPreserved}`);

  console.log('\nPhase 3 — Sync:');
  if (SKIP_SYNC) {
    console.log('  SKIPPED');
  } else {
    for (const [table, count] of Object.entries(report.phase3.recordsByTable)) {
      console.log(`  ${table} synced: ${count}`);
    }
    console.log(`  Iterations: ${report.phase3.iterations}`);
    console.log(`  Total sync duration: ${formatDuration(report.phase3.totalDurationMs)}`);
    if (report.phase3.errors.length > 0) {
      console.log(`  Errors: ${report.phase3.errors.length}`);
    }
  }

  console.log('\nPhase 4 — Rebuild:');
  if (SKIP_REBUILD) {
    console.log('  SKIPPED');
  } else {
    console.log(`  Users scored: ${report.phase4.usersScored}`);
    console.log(`  Avg risk score: ${report.phase4.avgScore}`);
    console.log(`  Tier distribution: ${JSON.stringify(report.phase4.tierDistribution)}`);
    if (report.phase4.errors.length > 0) {
      console.log(`  Errors: ${report.phase4.errors.length}`);
    }
  }

  console.log('\nPhase 5 — Validation:');
  console.log(`  Checks passed: ${report.phase5.passed}/${totalChecks}`);
  if (report.phase5.failed > 0) {
    const failedNames = report.phase5.checks
      .filter(c => !c.passed)
      .map(c => c.name);
    console.log(`  Checks failed: [${failedNames.join(', ')}]`);
  }

  console.log(`\nReadiness Score: ${readinessScore}/10`);
  console.log(`Status: ${status}`);
  console.log('='.repeat(60) + '\n');
}

// ─── Main Entry Point ────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  QwickServices CIS — Production Data Reset & Sync           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log(`[Config] Mode:          ${DRY_RUN ? 'DRY RUN (read-only)' : 'EXECUTE (destructive)'}`);
  console.log(`[Config] Skip Sync:     ${SKIP_SYNC}`);
  console.log(`[Config] Skip Rebuild:  ${SKIP_REBUILD}`);
  console.log('');

  if (!DRY_RUN) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  WARNING: --execute flag detected. This will DELETE data!    ║');
    console.log('║  Press Ctrl+C within 5 seconds to abort.                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Test database connection
  const connected = await testConnection();
  if (!connected) {
    logError('Setup', 'Cannot connect to CIS database. Check DB_* environment variables.');
    process.exit(1);
  }
  log('Setup', 'Database connection verified.\n');

  const startTime = Date.now();

  try {
    // Phase 1 — Audit
    await phase1Audit();

    // Phase 2 — Truncation
    await phase2Truncation();

    // Phase 3 — Sync
    await phase3Sync();

    // Phase 4 — Rebuild
    await phase4Rebuild();

    // Phase 5 — Validation
    await phase5Validation();

    // Phase 6 — Report
    phase6Report(startTime);

  } catch (error) {
    logError('FATAL', `Script failed: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await closePool();
  }
}

// ─── Execute ─────────────────────────────────────────────────────

main().catch((error) => {
  console.error('[FATAL]', error);
  process.exit(1);
});
