# QwickServices CIS — Quick Deployment

Fast-track production deployment in 5 steps.

## Prerequisites

- Ubuntu 20.04+ server with sudo access
- Domain DNS pointed to server
- Docker + Docker Compose installed

## Step 1: Install Dependencies

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Log out and back in for group changes
```

## Step 2: Configure Environment

```bash
# Clone repository
cd /opt
git clone <repository_url> qcis
cd qcis/src/backend

# Copy environment template
cp .env.production.example .env.production

# Generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit configuration (replace ALL placeholders)
nano .env.production
```

**Required changes:**
```bash
DB_PASSWORD=<strong_password>
JWT_SECRET=<64_char_hex>
HMAC_SECRET=<64_char_hex>
WEBHOOK_SECRET=<64_char_hex>
DASHBOARD_URL=https://cis.yourdomain.com
API_BASE_URL=https://api-cis.yourdomain.com
```

## Step 3: Initialize Database

```bash
# Start PostgreSQL
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for database
sleep 10

# Run migrations
npm ci
npm run migrate

# Create admin user
ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD=SecurePass123! npx tsx scripts/seed-admin.ts
```

## Step 4: Setup SSL (Optional but Recommended)

```bash
# Make script executable
chmod +x scripts/setup-ssl.sh

# Run SSL setup (requires port 80 accessible)
sudo ./scripts/setup-ssl.sh api-cis.yourdomain.com admin@yourdomain.com

# Update docker-compose.prod.yml to use SSL config
nano docker-compose.prod.yml
# Change: ./nginx/nginx.conf → ./nginx/nginx.ssl.conf
# Add: - /etc/letsencrypt:/etc/letsencrypt:ro
```

## Step 5: Start Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Verify services are running
docker-compose -f docker-compose.prod.yml ps

# Check health
curl http://localhost/api/health
# or with SSL:
curl https://api-cis.yourdomain.com/api/health
```

## Verification

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Test authentication
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"SecurePass123!"}'

# Check database
docker-compose -f docker-compose.prod.yml exec cis-backend npx tsx scripts/verify-db.ts
```

## Optional: Setup Monitoring

```bash
# Start Prometheus + Grafana
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d

# Access:
# Grafana: http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090
```

## Optional: Setup Automated Tasks

```bash
# Setup cron jobs for backups and health checks
chmod +x scripts/setup-cron.sh
sudo ./scripts/setup-cron.sh
```

## Common Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f [service]

# Restart service
docker-compose -f docker-compose.prod.yml restart [service]

# Stop all
docker-compose -f docker-compose.prod.yml down

# Backup database
./scripts/backup-db.sh

# Health check
./scripts/healthcheck.sh
```

## Troubleshooting

### Service won't start
```bash
docker-compose -f docker-compose.prod.yml logs cis-backend
# Check .env.production for missing variables
```

### Database connection failed
```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_isready
# Verify DB_* environment variables
```

### Port already in use
```bash
# Check what's using the port
sudo lsof -i :80
sudo lsof -i :443
# Stop conflicting service or change PORT in .env.production
```

## Next Steps

- Read full [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed configuration
- Setup monitoring (see [monitoring/README.md](./monitoring/README.md))
- Configure CI/CD (see `.github/workflows/`)
- Review security checklist in DEPLOYMENT.md

## Support

- Documentation: Project README
- Issues: GitHub Issues
- Email: support@qwickservices.com

---

**Estimated Time**: 15-20 minutes

**Last Updated**: 2026-02-13
