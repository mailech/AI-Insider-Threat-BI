import random
import time
import requests
from datetime import datetime

# =========================================================
# SYNTHETIC LOG GENERATOR (MILESTONE 1 ACADEMIC SAFE)
# =========================================================
# This script simulates a stream of completely fictional activity logs.
# It targets the local FastAPI backend ingestion endpoint. 
# It does NOT monitor any real system resources.

# Setup your local API endpoint
API_URL = "http://localhost:8000/api/v1/activities/ingest"

# The UUIDs match the synthetic employees we created in 002_mock_seed.sql
SYNTHETIC_EMPLOYEES = [
    "55555555-5555-4555-a555-555555555555", # SOC Analyst
    "66666666-6666-4666-a666-666666666666", # Backend Dev
    "77777777-7777-4777-a777-777777777777"  # Finance
]

ACTIVITY_TYPES = [
    'LOGIN', 'FILE_DOWNLOAD', 'FILE_UPLOAD', 'DATA_TRANSFER', 
    'EMAIL_ACTIVITY', 'PRIVILEGE_CHANGE', 'REMOTE_ACCESS',
    'NETWORK', 'USB', 'APP_USAGE'
]

def generate_random_event():
    emp_id = random.choice(SYNTHETIC_EMPLOYEES)
    event_type = random.choice(ACTIVITY_TYPES)
    
    # Generic safe payload
    log_payload = {
        "employee_id": emp_id,
        "device_id": None, 
        "event_type": event_type,
        "resource_accessed": {"simulated": True, "note": "Academic generated event"},
        "volume_bytes": random.randint(100, 5000000),
        "status": random.choice(["Success", "Success", "Success", "Failed"])
    }
    return log_payload


if __name__ == "__main__":
    print("Starting Synthetic Academic Log Generator...")
    print("Press Ctrl+C to stop.")
    
    try:
        while True:
            payload = generate_random_event()
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Pushing simulated event: {payload['event_type']} for Employee {payload['employee_id'][:8]}...")
            
            try:
                # Assuming the endpoint is unprotected or we pass a mock token if needed
                response = requests.post(API_URL, json=payload)
                if response.status_code == 200:
                    print(" -> Successfully ingested.")
                else:
                    print(f" -> Failed to ingest: {response.text}")
            except requests.exceptions.ConnectionError:
                print(" -> Connection refused. Ensure FastAPI backend is running on port 8000.")
                
            time.sleep(random.uniform(2.0, 5.0))
            
    except KeyboardInterrupt:
        print("\nStopping log generator.")
