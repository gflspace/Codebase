-- ============================================================
-- QwickServices CIS — Test Data Seed Script
-- Purpose: Populate all dashboard modules for E2E UI validation
-- Idempotent: Uses ON CONFLICT DO NOTHING with fixed UUIDs
-- Label: All records tagged with test_data = true in metadata
-- ============================================================

BEGIN;

-- ============================================================
-- REFERENCE: Existing entity IDs (do not re-create)
-- ============================================================
-- user_low_1  = d68ec8ce-20c1-4400-b6eb-4c19884ac48d (E2E Test Sender, score 31.80)
-- user_low_2  = 55cc0cb7-aee7-4b07-a38e-c7d46ddd2a0d (Test Sender, score 34.80)
-- receiver    = 6e385513-d91f-4141-b678-d9648cd82030 (Test Receiver)
-- admin_ts    = 9d6bbf59-be57-43c2-8705-7e6eeaf7b396 (admin@qwickservices.com)
-- enf_low_1   = 5e9068fd-bf07-44d6-87f8-153c61dedf98 (user_low_1 soft_warning)
-- enf_low_2   = 9763b34e-517b-4ff2-8a56-0fa4a2571068 (user_low_2 soft_warning)
-- score_low_1 = a8512107-1cea-4ec2-97bf-8099b78e899a (user_low_1 31.80)
-- score_low_2 = a39355a6-6900-4116-9beb-74c1c507f082 (user_low_2 34.80)

-- ============================================================
-- 1. USERS — 3 new synthetic users
-- ============================================================

-- user_med_1: escalation candidate, mid-tenure
INSERT INTO users (id, external_id, display_name, email, verification_status, trust_score, status, metadata)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-000000000001',
  'TEST_user_med_1',
  'Maria Chen',
  'maria.chen@testdata.cis',
  'verified',
  55.00,
  'active',
  '{"test_data": true, "label": "user_med_1", "tenure": "mid", "notes": "escalation candidate"}'
) ON CONFLICT (id) DO NOTHING;

-- user_high_1: enforcement history, old tenure
INSERT INTO users (id, external_id, display_name, email, verification_status, trust_score, status, metadata)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-000000000002',
  'TEST_user_high_1',
  'James Rodriguez',
  'james.rodriguez@testdata.cis',
  'verified',
  78.00,
  'active',
  '{"test_data": true, "label": "user_high_1", "tenure": "old", "notes": "enforcement history"}'
) ON CONFLICT (id) DO NOTHING;

-- user_sys: system actor
INSERT INTO users (id, external_id, display_name, email, verification_status, trust_score, status, metadata)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-000000000003',
  'TEST_user_sys',
  'CIS System',
  'system@internal.cis',
  'verified',
  50.00,
  'active',
  '{"test_data": true, "label": "user_sys", "system_actor": true}'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. MESSAGES — Synthetic conversations (case investigation context)
-- ============================================================

