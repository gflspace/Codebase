#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  QwickServices CIS — Production Health Check Script
# ═══════════════════════════════════════════════════════════════
#
# Verifies that all CIS services are healthy and operational:
#   - CIS Backend API
#   - PostgreSQL Database
#   - Redis Cache/Event Bus
#   - Nginx Reverse Proxy
#
# Usage:
#   ./scripts/healthcheck.sh
#
# Exit codes:
#   0 = All services healthy
#   1 = One or more services failed
#
# ═══════════════════════════════════════════════════════════════

set -e

# ─── Colors for output ────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Configuration ────────────────────────────────────────────
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
NGINX_URL="${NGINX_URL:-http://localhost:80}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-qwick_cis}"
DB_USER="${DB_USER:-cis_app_user}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# ─── Track overall health ─────────────────────────────────────
ALL_HEALTHY=true

# ─── Helper functions ─────────────────────────────────────────
check_service() {
    local service_name="$1"
    local check_command="$2"

    echo -ne "${BLUE}[CHECK]${NC} ${service_name}... "

    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ HEALTHY${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ALL_HEALTHY=false
        return 1
    fi
}

print_header() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  QwickServices CIS — Health Check"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
}

print_footer() {
    echo ""
    echo "───────────────────────────────────────────────────────────"
    if [ "$ALL_HEALTHY" = true ]; then
        echo -e "${GREEN}✓ All services are healthy${NC}"
        echo "═══════════════════════════════════════════════════════════"
        exit 0
    else
        echo -e "${RED}✗ One or more services failed health check${NC}"
        echo "═══════════════════════════════════════════════════════════"
        exit 1
    fi
}

# ─── Health Checks ────────────────────────────────────────────
print_header

# 1. Check CIS Backend API
check_service "CIS Backend API" \
    "curl -sf ${BACKEND_URL}/api/health"

# 2. Check PostgreSQL Database
if command -v pg_isready > /dev/null 2>&1; then
    check_service "PostgreSQL Database" \
        "pg_isready -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}"
elif command -v psql > /dev/null 2>&1; then
    check_service "PostgreSQL Database" \
        "psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c 'SELECT 1' -t"
else
    echo -ne "${BLUE}[CHECK]${NC} PostgreSQL Database... "
    if nc -z ${DB_HOST} ${DB_PORT} 2>/dev/null || timeout 2 bash -c "cat < /dev/null > /dev/tcp/${DB_HOST}/${DB_PORT}" 2>/dev/null; then
        echo -e "${YELLOW}⚠ REACHABLE (pg_isready not available)${NC}"
    else
        echo -e "${RED}✗ UNREACHABLE${NC}"
        ALL_HEALTHY=false
    fi
fi

# 3. Check Redis
if command -v redis-cli > /dev/null 2>&1; then
    check_service "Redis Cache/Event Bus" \
        "redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} ping | grep -q PONG"
else
    echo -ne "${BLUE}[CHECK]${NC} Redis Cache/Event Bus... "
    if nc -z ${REDIS_HOST} ${REDIS_PORT} 2>/dev/null || timeout 2 bash -c "cat < /dev/null > /dev/tcp/${REDIS_HOST}/${REDIS_PORT}" 2>/dev/null; then
        echo -e "${YELLOW}⚠ REACHABLE (redis-cli not available)${NC}"
    else
        echo -e "${RED}✗ UNREACHABLE${NC}"
        ALL_HEALTHY=false
    fi
fi

# 4. Check Nginx Reverse Proxy (if configured)
if [ "${NGINX_URL}" != "http://localhost:80" ] || nc -z localhost 80 2>/dev/null; then
    check_service "Nginx Reverse Proxy" \
        "curl -sf ${NGINX_URL}/api/health"
else
    echo -e "${BLUE}[CHECK]${NC} Nginx Reverse Proxy... ${YELLOW}⚠ SKIPPED (not running)${NC}"
fi

print_footer
