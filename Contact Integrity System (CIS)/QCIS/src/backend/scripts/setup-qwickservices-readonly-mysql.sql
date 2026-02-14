-- QwickServices CIS — MySQL Read-Only User Setup
-- Run this on the QwickServices MySQL database to create the CIS sync user.
-- Grants SELECT-only access to the tables CIS needs for data sync.
--
-- Usage:
--   mysql -u root -p < setup-qwickservices-readonly-mysql.sql
--
-- IMPORTANT: Change the password before running in production!

CREATE USER IF NOT EXISTS 'cis_readonly'@'%' IDENTIFIED BY 'CHANGE_ME';

GRANT SELECT ON qwickservices.categories TO 'cis_readonly'@'%';
GRANT SELECT ON qwickservices.users TO 'cis_readonly'@'%';
GRANT SELECT ON qwickservices.providers TO 'cis_readonly'@'%';
GRANT SELECT ON qwickservices.transactions TO 'cis_readonly'@'%';
GRANT SELECT ON qwickservices.bookings TO 'cis_readonly'@'%';
GRANT SELECT ON qwickservices.messages TO 'cis_readonly'@'%';
GRANT SELECT ON qwickservices.ratings TO 'cis_readonly'@'%';
GRANT SELECT ON qwickservices.disputes TO 'cis_readonly'@'%';

FLUSH PRIVILEGES;
