# QwickServices CIS — Plugins & MCP Configuration

**Last Updated:** 2026-02-09
**Maintained By:** Master Claude

> **Prime Directive (§10):** This factory must continue operating even with incomplete credentials.
> Dummy values are used until `/plugins` is updated with real secrets.

---

## 1. Infrastructure Credentials

### Hostinger VPS

| Key | Value | Status |
|---|---|---|
| Provider | Hostinger VPS (KVM 2) | Verified |
| Hostname | `srv1233672.hstgr.cloud` | Verified |
| Public IPv4 | `72.60.68.137` | Verified |
| Public IPv6 | `2a02:4780:2d:e7fe::1` | Verified |
| VPS ID | `1233672` | Verified |
| Subscription ID | `AzqNvfV6mtpti1svN` | Verified |
| Data Center ID | `17` | Verified |
| OS | Ubuntu 24.04.3 LTS | Verified |
| Kernel | `6.8.0-90-generic` | Verified |
| vCPUs | 2 | Verified |
| RAM | 8192 MB | Verified |
| Disk | 102400 MB | Verified |
| SSH User | `root` | Verified |
| SSH Port | `22` | Verified |
| SSH Key Path (local) | `D:\Codebase\Contact Integrity System (CIS)\server_config` | Verified |
| SSH Key Type | ed25519 (no passphrase) | Verified |
| SSH Key Fingerprint | `SHA256:sA0VcMJv35sDMPSuYBl52oZfA5gbqdIjexF8W9Oeam4` | Verified |
| SSH Public Key ID (Hostinger) | `420547` (name: `qcis-deploy-key`) | Verified |
| Hostinger API Token | Stored in `claude_Hostinger_MCP.json` (parent dir) | Active |
| NS1 | `153.92.2.6` | Verified |
| NS2 | `1.1.1.1` | Verified |

### SSH Connection Command (Quick Reference)

```bash
ssh -i "D:\Codebase\Contact Integrity System (CIS)\server_config" root@72.60.68.137
```

### PostgreSQL

| Key | Value | Status |
|---|---|---|
| Version | PostgreSQL 15.15 | Verified (pre-installed) |
| Host | `72.60.68.137` (VPS) | Verified |
| Port | `5432` | Verified |
| Cluster | `15/main` | Verified |
| Data Directory | `/var/lib/postgresql/15/main` | Verified |
| Log File | `/var/log/postgresql/postgresql-15-main.log` | Verified |
| Database | `qwick_cis` | Created & verified |
| App User | `qwick_cis_app` | Created & verified |
| Password | `DUMMY_STRONG_PASSWORD` | Dummy — active |
| Owner | `qwick_cis_app` | Verified |
| Schema Permissions | ALL on public schema | Verified |
| SSL | `on` (self-signed cert) | Verified |
| listen_addresses | `*` (remote access enabled) | Verified |
| pg_hba.conf | `hostssl` + `host` for `qwick_cis_app` from `0.0.0.0/0` | Verified |
| Service Status | `active (online)` | Verified |
| Tables | 14 (incl. schema_migrations) | Verified |
| Migrations Applied | 9/9 (001_users through 009_appeals) | Verified |

### PostgreSQL Connection (Quick Reference)

```bash
# Node.js (used by backend)
DB_HOST=72.60.68.137 DB_PORT=5432 DB_NAME=qwick_cis DB_USER=qwick_cis_app DB_PASSWORD=DUMMY_STRONG_PASSWORD DB_SSL=true

# psql from VPS
sudo -u postgres psql -d qwick_cis
```

### Application Deployment

| Key | Value | Status |
|---|---|---|
| Node.js | v20.20.0 (NodeSource) | Verified |
| npm | 10.8.2 | Verified |
| PM2 | 6.0.14 | Verified |
| Nginx | 1.24.0 (Ubuntu) | Verified |
| Repo Path | `/opt/qcis-repo` (git clone) | Verified |
| App Symlink | `/opt/qcis-backend` → repo backend dir | Verified |
| Built Output | `/opt/qcis-backend/dist/index.js` | Verified |
| PM2 Process | `qcis-backend` (cluster mode) | Online |
| PM2 Startup | systemd (`pm2-root.service`) | Enabled |
| PM2 Logs | `/var/log/qcis/out.log`, `/var/log/qcis/error.log` | Active |
| Ecosystem Config | `/opt/qcis-backend/ecosystem.config.js` | Created |
| .env Path | `/opt/qcis-backend/.env` (chmod 600) | Created |
| Nginx Config | `/etc/nginx/sites-available/qcis` | Enabled (SSL by Certbot) |
| Public URL | `https://cis.qwickservices.com` | Live |
| Health Check | `https://cis.qwickservices.com/api/health` | 200 OK |
| App Port | 3001 (proxied via Nginx 443 SSL + 80→HTTPS redirect) | Verified |

