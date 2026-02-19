-- QwickServices CIS — MySQL Read-Only User Setup
-- Run this on the QwickServices MySQL database to create the CIS sync user.
-- Grants SELECT-only access to the tables CIS needs for data sync.
--
-- Usage:
--   mysql -u root -p < setup-qwickservices-readonly-mysql.sql
--
-- IMPORTANT: Change the password before running in production!
-- Tables aligned to actual QwickServices Laravel schema (verified 2026-02-16).

CREATE USER IF NOT EXISTS 'cis_readonly'@'%' IDENTIFIED BY 'CHANGE_ME';

-- Core entity tables
GRANT SELECT ON qwickservices.categories TO 'cis_readonly'@'%';
GRANT SELECT ON qwickservices.users TO 'cis_readonly'@'%';
GRANT SELECT ON qwickservices.bookings TO 'cis_readonly'@'%';
GRANT SELECT ON qwickservices.ratings TO 'cis_readonly'@'%';

-- Financial tables (actual name is `payments`, not `transactions`)
GRANT SELECT ON qwickservices.payments TO 'cis_readonly'@'%';
GRANT SELECT ON qwickservices.wallet_histories TO 'cis_readonly'@'%';

-- Communication (actual name is `notifications`, not `messages`)
GRANT SELECT ON qwickservices.notifications TO 'cis_readonly'@'%';

-- Trust & safety tables
GRANT SELECT ON qwickservices.suspicious_activities TO 'cis_readonly'@'%';

-- Activity tracking
GRANT SELECT ON qwickservices.booking_activities TO 'cis_readonly'@'%';
GRANT SELECT ON qwickservices.login_activities TO 'cis_readonly'@'%';

FLUSH PRIVILEGES;
