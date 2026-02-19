// QwickServices CIS — Record-to-Event Transformer
// Converts QwickServices database rows into CIS DomainEvents.
// Handles user auto-provisioning for unknown users and category upserts.

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
 * Ensure a category exists in CIS database.
 * Upserts into CIS categories table from QwickServices category data.
 */
export async function ensureCategoryExists(
  externalId: string,
  name: string,
  parentId?: string | null,
  status?: string,
): Promise<string> {
  const existing = await query(
    'SELECT id FROM categories WHERE external_id = $1 LIMIT 1',
    [externalId]
  );

  if (existing.rows.length > 0) {
    // Update if name/status changed
    await query(
      `UPDATE categories SET name = $2, status = $3, updated_at = NOW() WHERE external_id = $1`,
      [externalId, name, status || 'active']
    );
    return existing.rows[0].id;
  }

  // Insert new category
  const id = generateId();
  await query(
    `INSERT INTO categories (id, external_id, name, parent_id, status, created_at, updated_at)
     VALUES ($1, $2, $3, (SELECT id FROM categories WHERE external_id = $4 LIMIT 1), $5, NOW(), NOW())
     ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = NOW()`,
    [id, externalId, name, parentId || '', status || 'active']
  );

  console.log(`[Sync] Auto-created CIS category for external_id=${externalId} → ${id}`);
  return id;
}

/**
 * Detect contact field changes for a user sync row.
 * Compares incoming QwickServices phone/email against existing CIS record.
 * Returns CONTACT_FIELD_CHANGED events for any detected changes.
 */
export async function detectContactFieldChanges(
  row: Record<string, unknown>,
  mapping: TableMapping,
): Promise<DomainEvent[]> {
  if (mapping.sourceTable !== 'users') return [];

  const externalUserId = mapping.extractUserId(row);
  if (!externalUserId) return [];

  // Look up existing CIS user
  const existing = await query(
    'SELECT id, email, metadata FROM users WHERE id = $1 OR external_id = $1',
    [externalUserId]
  );
  if (existing.rows.length === 0) return []; // New user, no diff needed

  const cisUser = existing.rows[0];
  const cisEmail = cisUser.email || null;
  const cisMeta = (typeof cisUser.metadata === 'string' ? JSON.parse(cisUser.metadata) : cisUser.metadata) || {};
  const cisPhone = cisMeta.phone || cisMeta.phone_number || null;

  const incomingEmail = row.email ? String(row.email) : null;
  const incomingPhone = row.phone_number ? String(row.phone_number) : null;

  const events: DomainEvent[] = [];
  const timestamp = row[mapping.cursorColumn]
    ? new Date(String(row[mapping.cursorColumn])).toISOString()
    : nowISO();

  if (incomingEmail && cisEmail && incomingEmail !== cisEmail) {
    events.push({
      id: generateId(),
      type: EventType.CONTACT_FIELD_CHANGED,
      correlation_id: generateId(),
      timestamp,
      version: 1,
      payload: {
        user_id: externalUserId,
        field: 'email',
        old_value: cisEmail,
        new_value: incomingEmail,
        _sync_source: 'data_sync',
        _source_table: 'users',
        _source_id: String(row[mapping.primaryKeyColumn]),
      },
    });
  }

  if (incomingPhone && cisPhone && incomingPhone !== cisPhone) {
    events.push({
      id: generateId(),
      type: EventType.CONTACT_FIELD_CHANGED,
      correlation_id: generateId(),
      timestamp,
      version: 1,
      payload: {
        user_id: externalUserId,
        field: 'phone',
        old_value: cisPhone,
        new_value: incomingPhone,
        _sync_source: 'data_sync',
        _source_table: 'users',
        _source_id: String(row[mapping.primaryKeyColumn]),
      },
    });
  }

  // Update CIS user email/metadata to reflect the new values
  if (events.length > 0) {
    const newMeta = { ...cisMeta };
    if (incomingPhone) newMeta.phone_number = incomingPhone;
    await query(
      `UPDATE users SET email = COALESCE($2, email), metadata = $3, updated_at = NOW()
       WHERE id = $1 OR external_id = $1`,
      [externalUserId, incomingEmail, JSON.stringify(newMeta)]
    );
  }

  return events;
}

/**
 * Ensure all users referenced in a row exist in CIS.
 * Also handles category rows by upserting into CIS categories table.
 */
export async function ensureUsersForRow(row: Record<string, unknown>, mapping: TableMapping): Promise<void> {
  // Handle category rows specially — no user provisioning needed
  if (mapping.sourceTable === 'categories') {
    const categoryId = row[mapping.primaryKeyColumn];
    if (categoryId) {
      await ensureCategoryExists(
        String(categoryId),
        String(row.name || ''),
        row.parent_id ? String(row.parent_id) : null,
        row.status ? String(row.status) : 'active',
      );
    }
    return;
  }

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
