-- ============================================================================
-- MiKO Clinical Concierge System - Core Tables
-- Migration: 001_core_tables.sql
-- Description: Creates leads and clinical_interests tables
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Lead status state machine
CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted',
  'qualified',
  'booked',
  'completed',
  'no_show',
  'archived',
  'disqualified'
);

-- Lead source channels
CREATE TYPE lead_source AS ENUM (
  'website',
  'instagram',
  'facebook',
  'google_ads',
  'referral',
  'phone',
  'walk_in',
  'realself',
  'yelp',
  'other'
);

-- Procedure categories
CREATE TYPE procedure_category AS ENUM (
  'facial',
  'breast',
  'body',
  'non_surgical',
  'reconstruction',
  'revision',
  'other'
);

-- Risk levels
CREATE TYPE risk_level AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- ============================================================================
-- LEADS TABLE
-- Primary table for patient lead management
-- ============================================================================

CREATE TABLE leads (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Contact information
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,

  -- Lead management
  status lead_status NOT NULL DEFAULT 'new',
  source lead_source NOT NULL DEFAULT 'website',
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),

  -- Risk assessment
  risk_level risk_level DEFAULT 'low',
  risk_flags TEXT[] DEFAULT '{}',
  requires_clinical_review BOOLEAN DEFAULT FALSE,
  clinical_review_completed_at TIMESTAMPTZ,
  clinical_reviewer_id UUID REFERENCES auth.users(id),

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,

  -- Source tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer_url TEXT,
  landing_page TEXT,

  -- Additional data
  notes TEXT,
  internal_notes TEXT, -- Staff-only notes
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_contacted_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$'),
  CONSTRAINT has_contact_method CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- ============================================================================
-- CLINICAL_INTERESTS TABLE
-- Tracks procedure interests for each lead
-- ============================================================================

CREATE TABLE clinical_interests (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign key to leads
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Procedure information
  procedure_category procedure_category NOT NULL,
  specific_procedure TEXT NOT NULL,

  -- Interest details
  interest_level INTEGER DEFAULT 5 CHECK (interest_level >= 1 AND interest_level <= 10),
  timeline TEXT, -- e.g., 'within_1_month', '1_3_months', '3_6_months', 'exploring'
  budget_range TEXT, -- e.g., 'under_5k', '5k_10k', '10k_20k', 'over_20k', 'unknown'

  -- Medical history flags
  is_revision BOOLEAN DEFAULT FALSE,
  has_prior_surgery BOOLEAN DEFAULT FALSE,
  prior_surgery_details TEXT,

  -- AI qualification
  ai_qualified BOOLEAN,
  ai_qualification_score DECIMAL(5,2),
  ai_qualification_notes TEXT,

  -- Staff qualification
  staff_qualified BOOLEAN,
  staff_qualification_notes TEXT,
  qualified_by UUID REFERENCES auth.users(id),
  qualified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate interests for same lead/procedure
  UNIQUE(lead_id, specific_procedure)
);

-- ============================================================================
-- INDEXES FOR CORE TABLES
-- ============================================================================

-- Leads indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_phone ON leads(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_leads_risk_level ON leads(risk_level) WHERE risk_level IN ('high', 'critical');
CREATE INDEX idx_leads_requires_review ON leads(requires_clinical_review) WHERE requires_clinical_review = TRUE;
CREATE INDEX idx_leads_last_activity ON leads(last_activity_at DESC);

-- Clinical interests indexes
CREATE INDEX idx_clinical_interests_lead_id ON clinical_interests(lead_id);
CREATE INDEX idx_clinical_interests_category ON clinical_interests(procedure_category);
CREATE INDEX idx_clinical_interests_procedure ON clinical_interests(specific_procedure);
CREATE INDEX idx_clinical_interests_revision ON clinical_interests(is_revision) WHERE is_revision = TRUE;

-- ============================================================================
-- TRIGGERS FOR CORE TABLES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update last_activity_at on leads
CREATE OR REPLACE FUNCTION update_lead_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads
  SET last_activity_at = NOW()
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for leads updated_at
CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for clinical_interests updated_at
CREATE TRIGGER trigger_clinical_interests_updated_at
  BEFORE UPDATE ON clinical_interests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update lead activity when clinical interest is added/updated
CREATE TRIGGER trigger_clinical_interests_lead_activity
  AFTER INSERT OR UPDATE ON clinical_interests
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_last_activity();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE leads IS 'Primary table for patient lead management in MiKO system';
COMMENT ON TABLE clinical_interests IS 'Tracks procedure interests and qualification status for each lead';
COMMENT ON COLUMN leads.lead_score IS 'AI-calculated lead quality score from 0-100';
COMMENT ON COLUMN leads.risk_flags IS 'Array of detected risk keywords requiring review';
COMMENT ON COLUMN leads.internal_notes IS 'Staff-only notes not visible to patients';
COMMENT ON COLUMN clinical_interests.ai_qualification_score IS 'AI confidence score for qualification (0.00-100.00)';
