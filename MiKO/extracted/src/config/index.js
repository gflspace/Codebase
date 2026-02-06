/**
 * MiKO Application Configuration
 * Centralized configuration management with environment variable support
 */

const config = {
  // Application Info
  app: {
    name: import.meta.env.VITE_APP_NAME || 'MiKO Plastic Surgery',
    version: '2.0.0',
  },

  // Contact Information
  contact: {
    email: import.meta.env.VITE_CONTACT_EMAIL || 'office@mikoplasticsurgery.com',
    phone: import.meta.env.VITE_CONTACT_PHONE || '(310) 275-2705',
    phoneRaw: '+13102752705',
    address: import.meta.env.VITE_OFFICE_ADDRESS || '436 N Bedford Dr #305, Beverly Hills, CA 90210',
  },

  // N8N Workflow Configuration
  n8n: {
    webhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL || '',
    instanceId: import.meta.env.VITE_N8N_INSTANCE_ID || '',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // Google Services Configuration
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
    calendarId: import.meta.env.VITE_GOOGLE_CALENDAR_ID || 'primary',
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  },

  // Base44 Platform Configuration
  base44: {
    appId: import.meta.env.VITE_BASE44_APP_ID || '6959eefb54c587c37d7ce9e8',
  },

  // Feature Flags
  features: {
    researchAgent: import.meta.env.VITE_ENABLE_RESEARCH_AGENT === 'true',
    smsReminders: import.meta.env.VITE_ENABLE_SMS_REMINDERS === 'true',
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
  },

  // Business Hours (Pacific Time)
  businessHours: {
    timezone: 'America/Los_Angeles',
    days: {
      monday: { open: '09:00', close: '17:00', available: true },
      tuesday: { open: '09:00', close: '17:00', available: true },
      wednesday: { open: '09:00', close: '17:00', available: true },
      thursday: { open: '09:00', close: '17:00', available: true },
      friday: { open: '09:00', close: '17:00', available: true },
      saturday: { open: '10:00', close: '14:00', available: false }, // By appointment only
      sunday: { open: null, close: null, available: false },
    },
    appointmentDuration: 60, // minutes
    bufferTime: 15, // minutes between appointments
  },

  // Chatbot Configuration
  chatbot: {
    maxHistoryLength: 20,
    typingDelay: 500,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    fallbackEnabled: true,
  },

  // Reminder Configuration
  reminders: {
    schedule: [
      { hours: 48, channel: 'email', template: 'reminder_48h' },
      { hours: 24, channel: 'email', template: 'reminder_24h' },
      { hours: 2, channel: 'sms', template: 'reminder_2h' },
    ],
  },

  // API Endpoints (for external services)
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '',
  },
};

// Validation function to check required config
export const validateConfig = () => {
  const warnings = [];

  if (!config.n8n.webhookUrl) {
    warnings.push('N8N webhook URL not configured - chatbot will use fallback mode');
  }

  if (!config.google.clientId) {
    warnings.push('Google Client ID not configured - calendar will use mock data');
  }

  if (warnings.length > 0 && import.meta.env.DEV) {
    console.warn('MiKO Configuration Warnings:', warnings);
  }

  return warnings;
};

// Check if Google Calendar is properly configured
export const isGoogleCalendarEnabled = () => {
  return !!(config.google.clientId && config.google.apiKey);
};

// Check if N8N is properly configured
export const isN8NEnabled = () => {
  return !!(config.n8n.webhookUrl && config.n8n.instanceId);
};

export default config;
