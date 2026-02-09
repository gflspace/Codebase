import subprocess, json, sys

BASE = 'https://cis.qwickservices.com'
PASS = 0
FAIL = 0

def curl(method, path, token=None, data=None):
    cmd = ['curl', '-s', '-w', '\n%{http_code}', BASE + path]
    if method != 'GET':
        cmd = ['curl', '-s', '-w', '\n%{http_code}', '-X', method, BASE + path]
    if token:
        cmd += ['-H', 'Authorization: Bearer ' + token]
    if data:
        cmd += ['-H', 'Content-Type: application/json', '-d', json.dumps(data)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    lines = r.stdout.strip().rsplit('\n', 1)
    body = lines[0] if len(lines) > 1 else ''
    code = int(lines[-1]) if lines[-1].isdigit() else 0
    return code, body

def check(name, condition, detail=''):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f'  PASS  {name}' + (f' -- {detail}' if detail else ''))
    else:
        FAIL += 1
        print(f'  FAIL  {name}' + (f' -- {detail}' if detail else ''))

print('=' * 60)
print('CIS DASHBOARD END-TO-END TEST')
print('=' * 60)

# ---- 1. DASHBOARD LOAD ----
print('\n[1] DASHBOARD PAGES')
code, body = curl('GET', '/')
check('Login page loads', code == 200 and 'QwickServices CIS' in body, f'HTTP {code}')

code, body = curl('GET', '/_next/static/css/a1bde36cc785c96a.css')
check('CSS assets load', code == 200, f'HTTP {code}')

# ---- 2. LOGIN ----
print('\n[2] AUTHENTICATION')
code, body = curl('POST', '/api/auth/login', data={'email': 'admin@qwickservices.com', 'password': 'QwickCIS2026admin'})
check('Login succeeds', code == 200, f'HTTP {code}')
login_data = json.loads(body)
token = login_data.get('token', '')
user = login_data.get('user', {})
check('JWT token returned', len(token) > 50, f'{len(token)} chars')
check('User role is trust_safety', user.get('role') == 'trust_safety', user.get('role', '?'))

code, body = curl('GET', '/api/auth/me', token)
check('Auth /me endpoint', code == 200, f'HTTP {code}')

# Bad login (password must be 8+ chars to pass validation)
code, _ = curl('POST', '/api/auth/login', data={'email': 'admin@qwickservices.com', 'password': 'wrongpassword123'})
check('Bad password rejected', code == 401, f'HTTP {code}')

# ---- 3. SYSTEM HEALTH MODULE ----
print('\n[3] SYSTEM HEALTH MODULE')
code, body = curl('GET', '/api/health')
health = json.loads(body)
check('Health endpoint', code == 200, f'HTTP {code}')
check('Status healthy', health.get('status') == 'healthy')
check('Database connected', health.get('database') == 'connected')
check('Shadow mode active', health.get('shadowMode') == True)

# ---- 4. ALERTS & INBOX MODULE ----
print('\n[4] ALERTS & INBOX MODULE')
code, body = curl('GET', '/api/alerts', token)
check('Alerts endpoint', code == 200, f'HTTP {code}')
alerts = json.loads(body)
alert_data = alerts.get('data', [])
check('Alert count is 5', len(alert_data) == 5, f'{len(alert_data)} alerts')
statuses = sorted([a['status'] for a in alert_data])
check('All 5 statuses present', statuses == ['assigned', 'dismissed', 'in_progress', 'open', 'resolved'], str(statuses))

for a in alert_data:
    has_fields = all(k in a for k in ['id', 'user_id', 'priority', 'status', 'title', 'description', 'created_at'])
    if not has_fields:
        check(f'Alert {a.get("status")} has required fields', False, str(list(a.keys())))
        break
else:
    check('All alerts have required fields', True)

priorities = sorted(set(a['priority'] for a in alert_data))
check('Multiple priorities (low, medium, high)', len(priorities) >= 3, str(priorities))

# Filter by status
code, body = curl('GET', '/api/alerts?status=open', token)
filtered = json.loads(body)
check('Filter alerts by status=open', len(filtered.get('data', [])) == 1, f'{len(filtered.get("data",[]))} results')

# ---- 5. CASE INVESTIGATION MODULE ----
print('\n[5] CASE INVESTIGATION MODULE')
code, body = curl('GET', '/api/cases', token)
check('Cases endpoint', code == 200, f'HTTP {code}')
cases = json.loads(body)
case_data = cases.get('data', [])
check('Case count is 3', len(case_data) == 3, f'{len(case_data)} cases')
case_statuses = sorted([c['status'] for c in case_data])
check('Case statuses (closed, investigating, open)', case_statuses == ['closed', 'investigating', 'open'], str(case_statuses))

# Get individual case detail
for c in case_data:
    cid = c['id']
    code2, body2 = curl('GET', f'/api/cases/{cid}', token)
    if code2 == 200:
        detail = json.loads(body2).get('data', {})
        has_detail = all(k in detail for k in ['id', 'title', 'status', 'user_id'])
        check(f'Case detail [{c["status"]}]', has_detail, c['title'][:50])
    else:
        check(f'Case detail [{c["status"]}]', False, f'HTTP {code2}')

# Add a test note to open case
open_case = [c for c in case_data if c['status'] == 'open']
if open_case:
    cid = open_case[0]['id']
    code, body = curl('POST', f'/api/cases/{cid}/notes', token, data={'content': 'E2E validation test note — dashboard check'})
    check('Add case note', code in [200, 201], f'HTTP {code}')

