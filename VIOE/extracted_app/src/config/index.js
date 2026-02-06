/**
 * Application Configuration
 * Centralized config loaded from environment variables
 *
 * PCE COMPLIANCE: Business rules are defined in planningConfig.js
 * which derives values from the planning/ directory.
 */

// Re-export planning configuration for convenience
export * from './planningConfig';

export const config = {
  // API Configuration
  api: {
    mode: import.meta.env.VITE_API_MODE || 'mock',
    base44AppId: import.meta.env.VITE_BASE44_APP_ID || '',
    base44ApiUrl: import.meta.env.VITE_BASE44_API_URL || 'https://api.base44.com',
  },

  // Authentication
  auth: {
    provider: import.meta.env.VITE_AUTH_PROVIDER || 'mock',
    oauth: {
      clientId: import.meta.env.VITE_OAUTH_CLIENT_ID || '',
      authority: import.meta.env.VITE_OAUTH_AUTHORITY || '',
      redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI || 'http://localhost:5173/callback',
    },
  },

  // Feature Flags
  features: {
    demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
    aiEnabled: import.meta.env.VITE_AI_FEATURES_ENABLED !== 'false',
    jiraEnabled: import.meta.env.VITE_JIRA_INTEGRATION_ENABLED === 'true',
    slackEnabled: import.meta.env.VITE_SLACK_INTEGRATION_ENABLED === 'true',
  },

  // External Services
  integrations: {
    jira: {
      baseUrl: import.meta.env.VITE_JIRA_BASE_URL || '',
      projectKey: import.meta.env.VITE_JIRA_PROJECT_KEY || '',
    },
    slack: {
      webhookUrl: import.meta.env.VITE_SLACK_WEBHOOK_URL || '',
    },
  },

  // Monitoring
  monitoring: {
    sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
    logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
  },

  // Development
  dev: {
    mockDelay: parseInt(import.meta.env.VITE_MOCK_DELAY || '100', 10),
    enableDevtools: import.meta.env.VITE_ENABLE_DEVTOOLS !== 'false',
  },
};

// Helper to check if running in production mode
export const isProduction = () => config.api.mode === 'production';

// Helper to check if running in mock/demo mode
export const isMockMode = () => config.api.mode === 'mock';

// Helper to check if a feature is enabled
export const isFeatureEnabled = (feature) => {
  return config.features[feature] === true;
};

export default config;
