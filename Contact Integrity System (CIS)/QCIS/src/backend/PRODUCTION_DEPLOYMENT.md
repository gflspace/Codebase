# QwickServices CIS — Production Deployment Guide

This document provides a complete guide for deploying the Contact Integrity System (CIS) backend to production.

---

## Infrastructure Overview

The CIS backend uses a multi-container Docker architecture:

- **PostgreSQL 15** — Primary database (with persistent volume)
- **Redis 7** — Event bus and caching layer (with persistence)
- **CIS Backend** — Node.js 20 Express API (TypeScript compiled)
- **Nginx** — Reverse proxy with SSL termination support

---

## Prerequisites

### System Requirements

- Docker 24.0+ and Docker Compose 2.0+
- Node.js 20+ (for local scripts)
- PostgreSQL client tools (for backups)
- At least 2GB RAM and 10GB disk space
- Ports available: 80, 443, 3001, 5432, 6379

### Required Files

All production infrastructure files are in `src/backend/`:

```
src/backend/
├── Dockerfile                      # Multi-stage production build
├── .dockerignore                   # Build context exclusions
├── docker-compose.prod.yml         # Production orchestration
├── .env.production.example         # Environment template
├── .env.production                 # Your actual config (create this)
├── nginx/
│   └── nginx.conf                  # Reverse proxy configuration
└── scripts/
    ├── deploy.sh                   # Main deployment script
    ├── migrate.ts                  # Database migration runner
    ├── seed-admin.ts               # Admin user seeder
    ├── verify-db.ts                # Database verification
    ├── healthcheck.sh              # Service health checker
    └── backup-db.sh                # Database backup script
```

---

## Deployment Steps

### 1. Environment Configuration

Create your production environment file:

```bash
cd src/backend
cp .env.production.example .env.production
```

**CRITICAL:** Edit `.env.production` and replace ALL `CHANGE_ME_*` placeholders:

```bash
# Generate secure secrets (run 3 times for JWT, HMAC, WEBHOOK):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Update these critical values:
- `DB_PASSWORD` — Strong database password (20+ characters)
- `JWT_SECRET` — Cryptographically random (64+ characters)
- `HMAC_SECRET` — Cryptographically random (64+ characters)
- `WEBHOOK_SECRET` — Shared with Laravel platform (64+ characters)

**Security Checklist:**
- ✅ All secrets are random and unique
- ✅ `DB_SSL=true` for encrypted connections
- ✅ `SHADOW_MODE=true` initially (disable after testing)
- ✅ `EVENT_BUS_BACKEND=redis` (never 'memory' in production)
- ✅ `LOG_LEVEL=info` (not 'debug')
- ✅ SMTP credentials configured for notifications
- ✅ URLs use HTTPS in production

### 2. Database Setup

Run migrations to initialize the database:

```bash
npm install
npx tsx scripts/migrate.ts
```

Expected output:
```
Applied migrations: 0
Total migrations: 29
Pending migrations: 29

  ✓ Applied: 001_users.sql
  ✓ Applied: 002_messages.sql
  ...
  ✓ Applied: 029_performance_indexes.sql

✓ Successfully applied 29 migration(s)
```

Verify database integrity:

```bash
npx tsx scripts/verify-db.ts
```

Expected output:
```
✓ Database connection successful
✓ Migrations applied: 29 / 29
✓ All 24 critical tables exist
✓ Database indexes: 47+
✓ Database verification PASSED
```

### 3. Create Admin User

Seed the initial admin account:

```bash
npx tsx scripts/seed-admin.ts
```

**Save the generated credentials securely!**

### 4. Deploy with Docker

Run the automated deployment script:

```bash
./scripts/deploy.sh
```

The script will:
1. ✅ Validate environment configuration
2. ✅ Run database migrations (if needed)
3. ✅ Build Docker images
4. ✅ Start all services
5. ✅ Perform health checks

**Manual deployment alternative:**

```bash
# Build images
docker-compose -f docker-compose.prod.yml build --no-cache

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. Health Verification

Run comprehensive health checks:

```bash
./scripts/healthcheck.sh
```

Expected output:
```
✓ CIS Backend API... HEALTHY
✓ PostgreSQL Database... HEALTHY
✓ Redis Cache/Event Bus... HEALTHY
✓ Nginx Reverse Proxy... HEALTHY

✓ All services are healthy
```

Verify API manually:

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "environment": "production",
  "shadowMode": true,
  "timestamp": "2026-02-13T...",
  "uptime": 123.45
}
```

---

## Post-Deployment Tasks

### 1. SSL Certificate Setup

For production domains, configure Let's Encrypt:

```bash
# Install certbot
apt-get install certbot

