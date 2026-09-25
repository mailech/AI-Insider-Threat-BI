import urllib.request
import json

roles = ['analyst', 'engineer', 'manager', 'admin']
print("Testing login for each role:")
for role in roles:
    url = 'http://localhost:8000/api/v1/auth/login'
    payload = json.dumps({'username': role, 'password': 'ChangeMe123!'}).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"  [OK] {role}: authenticated as {data.get('role')} (username={data.get('username')})")
            token = data.get('access_token')
            # Test protected endpoint
            me_req = urllib.request.Request('http://localhost:8000/api/v1/auth/me', headers={'Authorization': f'Bearer {token}'})
            with urllib.request.urlopen(me_req) as me_resp:
                me_data = json.loads(me_resp.read().decode('utf-8'))
                print(f"       /me returned: {me_data.get('email')} ({me_data.get('role')})")
    except Exception as e:
        print(f"  [FAIL] {role}: {e}")
