#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  QwickServices CIS — Database Backup Script
# ═══════════════════════════════════════════════════════════════
#
# Creates a compressed PostgreSQL backup with timestamp and manages
# retention by keeping only the last 7 backups.
#
# Features:
#   - Timestamped backup files: cis_backup_YYYY-MM-DD_HHMMSS.sql.gz
#   - Automatic compression with gzip
#   - Retention policy: keeps last 7 backups
#   - Validates backup file was created successfully
#   - Supports custom .env file path
#
# Usage:
#   ./scripts/backup-db.sh [env_file]
#
# Examples:
#   ./scripts/backup-db.sh                  # Uses .env.production
#   ./scripts/backup-db.sh .env.staging     # Uses custom env file
#
# Prerequisites:
#   - pg_dump installed (PostgreSQL client tools)
#   - Database credentials in .env file
#   - Write permissions for backups directory
#
# ═══════════════════════════════════════════════════════════════

set -e

# ─── Configuration ────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${1:-.env.production}"
BACKUP_DIR="${BACKEND_DIR}/backups"
RETENTION_COUNT=7

# ─── Colors for output ────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Helper functions ─────────────────────────────────────────
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ─── Load environment variables ───────────────────────────────
if [ ! -f "${BACKEND_DIR}/${ENV_FILE}" ]; then
    log_error "Environment file not found: ${ENV_FILE}"
    log_error "Please create ${ENV_FILE} or specify a different env file"
    exit 1
fi

log_info "Loading environment from: ${ENV_FILE}"

# Load .env file (export all variables)
set -a
# shellcheck disable=SC1090
source "${BACKEND_DIR}/${ENV_FILE}"
set +a

# Validate required variables
if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    log_error "Missing required database configuration"
    log_error "Required: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
    exit 1
fi

# ─── Create backup directory ──────────────────────────────────
if [ ! -d "$BACKUP_DIR" ]; then
    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# ─── Check pg_dump availability ──────────────────────────────
if ! command -v pg_dump &> /dev/null; then
    log_error "pg_dump not found. Please install PostgreSQL client tools."
    log_error "  Ubuntu/Debian: apt-get install postgresql-client"
    log_error "  macOS: brew install postgresql"
    log_error "  Windows: Download from https://www.postgresql.org/download/windows/"
    exit 1
fi

# ─── Generate backup filename ─────────────────────────────────
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/cis_backup_${TIMESTAMP}.sql.gz"

# ─── Perform backup ───────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  QwickServices CIS — Database Backup"
echo "═══════════════════════════════════════════════════════════"
echo "Database:   ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "Backup to:  ${BACKUP_FILE}"
echo "───────────────────────────────────────────────────────────"
echo ""

log_info "Starting backup..."

# Set PostgreSQL password for pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Create backup with compression
if pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    --verbose \
    2>&1 | gzip > "$BACKUP_FILE"; then

    # Unset password
    unset PGPASSWORD

    # Verify backup file was created
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file was not created: $BACKUP_FILE"
        exit 1
    fi

    # Get backup file size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

    log_success "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
    unset PGPASSWORD
    log_error "Backup failed"
    exit 1
fi

# ─── Cleanup old backups ──────────────────────────────────────
log_info "Applying retention policy (keep last ${RETENTION_COUNT} backups)..."

# Count existing backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "cis_backup_*.sql.gz" | wc -l)

if [ "$BACKUP_COUNT" -gt "$RETENTION_COUNT" ]; then
    # Delete oldest backups beyond retention count
    BACKUPS_TO_DELETE=$((BACKUP_COUNT - RETENTION_COUNT))

    log_info "Found $BACKUP_COUNT backups, removing $BACKUPS_TO_DELETE oldest..."

    find "$BACKUP_DIR" -name "cis_backup_*.sql.gz" -type f -printf '%T+ %p\n' | \
        sort | \
        head -n "$BACKUPS_TO_DELETE" | \
        cut -d' ' -f2- | \
        while read -r old_backup; do
            log_info "Deleting: $(basename "$old_backup")"
            rm -f "$old_backup"
        done

    log_success "Cleanup complete"
else
    log_info "Retention policy satisfied ($BACKUP_COUNT <= $RETENTION_COUNT backups)"
fi

# ─── Summary ──────────────────────────────────────────────────
echo ""
echo "───────────────────────────────────────────────────────────"
log_success "Backup completed successfully"
echo ""
echo "  File:  $BACKUP_FILE"
echo "  Size:  $BACKUP_SIZE"
echo ""
echo "Existing backups:"
find "$BACKUP_DIR" -name "cis_backup_*.sql.gz" -type f -printf '%T+ %p\n' | \
    sort -r | \
    while read -r timestamp filepath; do
        size=$(du -h "$filepath" | cut -f1)
        filename=$(basename "$filepath")
        echo "  - $filename ($size)"
    done
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

# ─── Restore instructions ─────────────────────────────────────
cat << 'EOF'
To restore this backup:

  1. Uncompress the backup:
     gunzip -c backups/cis_backup_YYYY-MM-DD_HHMMSS.sql.gz > restore.sql

  2. Restore to database:
     psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f restore.sql

  Or in one command:
     gunzip -c backups/cis_backup_YYYY-MM-DD_HHMMSS.sql.gz | \
       psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME

═══════════════════════════════════════════════════════════════
EOF
