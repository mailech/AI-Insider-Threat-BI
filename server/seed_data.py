# Seed data used to populate the SQLite database on first run.
# Same underlying dataset the earlier frontend-only version used, ported here
# so the real backend is the single source of truth now.

NAMED_SEED = [
    {"id": "EMP-1042", "name": "Ravi Menon", "email": "ravi@company.com", "dept": "Engineering",
     "role": "Senior Software Engineer", "score": 91, "activity": "184 files downloaded", "log_source": "file.csv"},
    {"id": "EMP-0871", "name": "Sneha Krishnan", "email": "sneha@company.com", "dept": "Finance",
     "role": "Financial Analyst", "score": 68, "activity": "New device login", "log_source": "logon.csv"},
    {"id": "EMP-0318", "name": "Arjun Joseph", "email": "arjun@company.com", "dept": "Sales",
     "role": "Account Executive", "score": 84, "activity": "Restricted folder access", "log_source": "http.csv"},
    {"id": "EMP-1129", "name": "Priya Nair", "email": "priya@company.com", "dept": "HR",
     "role": "HR Specialist", "score": 18, "activity": "Normal application use", "log_source": "device.csv"},
    {"id": "EMP-0764", "name": "Dev Varma", "email": "dev@company.com", "dept": "Engineering",
     "role": "Developer", "score": 57, "activity": "VPN login", "log_source": "email.csv"},
]

_FIRST_NAMES = ["Aditi","Rahul","Kavya","Vikram","Ananya","Rohan","Meera","Karan","Divya","Suresh","Neha","Amit",
                "Pooja","Sanjay","Ritu","Manoj","Anjali","Nikhil","Swati","Rajesh","Deepa","Vivek","Kiran","Shreya",
                "Aakash","Ishita","Varun","Nisha","Harish","Rekha","Gaurav","Sunita","Pranav","Lakshmi","Sameer",
                "Anita","Vishal","Radha","Naveen","Ajay","Bhavna","Yash","Tanvi","Ramesh","Priyanka","Farhan","Zara",
                "Rohit","Simran","Mohit"]
_LAST_NAMES = ["Reddy","Sharma","Gupta","Rao","Patel","Kumar","Singh","Nayar","Pillai","Chowdhury","Bose","Das",
               "Verma","Mehta","Kapoor","Malhotra","Chatterjee","Bhat","Desai","Joshi","Shetty","Agarwal","Bansal",
               "Trivedi","Iyer","Menon","Krishnan","Nair","Varma","Sinha"]
_ROLES_BY_DEPT = {
    "Engineering": ["Software Engineer", "DevOps Engineer", "QA Engineer", "Engineering Manager"],
    "Finance": ["Accountant", "Finance Manager", "Payroll Specialist"],
    "Sales": ["Sales Manager", "Business Development Rep", "Sales Ops Analyst"],
    "HR": ["Recruiter", "HR Manager", "People Ops Analyst"],
    "Operations": ["Operations Analyst", "Ops Manager", "Logistics Coordinator"],
    "Marketing": ["Marketing Specialist", "Content Strategist", "Marketing Manager"],
    "Legal": ["Legal Counsel", "Compliance Officer", "Paralegal"],
    "IT Support": ["IT Support Engineer", "System Administrator", "Helpdesk Analyst"],
    "Procurement": ["Procurement Analyst", "Vendor Manager"],
    "Customer Success": ["Customer Success Manager", "Support Specialist"],
}
_LOG_SOURCE_HIGH = ["file.csv", "http.csv"]
_ACTIVITY_HIGH = ["Mass file download detected", "Unusual data transfer volume", "Repeated failed login then success"]
_LOG_SOURCE_MED = ["logon.csv", "device.csv"]
_ACTIVITY_MED = ["After-hours login", "USB device connected", "VPN session from new location"]
_LOG_SOURCE_LOW = ["email.csv", "device.csv", "http.csv"]
_ACTIVITY_LOW = ["Normal application use", "Routine email activity", "Standard browsing pattern"]


