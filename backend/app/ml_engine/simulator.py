import os
import random
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any

SUSPICIOUS_KEYWORDS = ['confidential', 'urgent', 'password', 'secret', 'invoice', 'transfer', 'leak', 'financial_q4', 'source_code', 'credentials']
DEPARTMENTS = ["Engineering", "Finance", "Human Resources", "Sales & Marketing", "IT Administration", "Legal & Compliance", "Executive"]

def generate_synthetic_enterprise_logs(days: int = 30, num_users: int = 25, red_team_user_ids: List[str] = None) -> Dict[str, pd.DataFrame]:
    if red_team_user_ids is None:
        red_team_user_ids = ["EMP-007", "EMP-014", "EMP-021"]
    
    users = [f"EMP-{i:03d}" for i in range(1, num_users + 1)]
    files = [f"doc_project_{i}.docx" for i in range(1, 30)] + [f"financial_ledger_{i}.xlsx" for i in range(1, 15)] + [f"source_code_auth_{i}.py" for i in range(1, 20)] + ["customer_pii_dump.csv", "passwords_vault_backup.json", "q4_merger_strategy.pdf"]
    devices = [f"usb_corp_{i}" for i in range(1, 8)] + [f"unauthorized_sandisk_{i}" for i in range(1, 4)]
    emails = [f"user_{u.lower().replace('-', '')}@enterprise.corp" for u in users]
    external_domains = ["gmail.com", "protonmail.com", "mega.nz", "temp-mail.org", "pastebin.com", "competitor.io"]
    applications = ["Visual Studio Code", "Excel", "Outlook", "Slack", "Chrome", "Terminal", "BitTorrent", "Mimikatz", "Nmap", "Wireshark", "Tor Browser"]
    
    start_date = datetime.utcnow() - timedelta(days=days)
    random.seed(42)
    
    login_records = []
    file_records = []
    usb_records = []
    email_records = []
    network_records = []
    app_records = []
    remote_records = []
    privilege_records = []
    data_transfer_records = []
    
    for day in range(days):
        current_day = start_date + timedelta(days=day)
        is_weekend = current_day.weekday() >= 5
        
        for u_idx, user in enumerate(users):
            is_red_team = user in red_team_user_ids
            user_email = emails[u_idx]
            
            # --- 1. Login Events ---
            if is_weekend and not is_red_team and random.random() > 0.08:
                continue
            
            # Normal users: 8:00 AM - 10:00 AM. Red team: often after midnight or weird hours
            if is_red_team and random.random() < 0.65:
                login_hour = random.choice([22, 23, 1, 2, 3, 4])
                login_time = current_day + timedelta(hours=login_hour, minutes=random.randint(0, 59))
                logout_time = login_time + timedelta(hours=random.randint(2, 5))
                login_success = random.random() < 0.85
                ip = f"198.51.100.{random.randint(10, 200)}" if random.random() < 0.5 else f"10.0.4.{u_idx + 1}"
            else:
                login_hour = random.randint(8, 10)
                login_time = current_day + timedelta(hours=login_hour, minutes=random.randint(0, 59))
                logout_time = login_time + timedelta(hours=random.randint(7, 9))
                login_success = True
                ip = f"10.0.4.{u_idx + 1}"
                
            login_records.append({
                "employee_id": user,
                "login": login_time,
                "logout": logout_time,
                "success": login_success,
                "ip_address": ip,
                "location": "HQ Office - NY" if ip.startswith("10.") else "Remote / External VPN"
            })
            
            # --- 2. File Access (Read, Download, Upload, Delete) ---
            num_file_ops = random.randint(20, 50) if is_red_team else random.randint(5, 18)
            for _ in range(num_file_ops):
                if is_red_team and random.random() < 0.5:
                    target_file = random.choice(["customer_pii_dump.csv", "passwords_vault_backup.json", "q4_merger_strategy.pdf", "financial_ledger_1.xlsx"])
                    action = random.choice(["download", "mass_export", "exfiltrate_copy", "delete_audit_trail"])
                else:
                    target_file = random.choice(files[:25])
                    action = random.choice(["read", "modify", "save", "download"])
                    
                access_time = login_time + timedelta(minutes=random.randint(10, int((logout_time - login_time).total_seconds() / 60) + 30))
                file_records.append({
                    "employee_id": user,
                    "file": target_file,
                    "action": action,
                    "access_time": access_time,
                    "bytes_accessed": random.randint(50000, 5000000) if is_red_team else random.randint(2000, 80000)
                })
                
            # --- 3. USB Usage ---
            if (is_red_team and random.random() < 0.6) or (not is_red_team and random.random() < 0.05):
                device = random.choice(devices[8:]) if is_red_team else random.choice(devices[:5])
                plug_time = login_time + timedelta(hours=random.randint(1, 5))
                unplug_time = plug_time + timedelta(minutes=random.randint(10, 180))
                usb_records.append({
                    "employee_id": user,
                    "device": device,
                    "plug_time": plug_time,
                    "unplug_time": unplug_time,
                    "files_transferred": random.randint(15, 60) if is_red_team else random.randint(1, 3),
                    "bytes_written": random.randint(50000000, 2000000000) if is_red_team else random.randint(1000, 500000)
                })
                
            # --- 4. Email Activity ---
            num_emails = random.randint(10, 25) if is_red_team else random.randint(3, 12)
            for _ in range(num_emails):
                time = login_time + timedelta(hours=random.randint(0, 8), minutes=random.randint(0, 59))
                if is_red_team and random.random() < 0.4:
                    recipient = f"contact@{random.choice(external_domains)}"
                    subject = f"{random.choice(SUSPICIOUS_KEYWORDS).capitalize()} Database Backup and Passwords"
                    has_attachment = True
                else:
                    recipient = random.choice([e for e in emails if e != user_email])
                    subject = random.choice(["Sprint Planning Review", "Weekly Status Update", "Invoice Approval", "Team Sync", "Architecture Diagram Review"])
                    has_attachment = random.random() < 0.25
                
                email_records.append({
                    "employee_id": user,
                    "sender": user_email,
                    "recipient": recipient,
                    "time": time,
                    "subject": subject,
                    "has_attachment": has_attachment
                })
                
            # --- 5. Application Usage ---
            num_apps = random.randint(4, 8)
            for _ in range(num_apps):
                if is_red_team and random.random() < 0.4:
                    app = random.choice(["Mimikatz", "Wireshark", "Tor Browser", "BitTorrent", "Nmap"])
                else:
                    app = random.choice(applications[:5])
                app_records.append({
                    "employee_id": user,
                    "app_name": app,
                    "timestamp": login_time + timedelta(hours=random.randint(0, 6)),
                    "duration_mins": random.randint(10, 120)
                })
                
            # --- 6. Network Activity & Remote Access ---
            network_mb = random.randint(500, 8000) if is_red_team else random.randint(20, 250)
            network_records.append({
                "employee_id": user,
                "timestamp": login_time + timedelta(hours=random.randint(1, 7)),
                "bytes_out_mb": network_mb,
                "destination": "cloud-storage-drop.io" if is_red_team and random.random() < 0.5 else "api.internal.corp",
                "is_external": is_red_team
            })
            
            # --- 7. Privilege Changes / Escalations ---
            if is_red_team and random.random() < 0.25:
                privilege_records.append({
                    "employee_id": user,
                    "timestamp": login_time + timedelta(hours=2),
                    "action": "sudo_su_root_elevation",
                    "status": "Unauthorized Escalation",
                    "command": "chmod 777 /etc/shadow && adduser backdoor"
                })
                
            # --- 8. Data Transfers ---
            if is_red_team and random.random() < 0.4:
                data_transfer_records.append({
                    "employee_id": user,
                    "timestamp": login_time + timedelta(hours=3),
                    "destination_type": "External Cloud Storage / MegaUpload",
                    "transfer_volume_mb": random.randint(1200, 6500),
                    "is_authorized": False
                })

    df_logins = pd.DataFrame(login_records)
    df_files = pd.DataFrame(file_records)
    df_usb = pd.DataFrame(usb_records)
    df_emails = pd.DataFrame(email_records)
    df_network = pd.DataFrame(network_records)
    df_apps = pd.DataFrame(app_records)
    df_privileges = pd.DataFrame(privilege_records)
    df_transfers = pd.DataFrame(data_transfer_records)
    df_red_team = pd.DataFrame([{"user": u, "is_red_team": 1} for u in red_team_user_ids])
    
    return {
        "logins": df_logins,
        "files": df_files,
        "usb": df_usb,
        "emails": df_emails,
        "network": df_network,
        "apps": df_apps,
        "privileges": df_privileges,
        "transfers": df_transfers,
        "red_team": df_red_team
    }
