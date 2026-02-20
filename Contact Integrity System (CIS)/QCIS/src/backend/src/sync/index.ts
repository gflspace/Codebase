// QwickServices CIS — Data Sync Service Orchestrator
// Manages the polling lifecycle: start, stop, manual trigger.
// Polls all enabled tables on a configurable interval.
//
// Architecture spec compliance:
//   §2 — Runtime privilege verification at startup
//   §3 — Exponential backoff on failure
//   §4 — Static query allowlist registration
//   §5 — Event deduplication

import { config } from '../config';
import { query } from '../database/connection';
import {
  testExternalConnection,
  closeExternalPool,
  verifyReadOnlyPrivileges,
  registerAllowedQuery,
  getCircuitBreakerState,
  resetCircuitBreaker,
} from './connection';
import { TABLE_MAPPINGS, getMappingForTable } from './mappings';
import { pollTable, updateWatermark, logSyncRun, SyncResult } from './poller';
import { quickHealthCheck, checkSyncHealth } from './health';
import { getEventBus } from '../events/bus';

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;
let isBackfilling = false;

// ─── Exponential Backoff State ──────────────────────────────
// Spec §3: On success → reset to base interval; on failure → double up to max.

const BACKOFF_MAX_MS = 5 * 60 * 1000; // 5 minutes max backoff
let currentBackoffMs = 0; // 0 = use base interval (no backoff active)
let consecutiveCycleFailures = 0;

// ─── Event Deduplication ────────────────────────────────────
// Spec §5: Prevent duplicate domain events on re-poll after crash.
// Uses a rolling window of recently-emitted source keys.

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5-minute window
const dedupCache = new Map<string, number>(); // "table:sourceId" → timestamp

// Periodic cleanup of expired dedup entries (every 2 minutes)
const dedupCleanupInterval = setInterval(() => {
  const cutoff = Date.now() - DEDUP_WINDOW_MS;
  for (const [key, ts] of dedupCache) {
    if (ts < cutoff) dedupCache.delete(key);
  }
}, 2 * 60 * 1000);
dedupCleanupInterval.unref();

function isDuplicate(sourceTable: string, sourceId: string): boolean {
  const key = `${sourceTable}:${sourceId}`;
  return dedupCache.has(key) && (Date.now() - dedupCache.get(key)!) < DEDUP_WINDOW_MS;
}

function markEmitted(sourceTable: string, sourceId: string): void {
  dedupCache.set(`${sourceTable}:${sourceId}`, Date.now());
}

export function clearDedupCache(): void {
  dedupCache.clear();
}

/**
 * Whether the sync service is currently in backfill mode (initial catch-up).
 * During backfill, events are tagged with _backfill=true so downstream consumers
 * (scoring, enforcement) can debounce or skip to avoid a processing storm.
 */
export function isBackfillMode(): boolean {
  return isBackfilling;
}

export interface SyncStatus {
  enabled: boolean;
  running: boolean;
  intervalMs: number;
  driver: 'mysql' | 'pg';
  tables: Array<{
    source_table: string;
    enabled: boolean;
    last_synced_at: string;
    last_run_at: string | null;
    last_run_duration_ms: number | null;
    records_synced: number;
    last_error: string | null;
  }>;
  externalDbConnected: boolean;
  circuitBreaker: { state: string; consecutiveFailures: number };
  backoffMs: number;
}

/**
 * Get the current sync status for all tables.
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  let externalDbConnected = false;
  if (config.sync.enabled) {
    try {
      externalDbConnected = await testExternalConnection();
    } catch {
      externalDbConnected = false;
    }
  }

  const result = await query(
    `SELECT source_table, enabled, last_synced_at, last_run_at, last_run_duration_ms, records_synced, last_error
     FROM sync_watermarks ORDER BY source_table`
  );

  const cb = getCircuitBreakerState();

  return {
    enabled: config.sync.enabled,
    running: isSyncing,
    intervalMs: config.sync.intervalMs,
    driver: config.sync.db.driver,
    tables: result.rows.map((r: Record<string, unknown>) => ({
      source_table: String(r.source_table),
      enabled: Boolean(r.enabled),
      last_synced_at: r.last_synced_at ? new Date(String(r.last_synced_at)).toISOString() : '1970-01-01T00:00:00Z',
      last_run_at: r.last_run_at ? new Date(String(r.last_run_at)).toISOString() : null,
      last_run_duration_ms: r.last_run_duration_ms ? Number(r.last_run_duration_ms) : null,
      records_synced: Number(r.records_synced || 0),
      last_error: r.last_error ? String(r.last_error) : null,
    })),
    externalDbConnected,
    circuitBreaker: { state: cb.state, consecutiveFailures: cb.consecutiveFailures },
    backoffMs: currentBackoffMs,
  };
}

/**
 * Get recent sync run logs.
 */
