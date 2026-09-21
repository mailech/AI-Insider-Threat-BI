import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.models import Employee, BehavioralProfile, ActivityLog

def calculate_department_peer_baselines(db: Session) -> Dict[str, Dict[str, float]]:
    """Computes median metrics for each department to enable peer comparison"""
    employees = db.query(Employee).all()
    dept_map = {}
    for emp in employees:
        if emp.department not in dept_map:
            dept_map[emp.department] = []
        if emp.behavioral_profile:
            bp = emp.behavioral_profile
            dept_map[emp.department].append({
                "mean_login_hour": bp.mean_login_hour,
                "files_per_day": bp.files_per_day,
                "usb_per_day": bp.usb_per_day,
                "emails_per_day": bp.emails_per_day,
                "network_mb_per_day": bp.network_mb_per_day,
                "out_of_session_access": bp.out_of_session_access
            })
            
    peer_baselines = {}
    for dept, profiles in dept_map.items():
        if not profiles:
            continue
        df = pd.DataFrame(profiles)
        peer_baselines[dept] = {
            "avg_login_hour": round(float(df["mean_login_hour"].median()), 2),
            "avg_files_per_day": round(float(df["files_per_day"].median()), 2),
            "avg_usb_per_day": round(float(df["usb_per_day"].median()), 2),
            "avg_emails_per_day": round(float(df["emails_per_day"].median()), 2),
            "avg_network_mb_per_day": round(float(df["network_mb_per_day"].median()), 2),
            "avg_out_of_session": round(float(df["out_of_session_access"].median()), 2),
            "employee_count": len(profiles)
        }
    return peer_baselines

def compute_employee_peer_comparison(emp: Employee, peer_baselines: Dict[str, Dict[str, float]]) -> Dict[str, Any]:
    """Compares employee's metrics against their departmental peers"""
    bp = emp.behavioral_profile
    if not bp:
        return {}
        
    dept_base = peer_baselines.get(emp.department, {
        "avg_login_hour": 9.0,
        "avg_files_per_day": 12.0,
        "avg_usb_per_day": 0.2,
        "avg_emails_per_day": 15.0,
        "avg_network_mb_per_day": 100.0,
        "avg_out_of_session": 0.0
    })
    
    comparisons = [
        {
            "metric": "Daily File Access Volume",
            "employee_val": round(bp.files_per_day, 1),
            "peer_median": dept_base["avg_files_per_day"],
            "unit": "files/day",
            "deviation_pct": round(((bp.files_per_day - dept_base["avg_files_per_day"]) / max(1.0, dept_base["avg_files_per_day"])) * 100, 1)
        },
        {
            "metric": "USB Attachment Rate",
            "employee_val": round(bp.usb_per_day, 2),
            "peer_median": dept_base["avg_usb_per_day"],
            "unit": "plugs/day",
            "deviation_pct": round(((bp.usb_per_day - dept_base["avg_usb_per_day"]) / max(0.1, dept_base["avg_usb_per_day"])) * 100, 1)
        },
        {
            "metric": "Out-of-Session Access Events",
            "employee_val": bp.out_of_session_access,
            "peer_median": dept_base["avg_out_of_session"],
            "unit": "events",
            "deviation_pct": round((bp.out_of_session_access - dept_base["avg_out_of_session"]) * 100, 1)
        },
        {
            "metric": "Network Egress Volume",
            "employee_val": round(bp.network_mb_per_day, 1),
            "peer_median": dept_base["avg_network_mb_per_day"],
            "unit": "MB/day",
            "deviation_pct": round(((bp.network_mb_per_day - dept_base["avg_network_mb_per_day"]) / max(10.0, dept_base["avg_network_mb_per_day"])) * 100, 1)
        },
        {
            "metric": "Daily Email Activity",
            "employee_val": round(bp.emails_per_day, 1),
            "peer_median": dept_base["avg_emails_per_day"],
            "unit": "emails/day",
            "deviation_pct": round(((bp.emails_per_day - dept_base["avg_emails_per_day"]) / max(1.0, dept_base["avg_emails_per_day"])) * 100, 1)
        }
    ]
    
    return {
        "employee_id": emp.employee_id,
        "name": emp.name,
        "department": emp.department,
        "comparisons": comparisons
    }
