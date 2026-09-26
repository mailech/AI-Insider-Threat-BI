import os
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
import pandas as pd


def generate_sample_cert_dataset(
    output_dir: str = "data/cert_r4.2",
    num_users: int = 15,
    days: int = 30,
    seed: int = 42
):
    """
    Generates a high-fidelity synthetic CERT R4.2 dataset for testing and preprocessing pipeline validation.
    Conforms precisely to official CERT R4.2 column names, formats, timestamps, and schema definitions.
    """
    random.seed(seed)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    (out_path / "answers").mkdir(parents=True, exist_ok=True)
    (out_path / "LDAP").mkdir(parents=True, exist_ok=True)

    user_ids = [f"USR{i:04d}" for i in range(1, num_users + 1)]
    user_ids[0] = "AAE0190"  # Dedicated malicious subject from CERT spec

    start_date = datetime(2026, 1, 1, 8, 0, 0)

    logon_rows = []
    device_rows = []
    file_rows = []
    http_rows = []
    email_rows = []

    logon_id = 1
    device_id = 1
    file_id = 1
    http_id = 1
    email_id = 1

    for day_offset in range(days):
        current_day = start_date + timedelta(days=day_offset)
        is_weekend = current_day.weekday() >= 5
        date_str = current_day.strftime("%m/%d/%Y")

        for u in user_ids:
            pc = f"PC-{u}-01"
            is_malicious_user = (u == "AAE0190" and day_offset >= 20)

            # Weekend logic
            if is_weekend and not is_malicious_user:
                continue

            # 1. LOGON LOGS
            if not is_weekend or is_malicious_user:
                # Normal login: 08:30 - 09:15
                login_hour = random.randint(8, 9)
                login_min = random.randint(15, 55)
                login_time = f"{date_str} {login_hour:02d}:{login_min:02d}:{random.randint(0,59):02d}"
                logon_rows.append({"id": f"LGN{logon_id:07d}", "date": login_time, "user": u, "pc": pc, "activity": "Logon"})
                logon_id += 1

                # Normal logoff: 17:00 - 17:45
                logoff_hour = random.randint(17, 18)
                logoff_min = random.randint(0, 30)
                logoff_time = f"{date_str} {logoff_hour:02d}:{logoff_min:02d}:{random.randint(0,59):02d}"
                logon_rows.append({"id": f"LGN{logon_id:07d}", "date": logoff_time, "user": u, "pc": pc, "activity": "Logoff"})
                logon_id += 1

                # If malicious, add after-hours / weekend logins
                if is_malicious_user:
                    ah_time = f"{date_str} 22:{random.randint(10,50):02d}:{random.randint(0,59):02d}"
                    logon_rows.append({"id": f"LGN{logon_id:07d}", "date": ah_time, "user": u, "pc": pc, "activity": "Logon"})
                    logon_id += 1

            # 2. DEVICE (USB) LOGS
            if is_malicious_user:
                dev_time1 = f"{date_str} 22:15:{random.randint(0,59):02d}"
                dev_time2 = f"{date_str} 22:45:{random.randint(0,59):02d}"
                device_rows.append({"id": f"DEV{device_id:07d}", "date": dev_time1, "user": u, "pc": pc, "activity": "Connect"})
                device_id += 1
                device_rows.append({"id": f"DEV{device_id:07d}", "date": dev_time2, "user": u, "pc": pc, "activity": "Disconnect"})
                device_id += 1
            elif random.random() < 0.05:  # Rare accidental USB connect
                dev_time = f"{date_str} 11:30:{random.randint(0,59):02d}"
                device_rows.append({"id": f"DEV{device_id:07d}", "date": dev_time, "user": u, "pc": pc, "activity": "Connect"})
                device_id += 1

            # 3. FILE LOGS
            num_files = random.randint(60, 180) if is_malicious_user else random.randint(5, 20)
            for _ in range(num_files):
                f_hour = random.randint(21, 23) if is_malicious_user else random.randint(9, 16)
                f_time = f"{date_str} {f_hour:02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d}"
                if is_malicious_user and random.random() < 0.35:
                    fname = f"C:\\Confidential\\source_code_export_{random.randint(1,10)}.zip"
                else:
                    fname = f"C:\\Documents\\work_doc_{random.randint(1,50)}.docx"
                file_rows.append({"id": f"FIL{file_id:07d}", "date": f_time, "user": u, "pc": pc, "filename": fname, "activity": "File Open", "content": "Sample content"})
                file_id += 1

            # 4. HTTP LOGS
            num_http = random.randint(200, 500) if is_malicious_user else random.randint(40, 120)
            for _ in range(num_http):
                h_hour = random.randint(21, 23) if is_malicious_user else random.randint(9, 16)
                h_time = f"{date_str} {h_hour:02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d}"
                if is_malicious_user and random.random() < 0.15:
                    url = "https://mega.nz/upload/file"
                else:
                    url = f"https://intranet.company.org/page/{random.randint(1,20)}"
                http_rows.append({"id": f"HTP{http_id:07d}", "date": h_time, "user": u, "pc": pc, "url": url})
                http_id += 1

            # 5. EMAIL LOGS
            num_email = random.randint(20, 45) if is_malicious_user else random.randint(4, 12)
            for _ in range(num_email):
                e_hour = random.randint(21, 23) if is_malicious_user else random.randint(9, 16)
                e_time = f"{date_str} {e_hour:02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d}"
                if is_malicious_user and random.random() < 0.4:
                    to_email = "alex_personal@gmail.com"
                    att = "confidential_archive.zip;database_dump.sql"
                    size = 18500000.0
                else:
                    to_email = f"colleague{random.randint(1,10)}@dTA.org"
                    att = "memo.docx" if random.random() < 0.2 else ""
                    size = 450000.0
                email_rows.append({
                    "id": f"EML{email_id:07d}",
                    "date": e_time,
                    "user": u,
                    "pc": pc,
                    "to": to_email,
                    "cc": "",
                    "bcc": "",
                    "from": f"{u.lower()}@dTA.org",
                    "size": size,
                    "attachments": att
                })
                email_id += 1

    # Write Raw CSVs
    pd.DataFrame(logon_rows).to_csv(out_path / "logon.csv", index=False)
    pd.DataFrame(device_rows).to_csv(out_path / "device.csv", index=False)
    pd.DataFrame(file_rows).to_csv(out_path / "file.csv", index=False)
    pd.DataFrame(http_rows).to_csv(out_path / "http.csv", index=False)
    pd.DataFrame(email_rows).to_csv(out_path / "email.csv", index=False)

    # Write LDAP & Psychometric & Answer Key
    ldap_data = [{"user_id": u, "full_name": f"User {u}", "email": f"{u.lower()}@dTA.org", "role": "Engineer" if u == "AAE0190" else "Analyst", "department": "Engineering" if u == "AAE0190" else "Finance", "manager": "Director Vance"} for u in user_ids]
    pd.DataFrame(ldap_data).to_csv(out_path / "LDAP" / "users.csv", index=False)

    psycho_data = [{"user_id": u, "full_name": f"User {u}", "O": 35, "C": 40, "E": 28, "A": 32, "N": 45} for u in user_ids]
    pd.DataFrame(psycho_data).to_csv(out_path / "psychometric.csv", index=False)

    # Ground Truth Answer Key
    answer_data = [{
        "dataset": "4.2",
        "scenario": "1",
        "details": "User Alexander Evans exfiltrates intellectual property via USB and cloud upload",
        "user": "AAE0190",
        "start": (start_date + timedelta(days=20)).strftime("%m/%d/%Y"),
        "end": (start_date + timedelta(days=days-1)).strftime("%m/%d/%Y")
    }]
    pd.DataFrame(answer_data).to_csv(out_path / "answers" / "insiders.csv", index=False)
    print(f"Generated CERT R4.2 synthetic dataset in {output_dir}")
