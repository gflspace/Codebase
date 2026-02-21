-- Migration 042: intake_forms
-- QwickServices CIS — Public intake form submissions stored via POST /api/intake-form

BEGIN;

CREATE TABLE IF NOT EXISTS intake_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Contact fields
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  -- Service request
  service_category VARCHAR(100),
  service_description TEXT,
  preferred_date DATE,
  preferred_time VARCHAR(20),
  -- Tracking
  referral_source VARCHAR(100),  -- how_did_you_hear: google, referral, social, etc.
  ip_address INET,
  user_agent TEXT,
  -- Flexible overflow for custom fields
  metadata JSONB DEFAULT '{}',
  -- Status workflow
  status VARCHAR(30) NOT NULL DEFAULT 'new',  -- new, contacted, converted, archived
  notes TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('new', 'contacted', 'converted', 'archived'))
);

CREATE INDEX idx_intake_forms_email ON intake_forms(email);
CREATE INDEX idx_intake_forms_status ON intake_forms(status);
CREATE INDEX idx_intake_forms_created ON intake_forms(created_at DESC);
CREATE INDEX idx_intake_forms_service ON intake_forms(service_category);

-- Record migration
INSERT INTO schema_migrations (filename, applied_at)
VALUES ('042_intake_forms.sql', NOW());

COMMIT;
