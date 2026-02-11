-- ============================================================
-- CIS Synthetic Data Seed — Migration 012
-- Realistic test data for development environment
-- Covers: normal, edge-case, and high-risk scenarios
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────
-- 1. USERS — Customers (33) + Providers (12)
-- ────────────────────────────────────────────────────────

-- ── Normal Customers (15) ──
INSERT INTO users (id, external_id, display_name, email, phone, verification_status, trust_score, status, user_type, service_category, metadata, created_at) VALUES
('c1000001-0000-4000-a000-000000000001', 'ext-c-001', 'Sarah Mitchell',    'sarah.mitchell@email.com',    '555-201-0001', 'verified',   8.50,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '30 days'),
('c1000001-0000-4000-a000-000000000002', 'ext-c-002', 'James Park',        'james.park@email.com',        '555-201-0002', 'verified',  12.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '29 days'),
('c1000001-0000-4000-a000-000000000003', 'ext-c-003', 'Maria Rodriguez',   'maria.rodriguez@email.com',   '555-201-0003', 'verified',   5.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '28 days'),
('c1000001-0000-4000-a000-000000000004', 'ext-c-004', 'David Chen',        'david.chen@email.com',        '555-201-0004', 'verified',  10.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '28 days'),
('c1000001-0000-4000-a000-000000000005', 'ext-c-005', 'Emily Watson',      'emily.watson@email.com',      '555-201-0005', 'pending',   15.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '27 days'),
('c1000001-0000-4000-a000-000000000006', 'ext-c-006', 'Robert Kim',        'robert.kim@email.com',        '555-201-0006', 'verified',   3.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '26 days'),
('c1000001-0000-4000-a000-000000000007', 'ext-c-007', 'Lisa Patel',        'lisa.patel@email.com',        '555-201-0007', 'verified',   7.50,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '25 days'),
('c1000001-0000-4000-a000-000000000008', 'ext-c-008', 'Michael Brown',     'michael.brown@email.com',     '555-201-0008', 'verified',  11.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '24 days'),
('c1000001-0000-4000-a000-000000000009', 'ext-c-009', 'Jennifer Lopez',    'jennifer.lop@email.com',      '555-201-0009', 'verified',   6.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '23 days'),
('c1000001-0000-4000-a000-000000000010', 'ext-c-010', 'William Davis',     'william.davis@email.com',     '555-201-0010', 'verified',   9.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '22 days'),
('c1000001-0000-4000-a000-000000000011', 'ext-c-011', 'Amanda White',      'amanda.white@email.com',      '555-201-0011', 'pending',   14.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '21 days'),
('c1000001-0000-4000-a000-000000000012', 'ext-c-012', 'Christopher Lee',   'chris.lee@email.com',         '555-201-0012', 'verified',   4.50,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '20 days'),
('c1000001-0000-4000-a000-000000000013', 'ext-c-013', 'Samantha Green',    'sam.green@email.com',         '555-201-0013', 'verified',  13.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '19 days'),
('c1000001-0000-4000-a000-000000000014', 'ext-c-014', 'Daniel Martinez',   'daniel.m@email.com',          '555-201-0014', 'verified',   2.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '18 days'),
('c1000001-0000-4000-a000-000000000015', 'ext-c-015', 'Rachel Johnson',    'rachel.j@email.com',          '555-201-0015', 'verified',  11.50,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '17 days');

-- ── Edge-Case Customers (8) ──
INSERT INTO users (id, external_id, display_name, email, phone, verification_status, trust_score, status, user_type, service_category, metadata, created_at) VALUES
('c1000001-0000-4000-a000-000000000016', 'ext-c-016', 'Thomas Wilson',     'thomas.w@email.com',          '555-201-0016', 'verified',  18.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '25 days'),
('c1000001-0000-4000-a000-000000000017', 'ext-c-017', 'Jessica Taylor',    'jess.taylor@email.com',       '555-201-0017', 'verified',  22.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '24 days'),
('c1000001-0000-4000-a000-000000000018', 'ext-c-018', 'Andrew Clark',      'andrew.clark@email.com',      '555-201-0018', 'pending',   28.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '23 days'),
('c1000001-0000-4000-a000-000000000019', 'ext-c-019', 'Nicole Adams',      'nicole.a@email.com',          '555-201-0019', 'verified',  35.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '22 days'),
('c1000001-0000-4000-a000-000000000020', 'ext-c-020', 'Kevin Phillips',    'kevin.p@email.com',           '555-201-0020', 'unverified',15.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '20 days'),
('c1000001-0000-4000-a000-000000000021', 'ext-c-021', 'Michelle Evans',    'michelle.e@email.com',        '555-201-0021', 'verified',  10.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '18 days'),
('c1000001-0000-4000-a000-000000000022', 'ext-c-022', 'Brian Murphy',      'brian.m@email.com',           '555-201-0022', 'verified',  25.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '16 days'),
('c1000001-0000-4000-a000-000000000023', 'ext-c-023', 'Karen Hall',        'karen.h@email.com',           '555-201-0023', 'verified',  30.00,  'active', 'customer', NULL, '{}', NOW() - INTERVAL '15 days');

-- ── High-Risk Customers (10) ──
INSERT INTO users (id, external_id, display_name, email, phone, verification_status, trust_score, status, user_type, service_category, metadata, created_at) VALUES
('c1000001-0000-4000-a000-000000000030', 'ext-c-030', 'Alex Dubois',       'alex.dubois99@email.com',     '555-201-0030', 'pending',   55.00,  'active',     'customer', NULL, '{}', NOW() - INTERVAL '20 days'),
('c1000001-0000-4000-a000-000000000031', 'ext-c-031', 'Jordan Blake',      'jordan.blake@email.com',      '555-201-0031', 'verified',  62.00,  'restricted', 'customer', NULL, '{}', NOW() - INTERVAL '22 days'),
('c1000001-0000-4000-a000-000000000032', 'ext-c-032', 'Taylor Reed',       'taylor.reed@email.com',       '555-201-0032', 'pending',   78.00,  'restricted', 'customer', NULL, '{}', NOW() - INTERVAL '18 days'),
('c1000001-0000-4000-a000-000000000033', 'ext-c-033', 'Casey Morgan',      'casey.morgan@email.com',      '555-201-0033', 'unverified',85.00,  'suspended',  'customer', NULL, '{}', NOW() - INTERVAL '15 days'),
('c1000001-0000-4000-a000-000000000034', 'ext-c-034', 'Quinn Foster',      'quinn.f@email.com',           '555-201-0034', 'pending',   70.00,  'restricted', 'customer', NULL, '{}', NOW() - INTERVAL '14 days'),
('c1000001-0000-4000-a000-000000000035', 'ext-c-035', 'Riley Hayes',       'riley.h@email.com',           '555-201-0035', 'unverified',48.00,  'active',     'customer', NULL, '{}', NOW() - INTERVAL '12 days'),
('c1000001-0000-4000-a000-000000000036', 'ext-c-036', 'Avery Brooks',      'avery.b@email.com',           '555-201-0036', 'verified',  52.00,  'active',     'customer', NULL, '{}', NOW() - INTERVAL '10 days'),
('c1000001-0000-4000-a000-000000000037', 'ext-c-037', 'Morgan Perry',      'morgan.p@email.com',          '555-201-0037', 'pending',   67.00,  'restricted', 'customer', NULL, '{}', NOW() - INTERVAL '11 days'),
('c1000001-0000-4000-a000-000000000038', 'ext-c-038', 'Drew Coleman',      'drew.c@email.com',            '555-201-0038', 'verified',  45.00,  'active',     'customer', NULL, '{}', NOW() - INTERVAL '9 days'),
('c1000001-0000-4000-a000-000000000039', 'ext-c-039', 'Skyler Bennett',    'skyler.b@email.com',          '555-201-0039', 'unverified',90.00,  'suspended',  'customer', NULL, '{}', NOW() - INTERVAL '8 days');

-- ── Normal Providers (5) ──
INSERT INTO users (id, external_id, display_name, email, phone, verification_status, trust_score, status, user_type, service_category, metadata, created_at) VALUES
('p1000001-0000-4000-a000-000000000001', 'ext-p-001', 'Mike''s Cleaning',       'mike.clean@email.com',    '555-301-0001', 'verified', 5.00,  'active', 'provider', 'Cleaning',   '{"license":"BL-001"}', NOW() - INTERVAL '35 days'),
('p1000001-0000-4000-a000-000000000002', 'ext-p-002', 'Garcia Plumbing LLC',    'garcia.plumb@email.com',  '555-301-0002', 'verified', 3.00,  'active', 'provider', 'Plumbing',   '{"license":"PL-002"}', NOW() - INTERVAL '34 days'),
('p1000001-0000-4000-a000-000000000003', 'ext-p-003', 'Bright Electric Co',     'bright.elec@email.com',   '555-301-0003', 'verified', 7.00,  'active', 'provider', 'Electrical', '{"license":"EL-003"}', NOW() - INTERVAL '33 days'),
('p1000001-0000-4000-a000-000000000004', 'ext-p-004', 'GreenThumb Landscaping', 'green.thumb@email.com',   '555-301-0004', 'verified', 10.00, 'active', 'provider', 'Landscaping','{"license":"LS-004"}', NOW() - INTERVAL '32 days'),
('p1000001-0000-4000-a000-000000000005', 'ext-p-005', 'ProPaint Studios',       'propaint@email.com',      '555-301-0005', 'pending',  12.00, 'active', 'provider', 'Painting',   '{"license":"PT-005"}', NOW() - INTERVAL '31 days');

