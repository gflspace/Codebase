#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  QwickServices CIS — Production Cron Job Setup
# ═══════════════════════════════════════════════════════════════
#
# Sets up automated maintenance tasks:
#   - Database backups (daily at 2 AM)
#   - Health checks (every 5 minutes)
#   - Log rotation (weekly)
#
# Usage:
#   sudo ./scripts/setup-cron.sh
#
# Prerequisites:
#   - Docker Compose stack running
#   - Backup directory created
#
# ═══════════════════════════════════════════════════════════════

set -e

# ─── Configuration ───────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/cis}"
LOG_DIR="${LOG_DIR:-/var/log/cis}"

# ─── Color Output ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ─── Check Root Access ───────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root or with sudo"
    exit 1
fi

log_info "Setting up CIS production cron jobs..."

# ─── Create Required Directories ─────────────────────────────────
log_info "Creating backup and log directories..."
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"
chmod 755 "$BACKUP_DIR"
chmod 755 "$LOG_DIR"

# ─── Define Cron Jobs ────────────────────────────────────────────
# Database backup: Daily at 2 AM
BACKUP_CRON="0 2 * * * $SCRIPT_DIR/backup-db.sh >> $LOG_DIR/backup.log 2>&1"

# Health check: Every 5 minutes
HEALTH_CRON="*/5 * * * * $SCRIPT_DIR/healthcheck.sh || echo \"\$(date): Health check failed\" >> $LOG_DIR/healthcheck.log"

# Log rotation: Weekly on Sunday at 3 AM
LOGROTATE_CRON="0 3 * * 0 find $LOG_DIR -name '*.log' -mtime +30 -delete"

# Docker system cleanup: Monthly on 1st at 4 AM
DOCKER_CLEANUP_CRON="0 4 1 * * docker system prune -af --volumes >> $LOG_DIR/docker-cleanup.log 2>&1"

# ─── Check Existing Crontab ──────────────────────────────────────
log_info "Checking existing crontab..."

TEMP_CRON=$(mktemp)
crontab -l > "$TEMP_CRON" 2>/dev/null || true

# ─── Add Cron Jobs ───────────────────────────────────────────────
add_cron_if_missing() {
    local job="$1"
    local description="$2"

    if grep -qF "$job" "$TEMP_CRON"; then
        log_info "$description already exists"
    else
        echo "$job" >> "$TEMP_CRON"
        log_info "Added $description"
    fi
}

# Add header comment if not exists
if ! grep -q "QwickServices CIS" "$TEMP_CRON"; then
    echo "" >> "$TEMP_CRON"
    echo "# ─── QwickServices CIS Automated Tasks ───" >> "$TEMP_CRON"
fi

add_cron_if_missing "$BACKUP_CRON" "database backup (daily 2 AM)"
add_cron_if_missing "$HEALTH_CRON" "health check (every 5 minutes)"
add_cron_if_missing "$LOGROTATE_CRON" "log rotation (weekly)"
add_cron_if_missing "$DOCKER_CLEANUP_CRON" "Docker cleanup (monthly)"

# ─── Install New Crontab ─────────────────────────────────────────
log_info "Installing crontab..."
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

# ─── Verify Installation ─────────────────────────────────────────
log_info "Verifying crontab installation..."
if crontab -l | grep -q "QwickServices CIS"; then
    log_info "Crontab installed successfully"
else
    log_error "Crontab installation failed"
    exit 1
fi

# ─── Make Scripts Executable ─────────────────────────────────────
log_info "Setting script permissions..."
chmod +x "$SCRIPT_DIR/backup-db.sh" 2>/dev/null || log_warn "backup-db.sh not found"
chmod +x "$SCRIPT_DIR/healthcheck.sh" 2>/dev/null || log_warn "healthcheck.sh not found"

# ─── Summary ─────────────────────────────────────────────────────
log_info "Cron setup complete!"
echo ""
echo "Scheduled tasks:"
echo "  - Database backup:   Daily at 2:00 AM"
echo "  - Health check:      Every 5 minutes"
echo "  - Log rotation:      Weekly (Sunday 3:00 AM)"
echo "  - Docker cleanup:    Monthly (1st, 4:00 AM)"
echo ""
echo "Log files:"
echo "  - Backup log:        $LOG_DIR/backup.log"
echo "  - Health check log:  $LOG_DIR/healthcheck.log"
echo "  - Docker cleanup:    $LOG_DIR/docker-cleanup.log"
echo ""
echo "To view current crontab:"
echo "  crontab -l"
echo ""
echo "To remove CIS cron jobs:"
echo "  crontab -e  # and delete lines manually"
echo ""
log_info "Done!"
