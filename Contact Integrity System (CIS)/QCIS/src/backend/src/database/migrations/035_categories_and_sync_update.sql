-- Migration 035: Categories table + sync watermark updates for MySQL driver alignment
-- Adds categories entity, seeds its watermark, renames payments→transactions watermark.

-- ─── Categories Table ───────────────────────────────────────
-- Mirrors QwickServices categories for service classification in CIS.

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_external_id ON categories(external_id);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_status ON categories(status);

-- ─── Updated-at trigger ─────────────────────────────────────

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── Seed categories watermark ──────────────────────────────

INSERT INTO sync_watermarks (source_table, enabled) VALUES
  ('categories', true)
ON CONFLICT (source_table) DO NOTHING;

-- ─── Rename payments → transactions watermark ───────────────
-- Preserves existing sync progress when switching to blueprint table name.

UPDATE sync_watermarks
SET source_table = 'transactions'
WHERE source_table = 'payments';
