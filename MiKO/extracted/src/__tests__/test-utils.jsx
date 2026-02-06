/**
 * Test Utilities
 * Custom render functions and test helpers
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import userEvent from '@testing-library/user-event';

/**
 * All providers wrapper for tests
 */
function AllProviders({ children }) {
  return (
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        {children}
      </ThemeProvider>
    </BrowserRouter>
  );
}

/**
 * Custom render function that includes all providers
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @returns {Object} Render result with user event
 */
function customRender(ui, options = {}) {
  const { route = '/', ...renderOptions } = options;

  // Set the initial route
  window.history.pushState({}, 'Test page', route);

  return {
    user: userEvent.setup(),
    ...render(ui, {
      wrapper: AllProviders,
      ...renderOptions,
    }),
  };
}

/**
 * Render without router (for unit testing isolated components)
 */
function renderWithoutRouter(ui, options = {}) {
  return {
    user: userEvent.setup(),
    ...render(ui, options),
  };
}

/**
 * Create a mock Supabase response
 */
function createMockSupabaseResponse(data, error = null) {
  return {
    data,
    error,
    count: Array.isArray(data) ? data.length : null,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  };
}

/**
 * Create mock lead data
 */
function createMockLead(overrides = {}) {
  return {
    id: `lead-${Date.now()}`,
    full_name: 'Test Patient',
    email: 'test@example.com',
    phone: '(555) 123-4567',
    source: 'website',
    status: 'new',
    lead_score: 75,
    created_at: new Date().toISOString(),
    notes: 'Test lead',
    ai_qualified: true,
    response_time_seconds: 30,
    clinical_interests: [{ specific_procedure: 'Rhinoplasty' }],
    ...overrides,
  };
}

/**
 * Create mock appointment data
 */
function createMockAppointment(overrides = {}) {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour later

  return {
    id: `apt-${Date.now()}`,
    lead_id: 'lead-123',
    patient_name: 'Test Patient',
    patient_email: 'test@example.com',
    patient_phone: '(555) 123-4567',
    procedure: 'Consultation',
    consultation_type: 'virtual',
    scheduled_time: start.toISOString(),
    end_time: end.toISOString(),
    status: 'confirmed',
    notes: '',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock chat message
 */
function createMockChatMessage(overrides = {}) {
  return {
    id: Date.now(),
    role: 'user',
    content: 'Test message',
    timestamp: new Date(),
    ...overrides,
  };
}

/**
 * Create mock AI response
 */
function createMockAIResponse(overrides = {}) {
  return {
    success: true,
    message: 'Thank you for your inquiry. How can I assist you today?',
    intent: 'general_question',
    intentConfidence: 0.85,
    handoffRequired: false,
    suggestedActions: ['Book consultation', 'Learn more'],
    ...overrides,
  };
}

/**
 * Wait for loading to complete
 */
async function waitForLoadingToComplete(screen, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const loadingElements = screen.queryAllByRole('status');
    const spinners = screen.queryAllByTestId('loading-spinner');

    if (loadingElements.length === 0 && spinners.length === 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Export custom utilities
export {
  customRender as render,
  renderWithoutRouter,
  createMockSupabaseResponse,
  createMockLead,
  createMockAppointment,
  createMockChatMessage,
  createMockAIResponse,
  waitForLoadingToComplete,
  userEvent,
};
