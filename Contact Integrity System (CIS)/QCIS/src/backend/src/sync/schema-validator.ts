// QwickServices CIS — Schema Drift Detection (§11.7)
// Validates that QwickServices table schemas match expected columns
// before sync polling. On drift: skips table, fires alert.

import { createHash } from 'crypto';
import { externalQuery } from './connection';
import { TableMapping } from './mappings';
import { createAlert } from '../alerting/index';
import { config } from '../config';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// ─── Types ──────────────────────────────────────────────────

export interface ColumnInfo {
  column_name: string;
  data_type: string;
}

export interface SchemaDriftResult {
  valid: boolean;
  sourceTable: string;
  missingColumns: string[];
  extraColumns: string[];
  checksum: string;
  cached: boolean;
}

// ─── Cache ──────────────────────────────────────────────────

interface CacheEntry {
  result: SchemaDriftResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const schemaCache = new Map<string, CacheEntry>();

export function clearSchemaCache(): void {
  schemaCache.clear();
}

// ─── Column Parsing ─────────────────────────────────────────

/**
 * Extract column names from a mapping's selectColumns string.
 * Handles SQL aliases (e.g., "col AS alias" → "col"), whitespace, and newlines.
 */
export function parseExpectedColumns(selectColumns: string): string[] {
  return selectColumns
    .split(',')
    .map(col => col.trim())
    .filter(col => col.length > 0)
    .map(col => {
      // Handle "expression AS alias" — take the base column name
      const asMatch = col.match(/^(\w+)\s+AS\s+/i);
      if (asMatch) return asMatch[1].toLowerCase();
      // Plain column name (possibly with whitespace)
      return col.split(/\s+/)[0].toLowerCase();
    });
}

// ─── Checksum ───────────────────────────────────────────────

/**
 * Compute an MD5 checksum of sorted column:type pairs.
 * Deterministic — same columns always produce the same hash.
 */
export function computeSchemaChecksum(columns: ColumnInfo[]): string {
  const sorted = [...columns]
    .sort((a, b) => a.column_name.localeCompare(b.column_name))
    .map(c => `${c.column_name}:${c.data_type}`)
    .join('|');
  return createHash('md5').update(sorted).digest('hex');
}

// ─── Validation ─────────────────────────────────────────────

/**
 * Validate that a QwickServices table's actual schema contains all expected columns.
 * Queries INFORMATION_SCHEMA.COLUMNS (a SELECT — passes the read-only guard).
 *
 * On drift: fires an alert and returns { valid: false }.
 * On query failure: fails closed (returns invalid).
 * Caches valid results for 5 minutes.
 */
export async function validateTableSchema(mapping: TableMapping): Promise<SchemaDriftResult> {
  // Check cache first
  const cached = schemaCache.get(mapping.sourceTable);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.result, cached: true };
  }

  const expectedColumns = parseExpectedColumns(mapping.selectColumns);

  try {
    // INFORMATION_SCHEMA.COLUMNS is a SELECT — passes read-only guard
    const dbName = config.sync.db.name;
    const result = await externalQuery(
      `SELECT COLUMN_NAME, DATA_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = $1 AND TABLE_NAME = $2`,
      [dbName, mapping.sourceTable]
    );

    const actualColumns: ColumnInfo[] = result.rows.map((row) => ({
      column_name: String(row.COLUMN_NAME || row.column_name).toLowerCase(),
      data_type: String(row.DATA_TYPE || row.data_type).toLowerCase(),
    }));

    const actualColumnNames = new Set(actualColumns.map(c => c.column_name));
    const missingColumns = expectedColumns.filter(col => !actualColumnNames.has(col));
    const expectedSet = new Set(expectedColumns);
    const extraColumns = actualColumns
      .map(c => c.column_name)
      .filter(col => !expectedSet.has(col));

    const checksum = computeSchemaChecksum(actualColumns);
    const valid = missingColumns.length === 0;

    const driftResult: SchemaDriftResult = {
      valid,
      sourceTable: mapping.sourceTable,
      missingColumns,
      extraColumns,
      checksum,
      cached: false,
    };

    if (valid) {
      // Cache valid schemas
      schemaCache.set(mapping.sourceTable, {
        result: driftResult,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    } else {
      // Fire alert for schema drift
      await createAlert({
        user_id: SYSTEM_USER_ID,
        priority: 'high',
        title: `Schema drift detected: ${mapping.sourceTable}`,
        description:
          `Missing columns: [${missingColumns.join(', ')}]. ` +
          `Sync for this table has been paused until the schema is corrected.`,
        source: 'schema_drift_detector',
        auto_generated: true,
        metadata: {
          source_table: mapping.sourceTable,
          missing_columns: missingColumns,
          extra_columns: extraColumns,
          checksum,
        },
      });
      console.error(
        `[Schema] Drift detected on ${mapping.sourceTable}: missing [${missingColumns.join(', ')}]`
      );
    }

    return driftResult;
  } catch (err) {
    // Fail closed — treat query failure as invalid
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Schema] Validation failed for ${mapping.sourceTable}: ${errorMsg}`);

    return {
      valid: false,
      sourceTable: mapping.sourceTable,
      missingColumns: [],
      extraColumns: [],
      checksum: '',
      cached: false,
    };
  }
}
