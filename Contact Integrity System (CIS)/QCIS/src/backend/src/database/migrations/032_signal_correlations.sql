-- Migration 032: Cross-Signal Correlation Table
-- Tracks correlations between different signal types (e.g., contact shared then booking cancelled).
-- Used by the correlation engine to detect off-platform transaction patterns.

CREATE TABLE IF NOT EXISTS signal_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_type VARCHAR(50) NOT NULL,
  -- e.g., 'contact_then_cancel', 'contact_then_discount', 'repeated_unpaid', 'contact_then_fake_complete'
  user_id UUID REFERENCES users(id),
  counterparty_id UUID REFERENCES users(id),
  primary_signal_id UUID REFERENCES risk_signals(id),
  secondary_signal_id UUID REFERENCES risk_signals(id),
  booking_id UUID REFERENCES bookings(id),
  confidence NUMERIC(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  time_delta_seconds INTEGER,
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correlations_user ON signal_correlations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_correlations_type ON signal_correlations (correlation_type);
CREATE INDEX IF NOT EXISTS idx_correlations_counterparty ON signal_correlations (counterparty_id);
CREATE INDEX IF NOT EXISTS idx_correlations_booking ON signal_correlations (booking_id);
