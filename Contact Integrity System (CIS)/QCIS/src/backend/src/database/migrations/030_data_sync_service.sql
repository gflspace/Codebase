-- Migration 030: Data Sync Service — Pull architecture for QwickServices
-- CIS reads from QwickServices' database (read-only) instead of receiving webhooks.
-- Tracks sync watermarks per source table and logs sync runs for observability.

-- ─── Sync Watermarks ─────────────────────────────────────────
-- Tracks the last-synced position per QwickServices source table.
-- Uses updated_at timestamp as the watermark cursor.

CREATE TABLE IF NOT EXISTS sync_watermarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table VARCHAR(100) NOT NULL UNIQUE,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01T00:00:00Z',
  last_synced_id VARCHAR(255),
  records_synced BIGINT DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  last_run_duration_ms INTEGER,
  last_error TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_watermarks_table ON sync_watermarks(source_table);

-- ─── Sync Run Log ────────────────────────────────────────────
-- Logs each sync cycle for observability and debugging.

CREATE TABLE IF NOT EXISTS sync_run_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table VARCHAR(100) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  records_found INTEGER DEFAULT 0,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  events_emitted INTEGER DEFAULT 0,
  error TEXT,
  watermark_before TIMESTAMPTZ,
  watermark_after TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_run_log_table ON sync_run_log(source_table, started_at DESC);
CREATE INDEX idx_sync_run_log_recent ON sync_run_log(started_at DESC);

-- ─── Seed default watermarks for QwickServices tables ────────

INSERT INTO sync_watermarks (source_table, enabled) VALUES
  ('users', true),
  ('bookings', true),
  ('payments', true),
  ('messages', true),
  ('ratings', true),
  ('disputes', true),
  ('providers', true)
ON CONFLICT (source_table) DO NOTHING;

-- ─── Updated at trigger ──────────────────────────────────────

CREATE TRIGGER trg_sync_watermarks_updated_at
    BEFORE UPDATE ON sync_watermarks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
