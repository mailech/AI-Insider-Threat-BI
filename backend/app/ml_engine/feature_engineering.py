import pandas as pd
import numpy as np
from typing import Dict, Tuple
from app.ml_engine.simulator import SUSPICIOUS_KEYWORDS

def extract_comprehensive_features(log_data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    df_logins = log_data.get("logins", pd.DataFrame())
    df_files = log_data.get("files", pd.DataFrame())
    df_usb = log_data.get("usb", pd.DataFrame())
    df_emails = log_data.get("emails", pd.DataFrame())
    df_network = log_data.get("network", pd.DataFrame())
    df_apps = log_data.get("apps", pd.DataFrame())
    df_privileges = log_data.get("privileges", pd.DataFrame())
    df_transfers = log_data.get("transfers", pd.DataFrame())
    df_red_team = log_data.get("red_team", pd.DataFrame())
    
    red_team_users = set(df_red_team["user"].tolist()) if not df_red_team.empty and "user" in df_red_team.columns else set()
    
    users = df_logins["employee_id"].unique() if not df_logins.empty else []
    
    features = []
    for user in users:
        u_logins = df_logins[df_logins["employee_id"] == user] if not df_logins.empty else pd.DataFrame()
        u_files = df_files[df_files["employee_id"] == user] if not df_files.empty else pd.DataFrame()
        u_usb = df_usb[df_usb["employee_id"] == user] if not df_usb.empty else pd.DataFrame()
        u_emails = df_emails[df_emails["employee_id"] == user] if not df_emails.empty else pd.DataFrame()
        u_network = df_network[df_network["employee_id"] == user] if not df_network.empty else pd.DataFrame()
        u_apps = df_apps[df_apps["employee_id"] == user] if not df_apps.empty else pd.DataFrame()
        u_privileges = df_privileges[df_privileges["employee_id"] == user] if not df_privileges.empty else pd.DataFrame()
        u_transfers = df_transfers[df_transfers["employee_id"] == user] if not df_transfers.empty else pd.DataFrame()
        
        # 1. Login times
        mean_login_hour = float(pd.to_datetime(u_logins["login"]).dt.hour.mean()) if not u_logins.empty else 9.0
        mean_logout_hour = float(pd.to_datetime(u_logins["logout"]).dt.hour.mean()) if not u_logins.empty else 17.5
        
        # 2. Activity volumes per day
        files_per_day = float(u_files.groupby(pd.to_datetime(u_files["access_time"]).dt.date).size().mean()) if not u_files.empty else 0.0
        usb_per_day = float(u_usb.groupby(pd.to_datetime(u_usb["plug_time"]).dt.date).size().mean()) if not u_usb.empty else 0.0
        emails_per_day = float(u_emails.groupby(pd.to_datetime(u_emails["time"]).dt.date).size().mean()) if not u_emails.empty else 0.0
        network_mb_per_day = float(u_network["bytes_out_mb"].mean()) if not u_network.empty else 50.0
        
        # 3. Out of session access
        out_of_session = 0
        if not u_files.empty and not u_logins.empty:
            for _, f_row in u_files.iterrows():
                f_time = pd.to_datetime(f_row["access_time"])
                in_session = u_logins[
                    (pd.to_datetime(u_logins["login"]) <= f_time) & 
                    (pd.to_datetime(u_logins["logout"]) >= f_time)
                ]
                if in_session.empty:
                    out_of_session += 1
                    
        # 4. Suspicious apps & privileges
        suspicious_apps_list = ["mimikatz", "wireshark", "tor", "bittorrent", "nmap"]
        suspicious_app_count = 0
        if not u_apps.empty:
            suspicious_app_count = int(u_apps["app_name"].apply(lambda x: any(sa in str(x).lower() for sa in suspicious_apps_list)).sum())
            
        privilege_escalations = len(u_privileges) if not u_privileges.empty else 0
        unauth_transfers_mb = float(u_transfers["transfer_volume_mb"].sum()) if not u_transfers.empty else 0.0
        
        # 5. Email NLP & Suspicious Keywords
        keyword_flags = 0
        avg_subject_len = 15.0
        if not u_emails.empty:
            keyword_flags = int(u_emails["subject"].apply(lambda s: any(kw in str(s).lower() for kw in SUSPICIOUS_KEYWORDS)).sum())
            avg_subject_len = float(u_emails["subject"].apply(lambda s: len(str(s))).mean())
            
        keyword_flag_rate = float(keyword_flags / len(u_emails)) if not u_emails.empty and len(u_emails) > 0 else 0.0
        
        features.append({
            "employee_id": user,
            "mean_login_hour": round(mean_login_hour, 2),
            "mean_logout_hour": round(mean_logout_hour, 2),
            "files_per_day": round(files_per_day, 2),
            "usb_per_day": round(usb_per_day, 2),
            "emails_per_day": round(emails_per_day, 2),
            "network_mb_per_day": round(network_mb_per_day, 2),
            "out_of_session_access": out_of_session,
            "suspicious_app_count": suspicious_app_count,
            "privilege_escalations": privilege_escalations,
            "unauth_transfers_mb": round(unauth_transfers_mb, 2),
            "keyword_flag_rate": round(keyword_flag_rate, 4),
            "avg_subject_len": round(avg_subject_len, 2),
            "is_red_team": 1 if user in red_team_users else 0
        })
        
    return pd.DataFrame(features)
