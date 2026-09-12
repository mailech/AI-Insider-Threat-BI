from sqlalchemy import text
from app.database import engine
from app.auth import hash_password

password = "Admin1234!"

with engine.begin() as conn:

    employee = conn.execute(
        text("""
            INSERT INTO employees
            (employee_id, name, email, department, role)
            VALUES
            (:employee_id, :name, :email, :department, :role)
            ON CONFLICT (employee_id)
            DO UPDATE SET email = EXCLUDED.email
            RETURNING id
        """),
        {
            "employee_id": "EMP_ADMIN",
            "name": "ITBIS Administrator",
            "email": "admin@itbis.internal",
            "department": "Security",
            "role": "Administrator"
        }
    ).mappings().first()

    conn.execute(
        text("""
            INSERT INTO users
            (employee_id, email, password_hash, role, is_active)
            VALUES
            (:employee_id, :email, :password_hash, :role, TRUE)
            ON CONFLICT (email)
            DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                is_active = TRUE
        """),
        {
            "employee_id": employee["id"],
            "email": "admin@itbis.internal",
            "password_hash": hash_password(password),
            "role": "ADMINISTRATOR"
        }
    )

print("Admin user created successfully!")