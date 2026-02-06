-- ============================================================================
-- MiKO Clinical Concierge System - Scheduling Tables
-- Migration: 003_scheduling_tables.sql
-- Description: Creates appointments and related scheduling tables
-- ============================================================================

-- ============================================================================
-- ENUM TYPES FOR SCHEDULING
-- ============================================================================

-- Appointment types
CREATE TYPE appointment_type AS ENUM (
  'virtual',
  'in_person',
  'phone',
  'follow_up',
  'pre_op',
  'post_op',
  'procedure'
);

-- Appointment status
CREATE TYPE appointment_status AS ENUM (
  'pending',
  'confirmed',
  'reminded',
  'checked_in',
  'in_progress',
  'completed',
  'no_show',
  'cancelled',
  'rescheduled'
);

-- Cancellation reasons
CREATE TYPE cancellation_reason AS ENUM (
  'patient_request',
  'schedule_conflict',
  'illness',
  'emergency',
  'weather',
  'provider_unavailable',
  'no_response',
  'other'
);

-- ============================================================================
-- APPOINTMENTS TABLE
-- ============================================================================

CREATE TABLE appointments (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Appointment details
  appointment_type appointment_type NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  end_time TIMESTAMPTZ GENERATED ALWAYS AS (scheduled_at + (duration_minutes || ' minutes')::INTERVAL) STORED,

  -- Location
  location TEXT, -- For in-person: '9301 Wilshire Blvd, Suite 402, Beverly Hills, CA 90210'
  virtual_meeting_url TEXT, -- For virtual: Zoom/Google Meet link
  virtual_meeting_id TEXT,
  virtual_meeting_password TEXT,

  -- Procedure information
  procedure_of_interest TEXT,
  consultation_notes TEXT, -- Pre-filled notes about patient interest

  -- External calendar sync
  google_calendar_event_id TEXT,
  google_calendar_link TEXT,

  -- Reminder tracking
  confirmation_sent_at TIMESTAMPTZ,
  reminder_48h_sent_at TIMESTAMPTZ,
  reminder_24h_sent_at TIMESTAMPTZ,
  reminder_2h_sent_at TIMESTAMPTZ,
  patient_confirmed BOOLEAN DEFAULT FALSE,
  patient_confirmed_at TIMESTAMPTZ,

  -- Cancellation/Rescheduling
  cancelled_at TIMESTAMPTZ,
  cancellation_reason cancellation_reason,
  cancellation_notes TEXT,
  rescheduled_from_id UUID REFERENCES appointments(id),
  rescheduled_to_id UUID REFERENCES appointments(id),

  -- No-show handling
  marked_no_show_at TIMESTAMPTZ,
  no_show_follow_up_sent BOOLEAN DEFAULT FALSE,

  -- Check-in
  checked_in_at TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,

  -- Outcome
  outcome_notes TEXT,
  next_steps TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,

  -- Staff assignment
  assigned_provider TEXT DEFAULT 'Dr. Michael K. Obeng',
  coordinator_id UUID REFERENCES auth.users(id),

  -- Booking source
  booked_via TEXT DEFAULT 'ai_chat', -- 'ai_chat', 'phone', 'website', 'staff'
  booked_by_user_id UUID REFERENCES auth.users(id),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- APPOINTMENT_REMINDERS TABLE
-- Tracks all reminder communications for appointments
-- ============================================================================

CREATE TABLE appointment_reminders (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,

  -- Reminder details
  reminder_type TEXT NOT NULL, -- 'confirmation', '48h', '24h', '2h', 'custom'
  channel comm_channel NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,

  -- Delivery
  delivery_status TEXT DEFAULT 'pending',
  external_message_id TEXT,
  delivery_error TEXT,

  -- Response tracking
  patient_responded BOOLEAN DEFAULT FALSE,
  patient_response TEXT,
  response_received_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AVAILABILITY_BLOCKS TABLE
-- Tracks provider availability and blocked times
-- ============================================================================

CREATE TABLE availability_blocks (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Time block
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,

  -- Type
  is_available BOOLEAN NOT NULL DEFAULT TRUE, -- TRUE = available, FALSE = blocked
  block_reason TEXT, -- For blocked time

  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- iCal RRULE format

  -- Provider
  provider_name TEXT DEFAULT 'Dr. Michael K. Obeng',

  -- Appointment types allowed during this block
  allowed_appointment_types appointment_type[] DEFAULT ARRAY['virtual', 'in_person', 'phone']::appointment_type[],

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- ============================================================================
-- WAITLIST TABLE
-- For patients wanting earlier appointments
-- ============================================================================

CREATE TABLE waitlist (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  current_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,

  -- Preferences
  preferred_appointment_type appointment_type NOT NULL,
  preferred_dates DATERANGE[], -- Array of preferred date ranges
  preferred_times TEXT[], -- e.g., ['morning', 'afternoon', 'any']
  flexible_on_type BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  notified_count INTEGER DEFAULT 0,
  last_notified_at TIMESTAMPTZ,

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_appointment_id UUID REFERENCES appointments(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR SCHEDULING TABLES
-- ============================================================================

-- Appointments indexes
CREATE INDEX idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_appointments_type ON appointments(appointment_type);
CREATE INDEX idx_appointments_google_event ON appointments(google_calendar_event_id) WHERE google_calendar_event_id IS NOT NULL;
CREATE INDEX idx_appointments_upcoming ON appointments(scheduled_at)
  WHERE status IN ('pending', 'confirmed', 'reminded') AND scheduled_at > NOW();
CREATE INDEX idx_appointments_needs_reminder ON appointments(scheduled_at)
  WHERE status IN ('pending', 'confirmed') AND patient_confirmed = FALSE;

-- Appointment reminders indexes
CREATE INDEX idx_reminders_appointment_id ON appointment_reminders(appointment_id);
CREATE INDEX idx_reminders_scheduled_for ON appointment_reminders(scheduled_for);
CREATE INDEX idx_reminders_pending ON appointment_reminders(scheduled_for)
  WHERE delivery_status = 'pending' AND sent_at IS NULL;

-- Availability blocks indexes
CREATE INDEX idx_availability_time_range ON availability_blocks USING GIST (
  tstzrange(start_time, end_time)
);
CREATE INDEX idx_availability_available ON availability_blocks(is_available, start_time)
  WHERE is_available = TRUE;

-- Waitlist indexes
CREATE INDEX idx_waitlist_lead_id ON waitlist(lead_id);
CREATE INDEX idx_waitlist_active ON waitlist(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_waitlist_type ON waitlist(preferred_appointment_type);

-- ============================================================================
-- TRIGGERS FOR SCHEDULING TABLES
-- ============================================================================

-- Trigger for appointments updated_at
CREATE TRIGGER trigger_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for availability_blocks updated_at
CREATE TRIGGER trigger_availability_updated_at
  BEFORE UPDATE ON availability_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for waitlist updated_at
CREATE TRIGGER trigger_waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update lead status when appointment is created
CREATE OR REPLACE FUNCTION update_lead_on_appointment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update lead status to booked when appointment is created
  IF TG_OP = 'INSERT' THEN
    UPDATE leads
    SET
      status = 'booked',
      last_activity_at = NOW()
    WHERE id = NEW.lead_id AND status NOT IN ('completed', 'no_show', 'archived');
  END IF;

  -- Update lead status based on appointment outcome
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      UPDATE leads SET status = 'completed', last_activity_at = NOW() WHERE id = NEW.lead_id;
    ELSIF NEW.status = 'no_show' AND OLD.status != 'no_show' THEN
      UPDATE leads SET status = 'no_show', last_activity_at = NOW() WHERE id = NEW.lead_id;
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      -- Check if lead has other active appointments
      IF NOT EXISTS (
        SELECT 1 FROM appointments
        WHERE lead_id = NEW.lead_id
        AND id != NEW.id
        AND status IN ('pending', 'confirmed', 'reminded')
      ) THEN
        UPDATE leads SET status = 'qualified', last_activity_at = NOW() WHERE id = NEW.lead_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync lead status with appointment status
CREATE TRIGGER trigger_appointment_lead_sync
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_on_appointment();

-- Function to create appointment reminders
CREATE OR REPLACE FUNCTION create_appointment_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Create 48-hour reminder
  INSERT INTO appointment_reminders (appointment_id, reminder_type, channel, scheduled_for)
  VALUES (NEW.id, '48h', 'sms', NEW.scheduled_at - INTERVAL '48 hours');

  -- Create 24-hour reminder
  INSERT INTO appointment_reminders (appointment_id, reminder_type, channel, scheduled_for)
  VALUES (NEW.id, '24h', 'email', NEW.scheduled_at - INTERVAL '24 hours');

  -- Create 2-hour reminder
  INSERT INTO appointment_reminders (appointment_id, reminder_type, channel, scheduled_for)
  VALUES (NEW.id, '2h', 'sms', NEW.scheduled_at - INTERVAL '2 hours');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create reminders for new appointments
CREATE TRIGGER trigger_create_appointment_reminders
  AFTER INSERT ON appointments
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'confirmed'))
  EXECUTE FUNCTION create_appointment_reminders();

-- ============================================================================
-- ADD FOREIGN KEY FOR COMMUNICATION_AUDIT
-- ============================================================================

ALTER TABLE communication_audit
  ADD CONSTRAINT fk_comm_audit_appointment
  FOREIGN KEY (appointment_id)
  REFERENCES appointments(id)
  ON DELETE SET NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE appointments IS 'All consultation and procedure appointments';
COMMENT ON TABLE appointment_reminders IS 'Scheduled reminders for appointments';
COMMENT ON TABLE availability_blocks IS 'Provider availability and blocked time slots';
COMMENT ON TABLE waitlist IS 'Patients waiting for earlier appointment slots';
COMMENT ON COLUMN appointments.end_time IS 'Auto-calculated based on scheduled_at + duration';
COMMENT ON COLUMN appointments.google_calendar_event_id IS 'Synced Google Calendar event ID';
COMMENT ON COLUMN availability_blocks.recurrence_rule IS 'iCal RRULE format for recurring availability';
