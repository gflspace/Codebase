/**
 * Demo Mode Utilities
 *
 * Provides mock authentication and data for testing the admin UI
 * without requiring real Supabase credentials.
 *
 * Demo credentials:
 *   Email: demo@miko.com
 *   Password: demo123
 */

// Check if demo mode is enabled
export const isDemoMode = () => {
  return import.meta.env.VITE_DEMO_MODE === 'true';
};

// Demo user credentials
const DEMO_CREDENTIALS = {
  email: 'demo@miko.com',
  password: 'demo123',
};

// Demo user data
const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@miko.com',
  user_metadata: {
    full_name: 'Demo Admin',
  },
  created_at: new Date().toISOString(),
};

// Demo roles
const DEMO_ROLES = ['admin'];

/**
 * Validate demo credentials
 */
export function validateDemoCredentials(email, password) {
  return (
    email.toLowerCase() === DEMO_CREDENTIALS.email &&
    password === DEMO_CREDENTIALS.password
  );
}

/**
 * Get demo user
 */
export function getDemoUser() {
  return DEMO_USER;
}

/**
 * Get demo roles
 */
export function getDemoRoles() {
  return DEMO_ROLES;
}

/**
 * Mock leads data for dashboard
 */
export function getDemoLeads() {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  return [
    {
      id: 'lead-001',
      full_name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '(310) 555-0101',
      status: 'new',
      source: 'website',
      created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      clinical_interests: [
        { procedure_category: 'Rhinoplasty', interest_level: 'high' },
      ],
    },
    {
      id: 'lead-002',
      full_name: 'Michael Chen',
      email: 'michael.chen@email.com',
      phone: '(310) 555-0102',
      status: 'contacted',
      source: 'referral',
      created_at: new Date(now - 1 * dayMs).toISOString(),
      clinical_interests: [
        { procedure_category: 'Facelift', interest_level: 'medium' },
      ],
    },
    {
      id: 'lead-003',
      full_name: 'Emily Rodriguez',
      email: 'emily.r@email.com',
      phone: '(310) 555-0103',
      status: 'qualified',
      source: 'instagram',
      created_at: new Date(now - 2 * dayMs).toISOString(),
      clinical_interests: [
        { procedure_category: 'Breast Augmentation', interest_level: 'high' },
      ],
    },
    {
      id: 'lead-004',
      full_name: 'David Kim',
      email: 'david.kim@email.com',
      phone: '(310) 555-0104',
      status: 'consultation_scheduled',
      source: 'google',
      created_at: new Date(now - 3 * dayMs).toISOString(),
      clinical_interests: [
        { procedure_category: 'Liposuction', interest_level: 'high' },
      ],
    },
    {
      id: 'lead-005',
      full_name: 'Jessica Martinez',
      email: 'jess.martinez@email.com',
      phone: '(310) 555-0105',
      status: 'converted',
      source: 'website',
      created_at: new Date(now - 5 * dayMs).toISOString(),
      clinical_interests: [
        { procedure_category: 'Botox', interest_level: 'high' },
      ],
    },
    {
      id: 'lead-006',
      full_name: 'Robert Williams',
      email: 'r.williams@email.com',
      phone: '(310) 555-0106',
      status: 'new',
      source: 'facebook',
      created_at: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      clinical_interests: [
        { procedure_category: 'Hair Transplant', interest_level: 'medium' },
      ],
    },
    {
      id: 'lead-007',
      full_name: 'Amanda Thompson',
      email: 'amanda.t@email.com',
      phone: '(310) 555-0107',
      status: 'contacted',
      source: 'website',
      created_at: new Date(now - 6 * dayMs).toISOString(),
      clinical_interests: [
        { procedure_category: 'Tummy Tuck', interest_level: 'high' },
      ],
    },
    {
      id: 'lead-008',
      full_name: 'Christopher Lee',
      email: 'chris.lee@email.com',
      phone: '(310) 555-0108',
      status: 'lost',
      source: 'referral',
      created_at: new Date(now - 10 * dayMs).toISOString(),
      clinical_interests: [
        { procedure_category: 'Rhinoplasty', interest_level: 'low' },
      ],
    },
  ];
}

/**
 * Mock appointments data for dashboard
 */
