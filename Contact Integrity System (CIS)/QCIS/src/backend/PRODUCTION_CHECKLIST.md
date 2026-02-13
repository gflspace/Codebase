# QwickServices CIS — Production Readiness Checklist

Complete pre-deployment verification checklist.

## Environment Configuration

### Database

- [ ] Strong password set (20+ characters, mixed case, numbers, symbols)
- [ ] Database user has minimum required permissions
- [ ] SSL enabled (`DB_SSL=true`)
- [ ] Connection pool configured appropriately
- [ ] Statement timeout set (`DB_STATEMENT_TIMEOUT=30000`)

### Authentication & Security

- [ ] JWT secret is cryptographically random (64+ characters)
- [ ] HMAC secret is cryptographically random (64+ characters)
- [ ] Webhook secret is cryptographically random (64+ characters)
- [ ] All secrets are unique (not reused across services)
- [ ] Admin password is strong and unique
- [ ] Rate limiting configured in nginx

### External Services

- [ ] SMTP credentials configured and tested
- [ ] SMTP_FROM email verified
- [ ] Dashboard URL uses HTTPS
- [ ] API base URL uses HTTPS
- [ ] Webhook sources whitelist configured

### Enforcement

- [ ] `SHADOW_MODE=true` for initial deployment
- [ ] `ENFORCEMENT_KILL_SWITCH=false` (only enable for emergencies)
- [ ] Scoring model selected (`5-component` recommended)
- [ ] Notification channels configured

### Event Bus

- [ ] `EVENT_BUS_BACKEND=redis` (never 'memory' in production)
- [ ] Redis URL points to production instance
- [ ] Redis persistence enabled (AOF)
- [ ] Redis maxmemory policy set

### Logging & Observability

- [ ] `LOG_LEVEL=info` (not 'debug')
- [ ] Log output configured (stdout/file)
- [ ] Metrics endpoint enabled
- [ ] Graceful shutdown timeout set

## Infrastructure

### Docker & Containers

- [ ] Docker version 24.0+ installed
- [ ] Docker Compose version 2.0+ installed
- [ ] All images built successfully
- [ ] Container resource limits configured
- [ ] Health checks defined for all services
- [ ] Restart policies set (`unless-stopped`)

### Networking

- [ ] Firewall configured (only 80, 443 exposed)
- [ ] Internal services not exposed to internet
- [ ] Container network isolated
- [ ] Domain DNS configured correctly
- [ ] Load balancer configured (if applicable)

### SSL/TLS

