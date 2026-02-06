-- ============================================================================
-- MiKO Clinical Concierge System - Seed Data
-- Migration: 006_seed_data.sql
-- Description: Initial data for testing and development
-- ============================================================================

-- ============================================================================
-- DEFAULT AVAILABILITY BLOCKS
-- Set up standard business hours (Mon-Fri 9AM-5PM PST)
-- ============================================================================

-- Block weekends for the next 6 months
INSERT INTO availability_blocks (start_time, end_time, is_available, block_reason, is_recurring, provider_name)
SELECT
  (generate_series::DATE + TIME '00:00:00') AT TIME ZONE 'America/Los_Angeles',
  (generate_series::DATE + TIME '23:59:59') AT TIME ZONE 'America/Los_Angeles',
  FALSE,
  'Weekend - Office Closed',
  FALSE,
  'Dr. Michael K. Obeng'
FROM generate_series(
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '6 months',
  '1 day'::INTERVAL
) AS generate_series
WHERE EXTRACT(DOW FROM generate_series) IN (0, 6);  -- Sunday = 0, Saturday = 6

-- Block lunch hours (12PM-1PM) for weekdays
INSERT INTO availability_blocks (start_time, end_time, is_available, block_reason, is_recurring, provider_name)
SELECT
  (generate_series::DATE + TIME '12:00:00') AT TIME ZONE 'America/Los_Angeles',
  (generate_series::DATE + TIME '13:00:00') AT TIME ZONE 'America/Los_Angeles',
  FALSE,
  'Lunch Break',
  FALSE,
  'Dr. Michael K. Obeng'
FROM generate_series(
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '3 months',
  '1 day'::INTERVAL
) AS generate_series
WHERE EXTRACT(DOW FROM generate_series) NOT IN (0, 6);

-- ============================================================================
-- SAMPLE LEADS (for development/testing only)
-- Remove or comment out for production deployment
-- ============================================================================

-- Sample Lead 1: New inquiry
INSERT INTO leads (full_name, email, phone, status, source, lead_score, notes, created_at)
VALUES (
  'Sarah Johnson',
  'sarah.johnson@example.com',
  '+13105551001',
  'new',
  'website',
  45,
  'Interested in rhinoplasty consultation',
  NOW() - INTERVAL '2 hours'
);

-- Sample Lead 2: Contacted
INSERT INTO leads (full_name, email, phone, status, source, lead_score, first_contacted_at, notes, created_at)
VALUES (
  'Michael Chen',
  'michael.chen@example.com',
  '+13105551002',
  'contacted',
  'instagram',
  65,
  NOW() - INTERVAL '1 day' + INTERVAL '30 seconds',
  'Referred by existing patient. Interested in facelift.',
  NOW() - INTERVAL '1 day'
);

-- Sample Lead 3: Qualified
INSERT INTO leads (full_name, email, phone, status, source, lead_score, first_contacted_at, notes, created_at)
VALUES (
  'Jennifer Martinez',
  'jennifer.m@example.com',
  '+13105551003',
  'qualified',
  'referral',
  85,
  NOW() - INTERVAL '3 days' + INTERVAL '45 seconds',
  'Mommy makeover candidate. Budget confirmed.',
  NOW() - INTERVAL '3 days'
);

-- Sample Lead 4: Booked
INSERT INTO leads (full_name, email, phone, status, source, lead_score, first_contacted_at, notes, created_at)
VALUES (
  'David Williams',
  'david.w@example.com',
  '+13105551004',
  'booked',
  'google_ads',
  90,
  NOW() - INTERVAL '5 days' + INTERVAL '25 seconds',
  'Consultation scheduled for rhinoplasty.',
  NOW() - INTERVAL '5 days'
);

-- Sample Lead 5: High Risk (requires review)
INSERT INTO leads (full_name, email, phone, status, source, lead_score, risk_level, risk_flags, requires_clinical_review, notes, created_at)
VALUES (
  'Amanda Thompson',
  'amanda.t@example.com',
  '+13105551005',
  'contacted',
  'realself',
  55,
  'high',
  ARRAY['revision', 'complication'],
  TRUE,
  'Previous rhinoplasty with complications. Needs clinical review.',
  NOW() - INTERVAL '12 hours'
);

