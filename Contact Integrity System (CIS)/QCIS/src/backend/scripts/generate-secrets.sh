#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  QwickServices CIS — Secrets Generator
# ═══════════════════════════════════════════════════════════════
#
# Generates cryptographically secure secrets and creates
# .env.production from the template with real values.
#
# Usage:
#   ./scripts/generate-secrets.sh
#
# Output:
#   Creates .env.production with generated secrets.
#   Prints admin credentials to stdout (save these!).
#
# ═══════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "═══════════════════════════════════════════════════════════════"
echo "  QwickServices CIS — Secrets Generator"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─── Check for existing .env.production ───────────────────────

if [ -f ".env.production" ]; then
    log_warn ".env.production already exists!"
    read -p "Overwrite? This will regenerate ALL secrets (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        log_info "Cancelled. Existing .env.production preserved."
        exit 0
    fi
fi

# ─── Generate Secrets ─────────────────────────────────────────

gen_secret() {
    openssl rand -hex "$1" 2>/dev/null || node -e "console.log(require('crypto').randomBytes($1).toString('hex'))"
}

gen_password() {
    # Generate a strong password: 24 chars, mixed case, numbers, symbols
    local pwd=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9@#$%^&*!?' | head -c 24)
    # Ensure at least one of each character class
    echo "${pwd}Aa1!"
}

JWT_SECRET=$(gen_secret 32)
HMAC_SECRET=$(gen_secret 32)
WEBHOOK_SECRET=$(gen_secret 32)
DB_PASSWORD=$(gen_password)
ADMIN_PASSWORD=$(gen_password)

log_success "Secrets generated"

# ─── Prompt for Configuration ─────────────────────────────────

echo ""
log_info "Configuration (press Enter for defaults):"
echo ""

read -p "  Domain name [api-cis.qwickservices.com]: " DOMAIN
DOMAIN=${DOMAIN:-api-cis.qwickservices.com}

read -p "  Dashboard URL [https://cis.qwickservices.com]: " DASHBOARD_URL
DASHBOARD_URL=${DASHBOARD_URL:-https://cis.qwickservices.com}

read -p "  Admin email [admin@qwickservices.com]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@qwickservices.com}

read -p "  OpenAI API key (optional, press Enter to skip): " OPENAI_KEY
OPENAI_KEY=${OPENAI_KEY:-}

echo ""
log_info "QwickServices database (for data sync):"
read -p "  QwickServices DB host [localhost]: " SYNC_DB_HOST
SYNC_DB_HOST=${SYNC_DB_HOST:-localhost}

read -p "  QwickServices DB port [5432]: " SYNC_DB_PORT
SYNC_DB_PORT=${SYNC_DB_PORT:-5432}

read -p "  QwickServices DB name [qwickservices]: " SYNC_DB_NAME
SYNC_DB_NAME=${SYNC_DB_NAME:-qwickservices}

read -p "  QwickServices DB user [cis_readonly]: " SYNC_DB_USER
SYNC_DB_USER=${SYNC_DB_USER:-cis_readonly}

read -p "  QwickServices DB password: " SYNC_DB_PASSWORD
SYNC_DB_PASSWORD=${SYNC_DB_PASSWORD:-}

SYNC_ENABLED="false"
if [ -n "$SYNC_DB_PASSWORD" ]; then
    SYNC_ENABLED="true"
fi

# ─── Write .env.production ────────────────────────────────────

cat > .env.production << ENVFILE
# ═══════════════════════════════════════════════════════════════
#  QwickServices CIS — Production Configuration
#  Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
#  DO NOT COMMIT THIS FILE
# ═══════════════════════════════════════════════════════════════

# ─── Core ─────────────────────────────────────────────────────
NODE_ENV=production
PORT=3001
API_BASE_URL=https://${DOMAIN}

# ─── Database (CIS) ──────────────────────────────────────────
DB_HOST=postgres
DB_PORT=5432
DB_NAME=qwick_cis
DB_USER=cis_app_user
DB_PASSWORD=${DB_PASSWORD}
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
DB_STATEMENT_TIMEOUT=30000

# ─── Authentication ──────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h

# ─── Webhook Security ────────────────────────────────────────
HMAC_SECRET=${HMAC_SECRET}
WEBHOOK_SECRET=${WEBHOOK_SECRET}
WEBHOOK_ALLOWED_SOURCES=qwickservices

# ─── Enforcement ─────────────────────────────────────────────
SHADOW_MODE=true
ENFORCEMENT_KILL_SWITCH=false
SCORING_MODEL=5-component

# ─── Redis / Event Bus ───────────────────────────────────────
REDIS_URL=redis://redis:6379
EVENT_BUS_BACKEND=redis

# ─── Rate Limiting ───────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
RATE_LIMIT_AI_MAX=10
RATE_LIMIT_WRITE_MAX=30

# ─── Notifications ───────────────────────────────────────────
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=cis@qwickservices.com
SLACK_WEBHOOK_URL=

# ─── External URLs ───────────────────────────────────────────
DASHBOARD_URL=${DASHBOARD_URL}

# ─── AI / LLM Integration ───────────────────────────────────
OPENAI_API_KEY=${OPENAI_KEY}
OPENAI_MODEL=gpt-4o-mini

# ─── Observability ───────────────────────────────────────────
LOG_LEVEL=info
SHUTDOWN_TIMEOUT_MS=10000

# ─── Data Sync (QwickServices Pull) ─────────────────────────
SYNC_ENABLED=${SYNC_ENABLED}
SYNC_INTERVAL_MS=30000
SYNC_BATCH_SIZE=100
SYNC_DB_HOST=${SYNC_DB_HOST}
SYNC_DB_PORT=${SYNC_DB_PORT}
SYNC_DB_NAME=${SYNC_DB_NAME}
SYNC_DB_USER=${SYNC_DB_USER}
SYNC_DB_PASSWORD=${SYNC_DB_PASSWORD}
SYNC_DB_SSL=false
SYNC_DB_POOL_MAX=5
ENVFILE

chmod 600 .env.production
log_success ".env.production created (permissions: 600)"

# ─── Summary ─────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Configuration Summary"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Domain:         ${DOMAIN}"
echo "  Dashboard:      ${DASHBOARD_URL}"
echo "  Database:       qwick_cis @ postgres:5432"
echo "  Redis:          redis://redis:6379"
echo "  Shadow Mode:    ON (enforcement logged but not executed)"
echo "  Data Sync:      ${SYNC_ENABLED}"
echo ""
echo "  ┌─────────────────────────────────────────────────────────┐"
echo "  │  SAVE THESE CREDENTIALS — They will not be shown again  │"
echo "  ├─────────────────────────────────────────────────────────┤"
echo "  │  DB Password:      ${DB_PASSWORD}"
echo "  │  Admin Email:      ${ADMIN_EMAIL}"
echo "  │  Admin Password:   ${ADMIN_PASSWORD}"
echo "  │  JWT Secret:       ${JWT_SECRET:0:16}..."
echo "  │  HMAC Secret:      ${HMAC_SECRET:0:16}..."
echo "  │  Webhook Secret:   ${WEBHOOK_SECRET:0:16}..."
echo "  └─────────────────────────────────────────────────────────┘"
echo ""
echo "  Files created:"
echo "    .env.production  (chmod 600)"
echo ""
echo "  Next step:"
echo "    ADMIN_EMAIL=${ADMIN_EMAIL} ADMIN_PASSWORD='${ADMIN_PASSWORD}' \\"
echo "      ./scripts/deploy-full.sh"
echo ""
echo "═══════════════════════════════════════════════════════════════"
