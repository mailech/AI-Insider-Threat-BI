from typing import List, Dict, Any, Optional
import os
from datetime import datetime, timezone
import pandas as pd


class ForensicTimelineGenerator:
    """
    Reconstructs chronological multi-channel forensic activity timelines for SOC analysts.
    Aggregates granular events from Logon, Device, File, HTTP, and Email channels with
    threat tagging and anomaly severity indicators.
    """

    def __init__(self, raw_data_dir: str = "data/cert_r4.2"):
        self.raw_data_dir = raw_data_dir

    def get_user_timeline(
        self,
        user_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 200
    ) -> List[Dict[str, Any]]:
        """
        Extracts and sorts chronological raw events for an employee across all CERT channels.
        """
        events = []

        # 1. Logon Events
        logon_file = os.path.join(self.raw_data_dir, "logon.csv")
        if os.path.exists(logon_file):
            try:
                df_logon = pd.read_csv(logon_file)
                user_logons = df_logon[df_logon["user"] == user_id]
                for _, row in user_logons.iterrows():
                    date_val = str(row["date"])
                    if self._in_range(date_val, start_date, end_date):
                        dt = pd.to_datetime(date_val, errors="coerce")
                        hour = dt.hour if not pd.isna(dt) else 9
                        is_after_hours = bool(hour < 8 or hour >= 18)
                        
                        events.append({
                            "id": str(row.get("id", f"LOG-{len(events)}")),
                            "timestamp": date_val,
                            "channel": "LOGON",
                            "action": str(row.get("activity", "Logon")),
                            "pc": str(row.get("pc", "PC-UNKNOWN")),
                            "details": f"Workstation session event: {row.get('activity', 'Logon')} on {row.get('pc', 'PC-UNKNOWN')}",
                            "is_anomalous": is_after_hours,
                            "severity": "MEDIUM" if is_after_hours else "LOW",
                            "tag": "After-Hours Session" if is_after_hours else "Normal Shift"
                        })
            except Exception:
                pass

        # 2. Device (USB) Events
        device_file = os.path.join(self.raw_data_dir, "device.csv")
        if os.path.exists(device_file):
            try:
                df_dev = pd.read_csv(device_file)
                user_dev = df_dev[df_dev["user"] == user_id]
                for _, row in user_dev.iterrows():
                    date_val = str(row["date"])
                    if self._in_range(date_val, start_date, end_date):
                        act = str(row.get("activity", "Connect"))
                        events.append({
                            "id": str(row.get("id", f"DEV-{len(events)}")),
                            "timestamp": date_val,
                            "channel": "DEVICE",
                            "action": act,
                            "pc": str(row.get("pc", "PC-UNKNOWN")),
                            "details": f"Removable storage hardware: {act} event detected",
                            "is_anomalous": True,
                            "severity": "HIGH" if "Connect" in act else "MEDIUM",
                            "tag": "Removable Media / USB"
                        })
            except Exception:
                pass

        # 3. File Events
        file_path = os.path.join(self.raw_data_dir, "file.csv")
        if os.path.exists(file_path):
            try:
                df_file = pd.read_csv(file_path)
                user_files = df_file[df_file["user"] == user_id]
                for _, row in user_files.iterrows():
                    date_val = str(row["date"])
                    if self._in_range(date_val, start_date, end_date):
                        fname = str(row.get("filename", "file.dat"))
                        is_sens = any(k in fname.lower() for k in ["confidential", "secret", "financial", "salary", "password", "source", "patent"])
                        events.append({
                            "id": str(row.get("id", f"FIL-{len(events)}")),
                            "timestamp": date_val,
                            "channel": "FILE",
                            "action": "File Access / Transfer",
                            "pc": str(row.get("pc", "PC-UNKNOWN")),
                            "details": f"Accessed file: {fname}",
                            "is_anomalous": is_sens,
                            "severity": "CRITICAL" if is_sens else "LOW",
                            "tag": "Sensitive Intellectual Property" if is_sens else "Standard Document"
                        })
            except Exception:
                pass

        # 4. HTTP Events
        http_path = os.path.join(self.raw_data_dir, "http.csv")
        if os.path.exists(http_path):
            try:
                df_http = pd.read_csv(http_path)
                user_http = df_http[df_http["user"] == user_id]
                for _, row in user_http.iterrows():
                    date_val = str(row["date"])
                    if self._in_range(date_val, start_date, end_date):
                        url = str(row.get("url", ""))
                        is_susp = any(k in url.lower() for k in ["mega.nz", "dropbox", "wetransfer", "pastebin", "wikileaks", "anonfiles"])
                        events.append({
                            "id": str(row.get("id", f"HTTP-{len(events)}")),
                            "timestamp": date_val,
                            "channel": "HTTP",
                            "action": "Web Request",
                            "pc": str(row.get("pc", "PC-UNKNOWN")),
                            "details": f"HTTP request to: {url}",
                            "is_anomalous": is_susp,
                            "severity": "HIGH" if is_susp else "LOW",
                            "tag": "Unapproved Cloud / Exfil Domain" if is_susp else "Web Browsing"
                        })
            except Exception:
                pass

        # 5. Email Events
        email_path = os.path.join(self.raw_data_dir, "email.csv")
        if os.path.exists(email_path):
            try:
                df_email = pd.read_csv(email_path)
                user_email = df_email[df_email["user"] == user_id]
                for _, row in user_email.iterrows():
                    date_val = str(row["date"])
                    if self._in_range(date_val, start_date, end_date):
                        to_addr = str(row.get("to", ""))
                        atts = int(row.get("attachments", 0))
                        is_ext = any(d in to_addr.lower() for d in ["@gmail.com", "@yahoo.com", "@protonmail.com", "@hotmail.com"])
                        is_anom = is_ext and atts > 0
                        events.append({
                            "id": str(row.get("id", f"EML-{len(events)}")),
                            "timestamp": date_val,
                            "channel": "EMAIL",
                            "action": "Send Email",
                            "pc": str(row.get("pc", "PC-UNKNOWN")),
                            "details": f"Email sent to {to_addr} with {atts} attachments",
                            "is_anomalous": is_anom,
                            "severity": "HIGH" if is_anom else "LOW",
                            "tag": "External Webmail Exfiltration" if is_anom else "Internal Communication"
                        })
            except Exception:
                pass

        # Sort all events chronologically
        events.sort(key=lambda x: str(x.get("timestamp", "")))
        return events[:limit]

    def _in_range(self, date_str: str, start: Optional[str], end: Optional[str]) -> bool:
        if not start and not end:
            return True
        d = date_str[:10]
        if start and d < start[:10]:
            return False
        if end and d > end[:10]:
            return False
        return True
