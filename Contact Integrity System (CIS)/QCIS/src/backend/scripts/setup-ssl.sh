#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  QwickServices CIS — SSL Certificate Setup
# ═══════════════════════════════════════════════════════════════
#
# Obtains and configures Let's Encrypt SSL certificates.
#
# Usage:
#   ./scripts/setup-ssl.sh yourdomain.com admin@yourdomain.com
#
# Prerequisites:
#   - Domain DNS must point to this server
#   - Port 80 must be accessible (for ACME challenge)
#   - Docker Compose stack must be running
#
# ═══════════════════════════════════════════════════════════════

set -e

# ─── Configuration ───────────────────────────────────────────────
DOMAIN="${1:-api-cis.qwickservices.com}"
EMAIL="${2:-admin@qwickservices.com}"
CERT_DIR="/etc/letsencrypt"
WEBROOT="/var/www/certbot"

# ─── Color Output ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ─── Validation ──────────────────────────────────────────────────
if [ -z "$DOMAIN" ]; then
    log_error "Domain is required"
    echo "Usage: $0 <domain> <email>"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    log_error "Email is required for Let's Encrypt notifications"
    echo "Usage: $0 <domain> <email>"
    exit 1
fi

log_info "Setting up SSL for domain: $DOMAIN"
log_info "Contact email: $EMAIL"

# ─── Check Root Access ───────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root or with sudo"
    exit 1
fi

# ─── Install Certbot ─────────────────────────────────────────────
log_info "Checking certbot installation..."

if ! command -v certbot &> /dev/null; then
    log_info "Installing certbot..."

    # Detect OS
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y certbot
    elif [ -f /etc/redhat-release ]; then
        yum install -y certbot
    elif [ -f /etc/arch-release ]; then
        pacman -S --noconfirm certbot
    else
        log_error "Unsupported OS. Please install certbot manually."
        exit 1
    fi

    log_info "Certbot installed successfully"
else
    log_info "Certbot already installed"
fi

# ─── Create Webroot Directory ────────────────────────────────────
log_info "Creating webroot directory for ACME challenge..."
mkdir -p "$WEBROOT"
chown -R www-data:www-data "$WEBROOT" 2>/dev/null || chown -R nginx:nginx "$WEBROOT" 2>/dev/null || true

# ─── Obtain Certificate ──────────────────────────────────────────
log_info "Obtaining SSL certificate from Let's Encrypt..."

if [ -d "$CERT_DIR/live/$DOMAIN" ]; then
    log_warn "Certificate already exists for $DOMAIN"
    read -p "Do you want to renew it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Skipping certificate renewal"
        exit 0
    fi
fi

# Run certbot
certbot certonly \
    --webroot \
    --webroot-path="$WEBROOT" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --domain "$DOMAIN" \
    --non-interactive \
    --force-renewal

if [ $? -eq 0 ]; then
    log_info "Certificate obtained successfully!"
else
    log_error "Failed to obtain certificate"
    exit 1
fi

# ─── Set Permissions ─────────────────────────────────────────────
log_info "Setting certificate permissions..."
chmod -R 755 "$CERT_DIR/live"
chmod -R 755 "$CERT_DIR/archive"

# ─── Configure Auto-Renewal ──────────────────────────────────────
log_info "Setting up auto-renewal cron job..."

CRON_JOB="0 3 * * * certbot renew --quiet --deploy-hook 'docker exec cis-nginx nginx -s reload'"

# Check if cron job already exists
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    log_info "Auto-renewal cron job added (runs daily at 3 AM)"
else
    log_info "Auto-renewal cron job already exists"
fi

# ─── Update Nginx Configuration ──────────────────────────────────
log_info "Updating nginx configuration..."

NGINX_SSL_CONF="$(dirname "$0")/../nginx/nginx.ssl.conf"

if [ -f "$NGINX_SSL_CONF" ]; then
    # Replace domain placeholder in SSL config
    sed -i "s/api-cis.qwickservices.com/$DOMAIN/g" "$NGINX_SSL_CONF"
    log_info "Nginx SSL config updated with domain: $DOMAIN"
else
    log_warn "Nginx SSL config not found at: $NGINX_SSL_CONF"
fi

# ─── Reload Nginx ────────────────────────────────────────────────
log_info "Reloading nginx..."

if docker ps | grep -q cis-nginx; then
    docker exec cis-nginx nginx -t
    if [ $? -eq 0 ]; then
        docker exec cis-nginx nginx -s reload
        log_info "Nginx reloaded successfully"
    else
        log_error "Nginx configuration test failed"
        exit 1
    fi
else
    log_warn "Nginx container not running. Start docker-compose with SSL config:"
    echo ""
    echo "  1. Update docker-compose.prod.yml to use nginx.ssl.conf"
    echo "  2. Update volumes to mount $CERT_DIR"
    echo "  3. Run: docker-compose -f docker-compose.prod.yml --env-file .env.production up -d"
fi

# ─── Summary ─────────────────────────────────────────────────────
log_info "SSL setup complete!"
echo ""
echo "Certificate details:"
echo "  Domain: $DOMAIN"
echo "  Certificate: $CERT_DIR/live/$DOMAIN/fullchain.pem"
echo "  Private key: $CERT_DIR/live/$DOMAIN/privkey.pem"
echo "  Valid until: $(openssl x509 -enddate -noout -in $CERT_DIR/live/$DOMAIN/cert.pem | cut -d= -f2)"
echo ""
echo "Next steps:"
echo "  1. Update docker-compose.prod.yml to mount certificates"
echo "  2. Replace nginx.conf with nginx.ssl.conf"
echo "  3. Restart nginx: docker-compose restart nginx"
echo ""
log_info "Auto-renewal is configured. Certificates will renew automatically."