# Obtain certificate
certbot certonly --standalone -d cis.qwickservices.com

# Certificates will be in /etc/letsencrypt/live/cis.qwickservices.com/
```

Update `docker-compose.prod.yml` to mount certificates:

```yaml
nginx:
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

Update `nginx/nginx.conf` with SSL configuration.

### 2. Firewall Configuration

Configure firewall to allow only necessary ports:

```bash
# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Restrict direct backend access (only localhost)
ufw deny 3001/tcp

# Restrict database access (only localhost or specific IPs)
ufw deny 5432/tcp
ufw deny 6379/tcp

ufw enable
```

### 3. Monitoring Setup

Monitor service health:

```bash
# Add to crontab for periodic health checks
*/5 * * * * /path/to/scripts/healthcheck.sh >> /var/log/cis-health.log 2>&1
```

Monitor container logs:

```bash
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

### 4. Database Backups

Configure automated backups:

```bash
# Test backup manually
./scripts/backup-db.sh

# Add to crontab for daily backups at 2 AM
0 2 * * * /path/to/scripts/backup-db.sh >> /var/log/cis-backup.log 2>&1
```

Backups are stored in `./backups/` with automatic retention (keeps last 7).

**Restore a backup:**

```bash
# Uncompress and restore
gunzip -c backups/cis_backup_2026-02-13_020000.sql.gz | \
  psql -h localhost -p 5432 -U cis_app_user -d qwick_cis
```

### 5. Shadow Mode Testing

Initially, `SHADOW_MODE=true` logs enforcement actions without executing them.

Test enforcement:
1. Monitor shadow logs: `docker-compose logs -f cis-backend | grep SHADOW`
2. Create test violations via API
3. Verify actions are logged but not executed
4. Review shadow log table: `SELECT * FROM enforcement_shadow_log;`

**Disable shadow mode when ready:**

```bash
# Edit .env.production
SHADOW_MODE=false

# Restart services
docker-compose -f docker-compose.prod.yml restart cis-backend
```

---

## Operational Commands

### Service Management

```bash
# View all services
docker-compose -f docker-compose.prod.yml ps

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml down

# Restart a specific service
docker-compose -f docker-compose.prod.yml restart cis-backend

# View logs (all services)
docker-compose -f docker-compose.prod.yml logs -f

# View logs (specific service)
docker-compose -f docker-compose.prod.yml logs -f cis-backend

# Execute commands in container
docker exec -it cis-backend sh

# View resource usage
docker stats
```

### Database Operations

```bash
# Connect to database
docker exec -it cis-postgres psql -U cis_app_user -d qwick_cis

# Run migrations
npx tsx scripts/migrate.ts

# Verify database
npx tsx scripts/verify-db.ts

# Create backup
./scripts/backup-db.sh

# Check database size
docker exec -it cis-postgres psql -U cis_app_user -d qwick_cis -c "\l+"
```

### Update/Redeploy

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Or use deploy script
./scripts/deploy.sh
```

---

## Troubleshooting

### Backend won't start

**Check logs:**
```bash
docker-compose -f docker-compose.prod.yml logs cis-backend
```

**Common issues:**
- Database not ready: Wait for PostgreSQL health check to pass
- Missing environment variables: Check `.env.production`
- Migration failures: Run `npx tsx scripts/migrate.ts` manually
- Port conflicts: Ensure ports 3001, 5432, 6379 are available

### Database connection errors

**Verify PostgreSQL is running:**
```bash
docker-compose -f docker-compose.prod.yml ps postgres
pg_isready -h localhost -p 5432 -U cis_app_user -d qwick_cis
```

**Check credentials:**
- Verify `DB_PASSWORD` in `.env.production`
- Ensure `DB_USER` has permissions
- Check `DB_HOST` resolves correctly

### Health checks failing

**Run manual health check:**
```bash
./scripts/healthcheck.sh
```

**Check individual services:**
```bash
# Backend
curl http://localhost:3001/api/health

# Nginx
curl http://localhost:80/api/health

# PostgreSQL
pg_isready -h localhost -p 5432

# Redis
redis-cli -h localhost -p 6379 ping
```

### Out of memory

**Check container memory:**
```bash
docker stats
```

**Increase memory limits in `docker-compose.prod.yml`:**
```yaml
services:
  cis-backend:
    deploy:
      resources:
        limits:
          memory: 1G  # Increased from 512M
```

### Data persistence issues

**Verify volumes:**
```bash
docker volume ls | grep cis
```

