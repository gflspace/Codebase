-- ============================================================
-- QwickServices CIS — Test Data Reset Script
-- Purpose: Remove all seeded test data without affecting real data
-- Safe: Only deletes records with known test UUIDs
-- ============================================================

BEGIN;

-- Case notes (depends on cases)
DELETE FROM case_notes WHERE id IN (
  'dddddddd-0001-0001-0001-000000000001',
  'dddddddd-0001-0001-0001-000000000002',
  'dddddddd-0001-0001-0001-000000000003',
  'dddddddd-0001-0001-0001-000000000004',
  'dddddddd-0001-0001-0001-000000000005',
  'dddddddd-0001-0001-0001-000000000006',
  'dddddddd-0001-0001-0001-000000000007'
);

-- Cases
DELETE FROM cases WHERE id IN (
  'cccccccc-0001-0001-0001-000000000001',
  'cccccccc-0001-0001-0001-000000000002',
  'cccccccc-0001-0001-0001-000000000003'
);

-- Alerts
DELETE FROM alerts WHERE id IN (
  'bbbbbbbb-0001-0001-0001-000000000001',
  'bbbbbbbb-0001-0001-0001-000000000002',
  'bbbbbbbb-0001-0001-0001-000000000003',
  'bbbbbbbb-0001-0001-0001-000000000004',
  'bbbbbbbb-0001-0001-0001-000000000005'
);

-- Audit logs (test entries only)
DELETE FROM audit_logs WHERE id LIKE '22222222-0001-0001-0001-%';

-- Risk signals (test entries only)
DELETE FROM risk_signals WHERE id LIKE '11111111-0001-0001-0001-%';

-- Messages (test entries only)
DELETE FROM messages WHERE id LIKE 'eeeeeeee-0001-0001-0001-%';

-- Unlink enforcement risk_score_ids (restore to NULL)
UPDATE enforcement_actions SET risk_score_id = NULL
WHERE id IN ('5e9068fd-bf07-44d6-87f8-153c61dedf98', '9763b34e-517b-4ff2-8a56-0fa4a2571068');

-- Test users (CASCADE will clean up any remaining FK references)
DELETE FROM users WHERE id IN (
  'aaaaaaaa-bbbb-cccc-dddd-000000000001',
  'aaaaaaaa-bbbb-cccc-dddd-000000000002',
  'aaaaaaaa-bbbb-cccc-dddd-000000000003'
);

COMMIT;

SELECT 'Test data reset complete' AS status;
