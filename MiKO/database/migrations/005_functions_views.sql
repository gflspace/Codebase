-- ============================================================================
-- MiKO Clinical Concierge System - Functions and Views
-- Migration: 005_functions_views.sql
-- Description: Helper functions, stored procedures, and views
-- ============================================================================

-- ============================================================================
-- LEAD MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to calculate lead score
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  lead_record RECORD;
  interest_count INTEGER;
  has_high_value_procedure BOOLEAN;
BEGIN
  -- Get lead data
  SELECT * INTO lead_record FROM leads WHERE id = lead_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Base score for having contact info
  IF lead_record.email IS NOT NULL THEN
    score := score + 10;
  END IF;

  IF lead_record.phone IS NOT NULL THEN
    score := score + 15;
  END IF;

  -- Verified contact bonus
  IF lead_record.email_verified THEN
    score := score + 10;
  END IF;

  IF lead_record.phone_verified THEN
    score := score + 10;
  END IF;

  -- Source scoring
  CASE lead_record.source
    WHEN 'referral' THEN score := score + 20;
    WHEN 'google_ads' THEN score := score + 15;
    WHEN 'website' THEN score := score + 10;
    WHEN 'instagram' THEN score := score + 8;
    WHEN 'realself' THEN score := score + 12;
    ELSE score := score + 5;
  END CASE;

  -- Count clinical interests
  SELECT COUNT(*) INTO interest_count
  FROM clinical_interests
  WHERE clinical_interests.lead_id = calculate_lead_score.lead_id;

  score := score + LEAST(interest_count * 5, 20);

  -- Check for high-value procedures
  SELECT EXISTS (
    SELECT 1 FROM clinical_interests ci
    WHERE ci.lead_id = calculate_lead_score.lead_id
    AND ci.specific_procedure IN (
      'facelift', 'rhinoplasty', 'breast_augmentation',
      'tummy_tuck', 'mommy_makeover', 'bbl'
    )
  ) INTO has_high_value_procedure;

  IF has_high_value_procedure THEN
    score := score + 15;
  END IF;

  -- Engagement scoring based on status
  CASE lead_record.status
    WHEN 'qualified' THEN score := score + 20;
    WHEN 'booked' THEN score := score + 30;
    WHEN 'contacted' THEN score := score + 10;
    ELSE score := score + 0;
  END CASE;

  -- Cap at 100
  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update lead score