### Admin User (Trust & Safety)

| Key | Value | Status |
|---|---|---|
| Email | `admin@qwickservices.com` | Active |
| Password | `QwickCIS2026admin` | Active |
| Role | `trust_safety` | Verified |
| Auth Method | SHA256 hash → JWT (24h expiry) | Verified |
| Login Endpoint | `POST https://cis.qwickservices.com/api/auth/login` | E2E verified |

### Firewall (UFW)

| Rule | Port | Status |
|---|---|---|
| OpenSSH | 22 | ALLOW |
| PostgreSQL | 5432/tcp | ALLOW |
| HTTP | 80/tcp | ALLOW |
| HTTPS | 443/tcp | ALLOW |

---

## 2. API Credentials

### Claude Code Detection Orchestrator

| Key | Value | Status |
|---|---|---|
| API Endpoint | `https://api.qwickservices.com/analyze-event` | Placeholder |
| Auth Method | Signed JWT / HMAC | Defined |
| API Key | `REPLACE_WITH_REAL_API_KEY` | Dummy |
| Webhook Secret | `REPLACE_WITH_WEBHOOK_SECRET` | Dummy |

### Sidebase Backend

| Key | Value | Status |
|---|---|---|
| Base URL | `https://api.qwickservices.com` | Placeholder |
| Risk Signal Endpoint | `POST /risk-signal` | Defined |
| Auth Token | `REPLACE_WITH_BACKEND_TOKEN` | Dummy |

---

## 3. SSL / TLS

| Key | Value | Status |
|---|---|---|
| Provider | Let's Encrypt (Certbot 2.9.0) | Active |
| Domain | `cis.qwickservices.com` | Live |
| Certificate Path | `/etc/letsencrypt/live/cis.qwickservices.com/fullchain.pem` | Active |
| Private Key Path | `/etc/letsencrypt/live/cis.qwickservices.com/privkey.pem` | Active |
| Expires | 2026-05-10 | Auto-renews |
| Auto-Renew | systemd timer (certbot.timer, every 12h check) | Active |
| HTTP→HTTPS Redirect | 301 on port 80 (managed by Certbot) | Active |
| DNS Provider | GoDaddy (`ns43/ns44.domaincontrol.com`) | A record active |
| DNS Record | `cis` A → `72.60.68.137` (TTL 600) | Verified |

---

## 4. CI/CD Pipeline

| Key | Value | Status |
|---|---|---|
| Git Provider | GitHub / GitLab | Placeholder |
| Repo URL | `REPLACE_WITH_REPO_URL` | Dummy |
| Deploy Key | `REPLACE_WITH_DEPLOY_KEY` | Dummy |
| Pipeline Notifications | Email / Slack | Placeholder |

---

## 5. Monitoring & Alerting

| Key | Value | Status |
|---|---|---|
| Log Aggregator | TBD (ELK / Grafana Loki) | Placeholder |
| Metrics | TBD (Prometheus / Grafana) | Placeholder |
| Alert Channels | Email / Slack | Placeholder |

---

## 6. External Integrations

| Integration | Purpose | Status |
|---|---|---|
| Stripe | Platform payment processing | Placeholder |
| Email Service | User notifications | Placeholder |
| OCR Service | Image/attachment scanning | Placeholder |

---

## Update Instructions

To update credentials, use the `/plugins` slash command or edit this file directly.
All credential changes must be logged in `changelog.md`.

**WARNING:** Never commit real secrets to version control. Use environment variables for production deployment.

---

**Status:** Deployed & E2E Verified — VPS, PostgreSQL, Backend API live at https://cis.qwickservices.com (SSL active, full pipeline tested, 2026-02-09)