-- ── Edge-Case Providers (4) ──
INSERT INTO users (id, external_id, display_name, email, phone, verification_status, trust_score, status, user_type, service_category, metadata, created_at) VALUES
('p1000001-0000-4000-a000-000000000006', 'ext-p-006', 'QuickFix Handyman',      'quickfix@email.com',      '555-301-0006', 'verified', 20.00, 'active', 'provider', 'Handyman',   '{}', NOW() - INTERVAL '25 days'),
('p1000001-0000-4000-a000-000000000007', 'ext-p-007', 'Sparkle Maids',          'sparkle@email.com',       '555-301-0007', 'pending',  18.00, 'active', 'provider', 'Cleaning',   '{}', NOW() - INTERVAL '20 days'),
('p1000001-0000-4000-a000-000000000008', 'ext-p-008', 'AllStar Moving',         'allstar@email.com',       '555-301-0008', 'verified', 25.00, 'active', 'provider', 'Moving',     '{}', NOW() - INTERVAL '18 days'),
('p1000001-0000-4000-a000-000000000009', 'ext-p-009', 'Budget Repairs',         'budget.rep@email.com',    '555-301-0009', 'unverified',32.00, 'active', 'provider', 'Handyman',   '{}', NOW() - INTERVAL '15 days');

-- ── High-Risk Providers (3) ──
INSERT INTO users (id, external_id, display_name, email, phone, verification_status, trust_score, status, user_type, service_category, metadata, created_at) VALUES
('p1000001-0000-4000-a000-000000000010', 'ext-p-010', 'FastCash Services',      'fastcash@email.com',      '555-301-0010', 'unverified',58.00, 'restricted','provider','Cleaning',  '{}', NOW() - INTERVAL '14 days'),
('p1000001-0000-4000-a000-000000000011', 'ext-p-011', 'NoTrace Movers',         'notrace@email.com',       '555-301-0011', 'pending',   72.00, 'restricted','provider','Moving',    '{}', NOW() - INTERVAL '12 days'),
('p1000001-0000-4000-a000-000000000012', 'ext-p-012', 'ShadyDeal Repair',       'shadydeal@email.com',     '555-301-0012', 'unverified',88.00, 'suspended', 'provider','Handyman',  '{}', NOW() - INTERVAL '10 days');

-- ────────────────────────────────────────────────────────
-- 2. MESSAGES — Normal (120) + Edge (20) + High-Risk (60)
-- ────────────────────────────────────────────────────────

-- ── Normal Messages — Clean service conversations ──
INSERT INTO messages (id, sender_id, receiver_id, conversation_id, content, metadata, created_at) VALUES
-- Sarah ↔ Mike's Cleaning (conversation 1)
('m1000001-0000-4000-a000-000000000001', 'c1000001-0000-4000-a000-000000000001', 'p1000001-0000-4000-a000-000000000001', 'conv0001-0000-4000-a000-000000000001', 'Hi Mike, I need a deep clean for my 2-bedroom apartment. Are you available this Saturday?', '{}', NOW() - INTERVAL '29 days' + INTERVAL '10 hours'),
('m1000001-0000-4000-a000-000000000002', 'p1000001-0000-4000-a000-000000000001', 'c1000001-0000-4000-a000-000000000001', 'conv0001-0000-4000-a000-000000000001', 'Hi Sarah! Yes, Saturday works great. A deep clean for a 2BR usually takes 3-4 hours. I can start at 9am.', '{}', NOW() - INTERVAL '29 days' + INTERVAL '10 hours 15 minutes'),
('m1000001-0000-4000-a000-000000000003', 'c1000001-0000-4000-a000-000000000001', 'p1000001-0000-4000-a000-000000000001', 'conv0001-0000-4000-a000-000000000001', 'Perfect! 9am works. Do I need to provide any cleaning supplies?', '{}', NOW() - INTERVAL '29 days' + INTERVAL '10 hours 30 minutes'),
('m1000001-0000-4000-a000-000000000004', 'p1000001-0000-4000-a000-000000000001', 'c1000001-0000-4000-a000-000000000001', 'conv0001-0000-4000-a000-000000000001', 'No, I bring all my own supplies and equipment. See you Saturday at 9!', '{}', NOW() - INTERVAL '29 days' + INTERVAL '11 hours'),

-- James ↔ Garcia Plumbing (conversation 2)
('m1000001-0000-4000-a000-000000000005', 'c1000001-0000-4000-a000-000000000002', 'p1000001-0000-4000-a000-000000000002', 'conv0001-0000-4000-a000-000000000002', 'Hey, I have a leaky faucet in my kitchen. Can you come take a look?', '{}', NOW() - INTERVAL '28 days' + INTERVAL '9 hours'),
('m1000001-0000-4000-a000-000000000006', 'p1000001-0000-4000-a000-000000000002', 'c1000001-0000-4000-a000-000000000002', 'conv0001-0000-4000-a000-000000000002', 'Sure thing! I can come by tomorrow between 1-3pm. A standard faucet repair is $85-120 depending on the issue.', '{}', NOW() - INTERVAL '28 days' + INTERVAL '9 hours 20 minutes'),
('m1000001-0000-4000-a000-000000000007', 'c1000001-0000-4000-a000-000000000002', 'p1000001-0000-4000-a000-000000000002', 'conv0001-0000-4000-a000-000000000002', 'That works. Its a Moen single handle if that helps with pricing.', '{}', NOW() - INTERVAL '28 days' + INTERVAL '9 hours 45 minutes'),

-- Maria ↔ Bright Electric (conversation 3)
('m1000001-0000-4000-a000-000000000008', 'c1000001-0000-4000-a000-000000000003', 'p1000001-0000-4000-a000-000000000003', 'conv0001-0000-4000-a000-000000000003', 'I need to install a ceiling fan in my living room. Do you handle that?', '{}', NOW() - INTERVAL '27 days' + INTERVAL '14 hours'),
('m1000001-0000-4000-a000-000000000009', 'p1000001-0000-4000-a000-000000000003', 'c1000001-0000-4000-a000-000000000003', 'conv0001-0000-4000-a000-000000000003', 'Absolutely! Ceiling fan installation is one of our most popular services. Do you already have the fan purchased?', '{}', NOW() - INTERVAL '27 days' + INTERVAL '14 hours 30 minutes'),
('m1000001-0000-4000-a000-000000000010', 'c1000001-0000-4000-a000-000000000003', 'p1000001-0000-4000-a000-000000000003', 'conv0001-0000-4000-a000-000000000003', 'Yes, I have a Hunter fan from Home Depot. When can you come?', '{}', NOW() - INTERVAL '27 days' + INTERVAL '15 hours'),

-- David ↔ GreenThumb (conversation 4)
('m1000001-0000-4000-a000-000000000011', 'c1000001-0000-4000-a000-000000000004', 'p1000001-0000-4000-a000-000000000004', 'conv0001-0000-4000-a000-000000000004', 'Looking for weekly lawn maintenance. About quarter acre lot.', '{}', NOW() - INTERVAL '26 days' + INTERVAL '8 hours'),
('m1000001-0000-4000-a000-000000000012', 'p1000001-0000-4000-a000-000000000004', 'c1000001-0000-4000-a000-000000000004', 'conv0001-0000-4000-a000-000000000004', 'We offer weekly mowing, edging, and blowing for quarter acre lots at $45/visit. Would you like to set up a recurring schedule?', '{}', NOW() - INTERVAL '26 days' + INTERVAL '8 hours 45 minutes'),

-- Additional normal conversations (abbreviated for space)
('m1000001-0000-4000-a000-000000000013', 'c1000001-0000-4000-a000-000000000005', 'p1000001-0000-4000-a000-000000000005', 'conv0001-0000-4000-a000-000000000005', 'Need the exterior of my house painted. Its a single story ranch, about 1500 sqft.', '{}', NOW() - INTERVAL '25 days' + INTERVAL '11 hours'),
('m1000001-0000-4000-a000-000000000014', 'p1000001-0000-4000-a000-000000000005', 'c1000001-0000-4000-a000-000000000005', 'conv0001-0000-4000-a000-000000000005', 'For a 1500 sqft ranch exterior, we typically quote $2,500-3,200 depending on prep work needed. Id love to come out for a free estimate.', '{}', NOW() - INTERVAL '25 days' + INTERVAL '11 hours 30 minutes'),

('m1000001-0000-4000-a000-000000000015', 'c1000001-0000-4000-a000-000000000006', 'p1000001-0000-4000-a000-000000000001', 'conv0001-0000-4000-a000-000000000006', 'Do you offer move-out cleaning? I need to get my deposit back.', '{}', NOW() - INTERVAL '24 days' + INTERVAL '13 hours'),
('m1000001-0000-4000-a000-000000000016', 'c1000001-0000-4000-a000-000000000007', 'p1000001-0000-4000-a000-000000000002', 'conv0001-0000-4000-a000-000000000007', 'My water heater is making a strange noise. Is that something you can diagnose?', '{}', NOW() - INTERVAL '23 days' + INTERVAL '16 hours'),
('m1000001-0000-4000-a000-000000000017', 'c1000001-0000-4000-a000-000000000008', 'p1000001-0000-4000-a000-000000000003', 'conv0001-0000-4000-a000-000000000008', 'I need a few outlets added in my home office. Two on the north wall and one for ethernet.', '{}', NOW() - INTERVAL '22 days' + INTERVAL '10 hours'),
('m1000001-0000-4000-a000-000000000018', 'c1000001-0000-4000-a000-000000000009', 'p1000001-0000-4000-a000-000000000004', 'conv0001-0000-4000-a000-000000000009', 'Can you do a one-time leaf cleanup? My yard is covered after the storm.', '{}', NOW() - INTERVAL '21 days' + INTERVAL '9 hours'),
('m1000001-0000-4000-a000-000000000019', 'c1000001-0000-4000-a000-000000000010', 'p1000001-0000-4000-a000-000000000005', 'conv0001-0000-4000-a000-000000000010', 'Looking to repaint my kids rooms. Two rooms, about 10x12 each.', '{}', NOW() - INTERVAL '20 days' + INTERVAL '15 hours'),
('m1000001-0000-4000-a000-000000000020', 'c1000001-0000-4000-a000-000000000011', 'p1000001-0000-4000-a000-000000000001', 'conv0001-0000-4000-a000-000000000011', 'Can you do a regular biweekly cleaning for a 3BR house?', '{}', NOW() - INTERVAL '19 days' + INTERVAL '12 hours');

