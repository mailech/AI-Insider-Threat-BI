import streamlit as st
import pandas as pd
import plotly.express as px

# -------------------------------------------------
# PAGE CONFIGURATION
# -------------------------------------------------
st.set_page_config(
    page_title="Insider Threat Behavioral Intelligence",
    page_icon="🛡️",
    layout="wide"
)

# -------------------------------------------------
# TITLE
# -------------------------------------------------
st.title("🛡️ Insider Threat Behavioral Intelligence System")
st.write("AI-based dashboard for detecting and analyzing insider threats.")

# -------------------------------------------------
# LOAD DATA
# -------------------------------------------------
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
REPORT_FILE = BASE_DIR / "outputs" / "final_insider_threat_report.csv"

try:
    df = pd.read_csv(REPORT_FILE)
except FileNotFoundError:
    st.error(f"File not found: {REPORT_FILE}")
    st.stop()

# -------------------------------------------------
# BASIC DATA CLEANING
# -------------------------------------------------
df.columns = df.columns.str.strip()

# Show columns for debugging if needed
# st.write(df.columns.tolist())

# -------------------------------------------------
# TOTAL USERS
# -------------------------------------------------
# The final report contains only anomalous users.
# Therefore, total users analyzed = 1000.

TOTAL_USERS = 1000
ANOMALOUS_USERS = len(df)

# -------------------------------------------------
# RISK COUNTS
# -------------------------------------------------
if "risk_level" in df.columns:
    risk_counts = df["risk_level"].value_counts()

    HIGH_RISK = int(risk_counts.get("High", 0))
    MEDIUM_RISK = int(risk_counts.get("Medium", 0))
    LOW_RISK = int(risk_counts.get("Low", 0))

else:
    HIGH_RISK = 17
    MEDIUM_RISK = 33
    LOW_RISK = 0

# -------------------------------------------------
# DASHBOARD METRICS
# -------------------------------------------------
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(
        "👥 Total Users Analyzed",
        TOTAL_USERS
    )

with col2:
    st.metric(
        "🚨 Anomalous Users",
        ANOMALOUS_USERS
    )

with col3:
    st.metric(
        "🔴 High Risk Users",
        HIGH_RISK
    )

with col4:
    st.metric(
        "🟡 Medium Risk Users",
        MEDIUM_RISK
    )

st.divider()

# -------------------------------------------------
# RISK DISTRIBUTION
# -------------------------------------------------
st.subheader("📊 Risk Distribution")

risk_data = pd.DataFrame({
    "Risk Level": ["High", "Medium"],
    "Users": [HIGH_RISK, MEDIUM_RISK]
})

fig = px.bar(
    risk_data,
    x="Risk Level",
    y="Users",
    text="Users",
    title="Risk Level Distribution"
)

fig.update_traces(
    textposition="outside"
)

st.plotly_chart(
    fig,
    use_container_width=True
)

# -------------------------------------------------
# TOP HIGH-RISK USERS
# -------------------------------------------------
st.subheader("🚨 Top High-Risk Users")

if "risk_level" in df.columns:

    high_risk_df = df[
        df["risk_level"].astype(str).str.lower() == "high"
    ].copy()

    # Try to identify a risk score column
    possible_score_columns = [
        "risk_score",
        "final_risk_score",
        "Risk Score",
        "score"
    ]

    score_column = None

    for column in possible_score_columns:
        if column in high_risk_df.columns:
            score_column = column
            break

    if score_column:
        high_risk_df = high_risk_df.sort_values(
            by=score_column,
            ascending=False
        )

    st.dataframe(
        high_risk_df.head(10),
        use_container_width=True,
        hide_index=True
    )

else:
    st.info("Risk level column not found in the report.")

# -------------------------------------------------
# ALL ANOMALOUS USERS
# -------------------------------------------------
st.subheader("🔍 Anomalous User Details")

st.dataframe(
    df,
    use_container_width=True,
    hide_index=True
)

# -------------------------------------------------
# USER SEARCH
# -------------------------------------------------
st.subheader("👤 Search User")

# Try to find a user ID column
possible_user_columns = [
    "user",
    "user_id",
    "User",
    "User ID",
    "userid"
]

user_column = None

for column in possible_user_columns:
    if column in df.columns:
        user_column = column
        break

if user_column:

    selected_user = st.selectbox(
        "Select a user",
        df[user_column].astype(str).unique()
    )

    selected_data = df[
        df[user_column].astype(str) == selected_user
    ]

    st.write("### User Information")
    st.dataframe(
        selected_data,
        use_container_width=True,
        hide_index=True
    )

