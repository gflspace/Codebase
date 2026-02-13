#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  QwickServices CIS — Production Deployment Script
# ═══════════════════════════════════════════════════════════════
#
# This script automates the production deployment process:
#   1. Validates required environment variables
#   2. Runs database migrations
#   3. Builds and starts Docker containers
#   4. Performs health checks
#
# Usage:
#   ./scripts/deploy.sh
#
# Prerequisites:
#   - .env.production file exists and is populated
#   - Docker and docker-compose are installed
#   - Current directory is src/backend
#
# ═══════════════════════════════════════════════════════════════

set -e  # Exit immediately if a command exits with a non-zero status

# ─── Color Codes for Output ──────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Helper Functions ────────────────────────────────────────────

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ─── Banner ──────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "  QwickServices CIS — Production Deployment"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Environment Validation ──────────────────────────────

log_info "Step 1/4: Validating environment configuration..."

if [ ! -f ".env.production" ]; then
    log_error ".env.production file not found!"
    log_error "Please create .env.production from .env.production.example"
    exit 1
fi

# Load environment variables
set -a
source .env.production
set +a

# Check required variables
REQUIRED_VARS=("DB_HOST" "DB_NAME" "DB_USER" "DB_PASSWORD" "JWT_SECRET" "HMAC_SECRET" "WEBHOOK_SECRET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    log_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

# Security checks
if [[ "$JWT_SECRET" == *"CHANGE_ME"* ]] || [ ${#JWT_SECRET} -lt 32 ]; then
    log_error "JWT_SECRET must be changed from default and be at least 32 characters"
    exit 1
fi

if [[ "$HMAC_SECRET" == *"CHANGE_ME"* ]] || [ ${#HMAC_SECRET} -lt 32 ]; then
    log_error "HMAC_SECRET must be changed from default and be at least 32 characters"
    exit 1
fi

if [[ "$WEBHOOK_SECRET" == *"CHANGE_ME"* ]] || [ ${#WEBHOOK_SECRET} -lt 32 ]; then
    log_error "WEBHOOK_SECRET must be changed from default and be at least 32 characters"
    exit 1
fi

log_success "Environment validation passed"

# Show deployment configuration
log_info "Deployment configuration:"
echo "  - Environment: $NODE_ENV"
echo "  - Database: $DB_NAME@$DB_HOST:$DB_PORT"
echo "  - Shadow Mode: ${SHADOW_MODE:-true}"
echo "  - Event Bus: ${EVENT_BUS_BACKEND:-redis}"
echo "  - Scoring Model: ${SCORING_MODEL:-5-component}"

# Confirm production deployment
if [ "$NODE_ENV" = "production" ]; then
    log_warn "You are deploying to PRODUCTION environment"
    read -p "Continue? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

echo ""

# ─── Step 2: Database Migrations ─────────────────────────────────

log_info "Step 2/4: Running database migrations..."

if ! npx tsx scripts/migrate.ts; then
    log_error "Database migrations failed"
    exit 1
fi

log_success "Database migrations completed"
echo ""

# ─── Step 3: Docker Build & Deploy ───────────────────────────────

log_info "Step 3/4: Building and deploying Docker containers..."

# Build images
log_info "Building Docker images..."
if ! docker-compose -f docker-compose.prod.yml build --no-cache; then
    log_error "Docker build failed"
    exit 1
fi

# Start services
log_info "Starting services..."
if ! docker-compose -f docker-compose.prod.yml up -d; then
    log_error "Failed to start services"
    exit 1
fi

log_success "Containers started"
echo ""

# ─── Step 4: Health Checks ───────────────────────────────────────

log_info "Step 4/4: Running health checks..."

HEALTH_URL="http://localhost:3001/api/health"
MAX_ATTEMPTS=12
ATTEMPT=0
SLEEP_DURATION=5

log_info "Waiting for backend to be healthy (max ${MAX_ATTEMPTS}0s)..."

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))

    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        log_success "Backend is healthy!"

        # Get health status details
        HEALTH_RESPONSE=$(curl -s "$HEALTH_URL")
        echo ""
        echo "Health Check Response:"
        echo "$HEALTH_RESPONSE" | grep -E "(status|version|uptime|environment|shadowMode)" || echo "$HEALTH_RESPONSE"
        echo ""
        break
    else
        if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
            log_error "Health check failed after ${MAX_ATTEMPTS} attempts"
            log_error "Check container logs:"
            echo "  docker-compose -f docker-compose.prod.yml logs cis-backend"
            exit 1
        fi

        echo -n "."
        sleep $SLEEP_DURATION
    fi
done

echo ""

# ─── Final Status ────────────────────────────────────────────────

log_success "═══════════════════════════════════════════════════════════════"
log_success "  Deployment completed successfully!"
log_success "═══════════════════════════════════════════════════════════════"
echo ""
echo "Services running:"
echo "  - Backend API: http://localhost:3001"
echo "  - Nginx Proxy: http://localhost:80"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "Useful commands:"
echo "  - View logs:    docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Stop:         docker-compose -f docker-compose.prod.yml down"
echo "  - Restart:      docker-compose -f docker-compose.prod.yml restart cis-backend"
echo "  - Shell:        docker exec -it cis-backend sh"
echo ""
echo "Next steps:"
echo "  1. Verify API is accessible: curl http://localhost:3001/api/health"
echo "  2. Create admin user: npx tsx scripts/seed-admin.ts"
echo "  3. Review logs for any warnings or errors"
echo "  4. Configure SSL certificates for nginx"
echo "  5. Update firewall rules for production access"
echo ""

if [ "$SHADOW_MODE" = "true" ]; then
    log_warn "Shadow mode is ENABLED — enforcement actions will be logged but not executed"
    echo "  To disable: Set SHADOW_MODE=false in .env.production and redeploy"
fi

if [ "$ENFORCEMENT_KILL_SWITCH" = "true" ]; then
    log_warn "Enforcement kill switch is ACTIVE — all enforcement is disabled"
fi

echo "═══════════════════════════════════════════════════════════════"
