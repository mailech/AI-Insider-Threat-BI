import os
from typing import Optional
import pandas as pd


class LDAPPreprocessor:
    """
    Parser for CERT R4.2 LDAP directory or user profiles.
    Columns: user_id, employee_name, email, role, department, supervisor/manager
    """
    def process_file(self, file_path: str) -> pd.DataFrame:
        if not os.path.exists(file_path):
            return pd.DataFrame()

        df = pd.read_csv(file_path, dtype=str)
        
        # Standardize column names if variations exist
        col_map = {
            "user": "user_id",
            "user_id": "user_id",
            "employee_name": "full_name",
            "name": "full_name",
            "email": "email",
            "role": "role",
            "department": "department",
            "supervisor": "manager",
            "manager": "manager"
        }
        df = df.rename(columns={c: col_map[c] for c in df.columns if c in col_map})
        return df