CREATE OR REPLACE FUNCTION update_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.lead_score := calculate_lead_score(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update lead score
CREATE TRIGGER trigger_update_lead_score
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_score();

-- ============================================================================
-- AVAILABILITY FUNCTIONS
-- ============================================================================

-- Function to get available time slots for a date range
CREATE OR REPLACE FUNCTION get_available_slots(
  start_date DATE,
  end_date DATE,
  slot_duration_minutes INTEGER DEFAULT 60,
  appointment_type_filter appointment_type DEFAULT 'virtual'
)
RETURNS TABLE (
  slot_start TIMESTAMPTZ,
  slot_end TIMESTAMPTZ,
  slot_date DATE,
  slot_time TIME
) AS $$
DECLARE
  current_date DATE := start_date;
  day_start TIME := '09:00:00';
  day_end TIME := '17:00:00';
  slot_interval INTERVAL;
  current_slot TIMESTAMPTZ;
  slot_end_time TIMESTAMPTZ;
BEGIN
  slot_interval := (slot_duration_minutes || ' minutes')::INTERVAL;

  WHILE current_date <= end_date LOOP
    -- Skip weekends
    IF EXTRACT(DOW FROM current_date) NOT IN (0, 6) THEN
      current_slot := current_date + day_start;

      WHILE (current_slot::TIME + slot_interval::TIME) <= day_end LOOP
        slot_end_time := current_slot + slot_interval;

        -- Check if slot is available (no blocking and no existing appointment)
        IF NOT EXISTS (
          SELECT 1 FROM availability_blocks ab
          WHERE ab.is_available = FALSE
          AND tstzrange(ab.start_time, ab.end_time) && tstzrange(current_slot, slot_end_time)
        )
        AND NOT EXISTS (
          SELECT 1 FROM appointments a
          WHERE a.status IN ('pending', 'confirmed', 'reminded')
          AND tstzrange(a.scheduled_at, a.end_time) && tstzrange(current_slot, slot_end_time)
        )
        THEN
          slot_start := current_slot;
          get_available_slots.slot_end := slot_end_time;
          slot_date := current_date;
          slot_time := current_slot::TIME;
          RETURN NEXT;
        END IF;

        current_slot := current_slot + slot_interval;
      END LOOP;
    END IF;

    current_date := current_date + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check specific slot availability
CREATE OR REPLACE FUNCTION is_slot_available(
  check_time TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  slot_end TIMESTAMPTZ;
BEGIN
  slot_end := check_time + (duration_minutes || ' minutes')::INTERVAL;

  -- Check for blocking
  IF EXISTS (
    SELECT 1 FROM availability_blocks ab
    WHERE ab.is_available = FALSE
    AND tstzrange(ab.start_time, ab.end_time) && tstzrange(check_time, slot_end)
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check for existing appointments
  IF EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.status IN ('pending', 'confirmed', 'reminded')
    AND tstzrange(a.scheduled_at, a.end_time) && tstzrange(check_time, slot_end)
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- COMMUNICATION AUDIT FUNCTIONS
-- ============================================================================

-- Function to log communication (called by n8n)
CREATE OR REPLACE FUNCTION log_communication(
  p_lead_id UUID,
  p_channel comm_channel,
  p_direction comm_direction,
  p_recipient TEXT,
  p_sender TEXT,
  p_message TEXT,
  p_message_type TEXT DEFAULT NULL,
  p_external_id TEXT DEFAULT NULL,
  p_workflow_id TEXT DEFAULT NULL,
  p_workflow_execution_id TEXT DEFAULT NULL,
  p_triggered_by TEXT DEFAULT 'system'
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO communication_audit (
    lead_id,
    channel,
    direction,
    recipient_identifier,
    sender_identifier,
    message_body,
    message_type,
    external_message_id,
    workflow_id,
    workflow_execution_id,
    triggered_by,
    delivery_status
  ) VALUES (
    p_lead_id,
    p_channel,
    p_direction,
    p_recipient,
    p_sender,
    p_message,
    p_message_type,
    p_external_id,
    p_workflow_id,
    p_workflow_execution_id,
    p_triggered_by,
    'sent'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DASHBOARD STATISTICS FUNCTIONS
-- ============================================================================

-- Function to get lead pipeline statistics
CREATE OR REPLACE FUNCTION get_lead_pipeline_stats(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  status lead_status,
  count BIGINT,
  percentage DECIMAL(5,2)
) AS $$
DECLARE
  total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM leads
  WHERE created_at BETWEEN start_date AND end_date;

  RETURN QUERY
  SELECT
    l.status,
    COUNT(*)::BIGINT,
    ROUND((COUNT(*)::DECIMAL / NULLIF(total_count, 0) * 100), 2)
  FROM leads l
  WHERE l.created_at BETWEEN start_date AND end_date
  GROUP BY l.status
  ORDER BY
    CASE l.status
      WHEN 'new' THEN 1
      WHEN 'contacted' THEN 2
      WHEN 'qualified' THEN 3
      WHEN 'booked' THEN 4
      WHEN 'completed' THEN 5
      WHEN 'no_show' THEN 6
      WHEN 'archived' THEN 7
      WHEN 'disqualified' THEN 8
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get daily lead counts
CREATE OR REPLACE FUNCTION get_daily_lead_counts(
  days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  new_leads BIGINT,
  contacted BIGINT,
  booked BIGINT,
  completed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.date::DATE,
    COALESCE(SUM(CASE WHEN l.status = 'new' THEN 1 ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN l.status = 'contacted' THEN 1 ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN l.status = 'booked' THEN 1 ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN l.status = 'completed' THEN 1 ELSE 0 END), 0)::BIGINT
  FROM generate_series(
    CURRENT_DATE - (days || ' days')::INTERVAL,
    CURRENT_DATE,
    '1 day'::INTERVAL
  ) AS d(date)
  LEFT JOIN leads l ON DATE(l.created_at) = d.date::DATE
  GROUP BY d.date
  ORDER BY d.date;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get speed-to-lead metrics
CREATE OR REPLACE FUNCTION get_speed_to_lead_stats(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE (
  avg_response_seconds DECIMAL(10,2),
  median_response_seconds DECIMAL(10,2),
  under_60_seconds_pct DECIMAL(5,2),
  under_5_minutes_pct DECIMAL(5,2),
  total_leads BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH response_times AS (
    SELECT
      EXTRACT(EPOCH FROM (first_contacted_at - created_at)) AS response_seconds
    FROM leads
    WHERE created_at >= start_date
    AND first_contacted_at IS NOT NULL
  )
  SELECT
    ROUND(AVG(response_seconds)::DECIMAL, 2),
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_seconds)::DECIMAL, 2),
    ROUND((COUNT(*) FILTER (WHERE response_seconds < 60)::DECIMAL /
           NULLIF(COUNT(*), 0) * 100), 2),
    ROUND((COUNT(*) FILTER (WHERE response_seconds < 300)::DECIMAL /
           NULLIF(COUNT(*), 0) * 100), 2),
    COUNT(*)::BIGINT
  FROM response_times;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Active leads with latest activity
CREATE OR REPLACE VIEW v_active_leads AS
SELECT
  l.*,
  ci.procedure_category AS primary_procedure_category,
  ci.specific_procedure AS primary_procedure,
  a.scheduled_at AS next_appointment,
  a.appointment_type AS next_appointment_type,
  (
    SELECT COUNT(*)
    FROM communication_audit ca
    WHERE ca.lead_id = l.id
  ) AS communication_count,
  (
    SELECT MAX(created_at)
    FROM ai_qual_logs aql
    WHERE aql.lead_id = l.id
  ) AS last_ai_interaction
FROM leads l
LEFT JOIN LATERAL (
  SELECT procedure_category, specific_procedure
  FROM clinical_interests
  WHERE lead_id = l.id
  ORDER BY created_at DESC
  LIMIT 1
) ci ON TRUE
LEFT JOIN LATERAL (
  SELECT scheduled_at, appointment_type
  FROM appointments
  WHERE lead_id = l.id
  AND status IN ('pending', 'confirmed', 'reminded')
  AND scheduled_at > NOW()
  ORDER BY scheduled_at ASC
  LIMIT 1
) a ON TRUE
WHERE l.status NOT IN ('archived', 'disqualified');

-- View: Leads requiring clinical review
CREATE OR REPLACE VIEW v_leads_pending_review AS
SELECT
  l.id,
  l.full_name,
  l.email,
  l.phone,
  l.risk_level,
  l.risk_flags,
  l.created_at,
  aql.input_message AS trigger_message,
  aql.risk_keywords_detected,
  aql.escalation_reason,
  aql.created_at AS escalated_at
FROM leads l
INNER JOIN ai_qual_logs aql ON aql.lead_id = l.id AND aql.escalated = TRUE
WHERE l.requires_clinical_review = TRUE
AND l.clinical_review_completed_at IS NULL
ORDER BY l.created_at ASC;

-- View: Today's appointments
CREATE OR REPLACE VIEW v_todays_appointments AS
SELECT
  a.*,
  l.full_name AS patient_name,
  l.email AS patient_email,
  l.phone AS patient_phone,
  ci.specific_procedure AS procedure_interest
FROM appointments a
INNER JOIN leads l ON l.id = a.lead_id
LEFT JOIN LATERAL (
  SELECT specific_procedure
  FROM clinical_interests
  WHERE lead_id = l.id
  ORDER BY created_at DESC
  LIMIT 1
) ci ON TRUE
WHERE DATE(a.scheduled_at AT TIME ZONE 'America/Los_Angeles') = CURRENT_DATE
AND a.status IN ('pending', 'confirmed', 'reminded', 'checked_in')
ORDER BY a.scheduled_at ASC;

-- View: Upcoming reminders to send
CREATE OR REPLACE VIEW v_pending_reminders AS
SELECT
  ar.*,
  a.scheduled_at AS appointment_time,
  l.full_name AS patient_name,
  l.phone AS patient_phone,
  l.email AS patient_email
FROM appointment_reminders ar
INNER JOIN appointments a ON a.id = ar.appointment_id
INNER JOIN leads l ON l.id = a.lead_id
WHERE ar.delivery_status = 'pending'
AND ar.sent_at IS NULL
AND ar.scheduled_for <= NOW() + INTERVAL '5 minutes'
AND a.status IN ('pending', 'confirmed', 'reminded')
ORDER BY ar.scheduled_for ASC;

-- ============================================================================
-- GRANTS FOR VIEWS
-- ============================================================================

GRANT SELECT ON v_active_leads TO authenticated;
GRANT SELECT ON v_leads_pending_review TO authenticated;
GRANT SELECT ON v_todays_appointments TO authenticated;
GRANT SELECT ON v_pending_reminders TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION calculate_lead_score IS 'Calculates lead quality score based on multiple factors';
COMMENT ON FUNCTION get_available_slots IS 'Returns available appointment slots for date range';
COMMENT ON FUNCTION is_slot_available IS 'Checks if specific time slot is available';
COMMENT ON FUNCTION log_communication IS 'Logs communication to audit table (called by n8n)';
COMMENT ON FUNCTION get_lead_pipeline_stats IS 'Returns lead pipeline statistics for dashboard';
COMMENT ON FUNCTION get_daily_lead_counts IS 'Returns daily lead counts for charts';
COMMENT ON FUNCTION get_speed_to_lead_stats IS 'Returns speed-to-lead metrics';
COMMENT ON VIEW v_active_leads IS 'Active leads with enriched data';
COMMENT ON VIEW v_leads_pending_review IS 'Leads requiring clinical review';
COMMENT ON VIEW v_todays_appointments IS 'Today scheduled appointments';
COMMENT ON VIEW v_pending_reminders IS 'Reminders due to be sent';