-- ============================================================================
-- SAMPLE CLINICAL INTERESTS
-- ============================================================================

-- Interests for Sarah Johnson
INSERT INTO clinical_interests (lead_id, procedure_category, specific_procedure, interest_level, timeline)
SELECT id, 'facial', 'rhinoplasty', 8, 'within_3_months'
FROM leads WHERE email = 'sarah.johnson@example.com';

-- Interests for Michael Chen
INSERT INTO clinical_interests (lead_id, procedure_category, specific_procedure, interest_level, timeline, budget_range)
SELECT id, 'facial', 'facelift', 9, 'within_1_month', '20k_plus'
FROM leads WHERE email = 'michael.chen@example.com';

-- Interests for Jennifer Martinez
INSERT INTO clinical_interests (lead_id, procedure_category, specific_procedure, interest_level, timeline, budget_range)
SELECT id, 'body', 'mommy_makeover', 10, 'within_1_month', '20k_plus'
FROM leads WHERE email = 'jennifer.m@example.com';

INSERT INTO clinical_interests (lead_id, procedure_category, specific_procedure, interest_level)
SELECT id, 'breast', 'breast_augmentation', 8
FROM leads WHERE email = 'jennifer.m@example.com';

-- Interests for David Williams
INSERT INTO clinical_interests (lead_id, procedure_category, specific_procedure, interest_level, timeline, ai_qualified, ai_qualification_score)
SELECT id, 'facial', 'rhinoplasty', 9, 'within_1_month', TRUE, 92.5
FROM leads WHERE email = 'david.w@example.com';

-- Interests for Amanda Thompson (revision case)
INSERT INTO clinical_interests (lead_id, procedure_category, specific_procedure, interest_level, is_revision, has_prior_surgery, prior_surgery_details)
SELECT id, 'revision', 'rhinoplasty_revision', 10, TRUE, TRUE, 'Primary rhinoplasty 2 years ago at different practice. Breathing issues and asymmetry.'
FROM leads WHERE email = 'amanda.t@example.com';

-- ============================================================================
-- SAMPLE APPOINTMENTS
-- ============================================================================

-- Appointment for David Williams (upcoming)
INSERT INTO appointments (lead_id, appointment_type, status, scheduled_at, duration_minutes, location, procedure_of_interest, patient_confirmed, booked_via)
SELECT
  id,
  'in_person',
  'confirmed',
  (CURRENT_DATE + INTERVAL '3 days' + TIME '10:00:00') AT TIME ZONE 'America/Los_Angeles',
  60,
  '9301 Wilshire Blvd, Suite 402, Beverly Hills, CA 90210',
  'rhinoplasty',
  TRUE,
  'ai_chat'
FROM leads WHERE email = 'david.w@example.com';

-- Virtual consultation for Jennifer Martinez (upcoming)
INSERT INTO appointments (lead_id, appointment_type, status, scheduled_at, duration_minutes, virtual_meeting_url, procedure_of_interest, booked_via)
SELECT
  id,
  'virtual',
  'confirmed',
  (CURRENT_DATE + INTERVAL '5 days' + TIME '14:00:00') AT TIME ZONE 'America/Los_Angeles',
  45,
  'https://zoom.us/j/example123',
  'mommy_makeover',
  'website'
FROM leads WHERE email = 'jennifer.m@example.com';

-- ============================================================================
-- SAMPLE AI QUALIFICATION LOGS
-- ============================================================================

-- AI interaction for Sarah Johnson
INSERT INTO ai_qual_logs (lead_id, session_id, input_message, input_channel, intent_detected, intent_confidence, ai_response, ai_action, model_used, response_time_ms)
SELECT
  id,
  'session_' || id::TEXT,
  'Hi, I am interested in rhinoplasty. What is the consultation process?',
  'web_chat',
  'procedure_inquiry',
  0.92,
  'Thank you for your interest in rhinoplasty! Dr. Obeng is a Harvard-trained plastic surgeon who specializes in facial procedures. The consultation process begins with a virtual or in-person meeting where Dr. Obeng will assess your goals and create a personalized treatment plan. Would you like to schedule a consultation?',
  'responded',
  'gpt-4',
  1250
FROM leads WHERE email = 'sarah.johnson@example.com';

