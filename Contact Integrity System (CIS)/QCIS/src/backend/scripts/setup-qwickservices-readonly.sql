-- ═══════════════════════════════════════════════════════════════
--  QwickServices Database — CIS Read-Only User Setup
-- ═══════════════════════════════════════════════════════════════
--
-- Run this on the QwickServices database server to create a
-- read-only user that CIS will use for data sync.
--
-- Usage (as QwickServices DB admin):
--   psql -h <host> -U <admin_user> -d <qwickservices_db> -f setup-qwickservices-readonly.sql
--
-- Replace CHANGE_ME_SECURE_PASSWORD with the value you set for
-- SYNC_DB_PASSWORD in CIS's .env.production.
--
-- ═══════════════════════════════════════════════════════════════

-- 1. Create the read-only role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cis_readonly') THEN
        CREATE ROLE cis_readonly WITH LOGIN PASSWORD 'CHANGE_ME_SECURE_PASSWORD';
    END IF;
END
$$;

-- 2. Connect to the correct database (run these as the DB owner)

-- Grant CONNECT privilege
GRANT CONNECT ON DATABASE qwickservices TO cis_readonly;

-- Grant USAGE on the public schema
GRANT USAGE ON SCHEMA public TO cis_readonly;

-- 3. Grant SELECT on the specific tables CIS needs to read
-- (these are the tables referenced in CIS sync mappings)

GRANT SELECT ON TABLE users TO cis_readonly;
GRANT SELECT ON TABLE bookings TO cis_readonly;
GRANT SELECT ON TABLE payments TO cis_readonly;
GRANT SELECT ON TABLE messages TO cis_readonly;
GRANT SELECT ON TABLE ratings TO cis_readonly;
GRANT SELECT ON TABLE disputes TO cis_readonly;
GRANT SELECT ON TABLE providers TO cis_readonly;

-- 4. Grant SELECT on future tables (optional — for new tables added later)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO cis_readonly;

-- 5. Ensure the user cannot write, create, or drop anything
REVOKE CREATE ON SCHEMA public FROM cis_readonly;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM cis_readonly;

-- 6. Set a connection limit (prevent excessive connections from CIS)
ALTER ROLE cis_readonly CONNECTION LIMIT 10;

-- 7. Set statement timeout (prevent long-running queries from CIS)
ALTER ROLE cis_readonly SET statement_timeout = '15s';

-- ─── Verification ────────────────────────────────────────────
-- Run these to verify the setup:
--
--   -- Test connection:
--   psql -h <host> -U cis_readonly -d qwickservices -c "SELECT 1"
--
--   -- Verify read access:
--   psql -h <host> -U cis_readonly -d qwickservices -c "SELECT count(*) FROM users"
--
--   -- Verify write is blocked:
--   psql -h <host> -U cis_readonly -d qwickservices -c "INSERT INTO users (id) VALUES ('test')"
--   -- Should fail with: ERROR: permission denied for table users
--
-- ═══════════════════════════════════════════════════════════════
