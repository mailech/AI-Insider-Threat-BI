"""
Migration script — adds Milestone 1 columns to existing employees table.
Safe to run while uvicorn is running (SQLite WAL mode handles concurrent access).
"""
from sqlalchemy import inspect, text
from app.db.session import engine

insp = inspect(engine)
existing_cols = [c['name'] for c in insp.get_columns('employees')]
print('Current employees columns:', existing_cols)

new_cols = [
    ('device_id',    'VARCHAR(100)'),
    ('ip_address',   'VARCHAR(45)'),
    ('os_type',      'VARCHAR(50)'),
    ('access_level', "VARCHAR(10) NOT NULL DEFAULT 'READ'"),
    ('updated_at',   'DATETIME'),
]

with engine.connect() as conn:
    for col_name, col_def in new_cols:
        if col_name not in existing_cols:
            conn.execute(text(f'ALTER TABLE employees ADD COLUMN {col_name} {col_def}'))
            print(f'  Added column: {col_name}')
        else:
            print(f'  Column exists (skipped): {col_name}')
    conn.commit()

# Verify
insp2 = inspect(engine)
print('Updated employees columns:', [c['name'] for c in insp2.get_columns('employees')])
print('Migration complete.')
