from app.database import SessionLocal
from app.models.user import User
from app.auth.hashing import hash_password


EMAIL = "analyst@test.com"
NEW_PASSWORD = "Test@12345"


def reset_password():

    db = SessionLocal()

    try:
        user = (
            db.query(User)
            .filter(User.email == EMAIL)
            .first()
        )

        if not user:
            print("=" * 50)
            print("USER NOT FOUND")
            print("=" * 50)
            print("Email:", EMAIL)
            return

        user.password = hash_password(NEW_PASSWORD)

        db.commit()
        db.refresh(user)

        print("=" * 50)
        print("PASSWORD RESET SUCCESSFUL")
        print("=" * 50)
        print("Email    :", EMAIL)
        print("Password :", NEW_PASSWORD)
        print("Role     :", user.role)
        print("=" * 50)

    except Exception as e:

        db.rollback()

        print("=" * 50)
        print("PASSWORD RESET FAILED")
        print("=" * 50)
        print("Error:", e)
        print("=" * 50)

    finally:
        db.close()


if __name__ == "__main__":
    reset_password()