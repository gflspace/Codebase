import { createClient } from '@supabase/supabase-js';

// Optional: Supabase client for direct database access
// Currently we use Prisma, but this can be used for Supabase-specific features
// like real-time subscriptions, storage, etc.

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Note: We primarily use Prisma for database operations
// Supabase client is available for:
// - Real-time subscriptions
// - Storage operations
// - Direct SQL queries if needed
// - Supabase-specific features