else:
    st.info("User ID column not found.")


# -------------------------------------------------
# THREAT INVESTIGATION
# -------------------------------------------------
st.subheader("🔎 Threat Investigation")

st.write(
    "Select an anomalous user to investigate their behavioral risk indicators."
)

investigation_user = st.selectbox(
    "Select User for Investigation",
    df["user"].astype(str).unique(),
    key="investigation_user"
)

investigation_data = df[
    df["user"].astype(str) == investigation_user
].iloc[0]

# Risk information
st.write("### 🚨 Risk Summary")

risk_col1, risk_col2, risk_col3 = st.columns(3)

with risk_col1:
    st.metric(
        "Risk Score",
        f"{investigation_data['risk_score']:.2f}"
    )

with risk_col2:
    st.metric(
        "Risk Level",
        investigation_data["risk_level"]
    )

with risk_col3:
    st.metric(
        "Anomaly Score",
        f"{investigation_data['anomaly_score']:.4f}"
    )

# Behavioral activity
st.write("### 📊 Behavioral Activity")

behavior_data = pd.DataFrame({
    "Activity": [
        "Login Count",
        "After-hours Logins",
        "Weekend Logins",
        "USB Connections",
        "After-hours USB",
        "File Activity",
        "After-hours Files",
        "Email Activity",
        "After-hours Emails",
        "Web Activity",
        "After-hours Web",
        "Unique Computers"
    ],
    "Value": [
        investigation_data["login_count"],
        investigation_data["after_hours_logins"],
        investigation_data["weekend_logins"],
        investigation_data["usb_connections"],
        investigation_data["after_hours_usb"],
        investigation_data["file_activity"],
        investigation_data["after_hours_files"],
        investigation_data["email_count"],
        investigation_data["after_hours_emails"],
        investigation_data["web_activity"],
        investigation_data["after_hours_web"],
        investigation_data["unique_computers"]
    ]
})

st.dataframe(
    behavior_data,
    use_container_width=True,
    hide_index=True
)

# Investigation explanation
st.write("### 🧠 Behavioral Investigation")

st.warning(
    investigation_data["explanation"]
)


# -------------------------------------------------
# UEBA BEHAVIORAL ANALYTICS
# -------------------------------------------------
st.write("### 📈 UEBA Behavioral Analytics")

ueba_data = pd.DataFrame({
    "Activity": [
        "Logins",
        "USB",
        "Files",
        "Emails",
        "Web"
    ],
    "Activity Count": [
        investigation_data["login_count"],
        investigation_data["usb_connections"],
        investigation_data["file_activity"],
        investigation_data["email_count"],
        investigation_data["web_activity"]
    ]
})

fig_ueba = px.bar(
    ueba_data,
    x="Activity",
    y="Activity Count",
    text="Activity Count",
    title=f"Behavioral Activity Profile - {investigation_user}"
)

fig_ueba.update_traces(
    textposition="outside"
)

st.plotly_chart(
    fig_ueba,
    use_container_width=True
)

# -------------------------------------------------
# RISK ANALYTICS
# -------------------------------------------------
st.write("### 📊 Risk Analytics")

# Risk score distribution
fig_risk = px.histogram(
    df,
    x="risk_score",
    nbins=10,
    title="Risk Score Distribution",
    labels={
        "risk_score": "Risk Score",
        "count": "Number of Users"
    }
)

st.plotly_chart(
    fig_risk,
    use_container_width=True
)

# Risk level summary
st.write("### 🎯 Risk Level Summary")

risk_summary = (
    df["risk_level"]
    .value_counts()
    .reset_index()
)

risk_summary.columns = ["Risk Level", "Users"]

fig_summary = px.pie(
    risk_summary,
    names="Risk Level",
    values="Users",
    title="Anomalous Users by Risk Level"
)

st.plotly_chart(
    fig_summary,
    use_container_width=True
)

# -------------------------------------------------
# SECURITY ANALYST PRIORITY VIEW
# -------------------------------------------------
st.write("### 🚨 Security Analyst Priority View")

priority_columns = [
    "user",
    "risk_score",
    "risk_level",
    "anomaly_score",
    "explanation"
]

priority_df = df[priority_columns].copy()

priority_df = priority_df.sort_values(
    by="risk_score",
    ascending=False
)

st.dataframe(
    priority_df,
    use_container_width=True,
    hide_index=True
) 

# -------------------------------------------------
# FOOTER
# -------------------------------------------------
st.divider()

st.caption(
    "AI Insider Threat Behavioral Intelligence System | "
    "Machine Learning + Anomaly Detection"
)