# ---- 6. ENFORCEMENT MANAGEMENT MODULE ----
print('\n[6] ENFORCEMENT MANAGEMENT MODULE')
code, body = curl('GET', '/api/enforcement-actions', token)
check('Enforcement endpoint', code == 200, f'HTTP {code}')
enf = json.loads(body)
enf_data = enf.get('data', [])
check('Enforcement count is 2', len(enf_data) == 2, f'{len(enf_data)} actions')
active = [e for e in enf_data if e.get('reversed_at') is None]
check('Both actions active (not reversed)', len(active) == 2, f'{len(active)} active')
types = [e['action_type'] for e in enf_data]
check('All soft_warning type', all(t == 'soft_warning' for t in types), str(types))
reasons = [e.get('reason_code') for e in enf_data]
check('Reason codes present', all(r == 'LOW_RISK_FIRST_OFFENSE' for r in reasons), str(reasons))

# ---- 7. RISK & TRENDS MODULE ----
print('\n[7] RISK & TRENDS MODULE')
code, body = curl('GET', '/api/risk-scores', token)
check('Risk scores endpoint', code == 200, f'HTTP {code}')
risk = json.loads(body)
risk_data = risk.get('data', [])
check('Risk score count is 2', len(risk_data) == 2, f'{len(risk_data)} scores')

tiers = {}
for r in risk_data:
    t = r['tier']
    tiers[t] = tiers.get(t, 0) + 1
check('Tier: low=2', tiers.get('low') == 2, str(tiers))
check('Tier: monitor=0, medium=0, high=0, critical=0',
      tiers.get('monitor', 0) == 0 and tiers.get('medium', 0) == 0 and
      tiers.get('high', 0) == 0 and tiers.get('critical', 0) == 0)

scores = sorted([float(r['score']) for r in risk_data])
check('Scores are 31.80 and 34.80', scores == [31.80, 34.80], str(scores))

trends = [r['trend'] for r in risk_data]
check('All trends stable', all(t == 'stable' for t in trends))

signals = [r['signal_count'] for r in risk_data]
check('Signal counts are 8', all(s == 8 for s in signals), str(signals))

# Per-user risk score
if risk_data:
    uid = risk_data[0]['user_id']
    code, body = curl('GET', f'/api/risk-scores/user/{uid}', token)
    check('Per-user risk score lookup', code == 200, f'HTTP {code}')

# Risk signals (default pagination may limit to 20)
code, body = curl('GET', '/api/risk-signals?limit=50', token)
check('Risk signals endpoint', code == 200, f'HTTP {code}')
sigs = json.loads(body)
sig_count = len(sigs.get('data', []))
check('Risk signal count >= 22', sig_count >= 22, f'{sig_count} signals')

# ---- 8. APPEALS MODULE ----
print('\n[8] APPEALS MODULE')
code, body = curl('GET', '/api/appeals', token)
check('Appeals endpoint', code == 200, f'HTTP {code}')
appeals = json.loads(body)
appeal_count = len(appeals.get('data', []))
check('Appeals empty state (0 records)', appeal_count == 0, f'{appeal_count} appeals')

# ---- 9. AUDIT LOGS MODULE ----
print('\n[9] AUDIT LOGS MODULE')
code, body = curl('GET', '/api/audit-logs', token)
check('Audit logs endpoint', code == 200, f'HTTP {code}')
logs = json.loads(body)
log_data = logs.get('data', [])
check('Audit log count >= 15', len(log_data) >= 15, f'{len(log_data)} entries')

actions = set(l['action'] for l in log_data)
expected = {'event.message.created', 'alert.created', 'case.created', 'enforcement.shadow.soft_warning'}
found = expected.intersection(actions)
check('Key action types present (4/4)', len(found) >= 4, f'{len(found)}/4: {sorted(found)}')

for l in log_data[:1]:
    has_fields = all(k in l for k in ['id', 'actor', 'action', 'entity_type', 'entity_id', 'timestamp'])
    check('Audit log has required fields', has_fields)

# ---- 10. USERS ----
print('\n[10] USERS (SUPPORTING)')
code, body = curl('GET', '/api/users', token)
check('Users endpoint', code == 200, f'HTTP {code}')
users = json.loads(body)
user_data = users.get('data', [])
check('User count >= 7', len(user_data) >= 7, f'{len(user_data)} users')

# ---- 11. SHADOW STATUS ----
print('\n[11] SHADOW MODE STATUS')
code, body = curl('GET', '/api/shadow/status', token)
check('Shadow status endpoint', code == 200, f'HTTP {code}')
shadow = json.loads(body)
check('Shadow mode enabled', shadow.get('shadow_mode') == True)
metrics = shadow.get('metrics', {})
check('Signal count >= 22', metrics.get('total_signals', 0) >= 22, f'{metrics.get("total_signals", 0)} signals')
check('Shadow actions tracked', metrics.get('shadow_actions', 0) >= 2, f'{metrics.get("shadow_actions", 0)} actions')

# ---- SUMMARY ----
print('\n' + '=' * 60)
print(f'RESULTS: {PASS} passed, {FAIL} failed, {PASS + FAIL} total')
print('=' * 60)
if FAIL > 0:
    print('\nFailed checks need investigation.')
else:
    print('\nAll dashboard modules validated successfully.')
sys.exit(1 if FAIL > 0 else 0)