export async function getSyncRunHistory(limit: number = 50): Promise<Record<string, unknown>[]> {
  const result = await query(
    `SELECT id, source_table, started_at, finished_at, records_found, records_processed,
            records_failed, events_emitted, error, watermark_before, watermark_after
     FROM sync_run_log
     ORDER BY started_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Register all sync query templates in the static allowlist.
 * Must be called before the first sync cycle.
 */
function registerQueryTemplates(): void {
  for (const mapping of TABLE_MAPPINGS) {
    // Build the query template that pollTable() will generate
    const filterClause = mapping.extraFilter ? `AND ${mapping.extraFilter}` : '';
    const template = `SELECT ${mapping.selectColumns} FROM ${mapping.sourceTable} WHERE ${mapping.cursorColumn} > $1 ${filterClause} ORDER BY ${mapping.cursorColumn} ASC, ${mapping.primaryKeyColumn} ASC LIMIT $2`;
    registerAllowedQuery(template);
  }

  // The schema validator also uses INFORMATION_SCHEMA queries — those are
  // registered in connection.ts at module load.
  console.log(`[Sync] Registered ${TABLE_MAPPINGS.length} query templates in allowlist`);
}

/**
 * Run a single sync cycle across all enabled tables.
 */
export async function runSyncCycle(tableName?: string): Promise<SyncResult[]> {
  if (isSyncing) {
    console.log('[Sync] Sync cycle already in progress, skipping');
    return [];
  }

  isSyncing = true;
  const results: SyncResult[] = [];

  try {
    // Get enabled tables from watermarks
    const enabledResult = await query(
      'SELECT source_table FROM sync_watermarks WHERE enabled = true'
    );
    const enabledTables = new Set(enabledResult.rows.map((r: { source_table: string }) => r.source_table));

    // Filter to specific table if requested
    const mappings = tableName
      ? TABLE_MAPPINGS.filter(m => m.sourceTable === tableName)
      : TABLE_MAPPINGS.filter(m => enabledTables.has(m.sourceTable));

    if (mappings.length === 0) {
      console.log('[Sync] No enabled tables to sync');
      return results;
    }

    const bus = getEventBus();

    for (const mapping of mappings) {
      try {
        const { events, result } = await pollTable(mapping, config.sync.batchSize);

        // Tag backfill events so downstream consumers can debounce/skip
        if (isBackfilling) {
          for (const event of events) {
            event.payload._backfill = true;
          }
        }

        // Emit events to the CIS event bus (with deduplication)
        let dedupSkipped = 0;
        for (const event of events) {
          const sourceId = String(
            (event.payload as Record<string, unknown>)._source_id ||
            (event.payload as Record<string, unknown>).user_id ||
            event.id
          );

          // Spec §5: Skip if this source record was already emitted recently
          if (isDuplicate(mapping.sourceTable, sourceId)) {
            dedupSkipped++;
            continue;
          }

          try {
            await bus.emit(event);
            markEmitted(mapping.sourceTable, sourceId);
          } catch (err) {
            result.recordsFailed++;
            const errorMsg = err instanceof Error ? err.message : String(err);
            result.errors.push(`Event emit failed: ${errorMsg}`);
          }
        }

        if (dedupSkipped > 0) {
          console.log(`[Sync] ${mapping.sourceTable}: ${dedupSkipped} duplicate events skipped`);
        }

        result.eventsEmitted = result.recordsProcessed - result.recordsFailed - dedupSkipped;

        // Update watermark on success
        if (result.recordsProcessed > 0) {
          await updateWatermark(
            mapping.sourceTable,
            result.watermarkAfter,
            null,
            result.recordsProcessed,
            result.durationMs,
            result.errors.length > 0 ? result.errors[0] : undefined,
          );
        } else {
          // Still update last_run_at even if no records
          await updateWatermark(
            mapping.sourceTable,
            result.watermarkBefore,
            null,
            0,
            result.durationMs,
            result.errors.length > 0 ? result.errors[0] : undefined,
          );
        }

        // Log the sync run
        await logSyncRun(result);
        results.push(result);

        if (result.recordsFound > 0) {
          console.log(
            `[Sync] ${mapping.sourceTable}: ${result.recordsProcessed}/${result.recordsFound} records → ${result.eventsEmitted} events (${result.durationMs}ms)`
          );
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Sync] Failed sync for ${mapping.sourceTable}:`, errorMsg);

        const failResult: SyncResult = {
          sourceTable: mapping.sourceTable,
          recordsFound: 0,
          recordsProcessed: 0,
          recordsFailed: 0,
          eventsEmitted: 0,
          watermarkBefore: '',
          watermarkAfter: '',
          durationMs: 0,
          errors: [errorMsg],
        };
        await logSyncRun(failResult);
        results.push(failResult);
      }
    }
    // ─── Health checks ───────────────────────────────────────
    // Quick in-memory check for immediate logging
    const quick = quickHealthCheck(results);
    if (quick.hasIssues) {
      for (const issue of quick.issues) {
        console.warn(`[Sync:Health] ${issue.table}: ${issue.anomaly} — ${issue.description}`);
      }
    }

    // Full DB-backed health check (async, non-blocking)
    checkSyncHealth().catch(err => {
      console.error('[Sync:Health] Background health check failed:', err);
    });
  } finally {
    isSyncing = false;
  }

  return results;
}