-- ── High-Risk Messages — Off-platform intent ──
INSERT INTO messages (id, sender_id, receiver_id, conversation_id, content, metadata, created_at) VALUES
-- Alex Dubois: gradual escalation (C1 scenario)
('m1000001-0000-4000-a000-000000000101', 'c1000001-0000-4000-a000-000000000030', 'p1000001-0000-4000-a000-000000000005', 'conv0001-0000-4000-a000-000000000020', 'Hey, I really liked your painting work on the photos. Can we discuss details?', '{}', NOW() - INTERVAL '18 days' + INTERVAL '10 hours'),
('m1000001-0000-4000-a000-000000000102', 'c1000001-0000-4000-a000-000000000030', 'p1000001-0000-4000-a000-000000000005', 'conv0001-0000-4000-a000-000000000020', 'Hey so honestly the app is kinda slow for messaging. Do you have whatsapp?', '{}', NOW() - INTERVAL '14 days' + INTERVAL '14 hours'),
('m1000001-0000-4000-a000-000000000103', 'c1000001-0000-4000-a000-000000000030', 'p1000001-0000-4000-a000-000000000005', 'conv0001-0000-4000-a000-000000000020', 'Lets just take this off the app, way easier to coordinate. Text me at 555-901-2345', '{}', NOW() - INTERVAL '10 days' + INTERVAL '15 hours'),
('m1000001-0000-4000-a000-000000000104', 'c1000001-0000-4000-a000-000000000030', 'p1000001-0000-4000-a000-000000000006', 'conv0001-0000-4000-a000-000000000021', 'Trust me, if we skip the middleman we can save on fees. Hit me up on telegram @alexd99', '{}', NOW() - INTERVAL '8 days' + INTERVAL '11 hours'),

-- Jordan Blake: obfuscated contact sharing (C2 scenario)
('m1000001-0000-4000-a000-000000000110', 'c1000001-0000-4000-a000-000000000031', 'p1000001-0000-4000-a000-000000000003', 'conv0001-0000-4000-a000-000000000022', 'Hey can I get a quote for rewiring my basement?', '{}', NOW() - INTERVAL '16 days' + INTERVAL '9 hours'),
('m1000001-0000-4000-a000-000000000111', 'c1000001-0000-4000-a000-000000000031', 'p1000001-0000-4000-a000-000000000003', 'conv0001-0000-4000-a000-000000000022', 'actually reach me at five five five nine zero one two three four five, this app glitches on me', '{}', NOW() - INTERVAL '12 days' + INTERVAL '14 hours'),
('m1000001-0000-4000-a000-000000000112', 'c1000001-0000-4000-a000-000000000031', 'p1000001-0000-4000-a000-000000000003', 'conv0001-0000-4000-a000-000000000022', 'or email me j.o.r.d.a.n [at] g m a i l [dot] c o m', '{}', NOW() - INTERVAL '10 days' + INTERVAL '16 hours'),

-- Taylor Reed: heavy obfuscation + payment redirect (C2 + C6 scenario)
('m1000001-0000-4000-a000-000000000120', 'c1000001-0000-4000-a000-000000000032', 'p1000001-0000-4000-a000-000000000010', 'conv0001-0000-4000-a000-000000000023', 'I need some cleaning done but I prefer to pay directly', '{}', NOW() - INTERVAL '12 days' + INTERVAL '10 hours'),
('m1000001-0000-4000-a000-000000000121', 'c1000001-0000-4000-a000-000000000032', 'p1000001-0000-4000-a000-000000000010', 'conv0001-0000-4000-a000-000000000023', 'my number is f1ve f1ve f1ve n1ne zero one tw0 thr33 four f1ve, hit me up', '{}', NOW() - INTERVAL '10 days' + INTERVAL '13 hours'),
('m1000001-0000-4000-a000-000000000122', 'c1000001-0000-4000-a000-000000000032', 'p1000001-0000-4000-a000-000000000010', 'conv0001-0000-4000-a000-000000000023', 'just venmo me the deposit, no need for the platform to take a cut. ca$happ works too', '{}', NOW() - INTERVAL '9 days' + INTERVAL '15 hours'),
('m1000001-0000-4000-a000-000000000123', 'c1000001-0000-4000-a000-000000000032', 'p1000001-0000-4000-a000-000000000010', 'conv0001-0000-4000-a000-000000000023', 'between us we can work something out, avoid the fee completely, our secret deal', '{}', NOW() - INTERVAL '8 days' + INTERVAL '11 hours'),

-- Casey Morgan: critical — coordinated burst (C3 scenario)
('m1000001-0000-4000-a000-000000000130', 'c1000001-0000-4000-a000-000000000033', 'p1000001-0000-4000-a000-000000000006', 'conv0001-0000-4000-a000-000000000024', 'I need urgent help, multiple jobs. Pay you directly via western union', '{}', NOW() - INTERVAL '6 days' + INTERVAL '14 hours'),
('m1000001-0000-4000-a000-000000000131', 'c1000001-0000-4000-a000-000000000033', 'p1000001-0000-4000-a000-000000000007', 'conv0001-0000-4000-a000-000000000025', 'Hey, skip the middleman. I promise better price privately. DM me on instagram @caseyM', '{}', NOW() - INTERVAL '6 days' + INTERVAL '14 hours 10 minutes'),
('m1000001-0000-4000-a000-000000000132', 'c1000001-0000-4000-a000-000000000033', 'p1000001-0000-4000-a000-000000000008', 'conv0001-0000-4000-a000-000000000026', 'Don''t tell anyone but I can give you a special deal off platform. Just this once. Call me at 555.901.3333', '{}', NOW() - INTERVAL '6 days' + INTERVAL '14 hours 20 minutes'),
('m1000001-0000-4000-a000-000000000133', 'c1000001-0000-4000-a000-000000000033', 'p1000001-0000-4000-a000-000000000009', 'conv0001-0000-4000-a000-000000000027', 'exclusive offer just between us. wire transfer or bitcoin both work. my number is 5-5-5-9-0-1-3-3-3-3', '{}', NOW() - INTERVAL '6 days' + INTERVAL '14 hours 30 minutes'),
('m1000001-0000-4000-a000-000000000134', 'c1000001-0000-4000-a000-000000000033', 'p1000001-0000-4000-a000-000000000001', 'conv0001-0000-4000-a000-000000000028', 'special rate for you if you pay outside the app. venmo or paypal, no commission on your end', '{}', NOW() - INTERVAL '6 days' + INTERVAL '14 hours 40 minutes'),

-- Quinn Foster: payment failure + messaging spike (C6 scenario)
('m1000001-0000-4000-a000-000000000140', 'c1000001-0000-4000-a000-000000000034', 'p1000001-0000-4000-a000-000000000004', 'conv0001-0000-4000-a000-000000000029', 'Hey, my payment just failed on the app. This keeps happening.', '{}', NOW() - INTERVAL '7 days' + INTERVAL '13 hours 5 minutes'),
('m1000001-0000-4000-a000-000000000141', 'c1000001-0000-4000-a000-000000000034', 'p1000001-0000-4000-a000-000000000004', 'conv0001-0000-4000-a000-000000000029', 'can you just send me your cashapp or venmo? way easier', '{}', NOW() - INTERVAL '7 days' + INTERVAL '13 hours 8 minutes'),
('m1000001-0000-4000-a000-000000000142', 'c1000001-0000-4000-a000-000000000034', 'p1000001-0000-4000-a000-000000000004', 'conv0001-0000-4000-a000-000000000029', 'or zelle works. I can pay you directly right now, no fees for either of us', '{}', NOW() - INTERVAL '7 days' + INTERVAL '13 hours 10 minutes'),

-- Skyler Bennett: extreme — multi-signal burst (C5 scenario)
('m1000001-0000-4000-a000-000000000150', 'c1000001-0000-4000-a000-000000000039', 'p1000001-0000-4000-a000-000000000010', 'conv0001-0000-4000-a000-000000000030', 'need 5 different cleaners for 5 properties. pay you all in crypto, bitcoin or ethereum', '{}', NOW() - INTERVAL '5 days' + INTERVAL '10 hours'),
('m1000001-0000-4000-a000-000000000151', 'c1000001-0000-4000-a000-000000000039', 'p1000001-0000-4000-a000-000000000011', 'conv0001-0000-4000-a000-000000000031', 'urgent move needed. pay you double via wire transfer. call me NOW at 5 5 5 9 0 1 4 4 4 4', '{}', NOW() - INTERVAL '5 days' + INTERVAL '10 hours 5 minutes'),
('m1000001-0000-4000-a000-000000000152', 'c1000001-0000-4000-a000-000000000039', 'p1000001-0000-4000-a000-000000000012', 'conv0001-0000-4000-a000-000000000032', 'hey lets work something out privately. i promise ill pay more than what the app charges. my snap is skylerB99', '{}', NOW() - INTERVAL '5 days' + INTERVAL '10 hours 10 minutes'),
('m1000001-0000-4000-a000-000000000153', 'c1000001-0000-4000-a000-000000000039', 'p1000001-0000-4000-a000-000000000006', 'conv0001-0000-4000-a000-000000000033', 'add me on whatsapp or signal. we can avoid the platform fees completely. just between us ok?', '{}', NOW() - INTERVAL '5 days' + INTERVAL '10 hours 15 minutes');


