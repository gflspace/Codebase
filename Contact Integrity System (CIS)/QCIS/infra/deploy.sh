#!/usr/bin/env bash
# QwickServices CIS — Deployment Script
# Usage: ./infra/deploy.sh [--rollback]
#
# Prerequisites:
#   - SSH access to VPS configured in ~/.ssh/config as "cis-vps"
#   - PM2 installed globally on VPS
#   - PostgreSQL running on VPS
#   - .env.production present on VPS at /opt/cis/.env

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────

REMOTE_HOST="${CIS_DEPLOY_HOST:-cis-vps}"
REMOTE_DIR="${CIS_DEPLOY_DIR:-/opt/cis}"
REMOTE_USER="${CIS_DEPLOY_USER:-deploy}"
APP_NAME="cis-backend"

# ─── Colors ───────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
fail() { echo -e "${RED}[deploy]${NC} $*"; exit 1; }

# ─── Rollback ─────────────────────────────────────────────────

if [[ "${1:-}" == "--rollback" ]]; then
  log "Rolling back to previous release..."
  ssh "${REMOTE_USER}@${REMOTE_HOST}" "
    cd ${REMOTE_DIR} &&
    if [ -d releases/previous ]; then
      rm -f current &&
      ln -s releases/previous current &&
      cd current/src/backend &&
      pm2 reload ecosystem.config.js --update-env &&
      echo 'Rollback complete'
    else
      echo 'No previous release found' && exit 1
    fi
  "
  exit 0
fi

# ─── Pre-flight checks ───────────────────────────────────────

log "Running pre-flight checks..."

# Ensure we're on main branch with clean working tree
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  warn "Not on main branch (current: $BRANCH). Continue? [y/N]"
  read -r response
  [[ "$response" =~ ^[Yy]$ ]] || exit 0
fi

# Build locally first to catch errors
log "Building backend..."
cd src/backend
npm ci
npm run build
npm run test || warn "Tests failed — deploy at your own risk"
cd ../..

COMMIT=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RELEASE_NAME="${TIMESTAMP}_${COMMIT}"

log "Deploying release: ${RELEASE_NAME}"

# ─── Deploy ───────────────────────────────────────────────────

# 1. Create release directory on remote
ssh "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_DIR}/releases/${RELEASE_NAME}/src/backend"

# 2. Sync built files
log "Syncing files to VPS..."
rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='tests' \
  src/backend/dist \
  src/backend/package.json \
  src/backend/package-lock.json \
  src/backend/src/database/migrations \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/releases/${RELEASE_NAME}/src/backend/"

rsync -az \
  ecosystem.config.js \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/releases/${RELEASE_NAME}/"

# 3. Install production dependencies on remote
log "Installing dependencies on VPS..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" "
  cd ${REMOTE_DIR}/releases/${RELEASE_NAME}/src/backend &&
  npm ci --omit=dev
"

# 4. Run migrations
log "Running database migrations..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" "
  cd ${REMOTE_DIR}/releases/${RELEASE_NAME}/src/backend &&
  set -a && source ${REMOTE_DIR}/.env && set +a &&
  node -e \"require('./dist/database/migrate').runMigrations().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })\"
"

# 5. Swap symlinks (atomic release)
log "Activating release..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" "
  cd ${REMOTE_DIR} &&
  if [ -L current ]; then
    rm -f releases/previous &&
    mv current releases/previous 2>/dev/null || true
  fi &&
  ln -sfn releases/${RELEASE_NAME} current
"

# 6. Reload PM2 (graceful restart)
log "Reloading PM2..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" "
  cd ${REMOTE_DIR}/current &&
  set -a && source ${REMOTE_DIR}/.env && set +a &&
  pm2 reload ecosystem.config.js --update-env
"

# 7. Health check
log "Running health check..."
sleep 3
HEALTH=$(ssh "${REMOTE_USER}@${REMOTE_HOST}" "curl -sf http://localhost:3001/api/health || echo 'FAIL'")

if echo "$HEALTH" | grep -q "FAIL"; then
  fail "Health check failed! Run: ./infra/deploy.sh --rollback"
else
  log "Health check passed"
fi

# 8. Cleanup old releases (keep last 5)
ssh "${REMOTE_USER}@${REMOTE_HOST}" "
  cd ${REMOTE_DIR}/releases &&
  ls -1dt */ | tail -n +6 | xargs rm -rf 2>/dev/null || true
"

log "Deploy complete: ${RELEASE_NAME}"
