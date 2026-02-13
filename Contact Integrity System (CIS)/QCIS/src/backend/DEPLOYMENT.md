# QwickServices CIS — Deployment Guide

Complete production deployment configuration for the Contact Integrity System backend.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [SSL Certificate Setup](#ssl-certificate-setup)
4. [Docker Deployment](#docker-deployment)
5. [Monitoring Setup](#monitoring-setup)
6. [Automated Tasks](#automated-tasks)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **OS**: Ubuntu 20.04+ / Debian 11+ / RHEL 8+
- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Disk**: 20GB minimum (50GB+ recommended)
- **Network**: Static IP with DNS configured

### Software Requirements

```bash
# Docker & Docker Compose
docker --version  # 24.0+
docker-compose --version  # 2.0+

# Node.js (for development)
node --version  # 20.x

# PostgreSQL client (for manual operations)
psql --version  # 15.x

# OpenSSL (for SSL certificates)
openssl version  # 1.1.1+
```

### Installation (Ubuntu/Debian)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Install Node.js (optional, for local dev)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL client
sudo apt install -y postgresql-client
```

---

## Environment Setup

### 1. Clone Repository

```bash
cd /opt
git clone https://github.com/yourusername/qcis.git
cd qcis/src/backend
```

### 2. Configure Environment Variables

```bash
# Copy example environment file
cp .env.production.example .env.production

# Generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit configuration
nano .env.production
```

**Critical variables to set:**

```bash
# Database
DB_PASSWORD=<strong_random_password>

# Authentication
JWT_SECRET=<64_char_random_hex>

# Webhooks
HMAC_SECRET=<64_char_random_hex>
WEBHOOK_SECRET=<64_char_random_hex>

# SMTP (for notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PASSWORD=<sendgrid_api_key>
SMTP_FROM=cis@yourdomain.com

# URLs
DASHBOARD_URL=https://cis.yourdomain.com
API_BASE_URL=https://api-cis.yourdomain.com
```

### 3. Validate Configuration

```bash
# Check environment file
grep -E "CHANGE_ME|TODO" .env.production
# Should return empty (no placeholders remaining)

# Verify all required variables
docker-compose -f docker-compose.prod.yml config
```

---

## SSL Certificate Setup

### Automatic (Let's Encrypt)

```bash
# Make script executable
chmod +x scripts/setup-ssl.sh

# Run SSL setup
sudo ./scripts/setup-ssl.sh api-cis.yourdomain.com admin@yourdomain.com
```

The script will:
- Install certbot
- Obtain SSL certificates
- Configure nginx
- Set up auto-renewal cron job

### Manual (Existing Certificates)

```bash
# Copy certificates to nginx directory
sudo cp /path/to/fullchain.pem nginx/ssl/
sudo cp /path/to/privkey.pem nginx/ssl/

# Update nginx configuration
nano nginx/nginx.ssl.conf
# Update certificate paths
```

### Update Docker Compose for SSL

Edit `docker-compose.prod.yml`:

```yaml
nginx:
  volumes:
    - ./nginx/nginx.ssl.conf:/etc/nginx/nginx.conf:ro  # Use SSL config
    - /etc/letsencrypt:/etc/letsencrypt:ro             # Mount certificates
    - /var/www/certbot:/var/www/certbot:ro             # ACME challenge
```

---

## Docker Deployment

### 1. Build Images

```bash
# Build backend image
docker build -t qcis-backend:latest .

# Verify image
docker images | grep qcis-backend
```

### 2. Initialize Database

```bash
# Start PostgreSQL only
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for database to be ready
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U cis_app_user

# Run migrations
npm run migrate

# Seed admin user
ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD=<secure_password> npx tsx scripts/seed-admin.ts
```

### 3. Start All Services

```bash
# Start production stack
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Verify all services are healthy
docker-compose -f docker-compose.prod.yml ps
```

### 4. Verify Deployment

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test health endpoint
curl http://localhost:80/api/health

# Test HTTPS (if SSL configured)
curl https://api-cis.yourdomain.com/api/health

# Verify database connectivity
docker-compose -f docker-compose.prod.yml exec cis-backend npx tsx scripts/verify-db.ts
```

### Common Docker Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f [service_name]

# Restart service
docker-compose -f docker-compose.prod.yml restart [service_name]

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (CAUTION: deletes data)
docker-compose -f docker-compose.prod.yml down -v

# View resource usage
docker stats

# Execute command in container
docker-compose -f docker-compose.prod.yml exec cis-backend sh
```

---

## Monitoring Setup

### 1. Start Monitoring Stack

```bash
# Start Prometheus + Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# Or combine with production stack
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
```

### 2. Access Dashboards

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (default: admin/admin)

### 3. Configure Grafana

1. Login to Grafana (http://localhost:3000)
2. Navigate to Configuration → Data Sources
3. Prometheus should be auto-configured
4. Go to Dashboards → Browse
5. "QwickServices CIS - Overview" dashboard should be available

### 4. Available Metrics

The backend exposes metrics at `/api/metrics`:

```bash
curl http://localhost:3001/api/metrics
```

**Key metrics:**
- `http_requests_total` - Request count by method/status
- `http_request_duration_ms` - Request latency histogram
- `http_active_connections` - Active HTTP connections
- `events_processed_total` - Event bus processing
- `db_queries_total` - Database query count
- `db_query_duration_ms` - Database query latency

---

## Automated Tasks

### Setup Cron Jobs

```bash
# Make script executable
chmod +x scripts/setup-cron.sh

# Run cron setup
sudo ./scripts/setup-cron.sh
```

### Scheduled Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| Database Backup | Daily 2:00 AM | Dumps PostgreSQL database to `/var/backups/cis` |
| Health Check | Every 5 minutes | Monitors service health, logs failures |
| Log Rotation | Weekly Sunday 3:00 AM | Cleans logs older than 30 days |
| Docker Cleanup | Monthly 1st 4:00 AM | Removes unused images/volumes |

### Manual Backup

```bash
# Run backup script manually
./scripts/backup-db.sh

# Verify backup
ls -lh /var/backups/cis/
```

### Restore from Backup

```bash
# Stop backend
docker-compose -f docker-compose.prod.yml stop cis-backend

# Restore database
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U cis_app_user -d qwick_cis < /var/backups/cis/qwick_cis_YYYYMMDD_HHMMSS.sql

# Restart backend
docker-compose -f docker-compose.prod.yml start cis-backend
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

The project includes two workflows:

#### 1. CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main`

**Steps:**
- Install dependencies
- Run linting
- Run unit + integration tests
- Build Docker image
- (Optional) Push to container registry

#### 2. E2E Pipeline (`.github/workflows/e2e.yml`)

**Triggers:**
- Push to `main`
- Manual dispatch

**Steps:**
- Start PostgreSQL + Redis services
- Run database migrations
- Seed test data
- Execute E2E tests
- Upload test artifacts

### Required GitHub Secrets

For container registry push (optional):

```
REGISTRY_URL=ghcr.io
REGISTRY_USERNAME=<github_username>
REGISTRY_PASSWORD=<github_token>
```

### Manual Test Run

```bash
# Run unit tests
npm run test

# Run E2E tests (requires PostgreSQL + Redis)
npm run test:e2e

# Run with coverage
npm run test -- --coverage
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs cis-backend

# Common issues:
# 1. Database not ready → Wait 30s, restart backend
# 2. Port conflict → Change PORT in .env.production
# 3. Permission denied → Check file ownership: sudo chown -R $USER:$USER .
```

### Database Connection Failed

```bash
# Verify PostgreSQL is running
docker-compose -f docker-compose.prod.yml ps postgres

# Check connection from backend
docker-compose -f docker-compose.prod.yml exec cis-backend \
  psql -h postgres -U cis_app_user -d qwick_cis -c "SELECT 1;"

# Check environment variables
docker-compose -f docker-compose.prod.yml exec cis-backend env | grep DB_
```

### SSL Certificate Issues

```bash
# Verify certificate exists
sudo ls -l /etc/letsencrypt/live/api-cis.yourdomain.com/

# Test certificate validity
sudo openssl x509 -in /etc/letsencrypt/live/api-cis.yourdomain.com/cert.pem -text -noout

# Check nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Renew certificate manually
sudo certbot renew --force-renewal
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Adjust memory limits in docker-compose.prod.yml
# Restart with new limits
docker-compose -f docker-compose.prod.yml up -d
```

### Event Bus Issues

```bash
# Verify Redis is running
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# Check Redis memory usage
docker-compose -f docker-compose.prod.yml exec redis redis-cli info memory

# Clear Redis cache (CAUTION: loses cached data)
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL
```

### Performance Issues

```bash
# Check system resources
top
df -h
free -m

# View slow queries (PostgreSQL)
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U cis_app_user -d qwick_cis -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check application metrics
curl http://localhost:3001/api/metrics
```

---

## Security Checklist

- [ ] All environment variables set (no placeholders)
- [ ] Strong database password (20+ characters)
- [ ] JWT/HMAC secrets are cryptographically random
- [ ] SSL certificates installed and auto-renewal configured
- [ ] Database connections use SSL (DB_SSL=true)
- [ ] CORS configured for correct domain
- [ ] Rate limiting enabled in nginx
- [ ] Firewall configured (only 80, 443 exposed)
- [ ] Regular backups scheduled and tested
- [ ] Log files monitored for errors
- [ ] Monitoring alerts configured

---

## Production Checklist

Before going live:

- [ ] All tests passing (CI green)
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations applied
- [ ] Admin user created
- [ ] Backups configured and tested
- [ ] Monitoring dashboards accessible
- [ ] Health checks returning 200
- [ ] Load testing completed
- [ ] Incident response plan documented
- [ ] Team trained on deployment procedures

---

## Support

For issues or questions:

- **Documentation**: See project README
- **Issues**: https://github.com/yourusername/qcis/issues
- **Email**: support@qwickservices.com

---

**Last Updated**: 2026-02-13
