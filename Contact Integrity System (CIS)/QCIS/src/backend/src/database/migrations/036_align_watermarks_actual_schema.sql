-- Migration 036: Align sync watermarks with actual QwickServices schema
-- Verified against live QwickServices MySQL database (2026-02-16).
-- Renames watermarks to match real table names, adds new tables.

-- ─── Fix transactions → payments (revert 035 rename) ─────────
-- Actual QwickServices table is `payments`, not `transactions`.
UPDATE sync_watermarks SET source_table = 'payments'
WHERE source_table = 'transactions';

-- ─── Rename messages → notifications ─────────────────────────
-- QwickServices uses Laravel's notifications table, not a messages table.
UPDATE sync_watermarks SET source_table = 'notifications'
WHERE source_table = 'messages';

-- ─── Rename disputes → suspicious_activities ─────────────────
-- QwickServices tracks disputes as suspicious_activities.
UPDATE sync_watermarks SET source_table = 'suspicious_activities'
WHERE source_table = 'disputes';

-- ─── Remove providers watermark ──────────────────────────────
-- No separate providers table; providers are users with user_type filter.
DELETE FROM sync_watermarks WHERE source_table = 'providers';

-- ─── Add new table watermarks ────────────────────────────────

INSERT INTO sync_watermarks (source_table, enabled) VALUES
  ('booking_activities', true),
  ('wallet_histories', true),
  ('login_activities', true)
ON CONFLICT (source_table) DO NOTHING;
