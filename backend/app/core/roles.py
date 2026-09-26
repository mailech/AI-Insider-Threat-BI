from enum import Enum
from typing import List, Dict


class UserRole(str, Enum):
    SECURITY_ANALYST = "Security Analyst"
    SOC_ENGINEER = "SOC Engineer"
    SECURITY_MANAGER = "Security Manager"
    ADMINISTRATOR = "Administrator"


class Permission(str, Enum):
    VIEW_DASHBOARD = "view:dashboard"
    VIEW_EMPLOYEES = "view:employees"
    VIEW_ACTIVITIES = "view:activities"
    VIEW_ANOMALIES = "view:anomalies"
    VIEW_ALERTS = "view:alerts"
    MANAGE_ALERTS = "manage:alerts"
    VIEW_INCIDENTS = "view:incidents"
    MANAGE_INCIDENTS = "manage:incidents"
    ASSIGN_INCIDENTS = "assign:incidents"
    VIEW_ANALYTICS = "view:analytics"
    TRIGGER_ML_TRAIN = "trigger:ml_train"
    EXPORT_DATA = "export:data"
    MANAGE_USERS = "manage:users"
    VIEW_AUDIT_LOGS = "view:audit_logs"
    SYSTEM_CONFIG = "system:config"


ROLE_PERMISSIONS: Dict[UserRole, List[Permission]] = {
    UserRole.SECURITY_ANALYST: [
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_EMPLOYEES,
        Permission.VIEW_ACTIVITIES,
        Permission.VIEW_ANOMALIES,
        Permission.VIEW_ALERTS,
        Permission.MANAGE_ALERTS,
        Permission.VIEW_INCIDENTS,
        Permission.MANAGE_INCIDENTS,
        Permission.VIEW_ANALYTICS,
    ],
    UserRole.SOC_ENGINEER: [
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_EMPLOYEES,
        Permission.VIEW_ACTIVITIES,
        Permission.VIEW_ANOMALIES,
        Permission.VIEW_ALERTS,
        Permission.MANAGE_ALERTS,
        Permission.VIEW_INCIDENTS,
        Permission.MANAGE_INCIDENTS,
        Permission.VIEW_ANALYTICS,
        Permission.TRIGGER_ML_TRAIN,
        Permission.VIEW_AUDIT_LOGS,
    ],
    UserRole.SECURITY_MANAGER: [
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_EMPLOYEES,
        Permission.VIEW_ACTIVITIES,
        Permission.VIEW_ANOMALIES,
        Permission.VIEW_ALERTS,
        Permission.MANAGE_ALERTS,
        Permission.VIEW_INCIDENTS,
        Permission.MANAGE_INCIDENTS,
        Permission.ASSIGN_INCIDENTS,
        Permission.VIEW_ANALYTICS,
        Permission.TRIGGER_ML_TRAIN,
        Permission.EXPORT_DATA,
        Permission.VIEW_AUDIT_LOGS,
    ],
    UserRole.ADMINISTRATOR: [
        p for p in Permission
    ]
}


def has_permission(role: str, permission: Permission) -> bool:
    try:
        user_role = UserRole(role)
        return permission in ROLE_PERMISSIONS.get(user_role, [])
    except ValueError:
        return False
