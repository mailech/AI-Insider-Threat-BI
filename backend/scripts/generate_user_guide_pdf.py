"""
AEGIS Application User Guide PDF Generator
Generates a multi-page PDF document explaining every option on every page.
Uses only Python standard library (no external dependencies).
"""
import struct
import datetime
import os

def make_pdf_stream(text_lines, font_size=9, line_height=12, margin_left=50, margin_top=740, page_width=612, page_height=792, margin_bottom=50):
    """Build a valid multi-page PDF 1.4 binary from a list of text lines."""
    
    # Split lines into pages
    pages_text = []
    current_page = []
    y = margin_top
    for line in text_lines:
        if y < margin_bottom:
            pages_text.append(current_page)
            current_page = []
            y = margin_top
        current_page.append((line, y))
        y -= line_height
    if current_page:
        pages_text.append(current_page)

    num_pages = len(pages_text)
    
    # Build PDF objects
    objects = []
    obj_offsets = []
    
    def add_obj(data):
        objects.append(data)
    
    # Object 1: Catalog
    add_obj(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    
    # Object 2: Pages (will be updated later)
    pages_kids = " ".join([f"{3 + i*2} 0 R" for i in range(num_pages)])
    pages_obj = f"2 0 obj\n<< /Type /Pages /Kids [{pages_kids}] /Count {num_pages} >>\nendobj\n"
    add_obj(pages_obj.encode("latin1"))
    
    # Font objects
    # Object for each page: Page + Contents
    next_obj_id = 3
    font_obj_id = 3 + num_pages * 2  # After all page+content pairs
    
    for page_idx in range(num_pages):
        page_obj_id = next_obj_id
        content_obj_id = next_obj_id + 1
        
        # Build content stream
        text_ops = []
        text_ops.append(f"BT")
        for line_text, y_pos in pages_text[page_idx]:
            safe = line_text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            # Detect headings (lines starting with specific markers)
            if line_text.startswith("# ") or line_text.startswith("## ") or line_text.startswith("### "):
                clean = safe.lstrip("#").strip()
                fs = 14 if line_text.startswith("# ") else 11 if line_text.startswith("## ") else 10
                text_ops.append(f"/F2 {fs} Tf")
                text_ops.append(f"0.0 0.55 0.75 rg")
                text_ops.append(f"1 0 0 1 {margin_left} {y_pos} Tm")
                text_ops.append(f"({clean}) Tj")
                text_ops.append(f"/F1 {font_size} Tf")
                text_ops.append(f"0.15 0.15 0.15 rg")
            elif line_text.startswith("---"):
                # Draw a horizontal line
                text_ops.append(f"ET")
                text_ops.append(f"0.75 0.75 0.75 RG")
                text_ops.append(f"0.5 w")
                text_ops.append(f"{margin_left} {y_pos} m {page_width - margin_left} {y_pos} l S")
                text_ops.append(f"BT")
                text_ops.append(f"/F1 {font_size} Tf")
                text_ops.append(f"0.15 0.15 0.15 rg")
            elif line_text.startswith("| "):
                # Table row
                text_ops.append(f"/F1 8 Tf")
                text_ops.append(f"0.2 0.2 0.3 rg")
                text_ops.append(f"1 0 0 1 {margin_left} {y_pos} Tm")
                text_ops.append(f"({safe}) Tj")
                text_ops.append(f"/F1 {font_size} Tf")
                text_ops.append(f"0.15 0.15 0.15 rg")
            elif line_text.startswith("- **") or line_text.startswith("  - **"):
                text_ops.append(f"/F2 {font_size} Tf")
                text_ops.append(f"0.1 0.1 0.1 rg")
                indent = margin_left + 10 if line_text.startswith("  ") else margin_left + 5
                text_ops.append(f"1 0 0 1 {indent} {y_pos} Tm")
                bullet_text = safe.lstrip(" -")
                text_ops.append(f"(\\267 {bullet_text}) Tj")
                text_ops.append(f"/F1 {font_size} Tf")
                text_ops.append(f"0.15 0.15 0.15 rg")
            elif line_text.startswith("*"):
                text_ops.append(f"/F1 8 Tf")
                text_ops.append(f"0.4 0.4 0.4 rg")
                text_ops.append(f"1 0 0 1 {margin_left} {y_pos} Tm")
                text_ops.append(f"({safe}) Tj")
                text_ops.append(f"/F1 {font_size} Tf")
                text_ops.append(f"0.15 0.15 0.15 rg")
            else:
                text_ops.append(f"1 0 0 1 {margin_left} {y_pos} Tm")
                text_ops.append(f"({safe}) Tj")
        text_ops.append("ET")
        
        # Add page number footer
        text_ops.append("BT")
        text_ops.append(f"/F1 7 Tf")
        text_ops.append(f"0.5 0.5 0.5 rg")
        text_ops.append(f"1 0 0 1 280 25 Tm")
        text_ops.append(f"(Page {page_idx + 1} of {num_pages}) Tj")
        text_ops.append("ET")
        
        # Footer line
        text_ops.append(f"0.8 0.8 0.8 RG")
        text_ops.append(f"0.3 w")
        text_ops.append(f"50 35 m 562 35 l S")
        
        stream_data = "\n".join(text_ops)
        stream_bytes = stream_data.encode("latin1", errors="replace")
        stream_len = len(stream_bytes)
        
        # Page object
        page_data = f"{page_obj_id} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {page_width} {page_height}] /Resources << /Font << /F1 {font_obj_id} 0 R /F2 {font_obj_id + 1} 0 R >> >> /Contents {content_obj_id} 0 R >>\nendobj\n"
        add_obj(page_data.encode("latin1"))
        
        # Content stream object
        content_data = f"{content_obj_id} 0 obj\n<< /Length {stream_len} >>\nstream\n".encode("latin1") + stream_bytes + b"\nendstream\nendobj\n"
        add_obj(content_data)
        
        next_obj_id += 2
    
    # Font objects (Helvetica and Helvetica-Bold)
    add_obj(f"{font_obj_id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n".encode("latin1"))
    add_obj(f"{font_obj_id + 1} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n".encode("latin1"))
    
    total_objects = len(objects) + 1  # +1 for header
    
    # Build final PDF
    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    
    # Calculate offsets
    pos = len(header)
    xref_offsets = []
    for obj in objects:
        xref_offsets.append(pos)
        pos += len(obj)
    
    xref_start = pos
    
    # Cross-reference table
    xref = f"xref\n0 {total_objects}\n0000000000 65535 f \n"
    for offset in xref_offsets:
        xref += f"{offset:010d} 00000 n \n"
    
    trailer = f"trailer\n<< /Size {total_objects} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n"
    
    return header + b"".join(objects) + xref.encode("latin1") + trailer.encode("latin1")


def generate_user_guide_pdf():
    """Generate the complete AEGIS Application User Guide as a valid PDF."""
    
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    lines = [
        "# AEGIS Insider Threat Behavioral Intelligence System",
        "",
        "## Complete Application User Guide",
        "",
        f"Generated: {now}",
        "Version: 1.0.0",
        "",
        "---",
        "",
        "## Table of Contents",
        "",
        "  1. Left Sidebar (Navigation Panel)",
        "  2. Top Header Bar",
        "  3. Threat Queue (Security Analyst Dashboard)",
        "  4. SOC Radar (SOC Operations Dashboard)",
        "  5. Risk Posture (Security Manager Dashboard)",
        "  6. Admin Console (System Administration)",
        "  7. Employee Profiles (Identity Management)",
        "  8. Activity Logs (Activity Monitoring)",
        "  9. UEBA Analytics (Behavior Analytics)",
        "  10. Reports & Export (Report Download)",
        "  11. Auth Portal (Login & Registration)",
        "",
        "---",
        "",
        "",
        "## 1. Left Sidebar (Navigation Panel)",
        "",
        "The left sidebar is the main navigation panel. It stays fixed on",
        "the left side of the screen and lets you switch between pages.",
        "",
        "---",
        "",
        "### Threat Queue",
        "- **What it is:** Navigation button to the Security Analyst Dashboard.",
        "- **Used for:** Viewing and managing insider threat alerts.",
        "- **Why use it:** To review suspicious employee behavior and risk scores.",
        "- **What happens:** Opens the Insider Threat Queue with alerts and investigation tools.",
        "",
        "### SOC Radar",
        "- **What it is:** Navigation button to the SOC live monitoring page.",
        "- **Used for:** Watching real-time security events across the organization.",
        "- **Why use it:** To monitor live activity and track which departments have anomalies.",
        "- **What happens:** Opens real-time event streams and anomaly density charts.",
        "",
        "### Risk Posture",
        "- **What it is:** Navigation button to the executive risk dashboard.",
        "- **Used for:** Viewing the overall security health of the organization.",
        "- **Why use it:** To see risk scores, weekly trends, and compliance status.",
        "- **What happens:** Opens organizational risk gauge, trend charts, and compliance metrics.",
        "",
        "### Admin Console",
        "- **What it is:** Navigation button to the system administration page.",
        "- **Used for:** Managing users, permissions, and system settings.",
        "- **Why use it:** To control who can access what in the system.",
        "- **What happens:** Opens user role tables, system health metrics, and audit logs.",
        "",
        "### Employee Profiles",
        "- **What it is:** Navigation button to employee identity management.",
        "- **Used for:** Viewing, searching, and managing employee records.",
        "- **Why use it:** To look up employee details, devices, and access permissions.",
        "- **What happens:** Opens a searchable table of all monitored employees.",
        "",
        "### Activity Logs",
        "- **What it is:** Navigation button to the activity monitoring page.",
        "- **Used for:** Viewing detailed logs of all employee actions.",
        "- **Why use it:** To investigate what actions an employee took.",
        "- **What happens:** Opens a filterable table of timestamped employee activities.",
        "",
        "### UEBA Analytics",
        "- **What it is:** Navigation button to the behavior analytics page.",
        "- **Used for:** Comparing employee behavior against department baselines.",
        "- **Why use it:** To spot employees with unusual behavior patterns.",
        "- **What happens:** Opens peer group comparison charts and baseline deviation data.",
        "",
        "### Reports & Export",
        "- **What it is:** Button that opens the report download dialog.",
        "- **Used for:** Downloading security reports in PDF or CSV format.",
        "- **Why use it:** To generate reports for briefings, audits, or records.",
        "- **What happens:** Opens a popup to choose report type and download format.",
        "",
        "### Active Session Role (Dropdown)",
        "- **What it is:** A dropdown to switch between user roles.",
        "- **Used for:** Changing which dashboard view you see.",
        "- **Options:** Security Analyst, SOC Engineer, Security Manager, Administrator.",
        "- **What happens:** Switches your view to the dashboard for the selected role.",
        "",
        "### Logout Button",
        "- **What it is:** A red button at the bottom of the sidebar.",
        "- **Used for:** Signing out or switching to a different user account.",
        "- **What happens:** Opens the Authentication Portal modal.",
        "",
        "",
        "---",
        "",
        "## 2. Top Header Bar",
        "",
        "The top bar stays fixed at the top and provides search, status,",
        "and quick access to auth and reports.",
        "",
        "---",
        "",
        "### Search Bar",
        "- **What it is:** A text input field for searching.",
        "- **Used for:** Finding employees, alert IDs, or anomaly categories.",
        "- **Why use it:** To quickly locate specific alerts or employees.",
        "- **What happens:** The alert table filters results as you type.",
        "",
        "### FastAPI Live / Client Engine (Status Pill)",
        "- **What it is:** A green or amber badge showing backend connection status.",
        "- **Green (FastAPI Live):** Backend server is connected and providing live data.",
        "- **Amber (Client Engine):** Backend is offline, using built-in demo data.",
        "- **Note:** This is display-only and not clickable.",
        "",
        "### Auth Portal Button",
        "- **What it is:** A button labeled Auth Portal with a key icon.",
        "- **Used for:** Opening the login and registration dialog.",
        "- **What happens:** Opens the Auth Portal modal with login, register, and SSO options.",
        "",
        "### Report PDF/CSV Button",
        "- **What it is:** A button labeled Report PDF/CSV with a download icon.",
        "- **Used for:** Quick access to the report export dialog.",
        "- **What happens:** Opens the Export Intelligence Report modal.",
        "",
        "### Role Badge",
        "- **What it is:** A display badge showing your current role (e.g., Security Analyst).",
        "- **Note:** This is display-only. It updates when you change roles via the sidebar.",
        "",
        "",
        "---",
        "",
        "## 3. Threat Queue (Security Analyst Dashboard)",
        "",
        "The primary working page for Security Analysts to review and",
        "investigate insider threat alerts.",
        "",
        "---",
        "",
        "### Refresh Queue Button",
        "- **What it is:** A button to reload alert data from the server.",
        "- **Why use it:** To check for new alerts or see updated information.",
        "- **What happens:** Fetches fresh alerts and metrics from the backend API.",
        "",
        "### Export Report Button",
        "- **What it is:** A cyan button to open the report export dialog.",
        "- **Why use it:** To download threat data as PDF or CSV.",
        "- **What happens:** Opens the Export Intelligence Report modal.",
        "",
        "### KPI Cards (Top Summary Cards)",
        "",
        "- **Open Alerts:** Number of alerts waiting to be investigated.",
        "- **Critical Risk Users:** Number of employees with Critical severity.",
        "- **Mean Time to Detect:** Average time to detect a threat (e.g., 4.2 minutes).",
        "- **Investigations Active:** Number of cases currently being worked on.",
        "",
        "### Severity Filter Tabs",
        "- **All:** Show all alerts regardless of severity.",
        "- **Critical:** Show only most dangerous alerts (score 86-100).",
        "- **High:** Show high-risk alerts (score 61-85).",
        "- **Medium:** Show medium-risk alerts (score 31-60).",
        "- **Low:** Show low-risk alerts (score 0-30).",
        "",
        "### Alert Table Columns",
        "- **Severity:** Color-coded badge (Red=Critical, Amber=High, etc.).",
        "- **User:** Employee name and role/department.",
        "- **Risk Score:** Number 0-100 showing behavior risk level.",
        "- **Anomaly:** Description of the suspicious behavior detected.",
        "- **Detected:** How long ago the alert was triggered.",
        "- **Status:** Open, Investigating, or Resolved.",
        "- **Click a row:** Opens the Investigation Panel on the right.",
        "",
        "### Investigation Panel (Right Side)",
        "",
        "Appears when you click an alert. Shows full investigation details.",
        "",
        "- **Alert ID and Employee Info:** Identity of the flagged employee.",
        "- **Insider Risk Score:** Large number showing the calculated risk score.",
        "- **Score Breakdown:** Bar chart showing five risk categories:",
        "    Behavioral (35%), Privilege (25%), Data (20%),",
        "    Access (10%), Historical (10%).",
        "- **Activity Timeline:** Chronological list of suspicious actions.",
        "- **Escalate Button:** Send the alert to a higher authority.",
        "- **Resolve Button:** Mark the alert as resolved/closed.",
        "- **Dismiss Button (X):** Remove the alert from the current view.",
        "",
        "",
        "---",
        "",
        "## 4. SOC Radar (SOC Operations Dashboard)",
        "",
        "Designed for SOC Engineers to monitor real-time security events.",
        "",
        "---",
        "",
        "### DEFCON Threat Status Badge",
        "- **What it is:** Amber badge showing the current threat level.",
        "- **Example:** ELEVATED (LEVEL 3) means threat level is above normal.",
        "",
        "### KPI Stream Cards",
        "- **Daily Event Volume:** Total security events processed today.",
        "- **Flagged Anomalies:** Number of events flagged as suspicious.",
        "- **In-Flight Investigations:** Number of active investigations.",
        "- **Auto-Mitigations:** Percentage of threats handled automatically.",
        "",
        "### Event Stream Filter Tabs",
        "- **All:** Show every type of event.",
        "- **Login:** Show only login-related events.",
        "- **File:** Show only file access and download events.",
        "- **USB:** Show only USB device connection events.",
        "- **Privilege:** Show only privilege change events.",
        "",
        "### Real-Time Event Stream",
        "- A scrollable list of live security events showing:",
        "  Employee name, activity type, details, IP address,",
        "  device, timestamp, and risk impact score.",
        "- Red-bordered events are flagged anomalies.",
        "- Pulsing red dots indicate very high-impact events (80+).",
        "",
        "### Department Anomaly Density Panel",
        "- Shows colored bars for each department's risk level.",
        "- Red bars = critical risk, Amber = high, Green = low.",
        "",
        "### Threat Intelligence Feeds",
        "- External security alerts relevant to the organization.",
        "- Provides context from global threat databases.",
        "",
        "",
        "---",
        "",
        "## 5. Risk Posture (Security Manager Dashboard)",
        "",
        "High-level overview for managers and executives.",
        "",
        "---",
        "",
        "### Security Compliance Audit Badge",
        "- **What it is:** Green badge showing compliance pass percentage.",
        "",
        "### Org Risk Score Gauge",
        "- **What it is:** Circular gauge showing overall risk (0-100).",
        "- **Example:** 77.2 HIGH RISK means elevated organizational risk.",
        "",
        "### High Risk Departments Card",
        "- **What it shows:** How many departments exceed the risk threshold.",
        "- **Example:** 2 / 6 Total means 2 of 6 departments are high-risk.",
        "",
        "### Compliance Frameworks Card",
        "- Shows compliance status for three major frameworks:",
        "  ISO/IEC 27001, SOC 2 Type II, NIST SP 800-53.",
        "",
        "### 7-Day Risk Trend Chart",
        "- Bar chart showing daily risk scores over the past week.",
        "- Green = safe, Amber = elevated, Red = critical.",
        "",
        "### Departmental Risk Posture Chart",
        "- List of all departments with risk score progress bars.",
        "- Departments above 60.0 threshold are considered high risk.",
        "",
        "",
        "---",
        "",
        "## 6. Admin Console (System Administration)",
        "",
        "For administrators managing the platform itself.",
        "",
        "---",
        "",
        "### Admin KPI Cards",
        "- **Platform Provisioned Users:** Total user accounts.",
        "- **Active Concurrent Sessions:** Users currently logged in.",
        "- **Log Ingestion Rate:** Events processed per second (EPS).",
        "- **API Response P99:** Backend response time (e.g., 14.2ms).",
        "",
        "### RBAC Matrix (Role-Based Access Control)",
        "- Table showing users, roles, permissions, and status.",
        "- **+ Provision User:** Button to add a new user.",
        "",
        "### Risk Engine Formula Weights",
        "- Shows the five components of the risk scoring formula:",
        "  Behavioral 35%, Privilege 25%, Data 20%,",
        "  Access 10%, Historical 10%.",
        "",
        "### System Audit Trail",
        "- Log of all administrative actions taken on the platform.",
        "- Shows who did what and when for accountability.",
        "",
        "",
        "---",
        "",
        "## 7. Employee Profiles (Identity Management)",
        "",
        "View, search, filter, and manage all employee records.",
        "",
        "---",
        "",
        "### Sync Identities Button",
        "- **What it does:** Reloads employee data from the server.",
        "",
        "### + Onboard Employee Button",
        "- **What it does:** Opens a form to add a new employee.",
        "- **Form fields:** Name, ID, department, designation, manager,",
        "  device info, and access privileges.",
        "",
        "### Department Filter Buttons",
        "- Filter by: All, Finance, Engineering, Sales, HR, Legal, IT.",
        "",
        "### Search Bar",
        "- Search employees by name, ID, designation, or manager.",
        "",
        "### Employee Table Columns",
        "- **Employee ID & Name:** Unique ID and full name.",
        "- **Department & Designation:** Department and job title.",
        "- **Reporting Manager:** Who the employee reports to.",
        "- **Device Information:** Assigned computer hostname and IP.",
        "- **Access Privileges:** Number of granted permission scopes.",
        "- **Risk Level:** Current risk score and category.",
        "- **View Details:** Button to open full employee profile.",
        "",
        "",
        "---",
        "",
        "## 8. Activity Logs (Activity Monitoring)",
        "",
        "Detailed log of every employee action monitored by the system.",
        "",
        "---",
        "",
        "### Refresh Pipeline Button",
        "- **What it does:** Reloads activity data from the server.",
        "",
        "### Telemetry Filter Buttons",
        "- Filter by: All, Login, File Access, File Download,",
        "  Data Transfer, USB Device, Privilege Change, Remote Access.",
        "",
        "### Show Flagged Anomalies Only (Checkbox)",
        "- **When checked:** Shows only suspicious activities.",
        "- **When unchecked:** Shows all activities (normal and anomalies).",
        "",
        "### Search Filter",
        "- Search by employee name, event details, or IP address.",
        "",
        "### Activity Table Columns",
        "- **Timestamp:** Date and time of the activity.",
        "- **Employee:** Name and ID of the person.",
        "- **Activity Category:** Type of action (Login, File Access, etc.).",
        "- **Ingested Telemetry Event:** Detailed description of what happened.",
        "- **IP / Hostname:** Network address and device used.",
        "- **Risk Impact:** Score 0-100 (red = high risk).",
        "- **Anomaly Flag:** ANOMALY (red badge) or Normal.",
        "",
        "",
        "---",
        "",
        "## 9. UEBA Analytics (Behavior Analytics)",
        "",
        "Compares employee behavior against department peer baselines.",
        "",
        "---",
        "",
        "### Monitored Employee Profiles (Left Panel)",
        "- Click any employee to view their behavioral analysis.",
        "- Each employee shows their risk score badge.",
        "",
        "### Selected Employee Header Card",
        "- Shows employee ID, name, department, manager, and risk score.",
        "",
        "### Data Exfiltration vs Peer Baseline",
        "- **Blue bar:** Normal department average data usage.",
        "- **Red/Green bar:** The selected employee's actual data usage.",
        "- **Red warning:** Appears if employee exceeds 2x the baseline.",
        "",
        "### Provisioned Asset & Privilege Scopes",
        "- Lists all systems and tools the employee has access to.",
        "- More critical access = higher potential risk.",
        "",
        "",
        "---",
        "",
        "## 10. Reports & Export",
        "",
        "Popup dialog for downloading security intelligence reports.",
        "",
        "---",
        "",
        "### Report Specification Scope (Dropdown)",
        "- **Executive Threat Summary:** High-level overview for leadership.",
        "- **Behavioral Analytics Deep Dive:** Detailed behavior analysis.",
        "- **Incident & Investigation Audit:** Investigation status report.",
        "- **NIST Compliance Matrix:** Compliance framework status.",
        "",
        "### Target Export Format",
        "- **PDF:** Formatted document for printing and sharing.",
        "- **CSV:** Spreadsheet data for Excel or further analysis.",
        "",
        "### Download Button",
        "- Starts the download in your selected format.",
        "",
        "### Cancel Button",
        "- Closes the dialog without downloading.",
        "",
        "",
        "---",
        "",
        "## 11. Auth Portal (Login & Registration)",
        "",
        "Handles user authentication - login, register, and SSO.",
        "",
        "---",
        "",
        "### JWT Login Tab",
        "- Enter username and password to sign in.",
        "- Available usernames: analyst, soc_eng, manager, admin.",
        "- **Sign In with JWT:** Authenticates and logs you in.",
        "",
        "### User Registration Tab",
        "- Create a new user account with:",
        "  Username, Full Name, Email, Role, Department, Password.",
        "- **Register User & Issue JWT:** Creates account and logs in.",
        "",
        "### OAuth2 SSO Buttons",
        "- **Google:** Sign in with Google corporate account.",
        "- **Azure AD:** Sign in with Microsoft Azure AD.",
        "- **Okta:** Sign in with Okta identity provider.",
        "",
        "### Close Button (X)",
        "- Closes the auth modal without changes.",
        "",
        "",
        "---",
        "",
        "## Quick Reference Summary",
        "",
        "| Page             | Who Uses It        | Main Purpose                          |",
        "|------------------|--------------------|---------------------------------------|",
        "| Threat Queue     | Security Analyst   | Review insider threat alerts          |",
        "| SOC Radar        | SOC Engineer       | Monitor real-time security events     |",
        "| Risk Posture     | Security Manager   | View org-wide risk and compliance     |",
        "| Admin Console    | Administrator      | Manage users and system settings      |",
        "| Employee Profile | All Roles          | View employee identity information    |",
        "| Activity Logs    | All Roles          | Review employee activity records      |",
        "| UEBA Analytics   | All Roles          | Compare behavior vs peer baselines    |",
        "| Reports & Export | All Roles          | Download reports (PDF/CSV)            |",
        "| Auth Portal      | All Roles          | Login, register, or use SSO           |",
        "",
        "",
        "---",
        "",
        "*AEGIS Insider Threat Behavioral Intelligence System v1.0.0*",
        "*Confidential Enterprise Security Documentation*",
    ]
    
    return make_pdf_stream(lines)


if __name__ == "__main__":
    output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "AEGIS_Application_User_Guide.pdf")
    pdf_data = generate_user_guide_pdf()
    with open(output_path, "wb") as f:
        f.write(pdf_data)
    print(f"PDF generated successfully: {output_path}")
    print(f"File size: {len(pdf_data):,} bytes")
