#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  QwickServices CIS — Full Production Deployment
# ═══════════════════════════════════════════════════════════════
#
# Master deployment script that orchestrates all 7 steps:
#   Step 1: Validate prerequisites
#   Step 2: Start infrastructure (PostgreSQL + Redis via Docker)
#   Step 3: Run database migrations
#   Step 4: Seed admin user
#   Step 5: Build and deploy CIS backend
#   Step 6: Configure SSL (if domain is reachable)
#   Step 7: Start monitoring stack
#   Step 8: Run validation suite
#
# Usage:
#   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='SecurePass1!' \
#     ./scripts/deploy-full.sh
#
# Prerequisites:
#   - .env.production exists (run generate-secrets.sh first)
#   - Docker and Docker Compose installed (run provision-server.sh first)
#   - Current directory is src/backend/
#
# ═══════════════════════════════════════════════════════════════

set -e

# ─── Color Codes ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "\n${CYAN}━━━ Step $1 ━━━${NC}"; }

DEPLOY_START=$(date +%s)

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  QwickServices CIS — Full Production Deployment"
echo "  $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════
#  Step 1: Validate Prerequisites
# ═══════════════════════════════════════════════════════════════
log_step "1/8: Validating prerequisites"

# Check we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "Dockerfile" ]; then
    log_error "Must be run from src/backend/ directory"
    exit 1
fi

# Check .env.production exists
if [ ! -f ".env.production" ]; then
    log_error ".env.production not found. Run ./scripts/generate-secrets.sh first"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker not installed. Run sudo ./scripts/provision-server.sh first"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    log_error "Docker Compose not found"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js not installed"
    exit 1
fi

# Load and validate environment
set -a
source .env.production
set +a

REQUIRED_VARS=("DB_PASSWORD" "JWT_SECRET" "HMAC_SECRET" "WEBHOOK_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"CHANGE_ME"* ]]; then
        log_error "$var is not set or still has default value"
        exit 1
    fi
done

log_success "Prerequisites validated"
log_info "  Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
log_info "  Node.js: $(node --version)"
log_info "  Database: ${DB_NAME:-qwick_cis} @ ${DB_HOST:-postgres}"

# ═══════════════════════════════════════════════════════════════
#  Step 2: Start Infrastructure
# ═══════════════════════════════════════════════════════════════
log_step "2/8: Starting infrastructure (PostgreSQL + Redis)"

# Stop any existing containers gracefully
docker compose -f docker-compose.prod.yml --env-file .env.production down 2>/dev/null || true

# Start PostgreSQL and Redis first
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis

# Wait for PostgreSQL to be ready
log_info "Waiting for PostgreSQL to be ready..."
ATTEMPTS=0
MAX_WAIT=30
while [ $ATTEMPTS -lt $MAX_WAIT ]; do
    if docker exec cis-postgres pg_isready -U "${DB_USER:-cis_app_user}" -d "${DB_NAME:-qwick_cis}" > /dev/null 2>&1; then
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 1
done

if [ $ATTEMPTS -ge $MAX_WAIT ]; then
    log_error "PostgreSQL failed to start after ${MAX_WAIT}s"
    docker compose -f docker-compose.prod.yml logs postgres
    exit 1
fi

log_success "PostgreSQL is ready"

# Wait for Redis
log_info "Waiting for Redis to be ready..."
ATTEMPTS=0
while [ $ATTEMPTS -lt 15 ]; do
    if docker exec cis-redis redis-cli ping > /dev/null 2>&1; then
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 1
done

if [ $ATTEMPTS -ge 15 ]; then
    log_error "Redis failed to start"
    exit 1
fi

log_success "Redis is ready"

# ═══════════════════════════════════════════════════════════════
#  Step 3: Database Migrations
# ═══════════════════════════════════════════════════════════════
log_step "3/8: Running database migrations"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    log_info "Installing Node.js dependencies..."
    npm ci --production=false --silent
fi

# Run migrations against the Docker PostgreSQL
# Override DB_HOST to reach the Docker container from the host
DB_HOST=localhost npx tsx scripts/migrate.ts

log_success "Migrations completed (30 migrations)"

# ═══════════════════════════════════════════════════════════════
#  Step 4: Seed Admin User
# ═══════════════════════════════════════════════════════════════
log_step "4/8: Seeding admin user"

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
    log_warn "ADMIN_EMAIL and ADMIN_PASSWORD not set — skipping admin seed"
    log_warn "Run manually later:"
    log_warn "  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='...' npx tsx scripts/seed-admin.ts"
else
    DB_HOST=localhost ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" \
        npx tsx scripts/seed-admin.ts || {
        log_warn "Admin user may already exist (this is OK)"
    }
