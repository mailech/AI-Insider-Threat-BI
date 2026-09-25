import urllib.request
import json

endpoints = [
    '/api/v1/dashboard/summary',
    '/api/v1/alerts?limit=10',
    '/api/v1/events?limit=10',
    '/api/v1/incidents',
    '/api/v1/employees',
    '/api/v1/analytics/trends?days=30',
    '/api/v1/threat-intelligence',
    '/api/v1/notifications?limit=10',
    '/api/v1/analytics/prediction',
    '/api/v1/analytics/peer-groups',
    '/api/v1/compliance/metrics',
    '/api/v1/agents',
    '/api/v1/audit?limit=10',
    '/api/v1/admin/users',
]

def login(u):
    req = urllib.request.Request('http://localhost:8000/api/v1/auth/login',
        data=json.dumps({'username': u, 'password': 'ChangeMe123!'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())['access_token']

for role in ['analyst', 'engineer', 'manager', 'admin']:
    token = login(role)
    print(f"\n--- Testing Endpoints for Role: {role} ---")
    for ep in endpoints:
        req = urllib.request.Request(f'http://localhost:8000{ep}', headers={'Authorization': f'Bearer {token}'})
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"  [200 OK] {ep}")
        except urllib.error.HTTPError as e:
            print(f"  [{e.code}] {ep}: {e.reason}")
        except Exception as e:
            print(f"  [ERR] {ep}: {e}")