def generate_employees(count=100):
    """Deterministic synthetic employees spread across departments with a realistic risk mix."""
    depts = list(_ROLES_BY_DEPT.keys())
    out = []
    for i in range(count):
        fn = _FIRST_NAMES[i % len(_FIRST_NAMES)]
        ln = _LAST_NAMES[(i * 7 + 3) % len(_LAST_NAMES)]
        dept = depts[i % len(depts)]
        roles = _ROLES_BY_DEPT[dept]
        role = roles[i % len(roles)]
        roll = (i * 37) % 100
        if roll < 6:
            score = 80 + ((i * 13) % 18)
            activity = _ACTIVITY_HIGH[i % 3]
            log_source = _LOG_SOURCE_HIGH[i % 2]
        elif roll < 24:
            score = 50 + ((i * 11) % 30)
            activity = _ACTIVITY_MED[i % 3]
            log_source = _LOG_SOURCE_MED[i % 2]
        else:
            score = 5 + ((i * 5) % 44)
            activity = _ACTIVITY_LOW[i % 3]
            log_source = _LOG_SOURCE_LOW[i % 3]
        out.append({
            "id": f"EMP-{2000 + i}",
            "name": f"{fn} {ln}",
            "email": f"{fn}.{ln}{i}".lower() + "@company.com",
            "dept": dept, "role": role, "score": score, "activity": activity, "log_source": log_source,
        })
    return out


ALERTS_SEED = [
    {"id": "INC-2048", "title": "Mass file download outside baseline", "employee": "Ravi Menon",
     "employee_id": "EMP-1042", "severity": "Critical",
     "desc": "184 files downloaded in 11 minutes - 8.7x above baseline.",
     "risk_score": 91, "confidence": 94.2, "assessment": "Potential data exfiltration",
     "assessment_detail": "The sequence is 8.7x above Ravi Menon's historical file-access baseline.",
     "timeline": [["02:14 AM", "Unusual login"], ["02:18 AM", "Restricted folder access"],
                  ["02:23 AM", "184 files downloaded"], ["02:25 AM", "External connection"],
                  ["Model", "Recommended human investigation"]]},
    {"id": "INC-2049", "title": "After-hours authentication anomaly", "employee": "Sneha Krishnan",
     "employee_id": "EMP-0871", "severity": "High",
     "desc": "New device detected outside the established login pattern.",
     "risk_score": 68, "confidence": 81.5, "assessment": "Possible credential compromise",
     "assessment_detail": "Login originated from a device and location never seen before for this account.",
     "timeline": [["11:42 PM", "Login from unrecognized device"], ["11:43 PM", "New IP address, different city"],
                  ["11:45 PM", "MFA challenge passed"], ["11:46 PM", "Session began - Finance systems accessed"],
                  ["Model", "Recommended password reset and review"]]},
    {"id": "INC-2050", "title": "Restricted folder access", "employee": "Arjun Joseph",
     "employee_id": "EMP-0318", "severity": "High",
     "desc": "Accessed Finance/Payroll outside normal role scope.",
     "risk_score": 84, "confidence": 88.0, "assessment": "Unauthorized access attempt",
     "assessment_detail": "This employee's role (Account Executive) has no business need for Finance/Payroll systems.",
     "timeline": [["09:12 AM", "Standard login"], ["09:20 AM", "Navigated to Finance/Payroll folder"],
                  ["09:21 AM", "Opened 3 salary records"], ["09:24 AM", "Access denied on 4th record - escalated"],
                  ["Model", "Recommended access review with manager"]]},
    {"id": "INC-2051", "title": "USB activity increased", "employee": "Priya Nair",
     "employee_id": "EMP-1129", "severity": "Medium",
     "desc": "Removable-media activity is 3.2x above baseline.",
     "risk_score": 18, "confidence": 52.0, "assessment": "Likely benign, low confidence",
     "assessment_detail": "Slight increase in USB usage, but well within normal variance for this role.",
     "timeline": [["02:00 PM", "USB device connected"], ["02:05 PM", "Files copied to device"],
                  ["02:10 PM", "USB safely ejected"], ["Model", "No action needed - monitor only"]]},
]

NOTIF_SEED = [
    {"title": "Mass file download outside baseline", "desc": "Ravi Menon - 184 files downloaded in 11 minutes.", "time": "2 min ago"},
    {"title": "After-hours authentication anomaly", "desc": "Sneha Krishnan logged in from a new device.", "time": "18 min ago"},
    {"title": "Restricted folder access", "desc": "Arjun Joseph accessed the Finance/Payroll folder.", "time": "41 min ago"},
    {"title": "Weekly report ready", "desc": "Your weekly threat summary has been generated.", "time": "1 hr ago"},
]