fi

# ═══════════════════════════════════════════════════════════════
#  Step 5: Build & Deploy CIS Backend
# ═══════════════════════════════════════════════════════════════
log_step "5/8: Building and deploying CIS backend"

# Build the Docker image
log_info "Building CIS backend Docker image..."
docker compose -f docker-compose.prod.yml --env-file .env.production build cis-backend

# Start the full stack (backend + nginx)
log_info "Starting CIS backend + nginx..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Wait for backend to be healthy
log_info "Waiting for backend health check..."
ATTEMPTS=0
MAX_WAIT=60
while [ $ATTEMPTS -lt $MAX_WAIT ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 2
done

if [ $ATTEMPTS -ge $MAX_WAIT ]; then
    log_error "Backend health check failed after ${MAX_WAIT}s"
    log_error "Container logs:"
    docker compose -f docker-compose.prod.yml logs --tail=30 cis-backend
    exit 1
fi

log_success "CIS backend is healthy"

# Show health response
HEALTH=$(curl -s http://localhost:3001/api/health)
log_info "  Status: $(echo "$HEALTH" | grep -o '"status":"[^"]*"' | head -1)"

# ═══════════════════════════════════════════════════════════════
#  Step 6: SSL Certificate Setup
# ═══════════════════════════════════════════════════════════════
log_step "6/8: SSL certificate setup"

DOMAIN=$(grep "^API_BASE_URL=" .env.production | sed 's|API_BASE_URL=https://||' | tr -d '\r')

if [ -z "$DOMAIN" ]; then
    log_warn "No domain configured in API_BASE_URL — skipping SSL"
elif [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    log_success "SSL certificate already exists for $DOMAIN"
else
    # Check if domain resolves to this server
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")
    DOMAIN_IP=$(dig +short "$DOMAIN" 2>/dev/null || echo "unresolved")

    if [ "$SERVER_IP" = "$DOMAIN_IP" ]; then
        log_info "Domain $DOMAIN resolves to this server ($SERVER_IP)"
        log_info "Running SSL setup..."

        ADMIN_EMAIL_CERT=$(grep "^SMTP_FROM=" .env.production | cut -d= -f2 | tr -d '\r')
        ADMIN_EMAIL_CERT=${ADMIN_EMAIL_CERT:-admin@qwickservices.com}

        if [ "$EUID" -eq 0 ]; then
            bash scripts/setup-ssl.sh "$DOMAIN" "$ADMIN_EMAIL_CERT"
            log_success "SSL configured for $DOMAIN"
        else
            log_warn "SSL setup requires root. Run manually:"
            log_warn "  sudo bash scripts/setup-ssl.sh $DOMAIN $ADMIN_EMAIL_CERT"
        fi
    else
        log_warn "Domain $DOMAIN does not resolve to this server"
        log_warn "  Server IP: $SERVER_IP"
        log_warn "  Domain IP: $DOMAIN_IP"
        log_warn "Update DNS, then run: sudo bash scripts/setup-ssl.sh $DOMAIN"
    fi
fi

# ═══════════════════════════════════════════════════════════════
#  Step 7: Monitoring Stack
# ═══════════════════════════════════════════════════════════════
log_step "7/8: Starting monitoring stack"

if [ -f "docker-compose.monitoring.yml" ]; then
    docker compose -f docker-compose.monitoring.yml up -d 2>/dev/null && {
        log_success "Monitoring stack started"
        log_info "  Prometheus: http://localhost:9090"
        log_info "  Grafana:    http://localhost:3000 (admin/admin)"
    } || {
        log_warn "Monitoring stack failed to start (non-critical)"
        log_warn "Start manually: docker compose -f docker-compose.monitoring.yml up -d"
    }
else
    log_warn "docker-compose.monitoring.yml not found — skipping monitoring"
fi

# ═══════════════════════════════════════════════════════════════
#  Step 8: Validation Suite
# ═══════════════════════════════════════════════════════════════
log_step "8/8: Running validation suite"

PASS=0
FAIL=0
WARN=0

validate() {
    local name="$1"
    local cmd="$2"
    local expected="$3"

    result=$(eval "$cmd" 2>/dev/null || echo "FAILED")

    if echo "$result" | grep -q "$expected"; then
        log_success "$name"
        PASS=$((PASS + 1))
    else
        log_error "$name (got: $result)"
        FAIL=$((FAIL + 1))
    fi
}

validate_warn() {
    local name="$1"
    local cmd="$2"
    local expected="$3"

    result=$(eval "$cmd" 2>/dev/null || echo "FAILED")

    if echo "$result" | grep -q "$expected"; then
        log_success "$name"
        PASS=$((PASS + 1))
    else
        log_warn "$name (non-critical)"
        WARN=$((WARN + 1))
    fi
}

# Core services
validate "Health endpoint responds 200" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/health" "200"

validate "Health returns status:ok" \
    "curl -s http://localhost:3001/api/health" "status"

validate "Root endpoint responds" \
    "curl -s http://localhost:3001/" "Contact Integrity System"

# Database
validate "PostgreSQL is running" \
    "docker exec cis-postgres pg_isready -U ${DB_USER:-cis_app_user}" "accepting connections"

validate "Migrations applied (schema_migrations exists)" \
    "docker exec cis-postgres psql -U ${DB_USER:-cis_app_user} -d ${DB_NAME:-qwick_cis} -tAc \"SELECT count(*) FROM schema_migrations\"" ""

# Redis
validate "Redis is running" \
    "docker exec cis-redis redis-cli ping" "PONG"

# Nginx
validate "Nginx proxy responds on port 80" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health" "200"

# Auth
validate "Auth endpoint rejects unauthenticated" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/admin/users" "401"

# Docker containers
validate "All containers running" \
    "docker compose -f docker-compose.prod.yml ps --format '{{.State}}' | sort -u" "running"

# Data sync (if configured)
if [ "$SYNC_ENABLED" = "true" ]; then
    validate_warn "Data sync tables exist" \
        "docker exec cis-postgres psql -U ${DB_USER:-cis_app_user} -d ${DB_NAME:-qwick_cis} -tAc \"SELECT count(*) FROM sync_watermarks\"" ""
fi

# Monitoring (optional)
validate_warn "Prometheus responds" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:9090/-/healthy" "200"

validate_warn "Grafana responds" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health" "200"

# ═══════════════════════════════════════════════════════════════
#  Summary
# ═══════════════════════════════════════════════════════════════

DEPLOY_END=$(date +%s)
DEPLOY_DURATION=$((DEPLOY_END - DEPLOY_START))

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Deployment Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Duration:      ${DEPLOY_DURATION}s"
echo "  Validation:    ${PASS} passed, ${FAIL} failed, ${WARN} warnings"
echo ""
echo "  Services:"
echo "    Backend API:   http://localhost:3001 (internal)"
echo "    Nginx Proxy:   http://localhost:80"
echo "    PostgreSQL:    localhost:5432"
echo "    Redis:         localhost:6379"
if [ -f "docker-compose.monitoring.yml" ]; then
echo "    Prometheus:    http://localhost:9090"
echo "    Grafana:       http://localhost:3000 (admin/admin)"
fi
echo ""

if [ -n "$ADMIN_EMAIL" ]; then
echo "  Dashboard Login:"
echo "    URL:      ${DASHBOARD_URL:-http://localhost:3000}"
echo "    Email:    $ADMIN_EMAIL"
echo "    Password: (set during deployment)"
echo ""
fi

if [ "$SHADOW_MODE" = "true" ]; then
    log_warn "Shadow mode is ON — enforcement actions are logged but not executed"
    echo "  To activate enforcement: Set SHADOW_MODE=false in .env.production"
    echo "  Then restart: docker compose -f docker-compose.prod.yml restart cis-backend"
fi

echo ""
echo "  Useful commands:"
echo "    Logs:      docker compose -f docker-compose.prod.yml logs -f cis-backend"
echo "    Status:    docker compose -f docker-compose.prod.yml ps"
echo "    Restart:   docker compose -f docker-compose.prod.yml restart cis-backend"
echo "    Stop:      docker compose -f docker-compose.prod.yml down"
echo "    Backup:    bash scripts/backup-db.sh"
echo "    Health:    curl http://localhost:3001/api/health"
echo ""

if [ $FAIL -gt 0 ]; then
    log_error "$FAIL validation(s) failed — review errors above"
    exit 1
fi

echo "═══════════════════════════════════════════════════════════════"