-- ────────────────────────────────────────────────────────
-- 3. TRANSACTIONS
-- ────────────────────────────────────────────────────────

-- ── Normal — completed via escrow ──
INSERT INTO transactions (id, user_id, counterparty_id, amount, currency, status, payment_method, external_ref, metadata, created_at) VALUES
('t1000001-0000-4000-a000-000000000001', 'c1000001-0000-4000-a000-000000000001', 'p1000001-0000-4000-a000-000000000001', 150.00, 'USD', 'completed', 'escrow',    NULL, '{"service":"deep_clean"}',   NOW() - INTERVAL '27 days'),
('t1000001-0000-4000-a000-000000000002', 'c1000001-0000-4000-a000-000000000002', 'p1000001-0000-4000-a000-000000000002', 110.00, 'USD', 'completed', 'escrow',    NULL, '{"service":"faucet_repair"}', NOW() - INTERVAL '26 days'),
('t1000001-0000-4000-a000-000000000003', 'c1000001-0000-4000-a000-000000000003', 'p1000001-0000-4000-a000-000000000003', 225.00, 'USD', 'completed', 'platform',  NULL, '{"service":"fan_install"}',   NOW() - INTERVAL '25 days'),
('t1000001-0000-4000-a000-000000000004', 'c1000001-0000-4000-a000-000000000004', 'p1000001-0000-4000-a000-000000000004',  45.00, 'USD', 'completed', 'escrow',    NULL, '{"service":"lawn_mow"}',     NOW() - INTERVAL '24 days'),
('t1000001-0000-4000-a000-000000000005', 'c1000001-0000-4000-a000-000000000005', 'p1000001-0000-4000-a000-000000000005',2800.00, 'USD', 'completed', 'escrow',    NULL, '{"service":"exterior_paint"}',NOW() - INTERVAL '22 days'),
('t1000001-0000-4000-a000-000000000006', 'c1000001-0000-4000-a000-000000000006', 'p1000001-0000-4000-a000-000000000001', 200.00, 'USD', 'completed', 'escrow',    NULL, '{"service":"moveout_clean"}', NOW() - INTERVAL '22 days'),
('t1000001-0000-4000-a000-000000000007', 'c1000001-0000-4000-a000-000000000007', 'p1000001-0000-4000-a000-000000000002', 180.00, 'USD', 'completed', 'platform',  NULL, '{"service":"water_heater"}',  NOW() - INTERVAL '21 days'),
('t1000001-0000-4000-a000-000000000008', 'c1000001-0000-4000-a000-000000000008', 'p1000001-0000-4000-a000-000000000003', 350.00, 'USD', 'completed', 'escrow',    NULL, '{"service":"outlets"}',       NOW() - INTERVAL '20 days'),
('t1000001-0000-4000-a000-000000000009', 'c1000001-0000-4000-a000-000000000009', 'p1000001-0000-4000-a000-000000000004',  75.00, 'USD', 'completed', 'escrow',    NULL, '{"service":"leaf_cleanup"}',  NOW() - INTERVAL '19 days'),
('t1000001-0000-4000-a000-000000000010', 'c1000001-0000-4000-a000-000000000010', 'p1000001-0000-4000-a000-000000000005', 800.00, 'USD', 'completed', 'escrow',    NULL, '{"service":"kids_rooms"}',    NOW() - INTERVAL '18 days');

-- ── Edge — failed and cancelled transactions ──
INSERT INTO transactions (id, user_id, counterparty_id, amount, currency, status, payment_method, external_ref, metadata, created_at) VALUES
('t1000001-0000-4000-a000-000000000020', 'c1000001-0000-4000-a000-000000000017', 'p1000001-0000-4000-a000-000000000006', 300.00, 'USD', 'failed',    'platform',  NULL, '{}', NOW() - INTERVAL '20 days'),
('t1000001-0000-4000-a000-000000000021', 'c1000001-0000-4000-a000-000000000017', 'p1000001-0000-4000-a000-000000000006', 300.00, 'USD', 'failed',    'platform',  NULL, '{}', NOW() - INTERVAL '18 days'),
('t1000001-0000-4000-a000-000000000022', 'c1000001-0000-4000-a000-000000000018', 'p1000001-0000-4000-a000-000000000007', 150.00, 'USD', 'cancelled', 'escrow',    NULL, '{}', NOW() - INTERVAL '19 days'),
('t1000001-0000-4000-a000-000000000023', 'c1000001-0000-4000-a000-000000000019', 'p1000001-0000-4000-a000-000000000008', 500.00, 'USD', 'cancelled', 'platform',  NULL, '{}', NOW() - INTERVAL '17 days'),
('t1000001-0000-4000-a000-000000000024', 'c1000001-0000-4000-a000-000000000019', 'p1000001-0000-4000-a000-000000000008', 500.00, 'USD', 'cancelled', 'platform',  NULL, '{}', NOW() - INTERVAL '15 days'),
('t1000001-0000-4000-a000-000000000025', 'c1000001-0000-4000-a000-000000000019', 'p1000001-0000-4000-a000-000000000009', 450.00, 'USD', 'cancelled', 'platform',  NULL, '{}', NOW() - INTERVAL '13 days'),
('t1000001-0000-4000-a000-000000000026', 'c1000001-0000-4000-a000-000000000019', 'p1000001-0000-4000-a000-000000000009', 450.00, 'USD', 'completed', 'escrow',    NULL, '{}', NOW() - INTERVAL '11 days'),
-- Abandoned — initiated, never completed
('t1000001-0000-4000-a000-000000000027', 'c1000001-0000-4000-a000-000000000016', 'p1000001-0000-4000-a000-000000000007', 200.00, 'USD', 'initiated', 'platform',  NULL, '{}', NOW() - INTERVAL '20 days'),
('t1000001-0000-4000-a000-000000000028', 'c1000001-0000-4000-a000-000000000020', 'p1000001-0000-4000-a000-000000000008', 600.00, 'USD', 'initiated', 'escrow',    NULL, '{}', NOW() - INTERVAL '16 days');

-- ── High-Risk — payment failures near risky messages + shared external_ref ──
INSERT INTO transactions (id, user_id, counterparty_id, amount, currency, status, payment_method, external_ref, metadata, created_at) VALUES
-- Quinn Foster: payment failure right before messaging spike
('t1000001-0000-4000-a000-000000000030', 'c1000001-0000-4000-a000-000000000034', 'p1000001-0000-4000-a000-000000000004', 200.00, 'USD', 'failed',    'platform',  NULL, '{}', NOW() - INTERVAL '7 days' + INTERVAL '13 hours'),
('t1000001-0000-4000-a000-000000000031', 'c1000001-0000-4000-a000-000000000034', 'p1000001-0000-4000-a000-000000000004', 200.00, 'USD', 'failed',    'platform',  NULL, '{}', NOW() - INTERVAL '5 days' + INTERVAL '10 hours'),

-- Skyler Bennett: rapid burst — 5 transactions in one day
('t1000001-0000-4000-a000-000000000040', 'c1000001-0000-4000-a000-000000000039', 'p1000001-0000-4000-a000-000000000010', 400.00, 'USD', 'cancelled', 'platform',  NULL, '{}', NOW() - INTERVAL '5 days' + INTERVAL '9 hours'),
('t1000001-0000-4000-a000-000000000041', 'c1000001-0000-4000-a000-000000000039', 'p1000001-0000-4000-a000-000000000011', 600.00, 'USD', 'cancelled', 'platform',  NULL, '{}', NOW() - INTERVAL '5 days' + INTERVAL '9 hours 30 minutes'),
('t1000001-0000-4000-a000-000000000042', 'c1000001-0000-4000-a000-000000000039', 'p1000001-0000-4000-a000-000000000012', 350.00, 'USD', 'failed',    'platform',  NULL, '{}', NOW() - INTERVAL '5 days' + INTERVAL '10 hours'),
('t1000001-0000-4000-a000-000000000043', 'c1000001-0000-4000-a000-000000000039', 'p1000001-0000-4000-a000-000000000006', 500.00, 'USD', 'failed',    'platform',  NULL, '{}', NOW() - INTERVAL '5 days' + INTERVAL '10 hours 30 minutes'),
('t1000001-0000-4000-a000-000000000044', 'c1000001-0000-4000-a000-000000000039', 'p1000001-0000-4000-a000-000000000001', 250.00, 'USD', 'initiated', 'platform',  NULL, '{}', NOW() - INTERVAL '5 days' + INTERVAL '11 hours'),

-- Shared external_ref (network scoring trigger) — Casey + Skyler share same payment ref
('t1000001-0000-4000-a000-000000000050', 'c1000001-0000-4000-a000-000000000033', 'p1000001-0000-4000-a000-000000000010', 300.00, 'USD', 'failed',  'platform', 'EXTREF-SHARED-001', '{}', NOW() - INTERVAL '6 days' + INTERVAL '13 hours'),
('t1000001-0000-4000-a000-000000000051', 'c1000001-0000-4000-a000-000000000039', 'p1000001-0000-4000-a000-000000000010', 300.00, 'USD', 'failed',  'platform', 'EXTREF-SHARED-001', '{}', NOW() - INTERVAL '5 days' + INTERVAL '12 hours'),

-- Taylor Reed: non-escrow payment
('t1000001-0000-4000-a000-000000000055', 'c1000001-0000-4000-a000-000000000032', 'p1000001-0000-4000-a000-000000000010', 175.00, 'USD', 'completed', 'direct',  NULL, '{}', NOW() - INTERVAL '11 days');


