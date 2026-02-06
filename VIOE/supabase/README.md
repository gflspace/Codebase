# VIOE Supabase Backend Setup

This directory contains the database schema and configuration for running VIOE with Supabase as the backend coordination layer.

## PCE Compliance

This backend implements the **Coordination Layer** of the PCE framework:
- **Planning Layer** → `planning/` directory (business rules, thresholds)
- **Coordination Layer** → Supabase (this backend)
- **Execution Layer** → Frontend React application

The database stores PCE configuration in the `pce_configuration` table, allowing runtime updates to business rules without code changes.

## Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings → API

### 2. Run Database Schema

1. Open the SQL Editor in your Supabase dashboard
2. Copy the contents of `schema.sql` and run it
3. This creates all tables, functions, triggers, and RLS policies

### 3. Load Sample Data (Optional)

1. In the SQL Editor, run `seed.sql` to populate sample data
2. This creates teams, assets, vulnerabilities, and other demo data

### 4. Configure Frontend

1. Copy `.env.example` to `.env` in the `extracted_app` directory
2. Set the environment variables:

```env
VITE_API_MODE=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Start the Application

```bash
cd extracted_app
npm run dev
```

## File Structure

```
supabase/
├── README.md           # This file
├── schema.sql          # Database schema (tables, functions, triggers, RLS)
├── seed.sql            # Sample data for development/testing
└── functions/          # Edge Functions (to be deployed)
    ├── triage-vulnerability/
    ├── bulk-triage/
    └── generate-insights/
```

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `teams` | Team definitions with ownership patterns |
| `assets` | Systems, services, and infrastructure |
| `vulnerabilities` | Core vulnerability records |
| `ownership_logs` | Audit trail of ownership changes |
| `remediation_tasks` | Work items for fixing vulnerabilities |
| `incident_responses` | Security incident tracking |
| `suppression_rules` | Rules for suppressing known issues |
| `compliance_reports` | Compliance assessment results |
| `vulnerability_snapshots` | Historical data for trends |

### PCE Configuration Table

The `pce_configuration` table stores all business rules from the Planning Layer:

| Config Key | Source Document | Description |
|------------|-----------------|-------------|
| `confidence_thresholds` | prioritization.md | AI assignment confidence levels |
| `sla_by_severity` | prioritization.md | Remediation SLA targets |
| `cvss_severity_mapping` | risk_model.md | CVSS to severity mapping |
| `epss_thresholds` | risk_model.md | Exploit prediction thresholds |
| `bulk_operation_limits` | automation.md | Batch operation limits |
| `auto_fix_confidence` | automation.md | Auto-fix requirements |
| `compliance_score_thresholds` | compliance.md | Compliance score interpretation |

### Database Functions

| Function | Description |
|----------|-------------|
| `get_pce_config(key)` | Retrieve PCE configuration value |
| `calculate_sla_due_date(severity, detected_at)` | Calculate SLA based on severity |
| `get_confidence_level(confidence)` | Map confidence score to level |
| `check_needs_review(team_id, confidence)` | Determine if review is needed |
| `calculate_risk_score(...)` | Calculate composite risk score |

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- **Authenticated users**: Read access to all tables
- **Service role**: Full access (for Edge Functions)

Customize these policies based on your organization's access requirements.

## Edge Functions

Deploy Edge Functions for coordination logic:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy triage-vulnerability
supabase functions deploy bulk-triage
supabase functions deploy generate-insights
```

## Updating PCE Configuration

To update business rules at runtime without code changes:

```sql
-- Update confidence thresholds
UPDATE pce_configuration
SET config_value = '{"high": 85, "medium": 65, "low": 45}'::jsonb,
    updated_by = 'admin@company.com'
WHERE config_key = 'confidence_thresholds';

-- Changes take effect immediately for new operations
```

## Monitoring

### Dashboard Summary View

```sql
SELECT * FROM dashboard_summary;
```

### Team Workload View

```sql
SELECT * FROM team_workload ORDER BY critical_open DESC;
```

### SLA Compliance View

```sql
SELECT * FROM sla_compliance;
```

## Backup & Recovery

Supabase provides automatic daily backups. For point-in-time recovery:

1. Go to Database → Backups in your Supabase dashboard
2. Select the backup point
3. Restore to a new project or in-place

## Troubleshooting

### Connection Issues

1. Verify your Supabase URL and anon key are correct
2. Check that RLS policies allow your user's access
3. Ensure your IP is not blocked by Supabase

### Missing Data

1. Verify `seed.sql` was run successfully
2. Check for any errors in the SQL Editor
3. Confirm the correct project is selected

### Performance

1. Check that indexes were created by `schema.sql`
2. Review Supabase dashboard for slow queries
3. Consider adding additional indexes for your query patterns

## Migration from Mock Mode

When migrating from mock mode to Supabase:

1. Export any custom data from mock mode (if needed)
2. Run `schema.sql` to create the database structure
3. Run `seed.sql` for sample data, or migrate your own data
4. Update `.env` to use `VITE_API_MODE=supabase`
5. Test all functionality before going to production

The frontend code is identical for both modes - only the backend adapter changes.