-- Conversation 1: user_low_1 → Test Receiver (case_001 context)
INSERT INTO messages (id, sender_id, receiver_id, conversation_id, content, content_hash, metadata, created_at) VALUES
(
  'eeeeeeee-0001-0001-0001-000000000001',
  'd68ec8ce-20c1-4400-b6eb-4c19884ac48d',
  '6e385513-d91f-4141-b678-d9648cd82030',
  'ffffffff-0001-0001-0001-000000000001',
  'Hey, you can reach me at 555-867-5309 instead of using this app',
  'a1b2c3d4e5f6',
  '{"test_data": true, "detected_entities": ["phone_number"]}',
  NOW() - INTERVAL '4 hours'
),
(
  'eeeeeeee-0001-0001-0001-000000000002',
  'd68ec8ce-20c1-4400-b6eb-4c19884ac48d',
  '6e385513-d91f-4141-b678-d9648cd82030',
  'ffffffff-0001-0001-0001-000000000001',
  'Or email me at john.doe@gmail.com, its easier to coordinate there',
  'b2c3d4e5f6a7',
  '{"test_data": true, "detected_entities": ["email_address"]}',
  NOW() - INTERVAL '3 hours 50 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Conversation 2: user_med_1 → Test Receiver (case_002 context)
INSERT INTO messages (id, sender_id, receiver_id, conversation_id, content, content_hash, metadata, created_at) VALUES
(
  'eeeeeeee-0001-0001-0001-000000000003',
  'aaaaaaaa-bbbb-cccc-dddd-000000000001',
  '6e385513-d91f-4141-b678-d9648cd82030',
  'ffffffff-0001-0001-0001-000000000002',
  'Lets take this conversation off the platform. Message me on WhatsApp at +1-555-0199',
  'c3d4e5f6a7b8',
  '{"test_data": true, "detected_entities": ["messaging_app", "phone_number"]}',
  NOW() - INTERVAL '2 hours'
),
(
  'eeeeeeee-0001-0001-0001-000000000004',
  'aaaaaaaa-bbbb-cccc-dddd-000000000001',
  '6e385513-d91f-4141-b678-d9648cd82030',
  'ffffffff-0001-0001-0001-000000000002',
  'I can accept payment through Venmo @maria-chen99 to avoid the service fee',
  'd4e5f6a7b8c9',
  '{"test_data": true, "detected_entities": ["payment_external", "venmo_handle"]}',
  NOW() - INTERVAL '1 hour 50 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Conversation 3: user_high_1 → Test Receiver (case_003 context)
INSERT INTO messages (id, sender_id, receiver_id, conversation_id, content, content_hash, metadata, created_at) VALUES
(
  'eeeeeeee-0001-0001-0001-000000000005',
  'aaaaaaaa-bbbb-cccc-dddd-000000000002',
  '6e385513-d91f-4141-b678-d9648cd82030',
  'ffffffff-0001-0001-0001-000000000003',
  'Send the payment to my CashApp $jrodz99 — its faster and no platform cut',
  'e5f6a7b8c9d0',
  '{"test_data": true, "detected_entities": ["payment_external", "cashapp_handle"]}',
  NOW() - INTERVAL '6 hours'
),
(
  'eeeeeeee-0001-0001-0001-000000000006',
  'aaaaaaaa-bbbb-cccc-dddd-000000000002',
  '6e385513-d91f-4141-b678-d9648cd82030',
  'ffffffff-0001-0001-0001-000000000003',
  'I made another account after they flagged my first one. Dont worry about it',
  'f6a7b8c9d0e1',
  '{"test_data": true, "detected_entities": ["ban_evasion_intent"]}',
  NOW() - INTERVAL '5 hours 30 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. RISK SIGNALS — For new users (alerts reference these)
-- ============================================================

-- Signals for user_med_1 (3 signals for alert_003)
INSERT INTO risk_signals (id, source_event_id, user_id, signal_type, confidence, evidence, pattern_flags, created_at) VALUES
(
  '11111111-0001-0001-0001-000000000001',
  'eeeeeeee-0001-0001-0001-000000000003',
  'aaaaaaaa-bbbb-cccc-dddd-000000000001',
  'CONTACT_MESSAGING_APP',
  0.850,
  '{"matched_text": "WhatsApp", "context": "off-platform messaging redirect", "message_id": "eeeeeeee-0001-0001-0001-000000000003"}',
  ARRAY['ESCALATION_PATTERN'],
  NOW() - INTERVAL '1 hour 55 minutes'
),
(
  '11111111-0001-0001-0001-000000000002',
  'eeeeeeee-0001-0001-0001-000000000004',
  'aaaaaaaa-bbbb-cccc-dddd-000000000001',
  'PAYMENT_EXTERNAL',
  0.780,
  '{"matched_text": "Venmo @maria-chen99", "context": "external payment redirect with handle", "message_id": "eeeeeeee-0001-0001-0001-000000000004"}',
  ARRAY['TX_REDIRECT'],
  NOW() - INTERVAL '1 hour 45 minutes'
),
(
  '11111111-0001-0001-0001-000000000003',
  'eeeeeeee-0001-0001-0001-000000000003',
  'aaaaaaaa-bbbb-cccc-dddd-000000000001',
  'OFF_PLATFORM_INTENT',
  0.820,
  '{"matched_text": "off the platform", "intent": "platform_bypass", "message_id": "eeeeeeee-0001-0001-0001-000000000003"}',
  ARRAY['ESCALATION_PATTERN'],
  NOW() - INTERVAL '1 hour 55 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Signals for user_high_1 (3 signals for alert_004/005)
INSERT INTO risk_signals (id, source_event_id, user_id, signal_type, confidence, evidence, pattern_flags, created_at) VALUES
(
  '11111111-0001-0001-0001-000000000004',
  'eeeeeeee-0001-0001-0001-000000000005',
  'aaaaaaaa-bbbb-cccc-dddd-000000000002',
  'PAYMENT_EXTERNAL',
  0.920,
  '{"matched_text": "CashApp $jrodz99", "context": "direct payment redirect with handle and fee evasion", "message_id": "eeeeeeee-0001-0001-0001-000000000005"}',
  ARRAY['TX_REDIRECT', 'ESCALATION_PATTERN'],
  NOW() - INTERVAL '5 hours 55 minutes'
),
(
  '11111111-0001-0001-0001-000000000005',
  'eeeeeeee-0001-0001-0001-000000000005',
  'aaaaaaaa-bbbb-cccc-dddd-000000000002',
  'TX_REDIRECT_ATTEMPT',
  0.880,
  '{"matched_text": "no platform cut", "context": "fee evasion intent", "message_id": "eeeeeeee-0001-0001-0001-000000000005"}',
  ARRAY['TX_REDIRECT'],
  NOW() - INTERVAL '5 hours 55 minutes'
),
(
  '11111111-0001-0001-0001-000000000006',
  'eeeeeeee-0001-0001-0001-000000000006',
  'aaaaaaaa-bbbb-cccc-dddd-000000000002',
  'GROOMING_LANGUAGE',
  0.750,
  '{"matched_text": "made another account", "context": "ban evasion admission", "message_id": "eeeeeeee-0001-0001-0001-000000000006"}',
  ARRAY['ESCALATION_PATTERN'],
  NOW() - INTERVAL '5 hours 25 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. ALERTS — 5 alerts across all statuses
-- ============================================================

-- alert_001: OPEN, low priority, unassigned (user_low_1)
INSERT INTO alerts (id, user_id, priority, status, title, description, assigned_to, risk_signal_ids, auto_generated, metadata, created_at) VALUES
(
  'bbbbbbbb-0001-0001-0001-000000000001',
  'd68ec8ce-20c1-4400-b6eb-4c19884ac48d',
  'low',
  'open',
  'Off-platform contact sharing detected',
  'User shared personal phone number and email address in conversation, suggesting intent to bypass platform communication channels. Detection confidence: 0.745 (phone), 0.545 (email).',
  NULL,
  ARRAY[
    '261d5699-85d0-4fee-9745-d0be364c5da8',
    'cdf3dd08-8598-4b9d-93ae-c927c9515cbb'
  ]::UUID[],
  true,
  '{"test_data": true, "correlation_id": "corr-test-001", "trigger": "detection_pipeline"}',
  NOW() - INTERVAL '3 hours 45 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- alert_002: ASSIGNED, low priority (user_low_2)
INSERT INTO alerts (id, user_id, priority, status, title, description, assigned_to, risk_signal_ids, auto_generated, metadata, created_at) VALUES
(
  'bbbbbbbb-0001-0001-0001-000000000002',
  '55cc0cb7-aee7-4b07-a38e-c7d46ddd2a0d',
  'low',
  'assigned',
  'Multiple off-platform payment references detected',
  'User referenced external payment methods (Venmo, PayPal) and shared off-platform intent across multiple messages. Pattern suggests systematic platform bypass.',
  '9d6bbf59-be57-43c2-8705-7e6eeaf7b396',
  ARRAY[
    '51ddb648-3918-4b70-ac22-188807582d72',
    '8b3c3baf-b23f-4aa5-9842-4a3d88faf780',
    'be24e476-aaa4-4c2e-9805-28c06ab6dcc3'
  ]::UUID[],
  true,
  '{"test_data": true, "correlation_id": "corr-test-002", "trigger": "detection_pipeline"}',
  NOW() - INTERVAL '3 hours 30 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- alert_003: IN_PROGRESS, medium priority (user_med_1)
INSERT INTO alerts (id, user_id, priority, status, title, description, assigned_to, risk_signal_ids, auto_generated, metadata, created_at) VALUES
(
  'bbbbbbbb-0001-0001-0001-000000000003',
  'aaaaaaaa-bbbb-cccc-dddd-000000000001',
  'medium',
  'in_progress',
  'Escalation pattern: messaging app redirect + external payment',
  'User attempted to redirect communication to WhatsApp and payment to Venmo in the same conversation thread. Combined confidence exceeds escalation threshold. Active investigation required.',
  '9d6bbf59-be57-43c2-8705-7e6eeaf7b396',
  ARRAY[
    '11111111-0001-0001-0001-000000000001',
    '11111111-0001-0001-0001-000000000002',
    '11111111-0001-0001-0001-000000000003'
  ]::UUID[],
  true,
  '{"test_data": true, "correlation_id": "corr-test-003", "trigger": "detection_pipeline", "escalation": true}',
  NOW() - INTERVAL '1 hour 40 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- alert_004: RESOLVED, high priority (user_high_1)
INSERT INTO alerts (id, user_id, priority, status, title, description, assigned_to, risk_signal_ids, auto_generated, metadata, created_at) VALUES
(
  'bbbbbbbb-0001-0001-0001-000000000004',
  'aaaaaaaa-bbbb-cccc-dddd-000000000002',
  'high',
  'resolved',
  'High-confidence payment redirect with fee evasion intent',
  'User directed counterparty to CashApp with explicit fee evasion language. TX_REDIRECT confidence 0.920. Combined with ban evasion admission, this warrants enforcement action. Resolved after soft_warning issued.',
  '9d6bbf59-be57-43c2-8705-7e6eeaf7b396',
  ARRAY[
    '11111111-0001-0001-0001-000000000004',
    '11111111-0001-0001-0001-000000000005'
  ]::UUID[],
  true,
  '{"test_data": true, "correlation_id": "corr-test-004", "trigger": "detection_pipeline", "resolution": "enforcement_issued"}',
  NOW() - INTERVAL '5 hours 50 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- alert_005: DISMISSED, low priority (user_high_1)
INSERT INTO alerts (id, user_id, priority, status, title, description, assigned_to, risk_signal_ids, auto_generated, metadata, created_at) VALUES
(
  'bbbbbbbb-0001-0001-0001-000000000005',
  'aaaaaaaa-bbbb-cccc-dddd-000000000002',
  'low',
  'dismissed',
  'Ban evasion language detected (low confidence)',
  'Grooming language signal flagged potential ban evasion. Upon review, context was ambiguous and did not meet enforcement threshold. Dismissed by admin.',
  '9d6bbf59-be57-43c2-8705-7e6eeaf7b396',
  ARRAY[
    '11111111-0001-0001-0001-000000000006'
  ]::UUID[],
  true,
  '{"test_data": true, "correlation_id": "corr-test-005", "trigger": "detection_pipeline", "dismissal_reason": "insufficient_evidence"}',
  NOW() - INTERVAL '5 hours 20 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. CASES — 3 cases linked to alerts
-- ============================================================

-- case_001: OPEN, linked to alert_001 (user_low_1)
INSERT INTO cases (id, user_id, status, title, description, assigned_to, alert_ids, metadata, created_at) VALUES
(
  'cccccccc-0001-0001-0001-000000000001',
  'd68ec8ce-20c1-4400-b6eb-4c19884ac48d',
  'open',
  'Contact sharing investigation — E2E Test Sender',
  'User shared personal contact information (phone, email) in conversation. Low-risk behavior but warrants monitoring. Linked to active soft_warning enforcement.',
  '9d6bbf59-be57-43c2-8705-7e6eeaf7b396',
  ARRAY['bbbbbbbb-0001-0001-0001-000000000001']::UUID[],
  '{"test_data": true, "risk_tier": "low", "enforcement_id": "5e9068fd-bf07-44d6-87f8-153c61dedf98"}',
  NOW() - INTERVAL '3 hours 40 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- case_002: INVESTIGATING (active), linked to alert_003 (user_med_1)
INSERT INTO cases (id, user_id, status, title, description, assigned_to, alert_ids, metadata, created_at) VALUES
(
  'cccccccc-0001-0001-0001-000000000002',
  'aaaaaaaa-bbbb-cccc-dddd-000000000001',
  'investigating',
  'Escalation pattern — Maria Chen (WhatsApp + Venmo redirect)',
  'Active investigation into coordinated off-platform redirect. User directed counterparty to WhatsApp for communication and Venmo for payment in the same conversation. Escalation pattern confirmed by detection pipeline.',
  '9d6bbf59-be57-43c2-8705-7e6eeaf7b396',
  ARRAY['bbbbbbbb-0001-0001-0001-000000000003']::UUID[],
  '{"test_data": true, "risk_tier": "medium", "escalation": true}',
  NOW() - INTERVAL '1 hour 35 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- case_003: CLOSED, linked to alert_004 (user_high_1)
INSERT INTO cases (id, user_id, status, title, description, assigned_to, alert_ids, metadata, created_at) VALUES
(
  'cccccccc-0001-0001-0001-000000000003',
  'aaaaaaaa-bbbb-cccc-dddd-000000000002',
  'closed',
  'Fee evasion + ban evasion — James Rodriguez',
  'Closed after enforcement action. User explicitly directed payment to CashApp to avoid platform fees, and admitted to creating a second account after previous restriction. Soft warning issued (shadow mode). Ban evasion alert dismissed due to insufficient evidence for escalation.',
  '9d6bbf59-be57-43c2-8705-7e6eeaf7b396',
  ARRAY['bbbbbbbb-0001-0001-0001-000000000004', 'bbbbbbbb-0001-0001-0001-000000000005']::UUID[],
  '{"test_data": true, "risk_tier": "high", "resolution": "enforcement_issued", "closed_reason": "action_taken"}',
  NOW() - INTERVAL '5 hours'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. CASE NOTES — Investigation timeline entries
-- ============================================================

-- Notes for case_001
INSERT INTO case_notes (id, case_id, author, content, created_at) VALUES
(
  'dddddddd-0001-0001-0001-000000000001',
  'cccccccc-0001-0001-0001-000000000001',
  'admin@qwickservices.com',
  'Opened case from alert. User shared phone (555-867-5309) and email (john.doe@gmail.com) in messages to Test Receiver. Low risk — first offense, soft_warning already active.',
  NOW() - INTERVAL '3 hours 38 minutes'
),
(
  'dddddddd-0001-0001-0001-000000000002',
  'cccccccc-0001-0001-0001-000000000001',
  'admin@qwickservices.com',
  'Reviewed conversation history. Contact sharing appears to be isolated incident. Monitoring for repeat behavior before escalation.',
  NOW() - INTERVAL '2 hours'
)
ON CONFLICT (id) DO NOTHING;

-- Notes for case_002
INSERT INTO case_notes (id, case_id, author, content, created_at) VALUES
(
  'dddddddd-0001-0001-0001-000000000003',
  'cccccccc-0001-0001-0001-000000000002',
  'admin@qwickservices.com',
  'Escalation pattern detected: WhatsApp redirect + Venmo payment in same thread. User Maria Chen is mid-tenure verified account. Investigating whether this is a one-time redirect or systematic pattern.',
  NOW() - INTERVAL '1 hour 30 minutes'
),
(
  'dddddddd-0001-0001-0001-000000000004',
  'cccccccc-0001-0001-0001-000000000002',
  'admin@qwickservices.com',
  'Checked transaction history — no prior payment redirects. This appears to be first escalation. Recommending soft_warning before hard action. Will monitor next 72 hours.',
  NOW() - INTERVAL '45 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Notes for case_003
INSERT INTO case_notes (id, case_id, author, content, created_at) VALUES
(
  'dddddddd-0001-0001-0001-000000000005',
  'cccccccc-0001-0001-0001-000000000003',
  'admin@qwickservices.com',
  'High-confidence payment redirect detected. User James Rodriguez directed payment to CashApp $jrodz99 with explicit fee evasion language ("no platform cut"). TX_REDIRECT confidence 0.920.',
  NOW() - INTERVAL '5 hours 45 minutes'
),
(
  'dddddddd-0001-0001-0001-000000000006',
  'cccccccc-0001-0001-0001-000000000003',
  'admin@qwickservices.com',
  'User also admitted to creating a second account after previous flagging. Ban evasion signal (GROOMING_LANGUAGE, 0.750) triggered but deemed insufficient for escalation beyond soft_warning at this time.',
  NOW() - INTERVAL '5 hours 30 minutes'
),
(
  'dddddddd-0001-0001-0001-000000000007',
  'cccccccc-0001-0001-0001-000000000003',
  'admin@qwickservices.com',
  'Soft warning issued via enforcement pipeline (shadow mode). Case closed. Will reopen if pattern continues or if user creates additional accounts.',
  NOW() - INTERVAL '4 hours 45 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. ENFORCEMENT ACTIONS — Link existing to risk_scores
-- ============================================================

-- Update existing enforcement actions to link risk_score_id (if not already set)
UPDATE enforcement_actions
SET risk_score_id = 'a8512107-1cea-4ec2-97bf-8099b78e899a'
WHERE id = '5e9068fd-bf07-44d6-87f8-153c61dedf98'
  AND risk_score_id IS NULL;

UPDATE enforcement_actions
SET risk_score_id = 'a39355a6-6900-4116-9beb-74c1c507f082'
WHERE id = '9763b34e-517b-4ff2-8a56-0fa4a2571068'
  AND risk_score_id IS NULL;

-- ============================================================
-- 8. AUDIT LOGS — Additional system-generated events
-- ============================================================

-- Alert creation audit logs
INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details, timestamp) VALUES
(
  '22222222-0001-0001-0001-000000000001',
  'system',
  'detection_pipeline',
  'alert.created',
  'alert',
  'bbbbbbbb-0001-0001-0001-000000000001',
  '{"test_data": true, "user_id": "d68ec8ce-20c1-4400-b6eb-4c19884ac48d", "priority": "low", "signal_count": 2, "trigger": "off_platform_contact"}',
  NOW() - INTERVAL '3 hours 45 minutes'
),
(
  '22222222-0001-0001-0001-000000000002',
  'system',
  'detection_pipeline',
  'alert.created',
  'alert',
  'bbbbbbbb-0001-0001-0001-000000000003',
  '{"test_data": true, "user_id": "aaaaaaaa-bbbb-cccc-dddd-000000000001", "priority": "medium", "signal_count": 3, "trigger": "escalation_pattern"}',
  NOW() - INTERVAL '1 hour 40 minutes'
),
(
  '22222222-0001-0001-0001-000000000003',
  'system',
  'detection_pipeline',
  'alert.created',
  'alert',
  'bbbbbbbb-0001-0001-0001-000000000004',
  '{"test_data": true, "user_id": "aaaaaaaa-bbbb-cccc-dddd-000000000002", "priority": "high", "signal_count": 2, "trigger": "payment_redirect_high_confidence"}',
  NOW() - INTERVAL '5 hours 50 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Case lifecycle audit logs
INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details, timestamp) VALUES
(
  '22222222-0001-0001-0001-000000000004',
  'admin@qwickservices.com',
  'admin',
  'case.created',
  'case',
  'cccccccc-0001-0001-0001-000000000001',
  '{"test_data": true, "user_id": "d68ec8ce-20c1-4400-b6eb-4c19884ac48d", "linked_alerts": 1}',
  NOW() - INTERVAL '3 hours 40 minutes'
),
(
  '22222222-0001-0001-0001-000000000005',
  'admin@qwickservices.com',
  'admin',
  'case.created',
  'case',
  'cccccccc-0001-0001-0001-000000000002',
  '{"test_data": true, "user_id": "aaaaaaaa-bbbb-cccc-dddd-000000000001", "linked_alerts": 1, "escalation": true}',
  NOW() - INTERVAL '1 hour 35 minutes'
),
(
  '22222222-0001-0001-0001-000000000006',
  'admin@qwickservices.com',
  'admin',
  'case.closed',
  'case',
  'cccccccc-0001-0001-0001-000000000003',
  '{"test_data": true, "user_id": "aaaaaaaa-bbbb-cccc-dddd-000000000002", "linked_alerts": 2, "resolution": "enforcement_issued"}',
  NOW() - INTERVAL '4 hours 45 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Alert status change audit logs
INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details, timestamp) VALUES
(
  '22222222-0001-0001-0001-000000000007',
  'admin@qwickservices.com',
  'admin',
  'alert.assigned',
  'alert',
  'bbbbbbbb-0001-0001-0001-000000000002',
  '{"test_data": true, "previous_status": "open", "new_status": "assigned", "assigned_to": "admin@qwickservices.com"}',
  NOW() - INTERVAL '3 hours 25 minutes'
),
(
  '22222222-0001-0001-0001-000000000008',
  'admin@qwickservices.com',
  'admin',
  'alert.status_changed',
  'alert',
  'bbbbbbbb-0001-0001-0001-000000000003',
  '{"test_data": true, "previous_status": "assigned", "new_status": "in_progress"}',
  NOW() - INTERVAL '1 hour 30 minutes'
),
(
  '22222222-0001-0001-0001-000000000009',
  'admin@qwickservices.com',
  'admin',
  'alert.resolved',
  'alert',
  'bbbbbbbb-0001-0001-0001-000000000004',
  '{"test_data": true, "previous_status": "in_progress", "new_status": "resolved", "resolution": "enforcement_issued"}',
  NOW() - INTERVAL '5 hours'
),
(
  '22222222-0001-0001-0001-000000000010',
  'admin@qwickservices.com',
  'admin',
  'alert.dismissed',
  'alert',
  'bbbbbbbb-0001-0001-0001-000000000005',
  '{"test_data": true, "previous_status": "open", "new_status": "dismissed", "reason": "insufficient_evidence"}',
  NOW() - INTERVAL '5 hours 15 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Enforcement shadow mode audit logs
INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details, timestamp) VALUES
(
  '22222222-0001-0001-0001-000000000011',
  'system',
  'enforcement_engine',
  'enforcement.shadow.soft_warning',
  'user',
  'd68ec8ce-20c1-4400-b6eb-4c19884ac48d',
  '{"test_data": true, "action_id": "5e9068fd-bf07-44d6-87f8-153c61dedf98", "reason_code": "LOW_RISK_FIRST_OFFENSE", "shadow_mode": true, "automated": true}',
  NOW() - INTERVAL '3 hours 30 minutes'
),
(
  '22222222-0001-0001-0001-000000000012',
  'system',
  'enforcement_engine',
  'enforcement.shadow.soft_warning',
  'user',
  '55cc0cb7-aee7-4b07-a38e-c7d46ddd2a0d',
  '{"test_data": true, "action_id": "9763b34e-517b-4ff2-8a56-0fa4a2571068", "reason_code": "LOW_RISK_FIRST_OFFENSE", "shadow_mode": true, "automated": true}',
  NOW() - INTERVAL '3 hours 15 minutes'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Count all seeded entities
SELECT 'users' AS entity, count(*) FROM users
UNION ALL SELECT 'messages', count(*) FROM messages
UNION ALL SELECT 'risk_signals', count(*) FROM risk_signals
UNION ALL SELECT 'risk_scores', count(*) FROM risk_scores
UNION ALL SELECT 'enforcement_actions', count(*) FROM enforcement_actions
UNION ALL SELECT 'alerts', count(*) FROM alerts
UNION ALL SELECT 'cases', count(*) FROM cases
UNION ALL SELECT 'case_notes', count(*) FROM case_notes
UNION ALL SELECT 'appeals', count(*) FROM appeals
UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs
ORDER BY entity;