-- ────────────────────────────────────────────────────────
-- 4. RISK SIGNALS
-- ────────────────────────────────────────────────────────

INSERT INTO risk_signals (id, source_event_id, user_id, signal_type, confidence, evidence, obfuscation_flags, pattern_flags, processed, created_at) VALUES
-- Alex Dubois signals (gradual escalation)
('rs100001-0000-4000-a000-000000000001', 'evt00001-0000-4000-a000-000000000102', 'c1000001-0000-4000-a000-000000000030', 'CONTACT_MESSAGING_APP', 0.500, '{"message_ids":["m1000001-0000-4000-a000-000000000102"],"timestamps":["2025-01-27T14:00:00Z"]}', '{}', '{}', false, NOW() - INTERVAL '14 days' + INTERVAL '14 hours'),
('rs100001-0000-4000-a000-000000000002', 'evt00001-0000-4000-a000-000000000103', 'c1000001-0000-4000-a000-000000000030', 'OFF_PLATFORM_INTENT',    0.700, '{"message_ids":["m1000001-0000-4000-a000-000000000103"],"timestamps":["2025-02-01T15:00:00Z"]}', '{}', '{"ESCALATION_PATTERN"}', false, NOW() - INTERVAL '10 days' + INTERVAL '15 hours'),
('rs100001-0000-4000-a000-000000000003', 'evt00001-0000-4000-a000-000000000103', 'c1000001-0000-4000-a000-000000000030', 'CONTACT_PHONE',          0.700, '{"message_ids":["m1000001-0000-4000-a000-000000000103"],"timestamps":["2025-02-01T15:00:00Z"]}', '{}', '{}', false, NOW() - INTERVAL '10 days' + INTERVAL '15 hours'),
('rs100001-0000-4000-a000-000000000004', 'evt00001-0000-4000-a000-000000000104', 'c1000001-0000-4000-a000-000000000030', 'GROOMING_LANGUAGE',      0.500, '{"message_ids":["m1000001-0000-4000-a000-000000000104"],"timestamps":["2025-02-03T11:00:00Z"]}', '{}', '{"REPEATED_SIGNALS"}', false, NOW() - INTERVAL '8 days' + INTERVAL '11 hours'),
('rs100001-0000-4000-a000-000000000005', 'evt00001-0000-4000-a000-000000000104', 'c1000001-0000-4000-a000-000000000030', 'CONTACT_SOCIAL',         0.500, '{"message_ids":["m1000001-0000-4000-a000-000000000104"],"timestamps":["2025-02-03T11:00:00Z"]}', '{}', '{}', false, NOW() - INTERVAL '8 days' + INTERVAL '11 hours'),

-- Jordan Blake signals (obfuscated contact)
('rs100001-0000-4000-a000-000000000010', 'evt00001-0000-4000-a000-000000000111', 'c1000001-0000-4000-a000-000000000031', 'CONTACT_PHONE',          0.850, '{"message_ids":["m1000001-0000-4000-a000-000000000111"],"timestamps":[]}', '{"SPACED_CHARACTERS"}', '{}', false, NOW() - INTERVAL '12 days' + INTERVAL '14 hours'),
('rs100001-0000-4000-a000-000000000011', 'evt00001-0000-4000-a000-000000000112', 'c1000001-0000-4000-a000-000000000031', 'CONTACT_EMAIL',          0.900, '{"message_ids":["m1000001-0000-4000-a000-000000000112"],"timestamps":[]}', '{"SPACED_CHARACTERS","CHARACTER_SEPARATORS"}', '{"ESCALATION_PATTERN"}', false, NOW() - INTERVAL '10 days' + INTERVAL '16 hours'),

-- Taylor Reed signals (obfuscation + payment redirect + grooming)
('rs100001-0000-4000-a000-000000000020', 'evt00001-0000-4000-a000-000000000121', 'c1000001-0000-4000-a000-000000000032', 'CONTACT_PHONE',          0.950, '{"message_ids":["m1000001-0000-4000-a000-000000000121"],"timestamps":[]}', '{"LEETSPEAK","SPACED_CHARACTERS"}', '{}', false, NOW() - INTERVAL '10 days' + INTERVAL '13 hours'),
('rs100001-0000-4000-a000-000000000021', 'evt00001-0000-4000-a000-000000000122', 'c1000001-0000-4000-a000-000000000032', 'PAYMENT_EXTERNAL',       0.850, '{"message_ids":["m1000001-0000-4000-a000-000000000122"],"timestamps":[]}', '{}', '{"ESCALATION_PATTERN"}', false, NOW() - INTERVAL '9 days' + INTERVAL '15 hours'),
('rs100001-0000-4000-a000-000000000022', 'evt00001-0000-4000-a000-000000000123', 'c1000001-0000-4000-a000-000000000032', 'GROOMING_LANGUAGE',      0.680, '{"message_ids":["m1000001-0000-4000-a000-000000000123"],"timestamps":[]}', '{}', '{"REPEATED_SIGNALS","ESCALATION_PATTERN"}', false, NOW() - INTERVAL '8 days' + INTERVAL '11 hours'),
('rs100001-0000-4000-a000-000000000023', 'evt00001-0000-4000-a000-000000000122', 'c1000001-0000-4000-a000-000000000032', 'TX_REDIRECT_ATTEMPT',    0.700, '{"message_ids":["m1000001-0000-4000-a000-000000000122"],"timestamps":[]}', '{}', '{"TRANSACTION_PROXIMATE"}', false, NOW() - INTERVAL '9 days' + INTERVAL '15 hours'),

-- Casey Morgan signals (coordinated burst — critical)
('rs100001-0000-4000-a000-000000000030', 'evt00001-0000-4000-a000-000000000130', 'c1000001-0000-4000-a000-000000000033', 'PAYMENT_EXTERNAL',       0.850, '{"message_ids":["m1000001-0000-4000-a000-000000000130"],"timestamps":[]}', '{}', '{}', false, NOW() - INTERVAL '6 days' + INTERVAL '14 hours'),
('rs100001-0000-4000-a000-000000000031', 'evt00001-0000-4000-a000-000000000131', 'c1000001-0000-4000-a000-000000000033', 'GROOMING_LANGUAGE',      0.600, '{"message_ids":["m1000001-0000-4000-a000-000000000131"],"timestamps":[]}', '{}', '{"ESCALATION_PATTERN"}', false, NOW() - INTERVAL '6 days' + INTERVAL '14 hours 10 minutes'),
('rs100001-0000-4000-a000-000000000032', 'evt00001-0000-4000-a000-000000000131', 'c1000001-0000-4000-a000-000000000033', 'CONTACT_SOCIAL',         0.700, '{"message_ids":["m1000001-0000-4000-a000-000000000131"],"timestamps":[]}', '{}', '{}', false, NOW() - INTERVAL '6 days' + INTERVAL '14 hours 10 minutes'),
('rs100001-0000-4000-a000-000000000033', 'evt00001-0000-4000-a000-000000000132', 'c1000001-0000-4000-a000-000000000033', 'CONTACT_PHONE',          0.900, '{"message_ids":["m1000001-0000-4000-a000-000000000132"],"timestamps":[]}', '{"CHARACTER_SEPARATORS"}', '{"ESCALATION_PATTERN","HIGH_VOLUME_CONVERSATION"}', false, NOW() - INTERVAL '6 days' + INTERVAL '14 hours 20 minutes'),
('rs100001-0000-4000-a000-000000000034', 'evt00001-0000-4000-a000-000000000133', 'c1000001-0000-4000-a000-000000000033', 'PAYMENT_EXTERNAL',       0.850, '{"message_ids":["m1000001-0000-4000-a000-000000000133"],"timestamps":[]}', '{"CHARACTER_SEPARATORS"}', '{"REPEATED_SIGNALS"}', false, NOW() - INTERVAL '6 days' + INTERVAL '14 hours 30 minutes'),
('rs100001-0000-4000-a000-000000000035', 'evt00001-0000-4000-a000-000000000134', 'c1000001-0000-4000-a000-000000000033', 'OFF_PLATFORM_INTENT',    0.850, '{"message_ids":["m1000001-0000-4000-a000-000000000134"],"timestamps":[]}', '{}', '{"ESCALATION_PATTERN","HIGH_VOLUME_CONVERSATION"}', false, NOW() - INTERVAL '6 days' + INTERVAL '14 hours 40 minutes'),

-- Quinn Foster signals (payment failure + redirect)
('rs100001-0000-4000-a000-000000000040', 'evt00001-0000-4000-a000-000000000141', 'c1000001-0000-4000-a000-000000000034', 'PAYMENT_EXTERNAL',       0.700, '{"message_ids":["m1000001-0000-4000-a000-000000000141"],"timestamps":[]}', '{}', '{"TRANSACTION_PROXIMATE"}', false, NOW() - INTERVAL '7 days' + INTERVAL '13 hours 8 minutes'),
('rs100001-0000-4000-a000-000000000041', 'evt00001-0000-4000-a000-000000000141', 'c1000001-0000-4000-a000-000000000034', 'TX_FAILURE_CORRELATED',  0.600, '{"message_ids":["m1000001-0000-4000-a000-000000000141"],"timestamps":[]}', '{}', '{"TX_FAILURE_RECENT"}', false, NOW() - INTERVAL '7 days' + INTERVAL '13 hours 8 minutes'),
('rs100001-0000-4000-a000-000000000042', 'evt00001-0000-4000-a000-000000000142', 'c1000001-0000-4000-a000-000000000034', 'PAYMENT_EXTERNAL',       0.850, '{"message_ids":["m1000001-0000-4000-a000-000000000142"],"timestamps":[]}', '{}', '{"REPEATED_SIGNALS","ESCALATION_PATTERN"}', false, NOW() - INTERVAL '7 days' + INTERVAL '13 hours 10 minutes'),

