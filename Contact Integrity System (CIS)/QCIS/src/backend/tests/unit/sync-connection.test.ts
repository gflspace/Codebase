// QwickServices CIS — Sync Connection Unit Tests
// Tests placeholder conversion, driver selection, and write suppression guard.

import { describe, it, expect } from 'vitest';
import { convertPlaceholders, validateReadOnlyQuery } from '../../src/sync/connection';

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

// ─── Write Suppression Guard (§11.2) ─────────────────────────

describe('validateReadOnlyQuery', () => {
  // Allowed: SELECT
  it('allows SELECT queries', () => {
    expect(() => validateReadOnlyQuery('SELECT * FROM users')).not.toThrow();
  });

  it('allows SELECT with leading whitespace', () => {
    expect(() => validateReadOnlyQuery('  SELECT id FROM bookings')).not.toThrow();
  });

  it('allows SELECT with newlines', () => {
    expect(() => validateReadOnlyQuery('\n  SELECT id\n  FROM users\n')).not.toThrow();
  });

  it('allows lowercase select', () => {
    expect(() => validateReadOnlyQuery('select * from users')).not.toThrow();
  });

  it('allows mixed-case SeLeCt', () => {
    expect(() => validateReadOnlyQuery('SeLeCt * FROM users')).not.toThrow();
  });

  // Blocked: DML
  it('blocks INSERT statements', () => {
    expect(() => validateReadOnlyQuery('INSERT INTO users (id) VALUES (1)')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  it('blocks UPDATE statements', () => {
    expect(() => validateReadOnlyQuery('UPDATE users SET name = "hacked"')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  it('blocks DELETE statements', () => {
    expect(() => validateReadOnlyQuery('DELETE FROM users WHERE id = 1')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  it('blocks REPLACE statements', () => {
    expect(() => validateReadOnlyQuery('REPLACE INTO users (id) VALUES (1)')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  // Blocked: DDL
  it('blocks CREATE TABLE', () => {
    expect(() => validateReadOnlyQuery('CREATE TABLE evil (id INT)')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  it('blocks ALTER TABLE', () => {
    expect(() => validateReadOnlyQuery('ALTER TABLE users ADD COLUMN evil TEXT')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  it('blocks DROP TABLE', () => {
    expect(() => validateReadOnlyQuery('DROP TABLE users')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  it('blocks TRUNCATE', () => {
    expect(() => validateReadOnlyQuery('TRUNCATE TABLE users')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  // Blocked: DCL
  it('blocks GRANT', () => {
    expect(() => validateReadOnlyQuery('GRANT ALL ON users TO hacker')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  it('blocks REVOKE', () => {
    expect(() => validateReadOnlyQuery('REVOKE SELECT ON users FROM app')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  // Blocked: Procedural
  it('blocks CALL', () => {
    expect(() => validateReadOnlyQuery('CALL dangerous_procedure()')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  it('blocks EXECUTE', () => {
    expect(() => validateReadOnlyQuery('EXECUTE some_prepared_stmt')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  // Blocked: Transaction control
  it('blocks BEGIN', () => {
    expect(() => validateReadOnlyQuery('BEGIN')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  it('blocks COMMIT', () => {
    expect(() => validateReadOnlyQuery('COMMIT')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  // Edge cases
  it('blocks empty string', () => {
    expect(() => validateReadOnlyQuery('')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  it('blocks whitespace-only string', () => {
    expect(() => validateReadOnlyQuery('   ')).toThrow(/READ-ONLY POLICY VIOLATION/);
  });

  it('includes the offending verb in the error message', () => {
    try {
      validateReadOnlyQuery('DELETE FROM users');
      expect.unreachable('should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('DELETE');
    }
  });
});
