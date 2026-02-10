-- Migration 010: Add provider fields to users table
-- QwickServices CIS — Support for user_type, phone, service_category

-- Add new columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) NOT NULL DEFAULT 'customer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS service_category VARCHAR(100);

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_service_category ON users(service_category);

-- Update existing seed users with provider data
UPDATE users SET phone = '555-867-5309', user_type = 'customer'
  WHERE id = 'd68ec8ce-20c1-4400-b6eb-4c19884ac48d' AND phone IS NULL;

UPDATE users SET phone = '555-234-5678', user_type = 'customer'
  WHERE id = '55cc0cb7-aee7-4b07-a38e-c7d46ddd2a0d' AND phone IS NULL;

UPDATE users SET phone = '555-199-0001', user_type = 'provider', service_category = 'Cleaning'
  WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001' AND phone IS NULL;

UPDATE users SET phone = '555-199-0002', user_type = 'provider', service_category = 'Plumbing'
  WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-000000000002' AND phone IS NULL;

UPDATE users SET user_type = 'system'
  WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-000000000003' AND user_type = 'customer';
