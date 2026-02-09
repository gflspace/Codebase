# Technical Infrastructure Setup & Configuration Plan

**System:** QwickServices Contact Integrity System (CIS)  
**Role:** Technical Infrastructure Setup Model / Engineer  
**Environment:** Hostinger (Production-grade)  
**Purpose:** Secure, auditable, and scalable infrastructure for web application deployment

---

## 1. Hostinger Account & Server Provisioning

### 1.1 Account Access
- Confirm Hostinger account ownership and billing
- Enable **MFA** on Hostinger account
- Restrict dashboard access to authorized admins only

### 1.2 Server Provisioning

**Server Type:** VPS (Production)  
**Recommended Plan:** Hostinger VPS (≥ 4 vCPU, 8GB RAM)  

**Operating System:**
- Ubuntu 22.04 LTS (Linux)

**Server Identity (Placeholders)**
- Hostname: `cis-prod.qwickservices.com`
- Public IP: `XXX.XXX.XXX.XXX`
- Private IP: Assigned by Hostinger

### 1.3 Base System Configuration

**Initial Hardening**
- Update system packages
- Enable automatic security updates (`unattended-upgrades`)
- Set system timezone and locale

**Required Packages**
- Web server: **Nginx**
- Runtime (as applicable):
  - Node.js (LTS)
  - PHP 8.x
  - Python 3.10+
- Process manager: PM2 / Supervisor
- SSL tooling: Certbot (Let’s Encrypt)

### 1.4 SSH & Network Security

- SSH key-based authentication only
- Disable password-based SSH login
- Disable root SSH login
- Create non-root sudo user

**Firewall (UFW)**
- Allow: SSH (22), HTTP (80), HTTPS (443)
- Deny: All other inbound traffic by default

**Security Tools**
- Fail2Ban (brute-force protection)
- Logwatch or equivalent

---

## 2. Database Setup (PostgreSQL)

### 2.1 Database Provisioning

**Database Engine:** PostgreSQL 14+  
**Deployment:** Same VPS or Dedicated DB Server (recommended at scale)

### 2.2 Database Configuration (Placeholders)

- Database Name: `qwick_cis_prod`
- Application User: `cis_app_user`
- Password: `******** (env-managed)`

**Permissions**
- Application user: CRUD on application schema only
- No superuser or admin privileges

### 2.3 Security Controls

- Enforce SSL/TLS connections
- Restrict remote access by IP allowlist
- Enable query logging and connection audit logs

### 2.4 Backup & Recovery

- Automated daily database backups
- Backup format: Encrypted dump (`pg_dump`)
- Backup storage: Off-server secure storage

**Retention Policy**
- Daily backups retained for 30 days

**Recovery Testing**
- Restore test performed quarterly
- Documented restore procedure maintained

---

## 3. CI/CD Pipeline Setup

### 3.1 Source Control Integration

- Git provider: GitHub / GitLab (placeholder)
- Branch strategy:
  - `main` → production
  - `develop` → staging

### 3.2 Pipeline Architecture

**Pipeline Stages**
1. Code checkout
2. Dependency install
3. Build & test
4. Security checks (linting, dependency scan)
5. Deploy to staging
6. Manual approval gate
7. Deploy to production

### 3.3 Deployment Strategy

- SSH-based deployment with deploy key
- Zero-downtime reload (Nginx / PM2)
- Automatic rollback on failure

### 3.4 Secrets Management

- All secrets stored as CI/CD environment variables
- No credentials committed to source code
- Separate variables for staging and production

### 3.5 Notifications

- Pipeline failure alerts (Email / Slack)
- Deployment success/failure logs retained

---

## 4. Secure Access & Backup Policies

### 4.1 Server Access Control

- SSH access limited to authorized engineers
- Unique SSH keys per user
- MFA enforced at Hostinger and Git provider level
- All login attempts logged and monitored

### 4.2 Backup Policies

**Server Backups**
- Daily automated full-server snapshots
- Retained for 30 days

**Database Backups**
- Daily encrypted dumps
- Stored off-server

**Testing**
- Full restore simulation every quarter

---

## 5. Security & Compliance Alignment (CIS)

- Infrastructure supports event replay, audit logging, and forensic review
- Backup and retention aligned with CIS data minimization principles
- Access logs support regulatory and legal audits
- Environment supports separation of staging vs production

---

## 6. Setup Checklist (Execution-Ready)

- [ ] Hostinger account secured with MFA
- [ ] VPS provisioned (Ubuntu LTS)
- [ ] SSH hardened and firewall enabled
- [ ] Nginx + runtime installed
- [ ] PostgreSQL installed and secured
- [ ] Automated backups enabled and tested
- [ ] CI/CD pipeline connected and validated
- [ ] Monitoring and alerting active

---

**Status:** Infrastructure Plan Ready for Execution  
**Next Step:** Implement staging environment + monitoring dashboards

