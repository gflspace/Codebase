# CIS Backend — Deployment Quick Reference

**One-page command reference for production operations**

---

## Initial Setup

```bash
# 1. Create environment file
cp .env.production.example .env.production
# Edit .env.production and replace ALL CHANGE_ME_* values

# 2. Generate secrets (run 3x for JWT, HMAC, WEBHOOK)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Install dependencies
npm install

# 4. Run migrations
npx tsx scripts/migrate.ts

# 5. Verify database
npx tsx scripts/verify-db.ts

# 6. Create admin user
npx tsx scripts/seed-admin.ts

# 7. Deploy
./scripts/deploy.sh
```

---

## Daily Operations

### Health & Status

```bash
# Check all services
./scripts/healthcheck.sh

# Quick health check
curl http://localhost:3001/api/health

# Service status
docker-compose -f docker-compose.prod.yml ps

# Resource usage
docker stats
```

### Logs

```bash
# All services (follow)
docker-compose -f docker-compose.prod.yml logs -f

# Backend only
docker-compose -f docker-compose.prod.yml logs -f cis-backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100

# Errors only
docker-compose -f docker-compose.prod.yml logs | grep ERROR
```

### Service Control

```bash
# Start all
docker-compose -f docker-compose.prod.yml up -d

# Stop all
docker-compose -f docker-compose.prod.yml down

# Restart backend
docker-compose -f docker-compose.prod.yml restart cis-backend

# Restart all
docker-compose -f docker-compose.prod.yml restart
```

---

## Database Operations

### Migrations

```bash
# Run pending migrations
npx tsx scripts/migrate.ts

# Verify database integrity
npx tsx scripts/verify-db.ts

# Connect to database
docker exec -it cis-postgres psql -U cis_app_user -d qwick_cis
```

### Backups

```bash
# Create backup
./scripts/backup-db.sh

# List backups
ls -lh backups/

# Restore backup
gunzip -c backups/cis_backup_YYYY-MM-DD_HHMMSS.sql.gz | \
  psql -h localhost -p 5432 -U cis_app_user -d qwick_cis
```

---

## Updates & Redeployment

```bash
# Full redeployment
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Or use deploy script
./scripts/deploy.sh
```

---

## Troubleshooting

### View Container Shell

```bash
docker exec -it cis-backend sh
```

### Database Console

```bash
docker exec -it cis-postgres psql -U cis_app_user -d qwick_cis
```

### Redis CLI

```bash
docker exec -it cis-redis redis-cli
```

### Reset Everything (DANGER!)

```bash
# Backup first!
./scripts/backup-db.sh

# Stop and remove all containers and volumes
docker-compose -f docker-compose.prod.yml down -v

# Start fresh
docker-compose -f docker-compose.prod.yml up -d
npx tsx scripts/migrate.ts
npx tsx scripts/seed-admin.ts
```

---

## Common SQL Queries

```sql
-- Count users
SELECT COUNT(*) FROM users;

-- Recent enforcement actions
SELECT * FROM enforcement_actions
ORDER BY created_at DESC
LIMIT 10;

-- Shadow mode logs
SELECT * FROM enforcement_shadow_log
ORDER BY created_at DESC
LIMIT 10;

-- Migration status
SELECT * FROM schema_migrations
ORDER BY id DESC;

-- Audit log (last 24h)
SELECT * FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Database size
SELECT pg_size_pretty(pg_database_size('qwick_cis'));

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Environment Variables (Critical)

### Must Change Before Production

```bash
DB_PASSWORD=CHANGE_ME_strong_password_here
JWT_SECRET=CHANGE_ME_generate_with_openssl
HMAC_SECRET=CHANGE_ME_generate_with_openssl
WEBHOOK_SECRET=CHANGE_ME_shared_with_laravel
```

### Feature Flags

```bash
SHADOW_MODE=true              # Log but don't execute enforcement
ENFORCEMENT_KILL_SWITCH=false # Emergency disable all enforcement
SCORING_MODEL=5-component     # 3-layer or 5-component
```

### Production Settings

```bash
NODE_ENV=production
LOG_LEVEL=info               # debug, info, warn, error
DB_SSL=true                  # Always true in production
EVENT_BUS_BACKEND=redis      # Never 'memory' in production
```

---

## Emergency Procedures

### Kill Switch (Disable All Enforcement)

```bash
# Edit .env.production
ENFORCEMENT_KILL_SWITCH=true

# Restart
docker-compose -f docker-compose.prod.yml restart cis-backend
```

### Rollback to Backup

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Restore database
gunzip -c backups/cis_backup_LATEST.sql.gz | \
  psql -h localhost -p 5432 -U cis_app_user -d qwick_cis

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Out of Memory

```bash
# Check memory usage
docker stats

# Increase limits in docker-compose.prod.yml
# Then restart
docker-compose -f docker-compose.prod.yml restart
```

---

## File Locations

```
src/backend/
├── .env.production              # Production config (DO NOT COMMIT)
├── Dockerfile                   # Production build
├── docker-compose.prod.yml      # Production orchestration
├── backups/                     # Database backups (auto-created)
├── nginx/nginx.conf             # Reverse proxy config
└── scripts/
    ├── deploy.sh                # Main deployment
    ├── migrate.ts               # Run migrations
    ├── verify-db.ts             # Verify database
    ├── healthcheck.sh           # Health checks
    ├── backup-db.sh             # Backup database
    └── seed-admin.ts            # Create admin user
```

---

## Network Ports

- **80** — HTTP (Nginx)
- **443** — HTTPS (Nginx)
- **3001** — Backend API (internal, don't expose)
- **5432** — PostgreSQL (internal, don't expose)
- **6379** — Redis (internal, don't expose)

---

## Support

- **Full Guide:** `PRODUCTION_DEPLOYMENT.md`
- **Logs:** `docker-compose -f docker-compose.prod.yml logs -f`
- **Health:** `./scripts/healthcheck.sh`
- **Database:** `npx tsx scripts/verify-db.ts`

---

**Last Updated:** 2026-02-13
**Version:** 0.1.0
