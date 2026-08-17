import os
import getpass
import urllib.request
import urllib.parse
import json
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_PUBLISHABLE_KEY")

email = "mistika10042006@gmail.com"
password = getpass.getpass("Enter your Supabase Auth password: ")

data = urllib.parse.urlencode({
    "email": email,
    "password": password
}).encode()

request = urllib.request.Request(
    f"{url}/auth/v1/token?grant_type=password",
    data=data,
    headers={
        "apikey": key,
        "Content-Type": "application/x-www-form-urlencoded"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(request) as response:
        result = json.loads(response.read().decode())

    print("\n✅ Login successful!")
    print("\nYour access token is:")
    print(result["access_token"])

except Exception as e:
    print("\n❌ Login failed:")
    print(e)