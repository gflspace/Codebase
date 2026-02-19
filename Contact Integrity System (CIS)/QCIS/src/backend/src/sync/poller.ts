// QwickServices CIS — Data Sync Poller
// Polls QwickServices database for new/updated records per table.
// Uses watermark-based cursor tracking to avoid re-processing.

import { query } from '../database/connection';
import { externalQuery } from './connection';
import { TableMapping } from './mappings';
import { transformRow, ensureUsersForRow, detectContactFieldChanges } from './transformer';
import { DomainEvent } from '../events/types';
import { generateId, nowISO } from '../shared/utils';

export interface SyncResult {
  sourceTable: string;
  recordsFound: number;
  recordsProcessed: number;
  recordsFailed: number;
  eventsEmitted: number;
  watermarkBefore: string;
  watermarkAfter: string;
  durationMs: number;
  errors: string[];
}

interface Watermark {
  last_synced_at: string;
  last_synced_id: string | null;
}

/**
 * Get the current watermark for a source table.
 */
export async function getWatermark(sourceTable: string): Promise<Watermark> {
  const result = await query(
    'SELECT last_synced_at, last_synced_id FROM sync_watermarks WHERE source_table = $1',
    [sourceTable]
  );

  if (result.rows.length === 0) {
    return { last_synced_at: '1970-01-01T00:00:00Z', last_synced_id: null };
  }

  return {
    last_synced_at: new Date(result.rows[0].last_synced_at).toISOString(),
    last_synced_id: result.rows[0].last_synced_id,
  };
}

/**
 * Update the watermark after a successful sync.
 */
export async function updateWatermark(
  sourceTable: string,
  lastSyncedAt: string,
  lastSyncedId: string | null,
  recordsSynced: number,
  durationMs: number,
  error?: string,
): Promise<void> {
  await query(
    `UPDATE sync_watermarks
     SET last_synced_at = $2,
         last_synced_id = $3,
         records_synced = records_synced + $4,
         last_run_at = NOW(),
         last_run_duration_ms = $5,
         last_error = $6,
         updated_at = NOW()
     WHERE source_table = $1`,
    [sourceTable, lastSyncedAt, lastSyncedId, recordsSynced, durationMs, error || null]
  );
}

/**
 * Log a sync run for observability.
 */
export async function logSyncRun(result: SyncResult): Promise<void> {
  try {
    await query(
      `INSERT INTO sync_run_log (id, source_table, started_at, finished_at, records_found, records_processed, records_failed, events_emitted, error, watermark_before, watermark_after)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10)`,
      [
        generateId(),
        result.sourceTable,
        new Date(Date.now() - result.durationMs).toISOString(),
        result.recordsFound,
        result.recordsProcessed,
        result.recordsFailed,
        result.eventsEmitted,
        result.errors.length > 0 ? result.errors.join('; ') : null,
        result.watermarkBefore,
        result.watermarkAfter,
      ]
    );
  } catch (err) {
    console.error('[Sync] Failed to log sync run:', err);
  }
}

/**
 * Poll a single table for new/updated records since the last watermark.
 * Returns transformed DomainEvents ready for emission.
 */
export async function pollTable(
  mapping: TableMapping,
  batchSize: number = 100,
): Promise<{ events: DomainEvent[]; result: SyncResult }> {
  const startTime = Date.now();
  const watermark = await getWatermark(mapping.sourceTable);
  const events: DomainEvent[] = [];
  const errors: string[] = [];
  let recordsFound = 0;
  let recordsProcessed = 0;
  let recordsFailed = 0;
  let newWatermarkAt = watermark.last_synced_at;
  let newWatermarkId = watermark.last_synced_id;

  try {
    // Query QwickServices database for records updated since watermark
    const filterClause = mapping.extraFilter ? `AND ${mapping.extraFilter}` : '';
    const queryText = `
      SELECT ${mapping.selectColumns}
      FROM ${mapping.sourceTable}
      WHERE ${mapping.cursorColumn} > $1
      ${filterClause}
      ORDER BY ${mapping.cursorColumn} ASC, ${mapping.primaryKeyColumn} ASC
      LIMIT $2
    `;

    const rows = await externalQuery(queryText, [watermark.last_synced_at, batchSize]);
    recordsFound = rows.rows.length;

    for (const row of rows.rows) {
      try {
        // Ensure referenced users exist in CIS
        await ensureUsersForRow(row, mapping);

        // Detect contact field changes (emits CONTACT_FIELD_CHANGED events)
        const contactChangeEvents = await detectContactFieldChanges(row, mapping);
        events.push(...contactChangeEvents);

        // Transform to domain event
        const event = transformRow(row, mapping);
        events.push(event);
        recordsProcessed++;

        // Track the highest watermark
        const rowTimestamp = row[mapping.cursorColumn]
          ? new Date(String(row[mapping.cursorColumn])).toISOString()
          : nowISO();
        if (rowTimestamp > newWatermarkAt) {
          newWatermarkAt = rowTimestamp;
          newWatermarkId = String(row[mapping.primaryKeyColumn]);
        }
      } catch (err) {
        recordsFailed++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Row ${row[mapping.primaryKeyColumn]}: ${errorMsg}`);
        console.error(`[Sync] Failed to process row from ${mapping.sourceTable}:`, errorMsg);
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    errors.push(`Query failed: ${errorMsg}`);
    console.error(`[Sync] Failed to poll ${mapping.sourceTable}:`, errorMsg);
  }

  const durationMs = Date.now() - startTime;

  const syncResult: SyncResult = {
    sourceTable: mapping.sourceTable,
    recordsFound,
    recordsProcessed,
    recordsFailed,
    eventsEmitted: events.length,
    watermarkBefore: watermark.last_synced_at,
    watermarkAfter: newWatermarkAt,
    durationMs,
    errors,
  };

  return { events, result: syncResult };
}
