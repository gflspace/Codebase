#!/usr/bin/env bash
# QwickServices CIS — Database Backup Script
# Usage: ./infra/backup-db.sh
# Cron:  0 2 * * * /opt/cis/infra/backup-db.sh >> /var/log/cis/backup.log 2>&1

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────

BACKUP_DIR="${CIS_BACKUP_DIR:-/opt/cis/backups}"
RETENTION_DAYS="${CIS_BACKUP_RETENTION_DAYS:-30}"
DB_NAME="${DB_NAME:-qwick_cis_prod}"
DB_USER="${DB_USER:-cis_app_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# ─── Backup ───────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup: ${DB_NAME} → ${BACKUP_FILE}"

pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --compress=6 \
  --no-owner \
  --no-privileges \
  --verbose \
  2>/dev/null \
  | gzip > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: ${BACKUP_FILE} (${FILESIZE})"

# ─── Retention cleanup ────────────────────────────────────────

echo "[$(date -Iseconds)] Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -delete -print

echo "[$(date -Iseconds)] Backup job finished"
