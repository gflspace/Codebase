# MiKO Testing Guide

This directory contains the testing infrastructure for the MiKO Plastic Surgery application.

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Directory Structure

```
src/
├── __tests__/
│   ├── setup.js          # Test setup and global mocks
│   ├── test-utils.jsx    # Custom render functions and helpers
│   ├── fixtures.js       # Test data fixtures
│   └── README.md         # This file
├── __mocks__/
│   ├── supabase.js       # Supabase client mock
│   └── llmService.js     # AI/LLM service mock
├── api/
│   └── *.test.js         # API service tests
├── pages/
│   └── **/*.test.jsx     # Page component tests
└── components/
    └── **/*.test.jsx     # Component tests
```

## Writing Tests

### Unit Tests for Services

```javascript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from './myService';

describe('myService', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Component Tests

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../__tests__/test-utils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const { user } = render(<MyComponent />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

### Using Fixtures

```javascript
import { leads, appointments } from '../__tests__/fixtures';

describe('LeadService', () => {
  it('should process lead data', () => {
    const result = processLead(leads.newLead);
    expect(result.status).toBe('processed');
  });
});
```

### Using Mocks

```javascript
import { vi } from 'vitest';
import { supabase, setMockUser, setMockTableData } from '../__mocks__/supabase';

describe('AuthService', () => {
  beforeEach(() => {
    // Set up mock user
    setMockUser({ id: 'user-123', email: 'test@example.com' });

    // Set up mock table data
    setMockTableData('user_roles', [{ user_id: 'user-123', role: 'admin' }]);
  });

  it('should authenticate user', async () => {
    const result = await authenticateUser();
    expect(result.authenticated).toBe(true);
  });
});
```

## Test Utilities

### Custom Render

The custom render function wraps components with all necessary providers:

```javascript
import { render, screen } from '../__tests__/test-utils';

// Automatically includes:
// - BrowserRouter (for routing)
// - ThemeProvider (for theming)

const { user } = render(<MyComponent />);
```

### Mock Data Creators

```javascript
import {
  createMockLead,
  createMockAppointment,
  createMockAIResponse
} from '../__tests__/test-utils';

const lead = createMockLead({ status: 'qualified' });
const appointment = createMockAppointment({ consultation_type: 'virtual' });
const aiResponse = createMockAIResponse({ intent: 'booking' });
```

## Coverage Thresholds

The project has minimum coverage thresholds configured:

- Statements: 20%
- Branches: 20%
- Functions: 20%
- Lines: 20%

These will increase as more tests are added.

## Best Practices

### 1. Test Behavior, Not Implementation

```javascript
// Good - tests behavior
it('should show error message when login fails', async () => {
  // ...
  expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
});

// Bad - tests implementation details
it('should set error state to true', async () => {
  // ...
  expect(component.state.hasError).toBe(true);
});
```

### 2. Use Descriptive Test Names

```javascript
// Good
it('should disable submit button while form is submitting');
it('should show validation error for invalid email format');

// Bad
it('test 1');
it('button test');
```

### 3. Arrange-Act-Assert Pattern

```javascript
it('should update lead status when qualifying', async () => {
  // Arrange
  const lead = createMockLead({ status: 'new' });

  // Act
  const result = await qualifyLead(lead.id);

  // Assert
  expect(result.status).toBe('qualified');
});
```

### 4. Mock External Dependencies

Always mock external services (Supabase, APIs) in unit tests:

```javascript
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  isSupabaseConfigured: vi.fn(() => true),
}));
```

### 5. Clean Up After Tests

The setup file automatically cleans up after each test, but for custom cleanup:

```javascript
afterEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});
```

## Running Specific Tests

```bash
# Run tests matching a pattern
npm test -- chatService

# Run tests in a specific file
npm test -- src/api/chatService.test.js

# Run with verbose output
npm test -- --reporter=verbose
```

## Debugging Tests

```bash
# Run tests in debug mode
npm test -- --inspect-brk

# Or enable console output in setup.js by commenting out:
# vi.spyOn(console, 'error').mockImplementation(() => {});
```

## Continuous Integration

Tests should pass before merging any PR. The recommended CI workflow:

```yaml
- name: Run Tests
  run: npm run test:run

- name: Upload Coverage
  run: npm run test:coverage
```
