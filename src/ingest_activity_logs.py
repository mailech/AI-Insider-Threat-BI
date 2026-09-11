import pandas as pd
from datetime import datetime

from backend.database import SessionLocal
from backend.models import ActivityLog


# Load login activity data
file_path = "outputs/login_counts_per_user.csv"

df = pd.read_csv(file_path)

print("Login activity data loaded.")
print("Total users:", len(df))


# Connect to database
db = SessionLocal()

inserted_count = 0


# Insert activity logs
for _, row in df.iterrows():

    activity = ActivityLog(
        username=row["user"],
        activity_type="Login",
        activity_time=datetime.utcnow(),
        description=f"Total login count: {int(row['login_count'])}"
    )

    db.add(activity)
    inserted_count += 1


# Save changes
db.commit()
db.close()

print("Activity log ingestion completed.")
print("Records inserted:", inserted_count)