**Backup and recreate volumes:**
```bash
# Backup first!
./scripts/backup-db.sh

# Remove and recreate
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

---

## Security Best Practices

### Environment Variables
- ✅ Never commit `.env.production` to version control
- ✅ Use cryptographically random secrets (32+ bytes)
- ✅ Rotate secrets periodically (quarterly)
- ✅ Store backups of `.env.production` securely

### Database Security
- ✅ Use strong passwords (20+ characters)
- ✅ Enable SSL/TLS for connections
- ✅ Restrict access to localhost or specific IPs
- ✅ Regular backups with encryption
- ✅ Monitor for unusual query patterns

### Application Security
- ✅ Run containers as non-root user (already configured)
- ✅ Keep Docker images updated
- ✅ Use network isolation (Docker networks)
- ✅ Enable rate limiting (configured in `.env`)
- ✅ Monitor audit logs regularly

### Access Control
- ✅ Use SSH keys (not passwords) for server access
- ✅ Implement IP whitelisting for admin endpoints
- ✅ Enable 2FA for critical accounts
- ✅ Regular security audits
- ✅ Log all administrative actions

---

## Performance Optimization

### Database Tuning

Monitor slow queries:
```sql
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

Optimize connection pool (in `.env.production`):
```bash
DB_POOL_MIN=5
DB_POOL_MAX=50
DB_POOL_IDLE_TIMEOUT_MS=30000
```

### Redis Configuration

Monitor memory usage:
```bash
docker exec -it cis-redis redis-cli INFO memory
```

Adjust memory limit in `docker-compose.prod.yml`:
```yaml
redis:
  command: >
    redis-server
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
```

### Application Scaling

For high traffic, scale horizontally:

```bash
# Scale backend to 3 instances
docker-compose -f docker-compose.prod.yml up -d --scale cis-backend=3

# Update nginx for load balancing
# See nginx/nginx.conf for upstream configuration
```

---

## Compliance & Auditing

### Audit Logs

Query audit logs:
```sql
SELECT * FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

Export for compliance:
```bash
docker exec -it cis-postgres psql -U cis_app_user -d qwick_cis -c \
  "COPY (SELECT * FROM audit_logs WHERE created_at >= NOW() - INTERVAL '30 days') \
  TO STDOUT WITH CSV HEADER" > audit_export.csv
```

### Data Retention

Configured in migrations:
- Audit logs: 90 days
- Enforcement logs: 365 days
- Shadow logs: 30 days
- Risk scores: Indefinite

---

## Support & Escalation

### Critical Issues

If production is down:
1. Check health: `./scripts/healthcheck.sh`
2. Review logs: `docker-compose logs -f`
3. Emergency kill switch: Set `ENFORCEMENT_KILL_SWITCH=true`
4. Rollback: Restore from latest backup

### Emergency Contacts

- **Technical Lead:** [Contact info]
- **DevOps:** [Contact info]
- **Database Admin:** [Contact info]

### Incident Response

1. **Assess impact:** Number of users affected
2. **Enable kill switch:** Stop enforcement if needed
3. **Collect evidence:** Logs, metrics, error messages
4. **Apply fix:** Deploy hotfix or rollback
5. **Post-mortem:** Document incident and prevention

---

## Migration Count Reference

**Expected Migrations:** 29 (as of 2026-02-13)

```
001_users.sql
002_messages.sql
003_transactions.sql
004_risk_signals.sql
005_risk_scores.sql
006_enforcement_actions.sql
007_audit_logs.sql
008_alerts_cases.sql
009_appeals.sql
010_user_provider_fields.sql
011_permissions_rbac.sql
012_seed_synthetic_data.sql
013_webhook_events.sql
014_bookings.sql
015_wallet_transactions.sql
016_extend_signal_types.sql
017_trust_history_provider_metrics.sql
018_risk_scores_model_version.sql
019_detection_signal_types_phase2c.sql
020_ratings.sql
021_leakage_events.sql
022_user_relationships.sql
023_user_devices.sql
024_enforcement_orchestrator_phase3b.sql
025_alerting_engine_layer8.sql
026_admin_rules_engine.sql
027_contagion_signal_type.sql
028_disputes_anomaly_logs_communication_flags.sql
029_performance_indexes.sql
```

Verify with: `npx tsx scripts/verify-db.ts`

---

## License & Attribution

**QwickServices Contact Integrity System (CIS)**
Version: 0.1.0
License: Proprietary

---

## Changelog

### 2026-02-13
- Initial production deployment infrastructure
- Added comprehensive deployment scripts
- Implemented automated backups
- Added health check monitoring
- Created database verification tools
