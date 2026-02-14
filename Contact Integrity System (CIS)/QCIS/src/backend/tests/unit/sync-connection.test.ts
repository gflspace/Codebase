// QwickServices CIS — Sync Connection Unit Tests
// Tests placeholder conversion and driver selection logic.

import { describe, it, expect } from 'vitest';
import { convertPlaceholders } from '../../src/sync/connection';

// ─── Placeholder Conversion ─────────────────────────────────

describe('convertPlaceholders', () => {
  it('converts $1 to ?', () => {
    expect(convertPlaceholders('SELECT * FROM users WHERE id = $1')).toBe(
      'SELECT * FROM users WHERE id = ?'
    );
  });

  it('converts multiple placeholders $1, $2, $3', () => {
    const sql = 'INSERT INTO users (id, name, email) VALUES ($1, $2, $3)';
    expect(convertPlaceholders(sql)).toBe(
      'INSERT INTO users (id, name, email) VALUES (?, ?, ?)'
    );
  });

  it('handles placeholders with double-digit numbers', () => {
    const sql = 'SELECT * FROM t WHERE a=$1 AND b=$2 AND c=$10 AND d=$11';
    expect(convertPlaceholders(sql)).toBe(
      'SELECT * FROM t WHERE a=? AND b=? AND c=? AND d=?'
    );
  });

  it('returns unchanged SQL when no placeholders exist', () => {
    const sql = 'SELECT * FROM users WHERE status = true';
    expect(convertPlaceholders(sql)).toBe(sql);
  });

  it('handles complex sync-style queries', () => {
    const sql = `
      SELECT user_id, email, phone, is_active
      FROM users
      WHERE updated_at > $1
      AND user_type = 'customer' AND is_active = 1
      ORDER BY updated_at ASC, user_id ASC
      LIMIT $2
    `;
    const result = convertPlaceholders(sql);
    expect(result).not.toContain('$1');
    expect(result).not.toContain('$2');
    expect(result.match(/\?/g)?.length).toBe(2);
  });

  it('preserves string content that is not a placeholder', () => {
    const sql = "SELECT * FROM t WHERE col = $1 AND name LIKE '%test%'";
    const result = convertPlaceholders(sql);
    expect(result).toBe("SELECT * FROM t WHERE col = ? AND name LIKE '%test%'");
  });

  it('handles empty string', () => {
    expect(convertPlaceholders('')).toBe('');
  });
});