-- Skyler Bennett signals (extreme multi-signal burst)
('rs100001-0000-4000-a000-000000000050', 'evt00001-0000-4000-a000-000000000150', 'c1000001-0000-4000-a000-000000000039', 'PAYMENT_EXTERNAL',       0.850, '{"message_ids":["m1000001-0000-4000-a000-000000000150"],"timestamps":[]}', '{}', '{}', false, NOW() - INTERVAL '5 days' + INTERVAL '10 hours'),
('rs100001-0000-4000-a000-000000000051', 'evt00001-0000-4000-a000-000000000151', 'c1000001-0000-4000-a000-000000000039', 'CONTACT_PHONE',          0.900, '{"message_ids":["m1000001-0000-4000-a000-000000000151"],"timestamps":[]}', '{"SPACED_CHARACTERS"}', '{"ESCALATION_PATTERN"}', false, NOW() - INTERVAL '5 days' + INTERVAL '10 hours 5 minutes'),
('rs100001-0000-4000-a000-000000000052', 'evt00001-0000-4000-a000-000000000152', 'c1000001-0000-4000-a000-000000000039', 'GROOMING_LANGUAGE',      0.600, '{"message_ids":["m1000001-0000-4000-a000-000000000152"],"timestamps":[]}', '{}', '{"ESCALATION_PATTERN"}', false, NOW() - INTERVAL '5 days' + INTERVAL '10 hours 10 minutes'),
('rs100001-0000-4000-a000-000000000053', 'evt00001-0000-4000-a000-000000000152', 'c1000001-0000-4000-a000-000000000039', 'CONTACT_SOCIAL',         0.700, '{"message_ids":["m1000001-0000-4000-a000-000000000152"],"timestamps":[]}', '{}', '{}', false, NOW() - INTERVAL '5 days' + INTERVAL '10 hours 10 minutes'),
('rs100001-0000-4000-a000-000000000054', 'evt00001-0000-4000-a000-000000000153', 'c1000001-0000-4000-a000-000000000039', 'CONTACT_MESSAGING_APP',  0.850, '{"message_ids":["m1000001-0000-4000-a000-000000000153"],"timestamps":[]}', '{}', '{"REPEATED_SIGNALS","HIGH_VOLUME_CONVERSATION"}', false, NOW() - INTERVAL '5 days' + INTERVAL '10 hours 15 minutes'),
('rs100001-0000-4000-a000-000000000055', 'evt00001-0000-4000-a000-000000000153', 'c1000001-0000-4000-a000-000000000039', 'OFF_PLATFORM_INTENT',    0.850, '{"message_ids":["m1000001-0000-4000-a000-000000000153"],"timestamps":[]}', '{}', '{"ESCALATION_PATTERN","HIGH_VOLUME_CONVERSATION"}', false, NOW() - INTERVAL '5 days' + INTERVAL '10 hours 15 minutes');


-- ────────────────────────────────────────────────────────
-- 5. RISK SCORES
-- ────────────────────────────────────────────────────────

INSERT INTO risk_scores (id, user_id, score, tier, factors, trend, signal_count, last_signal_at, created_at) VALUES
-- Normal users: monitor tier, stable
('sc100001-0000-4000-a000-000000000001', 'c1000001-0000-4000-a000-000000000001',  8.50, 'monitor',  '{"operational":5,"behavioral":0,"network":0}',   'stable',    0, NULL, NOW() - INTERVAL '27 days'),
('sc100001-0000-4000-a000-000000000002', 'c1000001-0000-4000-a000-000000000002', 12.00, 'monitor',  '{"operational":10,"behavioral":0,"network":0}',  'stable',    0, NULL, NOW() - INTERVAL '26 days'),
('sc100001-0000-4000-a000-000000000003', 'c1000001-0000-4000-a000-000000000003',  5.00, 'monitor',  '{"operational":0,"behavioral":0,"network":0}',   'stable',    0, NULL, NOW() - INTERVAL '25 days'),

-- Edge users: low tier
('sc100001-0000-4000-a000-000000000010', 'c1000001-0000-4000-a000-000000000017', 22.00, 'low',      '{"operational":30,"behavioral":0,"network":0}',  'stable',    0, NULL, NOW() - INTERVAL '18 days'),
('sc100001-0000-4000-a000-000000000011', 'c1000001-0000-4000-a000-000000000019', 35.00, 'low',      '{"operational":45,"behavioral":0,"network":0}',  'escalating',0, NULL, NOW() - INTERVAL '13 days'),

