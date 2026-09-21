import pytest
from app.database import engine, Base, SessionLocal
from app.seed_data import seed_database
from app.models import User

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            seed_database()
    finally:
        db.close()
