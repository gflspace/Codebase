# QwickServices CIS — Scripts Reference

Production and operational scripts for CIS backend.

## Available Scripts

### Deployment Scripts

#### `deploy.sh`
**Purpose**: Deploy CIS backend to production

**Usage**:
```bash
./scripts/deploy.sh [environment]
```

**Features**:
- Validates environment configuration
- Runs database migrations
- Builds Docker images
- Performs health checks
- Supports rollback on failure

---

#### `setup-ssl.sh` ✨ NEW
**Purpose**: Obtain and configure SSL certificates

**Usage**:
```bash
sudo ./scripts/setup-ssl.sh <domain> <email>

# Example:
sudo ./scripts/setup-ssl.sh api-cis.yourdomain.com admin@yourdomain.com
```

**Features**:
- Auto-installs certbot
- Obtains Let's Encrypt certificates
- Configures nginx with SSL
- Sets up auto-renewal cron job
- Tests certificate validity

**Prerequisites**:
- Domain DNS must point to server
- Port 80 must be accessible
- Run as root or with sudo

---

### Database Scripts

#### `migrate.ts`
**Purpose**: Run database migrations

**Usage**:
```bash
npm run migrate

# Or directly:
npx tsx src/database/migrate.ts
```

**Environment Variables Required**:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

**Features**:
- Applies pending migrations in order
- Tracks migration history
- Validates schema integrity
- Atomic transactions

---

#### `seed-admin.ts`
**Purpose**: Create initial admin user

**Usage**:
```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=SecurePass123! npx tsx scripts/seed-admin.ts
```

**Environment Variables Required**:
- `ADMIN_EMAIL` - Admin user email
- `ADMIN_PASSWORD` - Admin user password (min 8 chars)
- `DB_*` - Database connection variables

**Output**:
- Creates admin user if not exists
- Returns JWT token for immediate use

---

#### `verify-db.ts`
**Purpose**: Verify database schema and connectivity

**Usage**:
```bash
npx tsx scripts/verify-db.ts
```

**Checks**:
- Database connectivity
- All required tables exist
- Indexes are present
- Constraints are valid
- Sample data can be queried

---

#### `backup-db.sh`
**Purpose**: Backup PostgreSQL database

**Usage**:
```bash
./scripts/backup-db.sh

# With custom output directory:
BACKUP_DIR=/custom/path ./scripts/backup-db.sh
```

**Features**:
- Dumps entire database to SQL file
- Compresses with gzip
- Names with timestamp: `qwick_cis_YYYYMMDD_HHMMSS.sql.gz`
- Retains last 30 backups
- Logs to `/var/log/cis/backup.log`

**Default Backup Location**: `/var/backups/cis/`

**Restore**:
```bash
gunzip -c /var/backups/cis/qwick_cis_20260213_020000.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U cis_app_user -d qwick_cis
```

---

### Operational Scripts

#### `healthcheck.sh`
**Purpose**: Check service health status

**Usage**:
```bash
./scripts/healthcheck.sh
```

**Checks**:
- HTTP endpoint health (`/api/health`)
- Database connectivity
- Redis connectivity
- Response time

**Exit Codes**:
- `0` - All healthy
- `1` - Service unhealthy
- `2` - Critical failure

**Use in Monitoring**:
```bash
# Run every 5 minutes via cron
*/5 * * * * /opt/qcis/src/backend/scripts/healthcheck.sh || echo "$(date): Health check failed" >> /var/log/cis/healthcheck.log
```

---

#### `setup-cron.sh` ✨ NEW
**Purpose**: Configure production cron jobs

**Usage**:
```bash
sudo ./scripts/setup-cron.sh
```

**Installs**:
- Database backup: Daily at 2:00 AM
- Health check: Every 5 minutes
- Log rotation: Weekly on Sunday at 3:00 AM
- Docker cleanup: Monthly on 1st at 4:00 AM

**Directories Created**:
- `/var/backups/cis` - Database backups
- `/var/log/cis` - Application logs

**Verification**:
```bash
crontab -l | grep "QwickServices CIS"
```

---

### Development Scripts

#### `dev.sh` (if exists)
**Purpose**: Start development environment

