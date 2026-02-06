/**
 * Test Fixtures
 * Reusable test data for unit and integration tests
 */

/**
 * Lead fixtures
 */
export const leads = {
  newLead: {
    id: 'lead-001',
    full_name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    phone: '(310) 555-1234',
    source: 'website',
    status: 'new',
    lead_score: 85,
    ai_qualified: true,
    response_time_seconds: 15,
    created_at: '2024-01-15T10:30:00Z',
    notes: 'Interested in rhinoplasty consultation',
  },

  qualifiedLead: {
    id: 'lead-002',
    full_name: 'Michael Chen',
    email: 'michael.chen@example.com',
    phone: '(310) 555-5678',
    source: 'referral',
    status: 'qualified',
    lead_score: 92,
    ai_qualified: true,
    response_time_seconds: 8,
    created_at: '2024-01-14T14:20:00Z',
    notes: 'Referred by Dr. Smith, interested in facelift',
  },

  consultedLead: {
    id: 'lead-003',
    full_name: 'Emily Davis',
    email: 'emily.davis@example.com',
    phone: '(310) 555-9012',
    source: 'instagram',
    status: 'consulted',
    lead_score: 78,
    ai_qualified: true,
    response_time_seconds: 45,
    created_at: '2024-01-10T09:15:00Z',
    notes: 'Had virtual consultation on 1/12, interested in breast augmentation',
  },
};

/**
 * Appointment fixtures
 */
export const appointments = {
  upcomingVirtual: {
    id: 'apt-001',
    lead_id: 'lead-001',
    patient_name: 'Sarah Johnson',
    patient_email: 'sarah.johnson@example.com',
    patient_phone: '(310) 555-1234',
    procedure: 'Rhinoplasty Consultation',
    consultation_type: 'virtual',
    scheduled_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    status: 'confirmed',
    notes: '',
    created_at: '2024-01-15T10:35:00Z',
  },

  upcomingInPerson: {
    id: 'apt-002',
    lead_id: 'lead-002',
    patient_name: 'Michael Chen',
    patient_email: 'michael.chen@example.com',
    patient_phone: '(310) 555-5678',
    procedure: 'Facelift Consultation',
    consultation_type: 'inperson',
    scheduled_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    status: 'confirmed',
    notes: 'Patient prefers afternoon appointments',
    created_at: '2024-01-14T14:25:00Z',
  },

  pastCompleted: {
    id: 'apt-003',
    lead_id: 'lead-003',
    patient_name: 'Emily Davis',
    patient_email: 'emily.davis@example.com',
    patient_phone: '(310) 555-9012',
    procedure: 'Breast Augmentation Consultation',
    consultation_type: 'virtual',
    scheduled_time: '2024-01-12T15:00:00Z',
    status: 'completed',
    notes: 'Patient is considering 350cc implants',
    created_at: '2024-01-10T09:20:00Z',
  },
};

/**
 * Chat message fixtures
 */
