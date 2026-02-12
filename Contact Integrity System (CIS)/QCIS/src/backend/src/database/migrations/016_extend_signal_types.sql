-- Migration 016: Extend signal_type enum with booking, wallet, provider, and rating signals
-- QwickServices CIS — New risk signal types for Phase 2A data sources
--
-- Note: signal_type is a Postgres ENUM (created in migration 004).
-- ADD VALUE IF NOT EXISTS is safe for idempotent re-runs.
-- Each ADD VALUE must run outside a transaction in some PG versions,
-- but within a single migration file this is typically fine.

ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'BOOKING_CANCEL_PATTERN';
ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'BOOKING_NO_SHOW_PATTERN';
ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'WALLET_VELOCITY_SPIKE';
ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'WALLET_SPLIT_PATTERN';
ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'PROVIDER_RATING_DROP';
ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'PROVIDER_COMPLAINT_CLUSTER';
