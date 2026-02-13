# QwickServices CIS — Monitoring Stack

Production-ready monitoring with Prometheus and Grafana.

## Quick Start

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Or combine with production
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d

# Access dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Stack                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    scrapes    ┌──────────────┐           │
│  │              │ ◄─────────────┤              │           │
│  │  Prometheus  │                │  CIS Backend │           │
│  │              ├───────────────►│ /api/metrics │           │
│  │   :9090      │    queries     │    :3001     │           │
│  └──────┬───────┘                └──────────────┘           │
│         │                                                    │
│         │ queries                                            │
│         ▼                                                    │
│  ┌──────────────┐                                           │
│  │              │                                            │
│  │   Grafana    │                                            │
│  │              │                                            │
│  │    :3000     │                                            │
│  └──────────────┘                                           │
│                                                              │
│  ┌──────────────┐                                           │
│  │ Node Exporter│  (host metrics: CPU, memory, disk)        │
│  │    :9100     │                                            │
│  └──────────────┘                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Metrics Available

### Application Metrics

Exposed at `http://localhost:3001/api/metrics`

#### HTTP Metrics
- `http_requests_total{method, status}` - Total HTTP requests
- `http_request_duration_ms_bucket` - Request latency histogram
- `http_active_connections` - Active HTTP connections

#### Business Metrics
- `events_processed_total{event_type}` - Event bus throughput
- `enforcement_actions_total{action_type, status}` - Enforcement actions
- `contact_operations_total{operation}` - Contact CRUD operations

#### Database Metrics
- `db_queries_total{query_type}` - Database query count
- `db_query_duration_ms_bucket` - Query latency histogram
- `db_pool_connections_active` - Active database connections
- `db_pool_connections_idle` - Idle database connections

#### Cache Metrics
- `cache_hits_total` - Cache hit count
- `cache_misses_total` - Cache miss count
- `cache_evictions_total` - Cache evictions

### System Metrics

Collected by Node Exporter (`:9100`)

- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- File system usage

## Grafana Dashboards

### Pre-configured Dashboards

#### 1. CIS Overview (`cis-overview.json`)

**Location**: `monitoring/grafana/dashboards/cis-overview.json`

**Panels**:
- Request Rate (by method, status)
- Request Latency (p50, p95, p99)
- Active Connections
- System Uptime
- Events Processed (by type)
- Database Query Rate
- Database Query Latency
- Error Rate (5xx responses)

**Refresh**: 10 seconds
**Time Range**: Last 1 hour (configurable)

### Creating Custom Dashboards

1. Login to Grafana (http://localhost:3000)
2. Navigate to Dashboards → New → New Dashboard
3. Add Panel → Select metric from Prometheus
4. Configure visualization
5. Save dashboard

### Example Queries

#### Request rate per endpoint
```promql
rate(http_requests_total{job="cis-backend"}[5m])
```

#### P95 latency
```promql
histogram_quantile(0.95, rate(http_request_duration_ms_bucket{job="cis-backend"}[5m]))
```

#### Error rate (5xx)
```promql
rate(http_requests_total{job="cis-backend",status=~"5.."}[5m])
/
rate(http_requests_total{job="cis-backend"}[5m])
```

#### Events processed per second
```promql
rate(events_processed_total{job="cis-backend"}[5m])
```

#### Database connection pool usage
```promql
db_pool_connections_active / (db_pool_connections_active + db_pool_connections_idle) * 100
```

## Prometheus Configuration

### Scrape Targets

Defined in `prometheus.yml`:

| Job Name | Target | Scrape Interval | Description |
|----------|--------|-----------------|-------------|
| cis-backend | cis-backend:3001 | 10s | CIS application metrics |
| node | node-exporter:9100 | 30s | Host system metrics |
| prometheus | localhost:9090 | 30s | Prometheus self-monitoring |

### Adding New Targets

Edit `monitoring/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'my-service'
    scrape_interval: 15s
    static_configs:
      - targets: ['my-service:8080']
        labels:
          service: 'my-service'
```

Reload Prometheus:
```bash
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

## Alerting (Future)

### Alert Manager Setup

1. Create `monitoring/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'email'

receivers:
  - name: 'email'
    email_configs:
      - to: 'ops@qwickservices.com'
        from: 'alerts@qwickservices.com'
        smarthost: 'smtp.sendgrid.net:587'
        auth_username: 'apikey'
        auth_password: '<SENDGRID_API_KEY>'
```

2. Create alert rules in `monitoring/alerts/rules.yml`:

```yaml
groups:
  - name: cis_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} (> 5%)"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High request latency"
          description: "P95 latency is {{ $value }}ms"
```

3. Add AlertManager to `docker-compose.monitoring.yml`

4. Update Prometheus config to include alert rules

## Data Retention

### Prometheus

Default: 30 days (configurable in `docker-compose.monitoring.yml`)

```yaml
command:
  - '--storage.tsdb.retention.time=30d'
```

### Grafana

Dashboard data stored in `grafana_data` volume (persistent)

## Backup & Restore

### Prometheus Data

```bash
# Backup
docker run --rm -v cis-prometheus-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/prometheus-backup.tar.gz -C /data .

# Restore
docker run --rm -v cis-prometheus-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/prometheus-backup.tar.gz -C /data
```

### Grafana Data

```bash
# Backup
docker run --rm -v cis-grafana-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/grafana-backup.tar.gz -C /data .

# Restore
docker run --rm -v cis-grafana-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/grafana-backup.tar.gz -C /data
```

## Security

### Grafana Admin Password

Change default password on first login or set via environment:

```yaml
environment:
  - GF_SECURITY_ADMIN_PASSWORD=<secure_password>
```

### Restrict Access

Use nginx reverse proxy with authentication:

```nginx
location /grafana/ {
    auth_basic "Monitoring";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://grafana:3000/;
}
```

### Metrics Endpoint

Restrict `/api/metrics` to internal networks in `nginx.ssl.conf`:

```nginx
location /api/metrics {
    allow 10.0.0.0/8;  # Internal network
    allow 172.16.0.0/12;
    deny all;
    proxy_pass http://cis_backend;
}
```

## Troubleshooting

### Prometheus Not Scraping

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check backend metrics endpoint
curl http://localhost:3001/api/metrics

# View Prometheus logs
docker-compose -f docker-compose.monitoring.yml logs prometheus
```

### Grafana Dashboard Blank

```bash
# Verify Prometheus data source
curl http://localhost:3000/api/datasources

# Test Prometheus query
curl http://localhost:9090/api/v1/query?query=up

# Check Grafana logs
docker-compose -f docker-compose.monitoring.yml logs grafana
```

### High Memory Usage

```bash
# Check container stats
docker stats cis-prometheus cis-grafana

# Reduce retention time in prometheus.yml
# Reduce scrape interval for non-critical metrics
```

## Best Practices

1. **Dashboard Organization**
   - Create folders for different teams/services
   - Use consistent naming conventions
   - Document complex queries

2. **Query Optimization**
   - Use recording rules for expensive queries
   - Set appropriate scrape intervals
   - Avoid wildcards in metric names

3. **Alerting**
   - Set meaningful thresholds
   - Avoid alert fatigue (tune sensitivity)
   - Include runbooks in alert annotations

4. **Capacity Planning**
   - Monitor Prometheus TSDB size
   - Track metric cardinality
   - Plan storage for retention period

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/best-practices-for-creating-dashboards/)

---

**Last Updated**: 2026-02-13