export function getDemoAppointments() {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  return [
    {
      id: 'appt-001',
      lead_id: 'lead-004',
      appointment_type: 'virtual',
      status: 'confirmed',
      scheduled_at: new Date(now + 1 * dayMs + 10 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 60,
      procedure_of_interest: 'Liposuction Consultation',
      leads: {
        full_name: 'David Kim',
        email: 'david.kim@email.com',
        phone: '(310) 555-0104',
      },
    },
    {
      id: 'appt-002',
      lead_id: 'lead-003',
      appointment_type: 'in_person',
      status: 'pending',
      scheduled_at: new Date(now + 2 * dayMs + 14 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 90,
      procedure_of_interest: 'Breast Augmentation Consultation',
      leads: {
        full_name: 'Emily Rodriguez',
        email: 'emily.r@email.com',
        phone: '(310) 555-0103',
      },
    },
    {
      id: 'appt-003',
      lead_id: 'lead-005',
      appointment_type: 'virtual',
      status: 'completed',
      scheduled_at: new Date(now - 2 * dayMs + 11 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 30,
      procedure_of_interest: 'Botox Follow-up',
      leads: {
        full_name: 'Jessica Martinez',
        email: 'jess.martinez@email.com',
        phone: '(310) 555-0105',
      },
    },
  ];
}

/**
 * Mock chat sessions data
 */
export function getDemoChatSessions() {
  const now = new Date();
  const hourMs = 60 * 60 * 1000;

  return [
    {
      id: 'chat-001',
      lead_id: 'lead-001',
      status: 'active',
      started_at: new Date(now - 30 * 60 * 1000).toISOString(),
      message_count: 12,
      leads: {
        full_name: 'Sarah Johnson',
      },
    },
    {
      id: 'chat-002',
      lead_id: 'lead-006',
      status: 'active',
      started_at: new Date(now - 15 * 60 * 1000).toISOString(),
      message_count: 5,
      leads: {
        full_name: 'Robert Williams',
      },
    },
    {
      id: 'chat-003',
      lead_id: 'lead-002',
      status: 'ended',
      started_at: new Date(now - 2 * hourMs).toISOString(),
      ended_at: new Date(now - 1 * hourMs).toISOString(),
      message_count: 24,
      leads: {
        full_name: 'Michael Chen',
      },
    },
  ];
}

/**
 * Mock analytics data
 */
export function getDemoAnalytics() {
  return {
    totalLeads: 156,
    newLeadsToday: 8,
    newLeadsThisWeek: 34,
    conversionRate: 23.5,
    avgResponseTime: '4.2 mins',
    topProcedures: [
      { name: 'Rhinoplasty', count: 42 },
      { name: 'Breast Augmentation', count: 38 },
      { name: 'Liposuction', count: 31 },
      { name: 'Facelift', count: 25 },
      { name: 'Botox', count: 20 },
    ],
    leadsBySource: [
      { source: 'Website', count: 65 },
      { source: 'Instagram', count: 42 },
      { source: 'Referral', count: 28 },
      { source: 'Google', count: 15 },
      { source: 'Facebook', count: 6 },
    ],
    leadsByStatus: [
      { status: 'new', count: 24 },
      { status: 'contacted', count: 31 },
      { status: 'qualified', count: 42 },
      { status: 'consultation_scheduled', count: 28 },
      { status: 'converted', count: 21 },
      { status: 'lost', count: 10 },
    ],
  };
}

/**
 * Mock audit logs
 */
export function getDemoAuditLogs() {
  const now = new Date();
  const minMs = 60 * 1000;

  return [
    {
      id: 'audit-001',
      user_email: 'demo@miko.com',
      action: 'login',
      resource_type: 'session',
      timestamp: new Date(now - 5 * minMs).toISOString(),
      details: { success: true },
    },
    {
      id: 'audit-002',
      user_email: 'demo@miko.com',
      action: 'view',
      resource_type: 'lead',
      resource_id: 'lead-001',
      timestamp: new Date(now - 4 * minMs).toISOString(),
      details: { lead_name: 'Sarah Johnson' },
    },
    {
      id: 'audit-003',
      user_email: 'demo@miko.com',
      action: 'export',
      resource_type: 'report',
      timestamp: new Date(now - 3 * minMs).toISOString(),
      details: { format: 'csv', row_count: 50 },
    },
  ];
}

export default {
  isDemoMode,
  validateDemoCredentials,
  getDemoUser,
  getDemoRoles,
  getDemoLeads,
  getDemoAppointments,
  getDemoChatSessions,
  getDemoAnalytics,
  getDemoAuditLogs,
};
