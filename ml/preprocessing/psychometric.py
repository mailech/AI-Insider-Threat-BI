import os
import pandas as pd


class PsychometricPreprocessor:
    """
    Parser for CERT R4.2 psychometric.csv (OCEAN Big-5 Personality scores).
    Columns: user_id, employee_name, O (Openness), C (Conscientiousness), E (Extraversion), A (Agreeableness), N (Neuroticism)
    """
    def process_file(self, file_path: str) -> pd.DataFrame:
        if not os.path.exists(file_path):
            return pd.DataFrame()

        df = pd.read_csv(file_path)
        col_map = {
            "user": "user_id",
            "user_id": "user_id",
            "employee_name": "full_name"
        }
        df = df.rename(columns={c: col_map[c] for c in df.columns if c in col_map})
        return df