- [ ] SSL certificates obtained (Let's Encrypt or custom)
- [ ] Certificates mounted in nginx container
- [ ] HTTPS redirect configured
- [ ] Auto-renewal cron job set up
- [ ] HSTS header enabled
- [ ] TLS 1.2+ only (no older protocols)

### Storage

- [ ] Sufficient disk space (50GB+ recommended)
- [ ] Docker volumes for persistent data
- [ ] Backup directory created (`/var/backups/cis`)
- [ ] Log directory created (`/var/log/cis`)
- [ ] Disk monitoring configured

## Database

### Schema

- [ ] All migrations applied successfully
- [ ] Database version matches code version
- [ ] No pending migrations
- [ ] Schema validated with `verify-db.ts`

### Data

- [ ] Admin user created
- [ ] Initial configuration data seeded
- [ ] Test data removed (if any)
- [ ] Database backed up before deployment

### Performance

- [ ] Indexes created for common queries
- [ ] Connection pooling configured
- [ ] Query timeout set
- [ ] Slow query logging enabled

### Backup & Recovery

- [ ] Backup script tested
- [ ] Backup cron job configured
- [ ] Backup retention policy defined
- [ ] Restore procedure tested and documented

## Application

### Build & Deploy

- [ ] All tests passing (CI green)
- [ ] TypeScript compiled successfully
- [ ] No type errors
- [ ] Linting passed
- [ ] Docker image built and tagged
- [ ] Version number updated

### API Endpoints

- [ ] Health check returns 200 OK
- [ ] Authentication endpoints working
- [ ] Webhook signature verification working
- [ ] Rate limiting active
- [ ] CORS configured correctly

### Error Handling

- [ ] All errors return proper status codes
- [ ] Error messages are informative but not exposing internals
- [ ] Unhandled rejection handlers configured
- [ ] Graceful shutdown on SIGTERM/SIGINT

### Performance

- [ ] Load testing completed
- [ ] Acceptable response times under load
- [ ] No memory leaks detected
- [ ] Connection pool not exhausted under load

## Monitoring & Alerting

### Metrics

- [ ] Prometheus scraping backend metrics
- [ ] Grafana dashboards configured
- [ ] Key metrics being collected:
  - [ ] Request rate
  - [ ] Request latency
  - [ ] Error rate
  - [ ] Active connections
  - [ ] Database query performance
  - [ ] Event processing rate

### Alerting (Future)

- [ ] Alert rules defined
- [ ] AlertManager configured
- [ ] Notification channels set up (email/Slack)
- [ ] On-call rotation defined
- [ ] Runbooks created for common alerts

### Logs

- [ ] Log aggregation configured (optional)
- [ ] Log retention policy defined
- [ ] Log rotation configured
- [ ] Sensitive data not logged

## Operational Readiness

### Documentation

- [ ] Deployment guide reviewed
- [ ] Architecture documented
- [ ] API documentation up to date
- [ ] Environment variables documented
- [ ] Runbooks created for common tasks

### Automation

- [ ] CI/CD pipeline configured
- [ ] Automated tests running
- [ ] Database backups automated
- [ ] Health checks automated
- [ ] Certificate renewal automated

### Team Readiness

- [ ] Team trained on deployment process
- [ ] Access credentials distributed securely
- [ ] On-call schedule established
- [ ] Escalation procedures documented
- [ ] Incident response plan created

### Security

- [ ] Security audit completed
- [ ] Dependencies up to date
- [ ] No known vulnerabilities
- [ ] Secrets stored securely (not in git)
- [ ] Access controls configured
- [ ] API keys rotated if needed

## Compliance & Legal

- [ ] Privacy policy reviewed
- [ ] Terms of service updated
- [ ] Data retention policy defined
- [ ] GDPR compliance verified (if applicable)
- [ ] Data processing agreement signed

## Pre-Deployment Testing

### Smoke Tests

```bash
# Health check
curl https://api-cis.yourdomain.com/api/health

# Authentication
curl -X POST https://api-cis.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"<password>"}'

# Webhook endpoint (with valid signature)
curl -X POST https://api-cis.yourdomain.com/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <valid_signature>" \
  -d '{"event":"test","data":{}}'
```

### Integration Tests

- [ ] End-to-end tests passing
- [ ] Webhook integration tested
- [ ] Email notifications tested
- [ ] Database operations tested

### Security Tests

- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] CSRF protection working
- [ ] Rate limiting preventing abuse
- [ ] Invalid JWT tokens rejected

## Post-Deployment

### Immediate (0-1 hour)

- [ ] All services healthy
- [ ] No error logs
- [ ] Metrics being collected
- [ ] Health checks passing
- [ ] SSL certificate valid

### Short-term (1-24 hours)

- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Check log files for issues
- [ ] Verify backups running
- [ ] Test critical user flows

### Medium-term (1-7 days)

- [ ] Performance trends stable
- [ ] No memory leaks
- [ ] Database performance acceptable
- [ ] User feedback collected
- [ ] Incident response tested

## Rollback Plan

### Preparation

- [ ] Previous version Docker image available
- [ ] Database backup taken before deployment
- [ ] Rollback procedure documented
- [ ] Rollback can be executed in < 5 minutes

### Rollback Triggers

- [ ] Error rate > 5%
- [ ] Response time > 2x baseline
- [ ] Critical functionality broken
- [ ] Security vulnerability discovered
- [ ] Data corruption detected

### Rollback Steps

```bash
# 1. Stop current deployment
docker-compose -f docker-compose.prod.yml down

# 2. Restore database (if schema changed)
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U cis_app_user -d qwick_cis < /var/backups/cis/pre-deploy.sql

# 3. Deploy previous version
docker tag qcis-backend:previous qcis-backend:latest
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify rollback
curl https://api-cis.yourdomain.com/api/health
```

## Sign-off

### Technical Lead

- [ ] Code review completed
- [ ] Architecture approved
- [ ] Security review passed
- [ ] Performance acceptable

**Signature**: _______________ **Date**: ___________

### Operations Lead

- [ ] Infrastructure ready
- [ ] Monitoring configured
- [ ] Backup/recovery tested
- [ ] Runbooks complete

**Signature**: _______________ **Date**: ___________

### Product Owner

- [ ] Requirements met
- [ ] User acceptance testing passed
- [ ] Documentation complete
- [ ] Go-live approved

**Signature**: _______________ **Date**: ___________

---

## Notes

Use this section to document any deviations from the checklist or additional considerations:

---

**Checklist Version**: 1.0
**Last Updated**: 2026-02-13
**Deployment Date**: ___________
**Deployed By**: ___________
