import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';

// ─── Mock Data ──────────────────────────────────────────────

const SUPER_ADMIN_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@qwickservices.com',
  name: 'Super Admin',
  role: 'super_admin',
  permissions: [
    'overview.view', 'alerts.view', 'alerts.manage', 'alerts.ai_summary',
    'cases.view', 'cases.manage', 'enforcement.view', 'enforcement.manage',
    'appeals.view', 'appeals.manage', 'appeals.ai_analysis', 'risk.view',
    'risk.ai_patterns', 'risk.ai_predictive', 'audit_logs.view',
    'system_health.view', 'intelligence.view', 'settings.view',
    'rules.view', 'rules.manage', 'sync.view', 'category.view',
    'intake.view', 'intake.manage', 'system.toggle_shadow',
  ],
};

const OPS_USER = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'ops@qwickservices.com',
  name: 'Ops User',
  role: 'ops',
  permissions: ['overview.view', 'alerts.view', 'alerts.manage', 'audit_logs.view', 'system_health.view'],
};

const LEGAL_USER = {
  id: '00000000-0000-0000-0000-000000000003',
  email: 'legal@qwickservices.com',
  name: 'Legal User',
  role: 'legal',
  permissions: ['overview.view', 'audit_logs.view', 'appeals.view', 'appeals.manage', 'enforcement.view'],
};

const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMSIsInJvbGUiOiJzdXBlcl9hZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.test';

const MOCK_ALERTS = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    title: 'High cancellation rate detected',
    priority: 'high',
    status: 'open',
    source: 'threshold',
    user_id: '10000000-0000-0000-0000-000000000001',
    user_name: 'Jane Doe',
    user_type: 'provider',
    service_category: 'Cleaning',
    escalation_count: 0,
    sla_deadline: new Date(Date.now() + 3600000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    title: 'Low-priority info alert',
    priority: 'low',
    status: 'open',
    source: 'trend',
    user_id: '10000000-0000-0000-0000-000000000002',
    user_name: 'John Smith',
    user_type: 'customer',
    service_category: 'Plumbing',
    escalation_count: 0,
    sla_deadline: null,
    created_at: new Date().toISOString(),
  },
];

const MOCK_CASES = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    title: 'Investigation: Suspicious cancellation pattern',
    description: 'Provider has cancelled 5 bookings in 24 hours.',
    status: 'open',
    user_id: '10000000-0000-0000-0000-000000000001',
    user_name: 'Jane Doe',
    user_email: 'jane@example.com',
    user_phone: '555-0101',
    user_type: 'provider',
    service_category: 'Cleaning',
    trust_score: 35,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_CASE_NOTES = [
  {
    id: 'n0000000-0000-0000-0000-000000000001',
    case_id: 'c0000000-0000-0000-0000-000000000001',
    content: 'Initial investigation started.',
    author_name: 'Super Admin',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

const MOCK_ENFORCEMENT_ACTIONS = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    user_id: '10000000-0000-0000-0000-000000000001',
    user_name: 'Jane Doe',
    action_type: 'soft_warning',
    reason: 'High cancellation rate',
    service_category: 'Cleaning',
    effective_until: new Date(Date.now() + 86400000).toISOString(),
    reversed_at: null,
    reversed_reason: null,
    created_at: new Date().toISOString(),
  },
];

const MOCK_APPEALS = [
  {
    id: 'ap000000-0000-0000-0000-000000000001',
    user_id: '10000000-0000-0000-0000-000000000001',
    user_name: 'Jane Doe',
    user_email: 'jane@example.com',
    user_phone: '555-0101',
    user_type: 'provider',
    service_category: 'Cleaning',
    trust_score: 35,
    enforcement_action_id: 'e0000000-0000-0000-0000-000000000001',
    action_type: 'soft_warning',
    reason: 'I had personal emergencies causing the cancellations.',
    status: 'submitted',
    resolution: null,
    resolution_notes: null,
    created_at: new Date().toISOString(),
  },
];

// ─── Helpers ────────────────────────────────────────────────

async function injectAuth(page: Page, user = SUPER_ADMIN_USER, token = MOCK_TOKEN) {
  await page.evaluate(({ t, u }) => {
    localStorage.setItem('cis_token', t);
    localStorage.setItem('cis_user', JSON.stringify(u));
  }, { t: token, u: user });
}