**Usage**:
```bash
./scripts/dev.sh
```

**Features**:
- Starts development Docker Compose stack
- Watches for file changes
- Hot-reloads on code changes
- Exposes debug ports

---

## Script Permissions

Make scripts executable:

```bash
cd src/backend/scripts

# All scripts
chmod +x *.sh

# Individual scripts
chmod +x setup-ssl.sh
chmod +x setup-cron.sh
chmod +x backup-db.sh
chmod +x healthcheck.sh
chmod +x deploy.sh
```

## Environment Variables

Most scripts require environment variables. Ensure `.env.production` is configured:

```bash
# Load environment
source .env.production

# Or run with environment file
env $(cat .env.production | grep -v '^#' | xargs) ./scripts/script-name.sh
```

## Logging

Scripts log to:
- **stdout** - Normal output
- **stderr** - Errors
- **Log files** - `/var/log/cis/` (created by setup-cron.sh)

View logs:
```bash
# Backup logs
tail -f /var/log/cis/backup.log

# Health check logs
tail -f /var/log/cis/healthcheck.log

# Docker cleanup logs
tail -f /var/log/cis/docker-cleanup.log
```

## Cron Jobs

After running `setup-cron.sh`, verify scheduled tasks:

```bash
# List cron jobs
crontab -l

# Edit cron jobs
crontab -e

# View cron logs (system-wide)
grep CRON /var/log/syslog
```

## Troubleshooting

### Script won't run

**Issue**: Permission denied
```bash
chmod +x scripts/script-name.sh
```

**Issue**: Bad interpreter
```bash
# Verify shebang line
head -1 scripts/script-name.sh
# Should be: #!/bin/bash
```

### Database scripts fail

**Issue**: Connection refused
```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.prod.yml ps postgres

# Test connection
psql -h localhost -U cis_app_user -d qwick_cis -c "SELECT 1;"
```

**Issue**: Authentication failed
```bash
# Verify environment variables
echo $DB_PASSWORD
env | grep DB_
```

### Backup fails

**Issue**: Disk full
```bash
df -h
# Clean old backups manually if needed
```

**Issue**: Permission denied
```bash
sudo mkdir -p /var/backups/cis
sudo chown $USER:$USER /var/backups/cis
```

### Health check fails

**Issue**: Service not running
```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml up -d
```

**Issue**: Timeout
```bash
# Increase timeout in healthcheck.sh
# Or check service logs
docker-compose -f docker-compose.prod.yml logs cis-backend
```

## Best Practices

1. **Always test scripts** in development before production
2. **Review logs** after running scripts
3. **Backup before** running destructive operations
4. **Use absolute paths** in cron jobs
5. **Set proper permissions** (750 for scripts, 700 for scripts with secrets)
6. **Document changes** to scripts in version control
7. **Monitor cron execution** via logs

## Adding New Scripts

When creating new scripts:

1. **Use proper shebang**: `#!/bin/bash`
2. **Set exit on error**: `set -e`
3. **Add script header** with description and usage
4. **Validate input** parameters
5. **Log actions** with timestamps
6. **Return proper exit codes**
7. **Make executable**: `chmod +x script-name.sh`
8. **Document** in this README

Example template:

```bash
#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  QwickServices CIS — Script Name
# ═══════════════════════════════════════════════════════════════
#
# Description: What this script does
#
# Usage: ./scripts/script-name.sh [options]
#
# Prerequisites:
#   - What needs to exist before running
#
# ═══════════════════════════════════════════════════════════════

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Main logic here...

log_info "Script completed successfully"
```

---

## Quick Reference

| Script | Purpose | Requires Root | Cron-able |
|--------|---------|---------------|-----------|
| deploy.sh | Deploy to production | No | No |
| setup-ssl.sh | Configure SSL | Yes | No |
| migrate.ts | Run migrations | No | No |
| seed-admin.ts | Create admin user | No | No |
| verify-db.ts | Verify database | No | Yes |
| backup-db.sh | Backup database | No | Yes |
| healthcheck.sh | Check health | No | Yes |
| setup-cron.sh | Setup cron jobs | Yes | No |

---

**Last Updated**: 2026-02-13