export const chatMessages = {
  greetingConversation: [
    {
      id: 1,
      role: 'assistant',
      content: "Hello! I'm MiKO, your virtual assistant at Dr. Obeng's practice. How can I help you today?",
      timestamp: new Date('2024-01-15T10:00:00Z'),
    },
    {
      id: 2,
      role: 'user',
      content: 'Hi, I want to learn about rhinoplasty',
      timestamp: new Date('2024-01-15T10:00:30Z'),
    },
    {
      id: 3,
      role: 'assistant',
      content: "I'd be happy to tell you about rhinoplasty! Dr. Obeng is a board-certified plastic surgeon who specializes in nose reshaping procedures. Would you like to know about the procedure itself, recovery time, or schedule a consultation?",
      timestamp: new Date('2024-01-15T10:00:35Z'),
    },
  ],

  bookingConversation: [
    {
      id: 1,
      role: 'user',
      content: 'I want to schedule a consultation',
      timestamp: new Date('2024-01-15T11:00:00Z'),
    },
    {
      id: 2,
      role: 'assistant',
      content: "I'd be happy to help you schedule a consultation! Would you prefer a virtual consultation via video call, or an in-person visit to our Beverly Hills office?",
      timestamp: new Date('2024-01-15T11:00:05Z'),
    },
    {
      id: 3,
      role: 'user',
      content: 'Virtual please. My name is John Smith, email is john@email.com',
      timestamp: new Date('2024-01-15T11:00:30Z'),
    },
  ],

  riskConversation: [
    {
      id: 1,
      role: 'user',
      content: 'I had a rhinoplasty 2 weeks ago and I think I have an infection',
      timestamp: new Date('2024-01-15T12:00:00Z'),
    },
    {
      id: 2,
      role: 'assistant',
      content: "I understand you're concerned about a possible infection after your rhinoplasty. This is a medical concern that requires immediate attention. Please call our office directly at (310) 275-2705, or if you're experiencing severe symptoms, please seek emergency care. I'm connecting you with a patient coordinator now.",
      timestamp: new Date('2024-01-15T12:00:10Z'),
    },
  ],
};

/**
 * User role fixtures
 */
export const userRoles = {
  admin: {
    user_id: 'user-001',
    role: 'admin',
    assigned_at: '2024-01-01T00:00:00Z',
  },

  staff: {
    user_id: 'user-002',
    role: 'staff',
    assigned_at: '2024-01-01T00:00:00Z',
  },

  clinicalReviewer: {
    user_id: 'user-003',
    role: 'clinical_reviewer',
    assigned_at: '2024-01-01T00:00:00Z',
  },
};

/**
 * Procedure fixtures
 */
export const procedures = [
  { id: 'proc-001', name: 'Rhinoplasty', category: 'Facial', popular: true },
  { id: 'proc-002', name: 'Facelift', category: 'Facial', popular: true },
  { id: 'proc-003', name: 'Breast Augmentation', category: 'Breast', popular: true },
  { id: 'proc-004', name: 'Breast Lift', category: 'Breast', popular: false },
  { id: 'proc-005', name: 'Tummy Tuck', category: 'Body', popular: true },
  { id: 'proc-006', name: 'Liposuction', category: 'Body', popular: true },
  { id: 'proc-007', name: 'Brazilian Butt Lift', category: 'Body', popular: true },
  { id: 'proc-008', name: 'Mommy Makeover', category: 'Body', popular: false },
  { id: 'proc-009', name: 'Blepharoplasty', category: 'Facial', popular: false },
  { id: 'proc-010', name: 'Botox', category: 'Non-Surgical', popular: true },
];

/**
 * Time slot fixtures
 */
export const timeSlots = {
  fullyAvailable: [
    { time: '9:00 AM', available: true },
    { time: '10:00 AM', available: true },
    { time: '11:00 AM', available: true },
    { time: '1:00 PM', available: true },
    { time: '2:00 PM', available: true },
    { time: '3:00 PM', available: true },
    { time: '4:00 PM', available: true },
  ],

  partiallyBooked: [
    { time: '9:00 AM', available: false },
    { time: '10:00 AM', available: true },
    { time: '11:00 AM', available: false },
    { time: '1:00 PM', available: true },
    { time: '2:00 PM', available: false },
    { time: '3:00 PM', available: true },
    { time: '4:00 PM', available: true },
  ],

  fullyBooked: [
    { time: '9:00 AM', available: false },
    { time: '10:00 AM', available: false },
    { time: '11:00 AM', available: false },
    { time: '1:00 PM', available: false },
    { time: '2:00 PM', available: false },
    { time: '3:00 PM', available: false },
    { time: '4:00 PM', available: false },
  ],
};

export default {
  leads,
  appointments,
  chatMessages,
  userRoles,
  procedures,
  timeSlots,
};