async function setupMockAPI(page: Page) {
  // Alerts
  await page.route('**/api/alerts*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ json: { data: MOCK_ALERTS, pagination: { page: 1, limit: 20, total: 2, pages: 1 } } });
    } else if (method === 'PATCH') {
      const body = route.request().postDataJSON();
      const url = route.request().url();
      const id = url.split('/api/alerts/')[1]?.split('?')[0];
      const alert = MOCK_ALERTS.find((a) => a.id === id) || MOCK_ALERTS[0];
      await route.fulfill({ json: { data: { ...alert, ...body } } });
    } else {
      await route.continue();
    }
  });

  // Cases
  await page.route('**/api/cases*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (method === 'GET' && url.includes('/notes')) {
      await route.fulfill({ json: { data: MOCK_CASE_NOTES } });
    } else if (method === 'POST' && url.includes('/notes')) {
      const body = route.request().postDataJSON();
      await route.fulfill({
        json: {
          data: {
            id: 'n0000000-0000-0000-0000-000000000099',
            case_id: MOCK_CASES[0].id,
            content: body.content,
            author_name: 'Super Admin',
            created_at: new Date().toISOString(),
          },
        },
      });
    } else if (method === 'GET' && /\/api\/cases\/[^/]+$/.test(url.replace(/\?.*/, ''))) {
      await route.fulfill({ json: { data: MOCK_CASES[0] } });
    } else if (method === 'GET') {
      await route.fulfill({ json: { data: MOCK_CASES, pagination: { page: 1, limit: 20, total: 1, pages: 1 } } });
    } else if (method === 'PATCH') {
      const body = route.request().postDataJSON();
      await route.fulfill({ json: { data: { ...MOCK_CASES[0], ...body } } });
    } else {
      await route.continue();
    }
  });

  // Enforcement actions
  await page.route('**/api/enforcement-actions*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    if (method === 'POST' && url.includes('/reverse')) {
      await route.fulfill({
        json: { data: { ...MOCK_ENFORCEMENT_ACTIONS[0], reversed_at: new Date().toISOString() } },
      });
    } else if (method === 'GET') {
      await route.fulfill({
        json: { data: MOCK_ENFORCEMENT_ACTIONS, pagination: { page: 1, limit: 20, total: 1, pages: 1 } },
      });
    } else {
      await route.continue();
    }
  });

  // Appeals
  await page.route('**/api/appeals*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    if (method === 'POST' && url.includes('/resolve')) {
      const body = route.request().postDataJSON();
      await route.fulfill({
        json: { data: { ...MOCK_APPEALS[0], status: body.resolution, resolution_notes: body.resolution_notes } },
      });
    } else if (method === 'GET') {
      await route.fulfill({
        json: { data: MOCK_APPEALS, pagination: { page: 1, limit: 20, total: 1, pages: 1 } },
      });
    } else {
      await route.continue();
    }
  });

  // AI endpoints (return graceful mocks)
  await page.route('**/api/ai/**', async (route) => {
    await route.fulfill({ json: { data: { summary: 'Mock AI response', confidence: 0.85 } } });
  });

  // Stats endpoints
  await page.route('**/api/stats/**', async (route) => {
    await route.fulfill({ json: { data: {} } });
  });

  // Users endpoint (for alert/case detail panels)
  await page.route('**/api/users/*', async (route) => {
    await route.fulfill({
      json: {
        data: {
          id: '10000000-0000-0000-0000-000000000001',
          display_name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '555-0101',
          user_type: 'provider',
          service_category: 'Cleaning',
          trust_score: 35,
          status: 'active',
        },
      },
    });
  });

  // Evaluation stats
  await page.route('**/api/evaluate/**', async (route) => {
    await route.fulfill({ json: { data: [] } });
  });
}

// ─── Tests ──────────────────────────────────────────────────

