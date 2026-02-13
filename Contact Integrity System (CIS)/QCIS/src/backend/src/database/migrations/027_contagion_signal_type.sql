-- Migration 027: Contagion Signal Type
-- QwickServices CIS — Adds NETWORK_CONTAGION signal type for contagion analysis consumer

ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'NETWORK_CONTAGION';