-- Alex Dubois: escalating from low to medium
('sc100001-0000-4000-a000-000000000020', 'c1000001-0000-4000-a000-000000000030', 25.00, 'low',      '{"operational":10,"behavioral":20,"network":5}', 'stable',    1, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
('sc100001-0000-4000-a000-000000000021', 'c1000001-0000-4000-a000-000000000030', 42.00, 'medium',   '{"operational":10,"behavioral":48,"network":5}', 'escalating',3, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('sc100001-0000-4000-a000-000000000022', 'c1000001-0000-4000-a000-000000000030', 55.00, 'medium',   '{"operational":10,"behavioral":65,"network":10}','escalating',5, NOW() - INTERVAL '8 days',  NOW() - INTERVAL '8 days'),

-- Jordan Blake: medium, escalating
('sc100001-0000-4000-a000-000000000025', 'c1000001-0000-4000-a000-000000000031', 45.00, 'medium',   '{"operational":5,"behavioral":55,"network":0}',  'stable',    1, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
('sc100001-0000-4000-a000-000000000026', 'c1000001-0000-4000-a000-000000000031', 62.00, 'high',     '{"operational":5,"behavioral":78,"network":5}',  'escalating',2, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

-- Taylor Reed: high, escalating fast
('sc100001-0000-4000-a000-000000000030', 'c1000001-0000-4000-a000-000000000032', 50.00, 'medium',   '{"operational":20,"behavioral":55,"network":10}','stable',    1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('sc100001-0000-4000-a000-000000000031', 'c1000001-0000-4000-a000-000000000032', 68.00, 'high',     '{"operational":25,"behavioral":72,"network":15}','escalating',3, NOW() - INTERVAL '9 days',  NOW() - INTERVAL '9 days'),
('sc100001-0000-4000-a000-000000000032', 'c1000001-0000-4000-a000-000000000032', 78.00, 'high',     '{"operational":30,"behavioral":85,"network":20}','escalating',4, NOW() - INTERVAL '8 days',  NOW() - INTERVAL '8 days'),

-- Casey Morgan: critical
('sc100001-0000-4000-a000-000000000035', 'c1000001-0000-4000-a000-000000000033', 65.00, 'high',     '{"operational":30,"behavioral":70,"network":25}','stable',    2, NOW() - INTERVAL '8 days',  NOW() - INTERVAL '8 days'),
('sc100001-0000-4000-a000-000000000036', 'c1000001-0000-4000-a000-000000000033', 85.00, 'critical', '{"operational":35,"behavioral":92,"network":40}','escalating',8, NOW() - INTERVAL '6 days',  NOW() - INTERVAL '6 days'),

-- Quinn Foster: medium to high
('sc100001-0000-4000-a000-000000000040', 'c1000001-0000-4000-a000-000000000034', 48.00, 'medium',   '{"operational":35,"behavioral":40,"network":5}', 'stable',    1, NOW() - INTERVAL '8 days',  NOW() - INTERVAL '8 days'),
('sc100001-0000-4000-a000-000000000041', 'c1000001-0000-4000-a000-000000000034', 70.00, 'high',     '{"operational":40,"behavioral":72,"network":10}','escalating',4, NOW() - INTERVAL '7 days',  NOW() - INTERVAL '7 days'),

-- Skyler Bennett: critical
('sc100001-0000-4000-a000-000000000045', 'c1000001-0000-4000-a000-000000000039', 72.00, 'high',     '{"operational":40,"behavioral":75,"network":30}','escalating',3, NOW() - INTERVAL '6 days',  NOW() - INTERVAL '6 days'),
('sc100001-0000-4000-a000-000000000046', 'c1000001-0000-4000-a000-000000000039', 90.00, 'critical', '{"operational":50,"behavioral":95,"network":45}','escalating',9, NOW() - INTERVAL '5 days',  NOW() - INTERVAL '5 days');


-- ────────────────────────────────────────────────────────
-- 6. ENFORCEMENT ACTIONS
-- ────────────────────────────────────────────────────────

INSERT INTO enforcement_actions (id, user_id, action_type, reason, reason_code, triggering_signal_ids, risk_score_id, effective_until, reversed_at, reversed_by, reversal_reason, automated, approved_by, metadata, created_at) VALUES
-- Alex Dubois: soft warning → hard warning
('ea100001-0000-4000-a000-000000000001', 'c1000001-0000-4000-a000-000000000030', 'soft_warning',          'Low-risk behavior detected. This is an informational warning.',                           'LOW_RISK_FIRST_OFFENSE',  ARRAY['rs100001-0000-4000-a000-000000000001']::UUID[], 'sc100001-0000-4000-a000-000000000020', NULL, NULL, NULL, NULL, true, NULL, '{}', NOW() - INTERVAL '14 days'),
('ea100001-0000-4000-a000-000000000002', 'c1000001-0000-4000-a000-000000000030', 'hard_warning',          'Medium-risk behavior detected. This warning is logged.',                                  'MEDIUM_RISK_FIRST',       ARRAY['rs100001-0000-4000-a000-000000000002','rs100001-0000-4000-a000-000000000003']::UUID[], 'sc100001-0000-4000-a000-000000000021', NULL, NULL, NULL, NULL, true, NULL, '{}', NOW() - INTERVAL '10 days'),

-- Jordan Blake: hard warning → temporary restriction
('ea100001-0000-4000-a000-000000000003', 'c1000001-0000-4000-a000-000000000031', 'hard_warning',          'Medium-risk behavior detected. This warning is logged.',                                  'MEDIUM_RISK_FIRST',       ARRAY['rs100001-0000-4000-a000-000000000010']::UUID[], 'sc100001-0000-4000-a000-000000000025', NULL, NULL, NULL, NULL, true, NULL, '{}', NOW() - INTERVAL '12 days'),
('ea100001-0000-4000-a000-000000000004', 'c1000001-0000-4000-a000-000000000031', 'temporary_restriction', 'High-risk behavior with evasion pattern detected. Admin review required.',                'HIGH_RISK_EVASION',       ARRAY['rs100001-0000-4000-a000-000000000011']::UUID[], 'sc100001-0000-4000-a000-000000000026', NOW() - INTERVAL '7 days', NULL, NULL, NULL, false, NULL, '{}', NOW() - INTERVAL '10 days'),

-- Taylor Reed: escalation ladder
('ea100001-0000-4000-a000-000000000005', 'c1000001-0000-4000-a000-000000000032', 'hard_warning',          'Medium-risk behavior detected. This warning is logged.',                                  'MEDIUM_RISK_FIRST',       ARRAY['rs100001-0000-4000-a000-000000000020']::UUID[], 'sc100001-0000-4000-a000-000000000030', NULL, NULL, NULL, NULL, true, NULL, '{}', NOW() - INTERVAL '10 days'),
('ea100001-0000-4000-a000-000000000006', 'c1000001-0000-4000-a000-000000000032', 'temporary_restriction', 'High-risk behavior with evasion pattern detected. Admin review required.',                'HIGH_RISK_EVASION',       ARRAY['rs100001-0000-4000-a000-000000000021','rs100001-0000-4000-a000-000000000023']::UUID[], 'sc100001-0000-4000-a000-000000000031', NOW() - INTERVAL '6 days', NULL, NULL, NULL, false, NULL, '{}', NOW() - INTERVAL '9 days'),

-- Casey Morgan: account suspension
('ea100001-0000-4000-a000-000000000007', 'c1000001-0000-4000-a000-000000000033', 'hard_warning',          'Medium-risk behavior detected.',                                                          'MEDIUM_RISK_FIRST',       ARRAY['rs100001-0000-4000-a000-000000000030']::UUID[], 'sc100001-0000-4000-a000-000000000035', NULL, NULL, NULL, NULL, true, NULL, '{}', NOW() - INTERVAL '8 days'),
('ea100001-0000-4000-a000-000000000008', 'c1000001-0000-4000-a000-000000000033', 'account_suspension',    'Critical-risk behavior detected. Account suspended pending admin review.',                'CRITICAL_RISK_SUSPEND',   ARRAY['rs100001-0000-4000-a000-000000000033','rs100001-0000-4000-a000-000000000034','rs100001-0000-4000-a000-000000000035']::UUID[], 'sc100001-0000-4000-a000-000000000036', NULL, NULL, NULL, NULL, false, NULL, '{}', NOW() - INTERVAL '6 days'),

-- Quinn Foster: temporary restriction
('ea100001-0000-4000-a000-000000000009', 'c1000001-0000-4000-a000-000000000034', 'hard_warning',          'Medium-risk behavior detected.',                                                          'MEDIUM_RISK_FIRST',       ARRAY['rs100001-0000-4000-a000-000000000040']::UUID[], 'sc100001-0000-4000-a000-000000000040', NULL, NULL, NULL, NULL, true, NULL, '{}', NOW() - INTERVAL '8 days'),
('ea100001-0000-4000-a000-000000000010', 'c1000001-0000-4000-a000-000000000034', 'temporary_restriction', 'High-risk behavior with evasion pattern detected.',                                       'HIGH_RISK_EVASION',       ARRAY['rs100001-0000-4000-a000-000000000040','rs100001-0000-4000-a000-000000000041','rs100001-0000-4000-a000-000000000042']::UUID[], 'sc100001-0000-4000-a000-000000000041', NOW() - INTERVAL '4 days', NULL, NULL, NULL, false, NULL, '{}', NOW() - INTERVAL '7 days'),

-- Skyler Bennett: direct to suspension
('ea100001-0000-4000-a000-000000000011', 'c1000001-0000-4000-a000-000000000039', 'account_suspension',    'Critical-risk behavior detected. Account suspended pending admin review.',                'CRITICAL_RISK_SUSPEND',   ARRAY['rs100001-0000-4000-a000-000000000050','rs100001-0000-4000-a000-000000000051','rs100001-0000-4000-a000-000000000054','rs100001-0000-4000-a000-000000000055']::UUID[], 'sc100001-0000-4000-a000-000000000046', NULL, NULL, NULL, NULL, false, NULL, '{}', NOW() - INTERVAL '5 days'),

-- Reversed enforcement (for appeal testing)
('ea100001-0000-4000-a000-000000000012', 'c1000001-0000-4000-a000-000000000035', 'hard_warning',          'Medium-risk behavior detected.',                                                          'MEDIUM_RISK_FIRST',       ARRAY['rs100001-0000-4000-a000-000000000001']::UUID[], NULL, NULL, NOW() - INTERVAL '5 days', NULL, 'Appeal approved: User provided context for off-platform mention.', true, NULL, '{}', NOW() - INTERVAL '8 days');


-- ────────────────────────────────────────────────────────
-- 7. ALERTS
-- ────────────────────────────────────────────────────────

INSERT INTO alerts (id, user_id, priority, status, title, description, assigned_to, risk_signal_ids, auto_generated, metadata, created_at) VALUES
('al100001-0000-4000-a000-000000000001', 'c1000001-0000-4000-a000-000000000030', 'medium',   'resolved',    'Enforcement: MEDIUM_RISK_FIRST',      'Automated enforcement action (hard_warning) applied to user Alex Dubois.',    NULL, ARRAY['rs100001-0000-4000-a000-000000000002']::UUID[], true, '{}', NOW() - INTERVAL '10 days'),
('al100001-0000-4000-a000-000000000002', 'c1000001-0000-4000-a000-000000000031', 'high',     'in_progress', 'Enforcement: HIGH_RISK_EVASION',      'Automated enforcement action (temporary_restriction) applied to user Jordan Blake.', NULL, ARRAY['rs100001-0000-4000-a000-000000000011']::UUID[], true, '{}', NOW() - INTERVAL '10 days'),
('al100001-0000-4000-a000-000000000003', 'c1000001-0000-4000-a000-000000000032', 'high',     'in_progress', 'Enforcement: HIGH_RISK_EVASION',      'Automated enforcement action (temporary_restriction) applied to user Taylor Reed.', NULL, ARRAY['rs100001-0000-4000-a000-000000000021']::UUID[], true, '{}', NOW() - INTERVAL '9 days'),
('al100001-0000-4000-a000-000000000004', 'c1000001-0000-4000-a000-000000000033', 'critical', 'open',        'Enforcement: CRITICAL_RISK_SUSPEND',  'Automated enforcement action (account_suspension) applied to user Casey Morgan. Multiple coordinated signals detected.', NULL, ARRAY['rs100001-0000-4000-a000-000000000033','rs100001-0000-4000-a000-000000000034']::UUID[], true, '{}', NOW() - INTERVAL '6 days'),
('al100001-0000-4000-a000-000000000005', 'c1000001-0000-4000-a000-000000000034', 'high',     'assigned',    'Enforcement: HIGH_RISK_EVASION',      'Automated enforcement action (temporary_restriction) applied to user Quinn Foster after payment failures.', NULL, ARRAY['rs100001-0000-4000-a000-000000000040']::UUID[], true, '{}', NOW() - INTERVAL '7 days'),
('al100001-0000-4000-a000-000000000006', 'c1000001-0000-4000-a000-000000000039', 'critical', 'open',        'Enforcement: CRITICAL_RISK_SUSPEND',  'Automated enforcement action (account_suspension) applied to user Skyler Bennett. Extreme multi-signal burst detected.', NULL, ARRAY['rs100001-0000-4000-a000-000000000050','rs100001-0000-4000-a000-000000000055']::UUID[], true, '{}', NOW() - INTERVAL '5 days'),
-- Manual alerts
('al100001-0000-4000-a000-000000000007', 'c1000001-0000-4000-a000-000000000019', 'low',      'dismissed',   'High cancellation rate',              'User Nicole Adams has cancelled 4 of 5 recent transactions.',                NULL, '{}', false, '{}', NOW() - INTERVAL '12 days'),
('al100001-0000-4000-a000-000000000008', 'p1000001-0000-4000-a000-000000000010', 'medium',   'open',        'Provider risk: FastCash Services',    'Provider account flagged for receiving multiple off-platform payment requests.',NULL, '{}', false, '{}', NOW() - INTERVAL '8 days');


-- ────────────────────────────────────────────────────────
-- 8. CASES
-- ────────────────────────────────────────────────────────

INSERT INTO cases (id, user_id, status, title, description, assigned_to, alert_ids, metadata, created_at) VALUES
('cs100001-0000-4000-a000-000000000001', 'c1000001-0000-4000-a000-000000000032', 'investigating',  'Escalation: HIGH_RISK_EVASION — Taylor Reed',    'User escalated for admin review. Detected high-risk behavior with heavy obfuscation + payment redirect attempts.', NULL, ARRAY['al100001-0000-4000-a000-000000000003']::UUID[], '{}', NOW() - INTERVAL '9 days'),
('cs100001-0000-4000-a000-000000000002', 'c1000001-0000-4000-a000-000000000033', 'open',           'Escalation: CRITICAL_RISK_SUSPEND — Casey Morgan','User escalated for admin review. Critical coordinated activity: 5 messages to 5 different providers in 40 minutes with payment redirect + grooming language.', NULL, ARRAY['al100001-0000-4000-a000-000000000004']::UUID[], '{}', NOW() - INTERVAL '6 days'),
('cs100001-0000-4000-a000-000000000003', 'c1000001-0000-4000-a000-000000000039', 'open',           'Escalation: CRITICAL_RISK_SUSPEND — Skyler Bennett','User escalated for admin review. Extreme burst: 4 messages + 5 transactions in 1 hour, all cancelled/failed, crypto and wire transfer references.', NULL, ARRAY['al100001-0000-4000-a000-000000000006']::UUID[], '{}', NOW() - INTERVAL '5 days'),
('cs100001-0000-4000-a000-000000000004', 'c1000001-0000-4000-a000-000000000034', 'pending_action', 'Review: Quinn Foster — Payment Failure Pattern',  'User triggered payment failure + off-platform redirect pattern. Transaction failed, followed by immediate messaging spike requesting off-platform payment.', NULL, ARRAY['al100001-0000-4000-a000-000000000005']::UUID[], '{}', NOW() - INTERVAL '7 days'),
('cs100001-0000-4000-a000-000000000005', 'p1000001-0000-4000-a000-000000000010', 'investigating',  'Provider Investigation: FastCash Services',       'Provider flagged for participating in multiple off-platform payment coordination attempts with different customers.', NULL, ARRAY['al100001-0000-4000-a000-000000000008']::UUID[], '{}', NOW() - INTERVAL '7 days');


-- ────────────────────────────────────────────────────────
-- 9. CASE NOTES
-- ────────────────────────────────────────────────────────

INSERT INTO case_notes (id, case_id, author, content, created_at) VALUES
('cn100001-0000-4000-a000-000000000001', 'cs100001-0000-4000-a000-000000000001', 'admin@qwickservices.com', 'Reviewed message history. User used leetspeak obfuscation for phone number and obfuscated email. Pattern consistent with deliberate evasion.', NOW() - INTERVAL '8 days'),
('cn100001-0000-4000-a000-000000000002', 'cs100001-0000-4000-a000-000000000001', 'admin@qwickservices.com', 'Cross-referenced with provider FastCash Services — provider appears complicit. Escalating provider investigation.', NOW() - INTERVAL '7 days'),
('cn100001-0000-4000-a000-000000000003', 'cs100001-0000-4000-a000-000000000002', 'admin@qwickservices.com', 'Coordinated burst confirmed: 5 messages to 5 providers in 40 minutes. All messages contain payment redirect + grooming language. High confidence malicious intent.', NOW() - INTERVAL '5 days'),
('cn100001-0000-4000-a000-000000000004', 'cs100001-0000-4000-a000-000000000004', 'admin@qwickservices.com', 'Payment failure appears legitimate (card declined). However, immediate pivot to off-platform payment is concerning. Recommending restriction pending user explanation.', NOW() - INTERVAL '6 days'),
('cn100001-0000-4000-a000-000000000005', 'cs100001-0000-4000-a000-000000000005', 'admin@qwickservices.com', 'Provider FastCash is linked to 3 different customers flagged for off-platform payment attempts. Network analysis suggests coordinated activity.', NOW() - INTERVAL '6 days');


-- ────────────────────────────────────────────────────────
-- 10. APPEALS
-- ────────────────────────────────────────────────────────

INSERT INTO appeals (id, enforcement_action_id, user_id, status, reason, resolution_notes, resolved_by, submitted_at, resolved_at) VALUES
-- Alex Dubois: submitted, pending review
('ap100001-0000-4000-a000-000000000001', 'ea100001-0000-4000-a000-000000000002', 'c1000001-0000-4000-a000-000000000030', 'submitted',    'I was just trying to coordinate a complex painting project. The app messaging was too slow for back-and-forth. I did not intend to circumvent the platform.', NULL, NULL, NOW() - INTERVAL '9 days', NULL),
-- Riley Hayes: approved (enforcement was reversed)
('ap100001-0000-4000-a000-000000000002', 'ea100001-0000-4000-a000-000000000012', 'c1000001-0000-4000-a000-000000000035', 'approved',     'I mentioned a phone number only because I was giving directions to my house. It was not an attempt to go off-platform.', 'Reviewed message context. User was indeed providing a house address that contained a phone-like number sequence. False positive.', NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days'),
-- Quinn Foster: denied
('ap100001-0000-4000-a000-000000000003', 'ea100001-0000-4000-a000-000000000010', 'c1000001-0000-4000-a000-000000000034', 'denied',       'My card kept declining on the app so I was just trying to find another way to pay. I still want to use your platform.', 'While the payment failure was legitimate, the user explicitly solicited off-platform payment (Venmo, CashApp, Zelle) in consecutive messages. This violates platform ToS regardless of payment failure context.', NULL, NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 days'),
-- Casey Morgan: under review
('ap100001-0000-4000-a000-000000000004', 'ea100001-0000-4000-a000-000000000008', 'c1000001-0000-4000-a000-000000000033', 'under_review', 'I was under pressure to get multiple jobs done quickly for an event. I apologize for the approach but I was not trying to scam anyone.', NULL, NULL, NOW() - INTERVAL '4 days', NULL);


-- ────────────────────────────────────────────────────────
-- 11. AUDIT LOGS (sample entries)
-- ────────────────────────────────────────────────────────

INSERT INTO audit_logs (id, actor, actor_type, action, entity_type, entity_id, details, ip_address, timestamp) VALUES
('au100001-0000-4000-a000-000000000001', 'system',                   'system', 'enforcement.soft_warning',       'enforcement_action', 'ea100001-0000-4000-a000-000000000001', '{"reason_code":"LOW_RISK_FIRST_OFFENSE","automated":true}',            NULL, NOW() - INTERVAL '14 days'),
('au100001-0000-4000-a000-000000000002', 'system',                   'system', 'enforcement.hard_warning',       'enforcement_action', 'ea100001-0000-4000-a000-000000000002', '{"reason_code":"MEDIUM_RISK_FIRST","automated":true}',                 NULL, NOW() - INTERVAL '10 days'),
('au100001-0000-4000-a000-000000000003', 'system',                   'system', 'enforcement.temporary_restriction','enforcement_action','ea100001-0000-4000-a000-000000000004', '{"reason_code":"HIGH_RISK_EVASION","requires_approval":true}',          NULL, NOW() - INTERVAL '10 days'),
('au100001-0000-4000-a000-000000000004', 'system',                   'system', 'enforcement.account_suspension', 'enforcement_action', 'ea100001-0000-4000-a000-000000000008', '{"reason_code":"CRITICAL_RISK_SUSPEND","requires_approval":true}',      NULL, NOW() - INTERVAL '6 days'),
('au100001-0000-4000-a000-000000000005', 'system',                   'system', 'enforcement.account_suspension', 'enforcement_action', 'ea100001-0000-4000-a000-000000000011', '{"reason_code":"CRITICAL_RISK_SUSPEND","requires_approval":true}',      NULL, NOW() - INTERVAL '5 days'),
('au100001-0000-4000-a000-000000000006', 'system',                   'system', 'enforcement.reversed',           'enforcement_action', 'ea100001-0000-4000-a000-000000000012', '{"reason":"Appeal approved","appeal_id":"ap100001-0000-4000-a000-000000000002"}', NULL, NOW() - INTERVAL '5 days'),
('au100001-0000-4000-a000-000000000007', 'system',                   'system', 'appeal.submitted',               'appeal',             'ap100001-0000-4000-a000-000000000001', '{"enforcement_action_id":"ea100001-0000-4000-a000-000000000002"}',      NULL, NOW() - INTERVAL '9 days'),
('au100001-0000-4000-a000-000000000008', 'system',                   'system', 'appeal.resolved',                'appeal',             'ap100001-0000-4000-a000-000000000002', '{"status":"approved","enforcement_reversed":true}',                     NULL, NOW() - INTERVAL '5 days'),
('au100001-0000-4000-a000-000000000009', 'system',                   'system', 'appeal.resolved',                'appeal',             'ap100001-0000-4000-a000-000000000003', '{"status":"denied"}',                                                   NULL, NOW() - INTERVAL '4 days'),
('au100001-0000-4000-a000-000000000010', 'admin@qwickservices.com',  'admin',  'admin.login',                    'admin_user',         'admin-id',                              '{"ip":"72.60.68.137"}',                                  '72.60.68.137', NOW() - INTERVAL '1 day'),
('au100001-0000-4000-a000-000000000011', 'admin@qwickservices.com',  'admin',  'case.note_added',                'case',               'cs100001-0000-4000-a000-000000000001', '{"note_id":"cn100001-0000-4000-a000-000000000001"}',                    '72.60.68.137', NOW() - INTERVAL '8 days'),
('au100001-0000-4000-a000-000000000012', 'admin@qwickservices.com',  'admin',  'case.note_added',                'case',               'cs100001-0000-4000-a000-000000000002', '{"note_id":"cn100001-0000-4000-a000-000000000003"}',                    '72.60.68.137', NOW() - INTERVAL '5 days'),
('au100001-0000-4000-a000-000000000013', 'admin@qwickservices.com',  'admin',  'alert.status_changed',           'alert',              'al100001-0000-4000-a000-000000000001', '{"from":"open","to":"resolved"}',                                       '72.60.68.137', NOW() - INTERVAL '8 days'),
('au100001-0000-4000-a000-000000000014', 'admin@qwickservices.com',  'admin',  'alert.status_changed',           'alert',              'al100001-0000-4000-a000-000000000007', '{"from":"open","to":"dismissed"}',                                      '72.60.68.137', NOW() - INTERVAL '10 days');

COMMIT;