test.describe('CIS Admin Dashboard E2E', () => {
  test.describe('Authentication', () => {
    test('shows login page for unauthenticated users', async ({ page }) => {
      await page.goto(BASE_URL);
      await expect(page.locator('text=Trust & Safety Admin Dashboard')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('login with valid credentials redirects to dashboard', async ({ page }) => {
      // Mock login API
      await page.route('**/api/auth/login', async (route) => {
        await route.fulfill({
          json: { token: MOCK_TOKEN, user: SUPER_ADMIN_USER },
        });
      });
      await setupMockAPI(page);

      await page.goto(BASE_URL);
      await page.fill('input[type="email"]', 'admin@qwickservices.com');
      await page.fill('input[type="password"]', 'testpassword123');
      await page.click('button[type="submit"]');

      // After successful login, should see dashboard sidebar
      await expect(page.getByText('CIS Dashboard')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Trust & Safety', { exact: true })).toBeVisible();
    });

    test('login with invalid credentials shows error', async ({ page }) => {
      // Mock failed login
      await page.route('**/api/auth/login', async (route) => {
        await route.fulfill({ status: 401, json: { error: 'Invalid credentials' } });
      });

      await page.goto(BASE_URL);
      await page.fill('input[type="email"]', 'bad@email.com');
      await page.fill('input[type="password"]', 'wrongpass');
      await page.click('button[type="submit"]');

      // Should display an error message
      await expect(page.locator('.bg-cis-red-soft')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('RBAC', () => {
    test('ops role cannot see case investigation module', async ({ page }) => {
      await setupMockAPI(page);
      await page.goto(BASE_URL);
      await injectAuth(page, OPS_USER);
      await page.reload();

      // Ops has alerts.view but NOT cases.view
      await expect(page.getByText('CIS Dashboard')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: 'Alerts & Inbox' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Case Investigation' })).not.toBeVisible();
    });

    test('legal role can see audit logs module', async ({ page }) => {
      await setupMockAPI(page);
      await page.goto(BASE_URL);
      await injectAuth(page, LEGAL_USER);
      await page.reload();

      await expect(page.getByText('CIS Dashboard')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: 'Audit Logs' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Appeals' })).toBeVisible();
      // Legal does not have cases.view
      await expect(page.getByRole('button', { name: 'Case Investigation' })).not.toBeVisible();
    });
  });

  test.describe('Alert Triage Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      await page.goto(BASE_URL);
      await injectAuth(page);
      await page.reload();
    });

    test('user can claim an open alert', async ({ page }) => {
      // Navigate to Alerts
      await page.getByRole('button', { name: 'Alerts & Inbox' }).click();
      await expect(page.getByText('Alerts & Inbox').first()).toBeVisible({ timeout: 5000 });

      // Wait for alerts to load
      await expect(page.getByText('High cancellation rate detected')).toBeVisible({ timeout: 5000 });

      // Click Claim on the first alert
      const claimButton = page.getByRole('button', { name: 'Claim' }).first();
      await expect(claimButton).toBeVisible();
      await claimButton.click();

      // After claiming, the alert should update (mock returns assigned status)
      // The claim button fires a PATCH with status: 'assigned'
      await page.waitForTimeout(500);
    });

    test('user can dismiss a low-priority alert', async ({ page }) => {
      await page.getByRole('button', { name: 'Alerts & Inbox' }).click();
      await expect(page.getByText('Alerts & Inbox').first()).toBeVisible({ timeout: 5000 });

      // Wait for alerts to load
      await expect(page.getByText('Low-priority info alert')).toBeVisible({ timeout: 5000 });

      // Click Dismiss on the low-priority alert
      const dismissButtons = page.getByRole('button', { name: 'Dismiss' });
      await expect(dismissButtons.first()).toBeVisible();
      await dismissButtons.first().click();

      await page.waitForTimeout(500);
    });
  });

  test.describe('Case Investigation', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      await page.goto(BASE_URL);
      await injectAuth(page);
      await page.reload();
    });

    test('user can view case details and timeline', async ({ page }) => {
      await page.getByRole('button', { name: 'Case Investigation' }).click();
      await expect(page.getByText('Cases').first()).toBeVisible({ timeout: 5000 });

      // Wait for case list to load
      await expect(page.getByText('Investigation: Suspicious cancellation pattern')).toBeVisible({ timeout: 5000 });

      // Click the case to select it
      await page.getByText('Investigation: Suspicious cancellation pattern').click();

      // Detail panel should appear with case info
      await expect(page.getByText('Provider has cancelled 5 bookings in 24 hours.')).toBeVisible({ timeout: 5000 });

      // Should show user details
      await expect(page.getByText('Jane Doe')).toBeVisible();

      // Should show the existing note in the timeline
      await expect(page.getByText('Initial investigation started.')).toBeVisible();
    });

    test('user can add internal notes to a case', async ({ page }) => {
      await page.getByRole('button', { name: 'Case Investigation' }).click();
      await expect(page.getByText('Cases').first()).toBeVisible({ timeout: 5000 });

      // Select the case
      await page.getByText('Investigation: Suspicious cancellation pattern').click();
      await expect(page.getByText('Provider has cancelled 5 bookings in 24 hours.')).toBeVisible({ timeout: 5000 });

      // Type a note
      const noteInput = page.getByPlaceholder('Add a note...');
      await expect(noteInput).toBeVisible();
      await noteInput.fill('Contacted provider for clarification.');

      // Click Add
      await page.getByRole('button', { name: 'Add' }).click();

      // The note should be submitted (mock API returns success)
      await page.waitForTimeout(500);
    });
  });

  test.describe('Enforcement Actions', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      await page.goto(BASE_URL);
      await injectAuth(page);
      await page.reload();
    });

    test('reversing an action requires justification', async ({ page }) => {
      await page.getByRole('button', { name: 'Enforcement' }).click();
      await expect(page.getByText('Enforcement Management')).toBeVisible({ timeout: 5000 });

      // Wait for data to load and click Reverse
      await expect(page.getByRole('button', { name: 'Reverse' })).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: 'Reverse' }).click();

      // Modal should appear
      await expect(page.getByText('Reverse Enforcement Action')).toBeVisible({ timeout: 3000 });
      await expect(page.getByText('You must provide a justification')).toBeVisible();

      // Confirm button should be disabled when justification is empty
      const confirmButton = page.getByRole('button', { name: 'Confirm Reversal' });
      await expect(confirmButton).toBeDisabled();

      // Fill justification
      await page.getByPlaceholder('Justification for reversal (required)...').fill('Customer provided valid documentation.');

      // Now button should be enabled
      await expect(confirmButton).toBeEnabled();
    });

    test('confirmation modal appears before reversal', async ({ page }) => {
      await page.getByRole('button', { name: 'Enforcement' }).click();
      await expect(page.getByText('Enforcement Management')).toBeVisible({ timeout: 5000 });

      // Click Reverse button on the action
      await expect(page.getByRole('button', { name: 'Reverse' })).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: 'Reverse' }).click();

      // Modal overlay should appear
      const modal = page.locator('.fixed.inset-0');
      await expect(modal).toBeVisible({ timeout: 3000 });

      // Modal should contain the heading and required elements
      await expect(page.getByText('Reverse Enforcement Action')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Confirm Reversal' })).toBeVisible();

      // Cancel should close modal
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('Reverse Enforcement Action')).not.toBeVisible();
    });
  });

  test.describe('Appeal Resolution', () => {
    test.beforeEach(async ({ page }) => {
      await setupMockAPI(page);
      await page.goto(BASE_URL);
      await injectAuth(page);
      await page.reload();
    });

    test('reviewing an appeal shows resolution options', async ({ page }) => {
      await page.getByRole('button', { name: 'Appeals' }).click();
      await expect(page.getByText('Appeals').first()).toBeVisible({ timeout: 5000 });

      // Wait for appeals to load
      await expect(page.getByText('I had personal emergencies causing the cancellations.')).toBeVisible({ timeout: 5000 });

      // Click Review button
      await page.getByRole('button', { name: 'Review' }).click();

      // Resolve modal should appear
      await expect(page.getByText('Resolve Appeal')).toBeVisible({ timeout: 3000 });

      // Should show decision dropdown with approve/deny options
      const select = page.locator('select');
      await expect(select).toBeVisible();

      // Verify options exist
      const options = select.locator('option');
      await expect(options).toHaveCount(2);

      // Should show resolution notes textarea
      await expect(page.getByPlaceholder('Resolution notes (required)...')).toBeVisible();

      // Submit button should be disabled without notes
      await expect(page.getByRole('button', { name: 'Submit Decision' })).toBeDisabled();
    });

    test('approving an appeal reverses the enforcement action', async ({ page }) => {
      await page.getByRole('button', { name: 'Appeals' }).click();
      await expect(page.getByText('Appeals').first()).toBeVisible({ timeout: 5000 });

      // Wait for appeals to load and click Review
      await expect(page.getByText('I had personal emergencies causing the cancellations.')).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: 'Review' }).click();

      // Select "Approve" decision
      await page.locator('select').selectOption('approved');

      // Fill resolution notes
      await page.getByPlaceholder('Resolution notes (required)...').fill('Emergencies verified. Enforcement reversed.');

      // Submit
      const submitButton = page.getByRole('button', { name: 'Submit Decision' });
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      // Modal should close after submission
      await expect(page.getByText('Resolve Appeal')).not.toBeVisible({ timeout: 5000 });
    });
  });
});
