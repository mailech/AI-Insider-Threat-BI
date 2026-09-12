from sqlalchemy import text
from app.database import engine

try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("PostgreSQL connected successfully!")
        print("Result:", result.scalar())

except Exception as e:
    print("PostgreSQL connection failed!")
    print(e)