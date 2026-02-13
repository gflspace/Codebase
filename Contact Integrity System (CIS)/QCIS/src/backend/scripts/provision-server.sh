#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  QwickServices CIS — Server Provisioning Script
# ═══════════════════════════════════════════════════════════════
#
# Provisions a fresh Ubuntu 22.04+ VPS for CIS deployment.
# Installs: Docker, Docker Compose, Node.js 20, PostgreSQL client,
#           Redis tools, Nginx, Certbot, and system hardening.
#
# Usage:
#   sudo ./scripts/provision-server.sh
#
# Tested on: Ubuntu 22.04 LTS, Ubuntu 24.04 LTS
# ═══════════════════════════════════════════════════════════════

set -e

# ─── Color Codes ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "\n${GREEN}═══ Step $1 ═══${NC}"; }

# ─── Root Check ───────────────────────────────────────────────

if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root: sudo $0"
    exit 1
fi

echo "═══════════════════════════════════════════════════════════════"
echo "  QwickServices CIS — Server Provisioning"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Target: $(hostname) ($(lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"'))"
echo "  Date:   $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# ─── Step 1: System Update ────────────────────────────────────
log_step "1/8: System Update"

apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget git unzip gnupg lsb-release ca-certificates \
    software-properties-common apt-transport-https \
    build-essential ufw fail2ban

log_success "System packages updated"

# ─── Step 2: Docker Engine ────────────────────────────────────
log_step "2/8: Docker Engine"

if command -v docker &> /dev/null; then
    log_info "Docker already installed: $(docker --version)"
else
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Enable and start Docker
    systemctl enable docker
    systemctl start docker

    log_success "Docker installed: $(docker --version)"
fi

# Docker Compose V2 (plugin)
if docker compose version &> /dev/null; then
    log_success "Docker Compose: $(docker compose version --short)"
else
    log_error "Docker Compose plugin not found"
    exit 1
fi

# ─── Step 3: Node.js 20 LTS ──────────────────────────────────
log_step "3/8: Node.js 20 LTS"

if command -v node &> /dev/null && node --version | grep -q "v20"; then
    log_info "Node.js already installed: $(node --version)"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs

    # Install global tools
    npm install -g pm2 tsx

    log_success "Node.js installed: $(node --version)"
    log_success "npm: $(npm --version)"
    log_success "pm2: $(pm2 --version)"
fi

# ─── Step 4: PostgreSQL Client ────────────────────────────────
log_step "4/8: PostgreSQL Client Tools"

if command -v psql &> /dev/null; then
    log_info "PostgreSQL client already installed: $(psql --version)"
else
    apt-get install -y -qq postgresql-client
    log_success "PostgreSQL client installed: $(psql --version)"
fi

# ─── Step 5: Redis Tools ─────────────────────────────────────
log_step "5/8: Redis Tools"

if command -v redis-cli &> /dev/null; then
    log_info "Redis CLI already installed"
else
    apt-get install -y -qq redis-tools
    log_success "Redis tools installed"
fi

# ─── Step 6: Firewall (UFW) ──────────────────────────────────
log_step "6/8: Firewall Configuration"

ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp    # HTTP (redirect to HTTPS)
ufw allow 443/tcp   # HTTPS
# Internal only — do NOT expose these publicly:
# Port 3001 (backend API) — proxied through nginx
# Port 5432 (PostgreSQL) — docker internal only
# Port 6379 (Redis) — docker internal only
# Port 9090 (Prometheus) — optional monitoring
# Port 3000 (Grafana) — optional monitoring
ufw --force enable

log_success "Firewall configured (SSH, HTTP, HTTPS allowed)"

# ─── Step 7: Fail2ban ────────────────────────────────────────
log_step "7/8: Fail2ban Intrusion Prevention"

cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
findtime = 600

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 600
FAIL2BAN

systemctl enable fail2ban
systemctl restart fail2ban

log_success "Fail2ban configured (SSH: 5 retries / 1hr ban)"

# ─── Step 8: Create CIS Application Directory ────────────────
log_step "8/8: Application Directory"

CIS_DIR="/opt/cis"
mkdir -p "$CIS_DIR"
mkdir -p "$CIS_DIR/backups"
mkdir -p "$CIS_DIR/logs"

log_success "Application directory created: $CIS_DIR"

# ─── System Tuning ───────────────────────────────────────────

# Increase file descriptors for high-concurrency
if ! grep -q "cis-limits" /etc/security/limits.conf; then
    cat >> /etc/security/limits.conf << 'LIMITS'

# cis-limits — QwickServices CIS tuning
* soft nofile 65536
* hard nofile 65536
LIMITS
fi

# TCP tuning for high-throughput
if ! grep -q "cis-sysctl" /etc/sysctl.conf; then
    cat >> /etc/sysctl.conf << 'SYSCTL'

# cis-sysctl — QwickServices CIS network tuning
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
SYSCTL
    sysctl -p > /dev/null 2>&1
fi

# ─── Summary ─────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Server Provisioning Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Installed:"
echo "    Docker:        $(docker --version | cut -d' ' -f3 | tr -d ',')"
echo "    Docker Compose: $(docker compose version --short)"
echo "    Node.js:       $(node --version)"
echo "    npm:           $(npm --version)"
echo "    PostgreSQL CLI: $(psql --version | head -1)"
echo "    Firewall:      Active (SSH, HTTP, HTTPS)"
echo "    Fail2ban:      Active (SSH protection)"
echo ""
echo "  Directories:"
echo "    Application:   $CIS_DIR"
echo "    Backups:       $CIS_DIR/backups"
echo "    Logs:          $CIS_DIR/logs"
echo ""
echo "  Next step:"
echo "    cd $CIS_DIR && git clone <your-repo> . && cd src/backend"
echo "    ./scripts/generate-secrets.sh"
echo "    ./scripts/deploy-full.sh"
echo ""
echo "═══════════════════════════════════════════════════════════════"