-- AI interaction for Amanda Thompson (escalated)
INSERT INTO ai_qual_logs (lead_id, session_id, input_message, input_channel, intent_detected, intent_confidence, risk_keywords_detected, risk_score, escalated, escalation_reason, ai_response, ai_action, model_used, response_time_ms)
SELECT
  id,
  'session_' || id::TEXT,
  'I had a rhinoplasty 2 years ago but had complications. I need a revision surgery.',
  'web_chat',
  'procedure_inquiry',
  0.88,
  ARRAY['revision', 'complication'],
  75.0,
  TRUE,
  'Patient mentioned revision surgery and previous complications - requires clinical review',
  'I understand you are looking for revision rhinoplasty care. Dr. Obeng is highly experienced with revision cases and has helped many patients who have had previous complications. Given the complexity of revision procedures, I will have our clinical coordinator reach out to you directly to gather more details about your case. They will contact you within the next few hours.',
  'escalated',
  'gpt-4',
  1450
FROM leads WHERE email = 'amanda.t@example.com';

-- ============================================================================
-- SAMPLE COMMUNICATION AUDIT
-- ============================================================================

-- Initial contact SMS for Sarah Johnson
INSERT INTO communication_audit (lead_id, channel, direction, recipient_identifier, sender_identifier, message_body, message_type, delivery_status, external_provider, triggered_by)
SELECT
  id,
  'sms',
  'outbound',
  '+13105551001',
  '+13101234567',
  'Hello Sarah, this is MiKO from Dr. Obeng''s practice. We received your inquiry about rhinoplasty. Would you like to schedule a consultation? Reply YES to continue.',
  'initial_contact',
  'delivered',
  'twilio',
  'ai'
FROM leads WHERE email = 'sarah.johnson@example.com';

-- Confirmation email for David Williams
INSERT INTO communication_audit (lead_id, channel, direction, recipient_identifier, sender_identifier, message_body, message_type, delivery_status, external_provider, triggered_by)
SELECT
  l.id,
  'email',
  'outbound',
  'david.w@example.com',
  'concierge@mikoplasticsurgery.com',
  'Dear David, Your consultation with Dr. Michael K. Obeng is confirmed for ' || to_char(a.scheduled_at, 'Day, Month DD at HH:MI AM') || '. Location: 9301 Wilshire Blvd, Suite 402, Beverly Hills, CA 90210. We look forward to seeing you!',
  'confirmation',
  'delivered',
  'gmail',
  'system'
FROM leads l
JOIN appointments a ON a.lead_id = l.id
WHERE l.email = 'david.w@example.com';

-- ============================================================================
-- SAMPLE CHAT SESSIONS
-- ============================================================================

-- Active chat session for Sarah Johnson
INSERT INTO chat_sessions (session_id, lead_id, is_active, message_count, last_message_at, current_intent, source_page)
SELECT
  'session_' || id::TEXT,
  id,
  TRUE,
  3,
  NOW() - INTERVAL '1 hour',
  'procedure_inquiry',
  '/procedures/rhinoplasty'
FROM leads WHERE email = 'sarah.johnson@example.com';

-- Completed chat session for David Williams
INSERT INTO chat_sessions (session_id, lead_id, is_active, message_count, last_message_at, ended_at, current_intent, source_page, conversation_summary)
SELECT
  'session_' || id::TEXT,
  id,
  FALSE,
  8,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days',
  'booking_request',
  '/',
  'Patient inquired about rhinoplasty, qualified through AI, and booked in-person consultation.'
FROM leads WHERE email = 'david.w@example.com';

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to verify seed data was inserted correctly
-- ============================================================================

-- Uncomment to verify:
-- SELECT 'Leads' as table_name, COUNT(*) as count FROM leads
-- UNION ALL SELECT 'Clinical Interests', COUNT(*) FROM clinical_interests
-- UNION ALL SELECT 'Appointments', COUNT(*) FROM appointments
-- UNION ALL SELECT 'AI Qual Logs', COUNT(*) FROM ai_qual_logs
-- UNION ALL SELECT 'Communication Audit', COUNT(*) FROM communication_audit
-- UNION ALL SELECT 'Chat Sessions', COUNT(*) FROM chat_sessions
-- UNION ALL SELECT 'Availability Blocks', COUNT(*) FROM availability_blocks;
