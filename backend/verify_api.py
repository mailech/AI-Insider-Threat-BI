"""Quick API verification script for Milestone 1 changes."""
import urllib.request, json

# 1. Login as analyst
req = urllib.request.Request(
    'http://localhost:8000/api/v1/auth/token',
    data=json.dumps({'email': 'analyst@itbis.internal', 'password': 'Analyst123!'}).encode(),
    headers={'Content-Type': 'application/json'},
    method='POST'
)
resp = urllib.request.urlopen(req)
token_data = json.loads(resp.read())
token = token_data['access_token']
print('Login OK - token received')

# 2. Fetch employees
req2 = urllib.request.Request(
    'http://localhost:8000/api/v1/employees/?limit=5',
    headers={'Authorization': 'Bearer ' + token},
)
resp2 = urllib.request.urlopen(req2)
employees = json.loads(resp2.read())
print('Employees fetched:', len(employees), 'records')
for e in employees:
    print('  emp_id=' + e['emp_id'],
          '| device_id=' + str(e.get('device_id')),
          '| ip=' + str(e.get('ip_address')),
          '| os=' + str(e.get('os_type')),
          '| access=' + str(e.get('access_level')),
          '| risk=' + str(e.get('risk_category')))

# 3. Fetch telemetry for first employee
req3 = urllib.request.Request(
    'http://localhost:8000/api/v1/telemetry/logs/emp_1001?limit=3',
    headers={'Authorization': 'Bearer ' + token},
)
resp3 = urllib.request.urlopen(req3)
logs = json.loads(resp3.read())
print('Telemetry logs for emp_1001:', len(logs), 'records')
for l in logs:
    print('  event_type=' + l.get('event_type','?') + ' | severity=' + l.get('severity','?'))
