# MiKO Platform - Operational Implementation Guide

Complete step-by-step guide with code examples for achieving production readiness.

---

## Table of Contents
1. [Phase 1: Critical Fixes (Week 1-2)](#phase-1-critical-fixes)
2. [Phase 2: Deployment Pipeline (Week 3-4)](#phase-2-deployment-pipeline)
3. [Phase 3: Monitoring Setup (Week 5-6)](#phase-3-monitoring-setup)
4. [Phase 4: Documentation (Week 7-10)](#phase-4-documentation)

---

## Phase 1: Critical Fixes (Week 1-2)

### Step 1: Credential Rotation (TODAY)

**Priority:** CRITICAL - Do first thing Monday morning

**Checklist:**
```markdown
## Supabase (CRITICAL)
- [ ] Visit https://supabase.com/dashboard
- [ ] Select project 'wawzhrpnicjsnqqexmhg'
- [ ] Go to Settings > API
- [ ] Click "Regenerate" for anon key
- [ ] Copy new key to local .env (NOT committed)
- [ ] Update deployment secrets (Vercel/Netlify)
- [ ] Verify app still works
- [ ] Monitor Supabase logs for unauthorized access

## n8n Webhook
- [ ] Visit your n8n instance
- [ ] Open MiKO chat workflow
- [ ] Generate new webhook ID
- [ ] Update VITE_N8N_WEBHOOK_URL in .env
- [ ] Test webhook with health check
- [ ] Set up rate limiting in n8n

## Google Cloud APIs
- [ ] Visit https://console.cloud.google.com/apis/credentials
- [ ] Delete old API key and Client ID
- [ ] Create new API key with restrictions:
  - HTTP referrer: https://your-domain.com
  - APIs: Calendar API only
- [ ] Create new OAuth Client ID
- [ ] Update VITE_GOOGLE_CLIENT_ID in .env

## Base44
- [ ] Visit Base44 dashboard
- [ ] Regenerate App ID
- [ ] Update VITE_BASE44_APP_ID in .env
```

**Verify Rotation:**
```bash
# 1. Ensure .env is in .gitignore
cat .gitignore | grep "^.env$"

# 2. Verify no secrets in git history
git log --all --full-history -S "wawzhrpnicjsnqqexmhg" -- .env .env.example

# 3. Test each service with new credentials
npm run dev
# Test chat, calendar, appointments
```

**Update .env.example (Safe Template):**
```bash
# Remove all real values - only placeholders
cat > .env.example << 'EOF'
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/chat
VITE_N8N_INSTANCE_ID=your-instance-id
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-google-api-key
VITE_BASE44_APP_ID=your-base44-app-id
EOF
```

**Documentation Update:**
```bash
# Update or create SECURITY.md
cat > SECURITY.md << 'EOF'
# Security Policy

## Reporting Security Issues

If you discover a security vulnerability, please email security@example.com
with details. Do NOT open a public issue.

## Credential Management

- Never commit .env files
- Use deployment platform for secrets (Vercel, Netlify, etc.)
- Rotate credentials every 90 days
- Use separate credentials for dev/staging/production

## Exposed Credentials

If credentials are accidentally exposed:
1. Immediately rotate the compromised credential
2. Audit access logs in the service (Supabase, Google Cloud, etc.)
3. Update all deployment environments
4. Notify the security team

## RLS Policies

All Supabase tables use Row Level Security (RLS) to prevent unauthorized access.
Policies are defined in the database and enforced at the server level.
EOF
```

---

### Step 2: Implement Error Tracking (Sentry)

**Duration:** 2-3 hours
**Difficulty:** Easy
**Cost:** Free tier (5K events/month)

**1. Install Sentry:**
```bash
npm install @sentry/react @sentry/tracing
```

**2. Create error tracking module:**

Create `src/lib/errorTracking.js`:
```javascript
import * as Sentry from "@sentry/react";

export function initializeErrorTracking() {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

  if (!sentryDsn) {
    console.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    beforeSend: (event) => {
      // Redact sensitive data
      if (event.request?.url) {
        event.request.url = event.request.url
          .replace(/[?&](api_key|token|key|secret)=[^&]*/gi, '***');
      }
      return event;
    },
  });
}

export function captureException(error, context = {}) {
  Sentry.captureException(error, {
    tags: { component: context.component },
    contexts: { custom: context },
  });
}
```

**3. Update main.jsx:**
```javascript
import { initializeErrorTracking } from '@/lib/errorTracking';

initializeErrorTracking();

// ... rest of app
```

**4. Create Sentry account:**
- Go to https://sentry.io
- Create free account
- Create new project for "React"
- Copy DSN to `.env` (local only, add to deployment platform)

**5. Test error tracking:**
```javascript
// In any component
import { captureException } from '@/lib/errorTracking';

try {
  throw new Error('Test error for Sentry');
} catch (error) {
  captureException(error, { component: 'TestComponent' });
}
```

**6. Verify in Sentry Dashboard:**
- Go to Sentry.io > Issues
- Should see test error with full stack trace
- Click to see context and source code

---

### Step 3: Create Health Check Endpoints

**Duration:** 2-3 hours
**Difficulty:** Easy

**1. Create health service:**

Create `src/api/health.js` (from DEPLOYMENT_READINESS_REPORT.md)

**2. Create health check page:**

Create `src/pages/Health.jsx`:
```javascript
import { useState, useEffect } from 'react';
import { getSystemHealth } from '@/api/health';

export default function HealthCheck() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSystemHealth().then(setHealth).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading health status...</div>;
  if (!health) return <div>Error loading health status</div>;

  const statusColor = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    error: 'bg-red-500',
  }[health.status];

  return (
    <div className={`min-h-screen ${statusColor} p-8`}>
      <div className="bg-white rounded-lg p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">System Health</h1>
        <div className="space-y-4">
          <div>
            <strong>Status:</strong> {health.status.toUpperCase()}
          </div>
          <div>
            <strong>Version:</strong> {health.version}
          </div>
          <div>
            <strong>Environment:</strong> {health.environment}
          </div>
          <div>
            <strong>Response Time:</strong> {health.responseTime.toFixed(2)}ms
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">Services</h2>
            <div className="space-y-2">
              {Object.entries(health.services).map(([name, service]) => (
                <div key={name} className="flex justify-between">
                  <span>{name}:</span>
                  <span className={`font-bold ${
                    service.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {service.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**3. Add route:**
In `src/pages/index.jsx`:
```javascript
import Health from './Health';

const PAGES = {
  Home: Home,
  Health: Health, // Add this
  // ... other pages
};

function PagesContent() {
  return (
    <Routes>
      <Route path="/health" element={<Health />} />
      {/* ... other routes */}
    </Routes>
  );
}
```

**4. Test health checks:**
```bash
# Start dev server
npm run dev

# Visit in browser
# http://localhost:5173/health

# Should see JSON response when accessed as API
curl http://localhost:5173/health
```

---

### Step 4: Set Up Basic Monitoring

**Duration:** 4-6 hours
**Difficulty:** Medium
**Cost:** Free-$50/month

**Option A: UptimeRobot (Free)**
1. Go to https://uptimerobot.com
2. Sign up free account
3. Create monitor for `https://your-domain.com/health`
4. Set check interval: every 5 minutes
5. Enable email alerts

**Option B: Datadog (Recommended, Paid)**
1. Sign up at https://www.datadoghq.com
2. Install browser RUM:
```bash
npm install @datadog/browser-rum
```

3. Initialize in main.jsx:
```javascript
import { datadogRum } from '@datadog/browser-rum'

datadogRum.init({
  applicationId: 'YOUR_APP_ID', // from Datadog
  clientToken: 'YOUR_CLIENT_TOKEN',
  site: 'datadoghq.com',
  service: 'miko-surgery',
  env: 'production',
  version: '2.0.0',
  trackUserInteractions: true,
  trackResources: true,
})

datadogRum.startSessionReplayRecording()
```

4. Create dashboard for:
   - Page load time
   - API errors
   - User actions
   - Service health

---

### Step 5: Create Dockerfile (Container Setup)

**Duration:** 1-2 hours
**Difficulty:** Easy

**File:** `Dockerfile`
```dockerfile
# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Run quality checks
RUN npm run lint && npm run test:run

# Build app
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install serve
RUN npm install -g serve

# Copy built app
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

EXPOSE 3000
ENV NODE_ENV=production

CMD ["serve", "-s", "dist", "-l", "3000"]
```

**File:** `docker-compose.yml`
```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: miko-surgery
    ports:
      - "3000:3000"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
      # ... other env vars
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Test Docker build:**
```bash
# Create .env with test credentials
cp .env.example .env.local

# Build image
docker build -t miko-surgery:latest .

# Run container
docker-compose up

# Visit http://localhost:3000
# Should see app running

# Test health check
curl http://localhost:3000/health

# Cleanup
docker-compose down
```

---

## Phase 2: Deployment Pipeline (Week 3-4)

### Step 1: Set Up GitHub Actions CI/CD

**Duration:** 1-2 days
**Difficulty:** Medium

**File:** `.github/workflows/ci.yml`
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Run tests
        run: npm run test:run

      - name: Security audit
        run: npm audit --production

      - name: Build
        run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to staging
        run: |
          echo "Deploying to staging..."
          # Add your staging deployment script
        env:
          DEPLOY_KEY: ${{ secrets.STAGING_DEPLOY_KEY }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # Add your production deployment script
        env:
          DEPLOY_KEY: ${{ secrets.PROD_DEPLOY_KEY }}

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment complete'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Create secret variables in GitHub:**
1. Go to Settings > Secrets and variables > Actions
2. Add:
   - `STAGING_DEPLOY_KEY`
   - `PROD_DEPLOY_KEY`
   - `SLACK_WEBHOOK` (optional)

---

### Step 2: Environment-Specific Configuration

**File:** `config/env.development.js`
```javascript
export const devConfig = {
  api: {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
  },
  logging: {
    level: 'debug',
    console: true,
  },
  security: {
    enableCSP: false,
  },
};
```

**File:** `config/env.production.js`
```javascript
export const prodConfig = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    timeout: 10000,
  },
  logging: {
    level: 'warn',
    console: false,
    external: true,
  },
  security: {
    enableCSP: true,
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  },
};
```

---

### Step 3: Update package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:analyze": "vite build && npm run analyze",
    "analyze": "echo 'Analyze bundle size with: npm run build:analyze'",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit",
    "security-check": "npm audit --production",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "preview": "vite preview",
    "prestart": "npm run lint && npm run type-check && npm run test:run",
    "start": "npm run build && npm run preview",
    "docker:build": "docker build -t miko-surgery:latest .",
    "docker:run": "docker-compose up",
    "docker:test": "docker build -t miko-surgery:test . && docker run miko-surgery:test",
    "deploy:staging": "npm run prestart && npm run build && echo 'Deploy to staging'",
    "deploy:prod": "npm run prestart && npm run build && echo 'Deploy to production'"
  }
}
```

---

## Phase 3: Monitoring Setup (Week 5-6)

### Create Comprehensive Logging

**File:** `src/lib/logger.js` (from DEPLOYMENT_READINESS_REPORT.md)

**Usage in services:**
```javascript
import { createLogger } from '@/lib/logger';

const logger = createLogger('appointmentService');

export async function createAppointment(data) {
  logger.debug('Creating appointment', { leadId: data.leadId });

  try {
    const result = await supabase
      .from('appointments')
      .insert([data])
      .select()
      .single();

    if (result.error) {
      logger.error('Failed to create appointment', {
        error: result.error.message,
        data,
      });
      return { success: false, error: result.error };
    }

    logger.info('Appointment created', {
      appointmentId: result.data.id,
      leadId: data.leadId,
    });

    return { success: true, data: result.data };
  } catch (error) {
    logger.critical('Unexpected error in createAppointment', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
```

### Create Metrics Collection

**File:** `src/lib/metrics.js` (from DEPLOYMENT_READINESS_REPORT.md)

**Usage in components:**
```javascript
import { metricsCollector } from '@/lib/metrics';

export function ChatWidget() {
  const startTime = performance.now();

  useEffect(() => {
    const pageLoadTime = performance.now() - startTime;
    metricsCollector.recordPageLoad(pageLoadTime);
  }, []);

  const handleBooking = async (data) => {
    const start = performance.now();

    try {
      const result = await createAppointment(data);
      const duration = performance.now() - start;

      metricsCollector.recordBooking({
        ...data,
        duration,
        success: result.success,
      });

      metricsCollector.recordAPICall('/appointments', duration, 200);
    } catch (error) {
      metricsCollector.recordError('booking_failed', {
        error: error.message,
      });
    }
  };

  return (
    // Component JSX
  );
}
```

---

### Create Monitoring Dashboard

**Datadog Dashboard Example:**

```python
# If using Datadog, create this dashboard
import json

dashboard = {
  "title": "MiKO Surgery - Production Monitoring",
  "widgets": [
    {
      "type": "timeseries",
      "title": "Page Load Time",
      "requests": [
        {
          "q": "avg:miko.page_load_time{env:production}"
        }
      ]
    },
    {
      "type": "timeseries",
      "title": "Error Rate",
      "requests": [
        {
          "q": "sum:miko.errors{env:production}"
        }
      ]
    },
    {
      "type": "gauge",
      "title": "Uptime",
      "requests": [
        {
          "q": "avg:miko.uptime{env:production}"
        }
      ]
    },
    {
      "type": "timeseries",
      "title": "Bookings per Hour",
      "requests": [
        {
          "q": "sum:miko.bookings{env:production}"
        }
      ]
    }
  ]
}
```

---

## Phase 4: Documentation (Week 7-10)

### Create Operational Runbooks

**File:** `docs/runbooks/outage-response.md`
```markdown
# Outage Response Runbook

## Detection
- UptimeRobot alert OR Datadog alert received
- Check #incidents Slack channel

## Immediate Actions (First 5 minutes)
1. [ ] Acknowledge alert in Slack
2. [ ] Check Sentry for errors
3. [ ] Check Datadog dashboard
4. [ ] Check Supabase status page
5. [ ] Visit /health endpoint

## Diagnosis (Next 10 minutes)

### Check each service:
1. **Supabase:**
   ```bash
   # Check status
   curl https://status.supabase.com
   ```

2. **n8n:**
   ```bash
   # Check webhook
   curl -X POST https://your-n8n.../webhook/chat \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

3. **Application:**
   ```bash
   # Check logs
   kubectl logs -f deployment/miko-surgery
   # or
   docker logs miko-surgery
   ```

## Common Issues & Fixes

### Issue: Database Connection Error
**Symptom:** All API calls fail, Supabase health check fails

**Fix:**
1. Check Supabase dashboard for connection issues
2. Verify credentials in environment variables
3. Restart application pods:
   ```bash
   kubectl rollout restart deployment/miko-surgery
   ```

### Issue: High Error Rate (>5%)
**Symptom:** Errors in Sentry dashboard

**Fix:**
1. Check error details in Sentry
2. Review recent deployments
3. Check for third-party API issues
4. If recent deploy caused it: `git revert <commit>`

### Issue: Slow Response Times
**Symptom:** Page load > 3 seconds, API response > 1 second

**Fix:**
1. Check database query performance
2. Look for N+1 queries
3. Check Datadog APM for bottlenecks
4. Restart application to clear caches

## Escalation

- [ ] If unresolved after 15 min: Page on-call engineer
- [ ] If unresolved after 30 min: Page engineering manager
- [ ] If critical data loss: Activate DR plan

## Post-Incident

1. [ ] Document root cause
2. [ ] Create Jira ticket
3. [ ] Implement fix
4. [ ] Add monitoring for prevention
5. [ ] Conduct postmortem
```

---

### Create Deployment Procedure

**File:** `docs/deployment.md`
```markdown
# Deployment Procedure

## Pre-Deployment (T-1 hour)

1. [ ] Notify #deployments Slack channel
2. [ ] Verify all tests passing: `npm run test:run`
3. [ ] Verify linting: `npm run lint`
4. [ ] Review recent commits
5. [ ] Backup production database
6. [ ] Notify customer success team

## Deployment (T-0)

1. [ ] Push to main branch (or merge PR)
2. [ ] GitHub Actions CI/CD pipeline starts automatically
3. [ ] Wait for all checks to pass
4. [ ] Monitor Datadog dashboard in real-time
5. [ ] Check /health endpoint responds

## Post-Deployment (T+15 min)

1. [ ] Verify application responding
2. [ ] Check error rate < 1%
3. [ ] Check response times normal
4. [ ] Test key user journeys:
   - [ ] Chat works
   - [ ] Appointment booking works
   - [ ] Admin dashboard loads
5. [ ] Post all-clear to #deployments

## Rollback Procedure (If needed)

1. [ ] `git revert <commit-hash>`
2. [ ] `git push origin main`
3. [ ] Wait for CI/CD pipeline
4. [ ] Verify /health endpoint
5. [ ] Document incident

## Deployment Checklist

Before deploying to production:
- [ ] All tests passing
- [ ] No security vulnerabilities
- [ ] Code reviewed
- [ ] Staging deployment tested
- [ ] Database migrations tested (if applicable)
- [ ] Feature flags configured
- [ ] Monitoring alerts active
- [ ] On-call engineer available
```

---

### Create Disaster Recovery Plan

**File:** `docs/disaster-recovery.md`
```markdown
# Disaster Recovery Plan

## RPO & RTO

- **RPO (Recovery Point Objective):** 1 hour
- **RTO (Recovery Time Objective):** 4 hours

## Backup Strategy

### Database Backups
- **Frequency:** Hourly automated backups
- **Retention:** 30 days
- **Provider:** Supabase (automated)
- **Test:** Monthly restore to staging

### Application Code
- **Frequency:** Every commit to GitHub
- **Retention:** Unlimited (GitHub)
- **Recovery:** Redeploy from git history

### Secrets & Credentials
- **Frequency:** Updated on rotation
- **Storage:** Deployment platform secrets
- **Retention:** Current + 1 previous version
- **Recovery:** Rotate and apply new secrets

## Failure Scenarios & Recovery

### Scenario 1: Database Corruption
1. [ ] Stop application from writing
2. [ ] Restore from automated backup
3. [ ] Verify data integrity
4. [ ] Resume operations
5. **RTO: 30 minutes**

### Scenario 2: Secrets Compromised
1. [ ] Rotate all credentials immediately
2. [ ] Update deployment secrets
3. [ ] Restart application pods
4. [ ] Monitor for unauthorized access
5. **RTO: 10 minutes**

### Scenario 3: Application Code Corruption
1. [ ] Identify last known good commit
2. [ ] `git revert` to previous version
3. [ ] Push to main
4. [ ] CI/CD pipeline deploys automatically
5. **RTO: 5 minutes**

## Testing DR Plan

**Monthly DR Drill:**
1. [ ] Simulate database failure
2. [ ] Restore from backup to test environment
3. [ ] Verify all data present
4. [ ] Document any issues
5. [ ] Update runbooks as needed

**Quarterly Failover Test:**
1. [ ] Failover to secondary region (if available)
2. [ ] Verify all services operational
3. [ ] Document timing
4. [ ] Failback to primary

## Contacts

**On-Call Engineer:** [phone number]
**Engineering Manager:** [phone number]
**VP Engineering:** [phone number]
**Customer Success:** [email]
```

---

## Verification Checklist

After completing all phases, verify:

```markdown
# Production Readiness Verification

## Phase 1: Critical Fixes
- [ ] All credentials rotated (verify in services)
- [ ] Sentry dashboard receiving errors
- [ ] /health endpoint returns proper JSON
- [ ] UptimeRobot reporting up/down status

## Phase 2: Deployment Pipeline
- [ ] GitHub Actions CI/CD pipeline working
- [ ] Docker build succeeds
- [ ] docker-compose up brings up full stack
- [ ] Environment variables properly validated

## Phase 3: Monitoring
- [ ] Datadog dashboard showing metrics
- [ ] Alerts triggering for test errors
- [ ] Logs visible in centralized logging
- [ ] Performance metrics being collected

## Phase 4: Documentation
- [ ] Runbooks reviewed by team
- [ ] DR plan tested at least once
- [ ] Deployment procedure documented and followed
- [ ] Team trained on all procedures

## Overall
- [ ] Team comfortable with deployment process
- [ ] On-call escalation clear
- [ ] Monitoring dashboards accessible
- [ ] Error tracking working
- [ ] Application passes all tests
- [ ] Security audit completed
```

---

## Success Criteria

Once all phases complete:

✅ Can deploy multiple times per day safely
✅ Errors detected within 1 minute
✅ Outages detected and alerted within 2 minutes
✅ Can rollback in < 5 minutes
✅ Complete audit trail of all changes
✅ Team confident in production operations
✅ < 1% deployment failure rate
✅ 99.9% uptime capability

---

## Support & Escalation

If stuck on any step:

1. **For Sentry:** Check docs.sentry.io
2. **For GitHub Actions:** Check github.com/actions/docs
3. **For Docker:** Check docker.com/docs
4. **For Datadog:** Check docs.datadoghq.com
5. **For internal issues:** Create Jira ticket with "DEPLOYMENT" label
