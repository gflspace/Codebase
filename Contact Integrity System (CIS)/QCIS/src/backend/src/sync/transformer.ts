// QwickServices CIS — Record-to-Event Transformer
// Converts QwickServices database rows into CIS DomainEvents.
// Handles user auto-provisioning for unknown users.

import { DomainEvent, EventType } from '../events/types';
import { generateId, nowISO } from '../shared/utils';
import { query } from '../database/connection';
import { TableMapping } from './mappings';

/**
 * Transform a QwickServices database row into a CIS DomainEvent.
 */
export function transformRow(row: Record<string, unknown>, mapping: TableMapping): DomainEvent {
  const eventType = mapping.eventTypeMapping(row);
  const payload = mapping.transformPayload(row);

  return {
    id: generateId(),
    type: eventType,
    correlation_id: generateId(),
    timestamp: row[mapping.cursorColumn]
      ? new Date(String(row[mapping.cursorColumn])).toISOString()
      : nowISO(),
    version: 1,
    payload: {
      ...payload,
      _sync_source: 'data_sync',
      _source_table: mapping.sourceTable,
      _source_id: String(row[mapping.primaryKeyColumn]),
    },
  };
}

/**
 * Ensure user exists in CIS database.
 * Uses lazy registration: if user doesn't exist, create with defaults.
 * Returns the CIS user ID (which is the external QwickServices user ID).
 */
export async function ensureUserExists(externalUserId: string): Promise<string> {
  // Check if user already exists
  const existing = await query(
    'SELECT id FROM users WHERE id = $1 OR external_id = $1',
    [externalUserId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Auto-provision user with defaults
  const userId = externalUserId; // Use QwickServices ID directly as CIS ID
  try {
    await query(
      `INSERT INTO users (id, external_id, trust_score, status, verification_status, created_at, updated_at)
       VALUES ($1, $2, 50.00, 'active', 'unverified', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [userId, externalUserId]
    );
  } catch (err) {
    // Race condition or ID format mismatch — use generated ID
    const newId = generateId();
    await query(
      `INSERT INTO users (id, external_id, trust_score, status, verification_status, created_at, updated_at)
       VALUES ($1, $2, 50.00, 'active', 'unverified', NOW(), NOW())
       ON CONFLICT (external_id) DO NOTHING`,
      [newId, externalUserId]
    );
    return newId;
  }

  return userId;
}

/**
 * Ensure all users referenced in a row exist in CIS.
 */
export async function ensureUsersForRow(row: Record<string, unknown>, mapping: TableMapping): Promise<void> {
  const userId = mapping.extractUserId(row);
  if (userId) {
    await ensureUserExists(userId);
  }

  if (mapping.extractCounterpartyId) {
    const counterpartyId = mapping.extractCounterpartyId(row);
    if (counterpartyId) {
      await ensureUserExists(counterpartyId);
    }
  }
}
