/**
 * Test Utilities
 * Custom render function and test helpers
 */

import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

/**
 * Create a fresh QueryClient for each test
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * All providers wrapper for testing
 */
function AllProviders({ children, queryClient }) {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Custom render function that includes all providers
 */
export function renderWithProviders(ui, options = {}) {
  const { queryClient, ...renderOptions } = options;

  return {
    ...render(ui, {
      wrapper: ({ children }) => (
        <AllProviders queryClient={queryClient}>
          {children}
        </AllProviders>
      ),
      ...renderOptions,
    }),
    queryClient: queryClient || createTestQueryClient(),
  };
}

/**
 * Wait for loading states to resolve
 */
export async function waitForLoadingToFinish() {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => {
    const loaders = document.querySelectorAll('[data-testid="loader"]');
    if (loaders.length > 0) {
      throw new Error('Still loading');
    }
  }, { timeout: 5000 });
}

/**
 * Create mock vulnerability data
 */
export function createMockVulnerability(overrides = {}) {
  return {
    id: `vuln-${Date.now()}`,
    title: 'Test Vulnerability',
    cve_id: 'CVE-2024-0001',
    severity: 'high',
    status: 'open',
    environment: 'production',
    asset: 'test-service',
    assigned_team: 'team-1',
    ownership_confidence: 85,
    is_suppressed: false,
    created_date: new Date().toISOString(),
    description: 'Test vulnerability description',
    remediation_guidance: 'Test remediation steps',
    cvss_score: 7.5,
    ...overrides,
  };
}

/**
 * Create mock team data
 */
export function createMockTeam(overrides = {}) {
  return {
    id: `team-${Date.now()}`,
    name: 'Test Team',
    lead_email: 'lead@test.com',
    slack_channel: '#test-team',
    ...overrides,
  };
}

/**
 * Create mock remediation task data
 */
export function createMockTask(overrides = {}) {
  return {
    id: `task-${Date.now()}`,
    title: 'Test Task',
    vulnerability_id: 'vuln-1',
    assigned_to: 'user@test.com',
    assigned_team: 'team-1',
    status: 'pending',
    priority: 'high',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_date: new Date().toISOString(),
    estimated_effort: '4 hours',
    ...overrides,
  };
}

/**
 * Create mock asset data
 */
export function createMockAsset(overrides = {}) {
  return {
    id: `asset-${Date.now()}`,
    name: 'test-service',
    type: 'service',
    criticality: 'high',
    environment: 'production',
    owner_team: 'team-1',
    risk_score: 75,
    ...overrides,
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
