// QwickServices CIS — Data Sync Service Orchestrator
// Manages the polling lifecycle: start, stop, manual trigger.
// Polls all enabled tables on a configurable interval.

import { config } from '../config';
import { query } from '../database/connection';
import { testExternalConnection, closeExternalPool } from './connection';
import { TABLE_MAPPINGS, getMappingForTable } from './mappings';
import { pollTable, updateWatermark, logSyncRun, SyncResult } from './poller';
import { getEventBus } from '../events/bus';

let syncInterval: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

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

        // Emit events to the CIS event bus
        for (const event of events) {
          try {
            await bus.emit(event);
          } catch (err) {
            result.recordsFailed++;
            const errorMsg = err instanceof Error ? err.message : String(err);
            result.errors.push(`Event emit failed: ${errorMsg}`);
          }
        }

        result.eventsEmitted = result.recordsProcessed - result.recordsFailed;

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

  // When webhooks are active, increase polling interval to fallback mode (gap-fill only)
  const effectiveInterval = config.sync.webhookPushEnabled
    ? config.sync.fallbackIntervalMs
    : config.sync.intervalMs;
  const mode = config.sync.webhookPushEnabled ? 'fallback/gap-fill' : 'primary';
  console.log(`[Sync] Starting data sync (mode: ${mode}, interval: ${effectiveInterval}ms, batch: ${config.sync.batchSize})`);

  // Run initial sync
  await runSyncCycle();

  // Set up periodic polling
  syncInterval = setInterval(async () => {
    try {
      const results = await runSyncCycle();
      // Log gap-fill metrics when in fallback mode
      if (config.sync.webhookPushEnabled) {
        const totalGapFill = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
        if (totalGapFill > 0) {
          console.log(`[Sync] Gap-fill: ${totalGapFill} records found by polling that were not delivered via webhook`);
        }
      }
    } catch (err) {
      console.error('[Sync] Periodic sync error:', err);
    }
  }, effectiveInterval);

  return true;
}

/**
 * Stop the periodic sync service.
 */
export async function stopSync(): Promise<void> {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  await closeExternalPool();
  console.log('[Sync] Data sync stopped');
}
