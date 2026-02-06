# MiKO Database Schema

This directory contains the complete database schema for the MiKO Clinical Concierge System.

## Quick Start

### Option 1: Full Schema (Recommended)
Run the complete schema in one go:

```sql
-- In Supabase SQL Editor
\i migrations/000_full_schema.sql
```

Or copy the contents of `migrations/000_full_schema.sql` and paste into Supabase SQL Editor.

### Option 2: Individual Migrations
Run migrations in order:

1. `001_core_tables.sql` - Leads and clinical interests
2. `002_communication_tables.sql` - AI logs, chat sessions, audit trail
3. `003_scheduling_tables.sql` - Appointments and availability
4. `004_rls_policies.sql` - Row Level Security policies
5. `005_functions_views.sql` - Helper functions and views
6. `006_seed_data.sql` - Sample data (optional, for development)

## Schema Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `leads` | Patient lead management |
| `clinical_interests` | Procedure interests per lead |

### Communication Tables

| Table | Description |
|-------|-------------|
| `ai_qual_logs` | AI qualification interactions |
| `chat_sessions` | Web chat session tracking |
| `communication_audit` | HIPAA-compliant audit trail |

### Scheduling Tables

| Table | Description |
|-------|-------------|
| `appointments` | All consultations and procedures |
| `appointment_reminders` | Scheduled reminder tracking |
| `availability_blocks` | Provider availability |
| `waitlist` | Patients waiting for slots |

### Security Tables

| Table | Description |
|-------|-------------|
| `user_roles` | Application role assignments |

## Key Functions

### Lead Management
- `calculate_lead_score(lead_id)` - Calculate lead quality score
- `get_lead_pipeline_stats(start_date, end_date)` - Pipeline statistics
- `get_speed_to_lead_stats(start_date)` - Response time metrics

### Scheduling
- `get_available_slots(start_date, end_date, duration, type)` - Find open slots
- `is_slot_available(time, duration)` - Check specific slot

### Communication
- `log_communication(...)` - Log to audit table (for n8n)

## Views

| View | Description |
|------|-------------|
| `v_active_leads` | Active leads with enriched data |
| `v_leads_pending_review` | Leads requiring clinical review |
| `v_todays_appointments` | Today's scheduled appointments |
| `v_pending_reminders` | Reminders due to be sent |

## User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access to all tables |
| `staff` | Read all, write assigned leads |
| `clinical_reviewer` | Staff + clinical review actions |
| `readonly` | Read-only access |

## Enum Types

### lead_status
```
new → contacted → qualified → booked → completed
                                    ↘ no_show
                           archived / disqualified
```

### appointment_status
```
pending → confirmed → reminded → checked_in → in_progress → completed
                                                         ↘ no_show
                              cancelled / rescheduled
```

## Environment Variables

Required for Supabase connection:

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Server-side only
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Testing the Schema

After running migrations:

```sql
-- Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = TRUE;

-- Verify functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- Test available slots function
SELECT * FROM get_available_slots(CURRENT_DATE, CURRENT_DATE + 7);
```

## HIPAA Compliance Notes

1. **RLS Enabled**: All tables have Row Level Security
2. **Audit Trail**: `communication_audit` logs all PHI access
3. **PHI Flagging**: `contains_phi` column on communications
4. **Retention Categories**: Data retention policies supported
5. **Encryption**: All data encrypted at rest via Supabase

## Maintenance

### Extend Availability Blocks
Run periodically to extend weekend/holiday blocking:

```sql
-- Block weekends for next 6 months
INSERT INTO availability_blocks (start_time, end_time, is_available, block_reason)
SELECT
  (d::DATE + TIME '00:00:00') AT TIME ZONE 'America/Los_Angeles',
  (d::DATE + TIME '23:59:59') AT TIME ZONE 'America/Los_Angeles',
  FALSE,
  'Weekend'
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months', '1 day') d
WHERE EXTRACT(DOW FROM d) IN (0, 6)
ON CONFLICT DO NOTHING;
```

### Clean Old Sessions
```sql
-- Archive inactive chat sessions older than 30 days
UPDATE chat_sessions
SET is_active = FALSE
WHERE is_active = TRUE
AND last_message_at < NOW() - INTERVAL '30 days';
```