/**
 * Toggle sync for a specific table.
 */
export async function toggleTableSync(sourceTable: string, enabled: boolean): Promise<void> {
  await query(
    'UPDATE sync_watermarks SET enabled = $2, updated_at = NOW() WHERE source_table = $1',
    [sourceTable, enabled]
  );
}

/**
 * Reset watermark for a table (re-syncs from beginning).
 */
export async function resetWatermark(sourceTable: string): Promise<void> {
  await query(
    `UPDATE sync_watermarks
     SET last_synced_at = '1970-01-01T00:00:00Z', last_synced_id = NULL,
         records_synced = 0, last_error = NULL, updated_at = NOW()
     WHERE source_table = $1`,
    [sourceTable]
  );
}

// ─── Adaptive Polling Loop ──────────────────────────────────
// Spec §3: Exponential backoff on failure, reset on success.
// Uses setTimeout instead of setInterval for dynamic interval control.

function scheduleNextCycle(baseIntervalMs: number): void {
  const delay = currentBackoffMs > 0 ? currentBackoffMs : baseIntervalMs;

  syncTimeout = setTimeout(async () => {
    try {
      const results = await runSyncCycle();

      // Success: reset backoff
      consecutiveCycleFailures = 0;
      currentBackoffMs = 0;

      // Log gap-fill metrics when in fallback mode
      if (config.sync.webhookPushEnabled) {
        const totalGapFill = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
        if (totalGapFill > 0) {
          console.log(`[Sync] Gap-fill: ${totalGapFill} records found by polling that were not delivered via webhook`);
        }
      }
    } catch (err) {
      consecutiveCycleFailures++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Sync] Periodic sync error (failure #${consecutiveCycleFailures}):`, errorMsg);

      // Exponential backoff: double delay, cap at BACKOFF_MAX_MS
      currentBackoffMs = Math.min(
        (currentBackoffMs || baseIntervalMs) * 2,
        BACKOFF_MAX_MS,
      );
      console.log(`[Sync] Backing off to ${currentBackoffMs / 1000}s before next cycle`);
    }

    // Schedule next cycle (with potentially updated backoff)
    if (syncTimeout !== null) { // only if not stopped
      scheduleNextCycle(baseIntervalMs);
    }
  }, delay);
}

/**
 * Start the periodic sync service.
 */
export async function startSync(): Promise<boolean> {
  if (!config.sync.enabled) {
    console.log('[Sync] Data sync disabled (set SYNC_ENABLED=true to enable)');
    return false;
  }

  // Test external database connection
  const connected = await testExternalConnection();
  if (!connected) {
    console.error('[Sync] Cannot connect to QwickServices database — sync disabled');
    return false;
  }

  // Spec §2: Runtime privilege verification — refuse to start with write privileges
  const privCheck = await verifyReadOnlyPrivileges();
  if (!privCheck.safe) {
    console.error(
      `[SECURITY] External DB user has write privileges — sync REFUSED to start. ` +
      `Grants: ${privCheck.grants.join(' | ')}. ` +
      `Provision a SELECT-only role per architecture spec §2.`
    );
    await closeExternalPool();
    return false;
  }

  // Spec §4: Register all known query templates in the static allowlist
  registerQueryTemplates();

  // When webhooks are active, increase polling interval to fallback mode (gap-fill only)
  const effectiveInterval = config.sync.webhookPushEnabled
    ? config.sync.fallbackIntervalMs
    : config.sync.intervalMs;
  const mode = config.sync.webhookPushEnabled ? 'fallback/gap-fill' : 'primary';
  console.log(`[Sync] Starting data sync (mode: ${mode}, interval: ${effectiveInterval}ms, batch: ${config.sync.batchSize})`);

  // Detect if any table needs initial backfill (watermark at epoch = never synced)
  const watermarkCheck = await query(
    `SELECT COUNT(*) as stale_count FROM sync_watermarks
     WHERE enabled = true AND last_synced_at <= '1970-01-02T00:00:00Z'`
  );
  const needsBackfill = parseInt(String(watermarkCheck.rows[0]?.stale_count || '0'), 10) > 0;

  if (needsBackfill) {
    isBackfilling = true;
    console.log('[Sync] Initial backfill detected — events will be tagged with _backfill=true');
    console.log('[Sync] Scoring will debounce, enforcement will skip during backfill');
  }

  // Run initial sync (may be backfill)
  await runSyncCycle();

  if (isBackfilling) {
    isBackfilling = false;
    console.log('[Sync] Initial backfill complete — switching to normal mode');
  }

  // Set up adaptive polling loop (setTimeout-based for backoff support)
  scheduleNextCycle(effectiveInterval);

  return true;
}

/**
 * Stop the periodic sync service.
 */
export async function stopSync(): Promise<void> {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  currentBackoffMs = 0;
  consecutiveCycleFailures = 0;
  resetCircuitBreaker();
  await closeExternalPool();
  console.log('[Sync] Data sync stopped');
}
