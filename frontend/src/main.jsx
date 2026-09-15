import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
const API = 'http://127.0.0.1:8000';
const nav = [
['dashboard','Dashboard','⌂'],
['employees','Employees','◉'],
['activities','Activities','↯'],
['anomalies','Anomalies','△'],
['risk','Risk Intelligence','◈'],
['alerts','Alerts','!'],
['investigations','Investigations','⌁'],
['analytics','UEBA Analytics','◎'],
['reports','Reports','▤']
];
const firstNames = [
'Aarav','Vivaan','Aditya','Arjun','Sai','Rohan','Karthik','Rahul',
'Vikram','Nikhil','Akash','Abhishek','Harsha','Tejas','Varun','Manish',
'Siddharth','Pranav','Ravi','Anirudh','Chaitanya','Surya','Vishal',
'Krishna','Sandeep','Tarun','Yash','Ritesh','Mohan','Naveen','Pooja',
'Ananya','Anusha','Deepika','Nandini','Keerthi','Sneha','Swathi',
'Divya','Kavya','Priya','Meghana','Shreya','Aishwarya','Bhavya',
'Lakshmi','Harini','Sowmya','Neha','Ishita'
];
const lastNames = [
'Kumar','Rao','Sharma','Reddy','Patel','Verma','Singh','Gupta',
'Iyer','Nair','Das','Mehta','Joshi','Kapoor','Malhotra','Agarwal',
'Mishra','Choudhary','Bhat','Naidu'
];
const departments = [
'Finance','Engineering','Human Resources','Sales','Marketing',
'IT Security','Operations','Legal','Research','Customer Support'
];
const designations = [
'Software Engineer','Senior Software Engineer','Data Analyst',
'Security Analyst','SOC Engineer','System Administrator','HR Executive',
'Finance Analyst','Product Manager','Network Engineer','Cloud Engineer',
'DevOps Engineer','Business Analyst','Sales Executive','Security Manager'
];
const activityTypes = [
'LOGIN',
'FILE_ACCESS',
'APP_USAGE',
'NETWORK_ACCESS',
'EMAIL_SENT',
'USB_CONNECTED',
'DOWNLOAD',
'UPLOAD',
'DATA_TRANSFER',
'PRIVILEGE_CHANGE',
'REMOTE_SESSION'
];
const resources = [
'Finance Portal','HR Portal','Git Repository','Customer Database',
'Payroll System','AWS Console','VPN Gateway','Email Server',
'SharePoint','Production Server','Security Console',
'Analytics Platform','CRM System','Document Vault','USB Storage'
];
const locations = [
'Hyderabad','Bengaluru','Chennai','Mumbai','Pune','Delhi','Kolkata'
];
const anomalyTypes = [
'Unusual Login Time',
'Abnormal Download Volume',
'Unauthorized Access Attempt',
'Excessive Data Transfer',
'Suspicious Device Usage',
'Privilege Misuse',
'Access Pattern Deviation'
];
/* =========================================================
DEMO DATA
\========================================================= */
function makeEmployees() {
return Array.from({ length: 100 }, (_, i) => {
const first = firstNames[i % firstNames.length];
const last =
lastNames[Math.floor(i / firstNames.length) % lastNames.length];

return {
  id: i + 1,
  employee_id: `EMP${String(i + 1).padStart(3, '0')}`,
  name: `${first} ${last}`,
  department: departments[i % departments.length],
  designation: designations[i % designations.length],
  manager: `Manager ${(i % 12) + 1}`,
  device: `LAP-${String(i + 1).padStart(3, '0')}`,
  location: locations[i % locations.length],
  privilege: i % 7 === 0 ? 'Privileged' : 'Normal',
  last_login: `${String(8 + (i % 4)).padStart(2, '0')}:${
    i % 2 === 0 ? '00' : '30'
  }`,
  email: `${first.toLowerCase()}.${last.toLowerCase()}${
    i + 1
  }@sentinel.local`
};

});
}
const DEMO_EMPLOYEES = makeEmployees();
function makeActivities(employees) {
let id = 1;
return employees.flatMap((e, ei) =>
Array.from({ length: 10 }, (_, j) => {
const type = activityTypes[(ei + j) % activityTypes.length];

  const bytes = ['DOWNLOAD', 'UPLOAD', 'DATA_TRANSFER'].includes(type)
    ? (1 + ((ei * 13 + j * 7) % 80)) * 1024 * 1024
    : 0;

  return {
    id: id++,
    employee_id: e.employee_id,
    employee_name: e.name,
    activity_type: type,
    resource: resources[(ei + j) % resources.length],
    source_ip: `10.20.${(ei % 20) + 1}.${(j % 200) + 10}`,
    bytes_transferred: bytes,
    success: !(ei % 17 === 0 && j === 7),
    privilege: e.privilege,
    timestamp: new Date(
      Date.now() - (ei * 10 + j) * 13 * 60000
    ).toISOString()
  };
})

);
}
function makeAnomalies(employees) {
return employees.slice(0, 30).map((e, i) => ({
id: i + 1,
employee_id: e.employee_id,
employee_name: e.name,
severity:
i < 7
? 'Critical'
: i < 16
? 'High'
: 'Medium',
category: anomalyTypes[i % anomalyTypes.length],
description:
i % 2 === 0
? 'Activity deviated from established behavioral baseline.'
: 'Behavioral pattern requires security analyst review.',
score: Number((82 + ((i * 3.7) % 17)).toFixed(1)),
status: i % 4 === 0 ? 'Resolved' : 'Open',
detected_at: new Date(
Date.now() - i * 2 * 3600000
).toISOString()
}));
}
function makeRisk(employees, anomalies) {
return employees.map((e, i) => {
const a = anomalies.find(
x => x.employee_id === e.employee_id
);

const score = a
  ? a.score
  : 8 + ((i * 7) % 48);

return {
  employee_id: e.employee_id,
  name: e.name,
  department: e.department,
  designation: e.designation,
  score: Number(score.toFixed(1)),
  category:
    score >= 80
      ? 'Critical Risk'
      : score >= 60
      ? 'High Risk'
      : score >= 35
      ? 'Medium Risk'
      : 'Low Risk',
  trend:
    i % 3 === 0
      ? 'Increasing'
      : i % 3 === 1
      ? 'Stable'
      : 'Improving'
};

});
}
function makeAlerts(anomalies) {
return anomalies.slice(0, 12).map((a, i) => ({
id: i + 1,
employee_id: a.employee_id,
title: a.category,
message: a.description,
severity: a.severity,
status:
i % 3 === 0
? 'Acknowledged'
: 'Open',
created_at: a.detected_at
}));
}
function makeInvestigations(employees) {
const cases = [
['Unusual Login Time', 'Low'],
['Abnormal Download Volume', 'Medium'],
['Unauthorized Access Attempt', 'Medium'],
['Excessive Data Transfer', 'High'],
['Suspicious Device Usage', 'High'],
['Privilege Misuse', 'Critical'],
['Access Pattern Deviation', 'High'],
['Multiple Failed Logins', 'Medium'],
['Sensitive File Access', 'High'],
['Remote Session Anomaly', 'Critical']
];
return cases.map((c, i) => ({
id: `INC-${String(i + 1).padStart(4, '0')}`,
title: c[0],
severity: c[1],
employee_id:
employees[(i * 7) % employees.length].employee_id,
status:
i % 4 === 0
? 'Investigating'
: 'Open',
created_at: new Date(
Date.now() - i * 4 * 3600000
).toISOString()
}));
}
/* =========================================================
APP
\========================================================= */
function App() {
const [token, setToken] = useState(
localStorage.getItem('sentinel_token') || ''
);
const [role, setRole] = useState(
localStorage.getItem('sentinel_role') ||
'Administrator'
);
const [page, setPage] = useState('dashboard');
const [data, setData] = useState({
summary: null,
employees: [],
activities: [],
anomalies: [],
risk: [],
alerts: [],
incidents: []
});
const [loading, setLoading] = useState(false);
const [toast, setToast] = useState('');
const [selectedEmployee, setSelectedEmployee] =
useState(null);
const [uebaEmployee, setUebaEmployee] =
useState(null);
const [layer, setLayer] =
useState(null);
const [selectedAnomaly, setSelectedAnomaly] =
useState(null);
const [selectedAlert, setSelectedAlert] =
useState(null);
const [selectedIncident, setSelectedIncident] =
useState(null);
const [employeeModal, setEmployeeModal] =
useState(false);
const [activityModal, setActivityModal] =
useState(false);
const [investigationModal, setInvestigationModal] =
useState(false);
const [anomalyModal, setAnomalyModal] =
useState(false);
const auth = async (path, opts = {}) => {
const res = await fetch(API + path, {
...opts,
headers: {
...(opts.headers || {}),
...(token
? { Authorization: `Bearer ${token}` }
: {})
}
});

if (!res.ok) {
  throw new Error(await res.text());
}

return res;

};
const load = async () => {
if (!token) return;

setLoading(true);

let backend = {
  employees: [],
  activities: [],
  anomalies: [],
  risk: [],
  alerts: [],
  incidents: [],
  summary: null
};

try {
  const paths = [
    '/api/dashboard/summary',
    '/api/employees',
    '/api/activities',
    '/api/anomalies',
    '/api/risk',
    '/api/alerts',
    '/api/incidents'
  ];

  const vals = await Promise.all(
    paths.map(p =>
      auth(p)
        .then(r => r.json())
        .catch(() => [])
    )
  );

  backend = {
    summary: vals[0],
    employees:
      Array.isArray(vals[1]) ? vals[1] : [],
    activities:
      Array.isArray(vals[2]) ? vals[2] : [],
    anomalies:
      Array.isArray(vals[3]) ? vals[3] : [],
    risk:
      Array.isArray(vals[4]) ? vals[4] : [],
    alerts:
      Array.isArray(vals[5]) ? vals[5] : [],
    incidents:
      Array.isArray(vals[6]) ? vals[6] : []
  };
} catch (e) {}

const savedEmployees = JSON.parse(
  localStorage.getItem(
    'sentinel_custom_employees'
  ) || '[]'
);

const employees = [
  ...DEMO_EMPLOYEES,
  ...savedEmployees.filter(
    x =>
      !DEMO_EMPLOYEES.some(
        d => d.employee_id === x.employee_id
      )
  )
];

const customActivities = JSON.parse(
  localStorage.getItem(
    'sentinel_custom_activities'
  ) || '[]'
);

const activities = [
  ...makeActivities(employees),
  ...customActivities
];

const anomalies = makeAnomalies(employees);

const risk = makeRisk(
  employees,
  anomalies
);

const alerts = makeAlerts(anomalies);

const customInvestigations = JSON.parse(
  localStorage.getItem(
    'sentinel_custom_investigations'
  ) || '[]'
);

const incidents = [
  ...makeInvestigations(employees),
  ...customInvestigations
];

setData({
  summary: {
    employees: employees.length,
    activities: activities.length,
    anomalies: anomalies.length,
    high_risk: risk.filter(
      x => x.score >= 60
    ).length
  },
  employees,
  activities,
  anomalies,
  risk,
  alerts,
  incidents
});

setLoading(false);

};
useEffect(() => {
load();
}, [token]);
useEffect(() => {
if (toast) {
const t = setTimeout(
() => setToast(''),
3000
);

  return () => clearTimeout(t);
}

}, [toast]);
if (!token) {
return (
<Login
onLogin={(t, r) => {
localStorage.setItem(
'sentinel_token',
t
);

      localStorage.setItem(
        'sentinel_role',
        r
      );

      setToken(t);
      setRole(r);
    }}
  />
);

}
const logout = () => {
localStorage.removeItem(
'sentinel_token'
);

localStorage.removeItem(
  'sentinel_role'
);

setToken('');

};
const go = id => setPage(id);
return (
<div className="app-shell">

  <aside className="sidebar">

    <div className="brand">
      <div className="brand-mark">
        S
      </div>

      <div>
        <b>SENTINEL</b>
        <span>
          THREAT INTELLIGENCE
        </span>
      </div>
    </div>

    <div className="side-label">
      OPERATIONS
    </div>

    {nav.map(
      ([id, label, icon]) => (
        <button
          key={id}
          className={
            'nav-btn ' +
            (page === id
              ? 'active'
              : '')
          }
          onClick={() =>
            go(id)
          }
        >
          <i>{icon}</i>
          <span>{label}</span>

          {id === 'alerts' &&
            data.alerts.filter(
              a =>
                a.status !==
                'Resolved'
            ).length > 0 && (
              <em>
                {
                  data.alerts.filter(
                    a =>
                      a.status !==
                      'Resolved'
                  ).length
                }
              </em>
            )}
        </button>
      )
    )}

    <div className="sidebar-bottom">

      <div className="system-card">
        <span className="pulse"></span>

        <div>
          <b>Platform online</b>
          <small>
            All engines operational
          </small>
        </div>
      </div>

      <button
        className="nav-btn"
        onClick={logout}
      >
        <i>↪</i>
        <span>Sign out</span>
      </button>

    </div>
  </aside>

  <main className="main">

    <header className="topbar">

      <div>
        <span className="crumb">
          SECURITY OPERATIONS /
        </span>

        <strong>
          {
            nav.find(
              x => x[0] === page
            )?.[1]
          }
        </strong>
      </div>

      <div className="top-actions">

        <span className="live">
          <span className="pulse"></span>
          LIVE MONITORING
        </span>

        <span className="role-chip">
          {role}
        </span>

        <div className="avatar">
          A
        </div>

      </div>

    </header>

    <div className="content">

      {loading && (
        <div className="loading">
          Synchronizing intelligence data…
        </div>
      )}

      {page === 'dashboard' && (
        <Dashboard
          d={data}
          onNav={go}
        />
      )}

      {page === 'employees' && (
        <Employees
          d={data}
          onProfile={
            setSelectedEmployee
          }
          onAdd={() =>
            setEmployeeModal(true)
          }
        />
      )}

      {page === 'activities' && (
        <Activities
          d={data}
          onAdd={() =>
            setActivityModal(true)
          }
        />
      )}

      {page === 'anomalies' && (
        <Anomalies
          d={data}
          onNav={go}
          onOpen={a => {
            setSelectedAnomaly(a);
            setAnomalyModal(true);
          }}
        />
      )}

      {page === 'risk' && (
        <Risk
          d={data}
          onRecalculate={() => {
            setToast(
              'Risk scores recalculated successfully'
            );
            load();
          }}
        />
      )}

      {page === 'alerts' && (
        <Alerts
          d={data}
          setData={setData}
          toast={setToast}
          onOpen={setSelectedAlert}
        />
      )}

      {page === 'investigations' && (
        <Investigations
          d={data}
          onCreate={() =>
            setInvestigationModal(
              true
            )
          }
          onOpen={
            setSelectedIncident
          }
        />
      )}

      {page === 'analytics' && (
        <Analytics
          d={data}
          onProfile={
            setUebaEmployee
          }
          onLayer={setLayer}
        />
      )}

      {page === 'reports' && (
        <Reports
          token={token}
          toast={setToast}
        />
      )}

    </div>

    {toast && (
      <div className="toast">
        {toast}
      </div>
    )}

  </main>

  {selectedEmployee && (
    <EmployeeModal
      employee={selectedEmployee}
      data={data}
      onClose={() =>
        setSelectedEmployee(null)
      }
      onOpenUEBA={() => {
        setUebaEmployee(
          selectedEmployee
        );

        setSelectedEmployee(null);
        setPage('analytics');
      }}
    />
  )}

  {uebaEmployee && (
    <UEBAProfileModal
      employee={uebaEmployee}
      data={data}
      onClose={() =>
        setUebaEmployee(null)
      }
      onLayer={setLayer}
    />
  )}

  {layer && (
    <LayerModal
      layer={layer}
      employee={
        uebaEmployee ||
        selectedEmployee ||
        data.employees[0]
      }
      data={data}
      onClose={() =>
        setLayer(null)
      }
    />
  )}

  {anomalyModal &&
    selectedAnomaly && (
      <AnomalyModal
        anomaly={
          selectedAnomaly
        }
        onClose={() => {
          setAnomalyModal(false);
          setSelectedAnomaly(null);
        }}
      />
    )}

  {selectedAlert && (
    <AlertModal
      alert={selectedAlert}
      onClose={() =>
        setSelectedAlert(null)
      }
    />
  )}

  {selectedIncident && (
    <IncidentModal
      incident={selectedIncident}
      onClose={() =>
        setSelectedIncident(null)
      }
    />
  )}

  {employeeModal && (
    <AddEmployeeModal
      onClose={() =>
        setEmployeeModal(false)
      }
      onSave={e => {
        const key =
          'sentinel_custom_employees';

        const saved =
          JSON.parse(
            localStorage.getItem(
              key
            ) || '[]'
          );

        const next = {
          ...e,
          id: Date.now(),
          employee_id:
            `EMP${String(
              100 +
                saved.length +
                1
            ).padStart(3, '0')}`
        };

        localStorage.setItem(
          key,
          JSON.stringify([
            ...saved,
            next
          ])
        );

        setEmployeeModal(false);

        setToast(
          'Employee added to Employee Intelligence'
        );

        load();
      }}
    />
  )}

  {activityModal && (
    <AddActivityModal
      employees={data.employees}
      onClose={() =>
        setActivityModal(false)
      }
      onSave={a => {
        const key =
          'sentinel_custom_activities';

        const saved =
          JSON.parse(
            localStorage.getItem(
              key
            ) || '[]'
          );

        localStorage.setItem(
          key,
          JSON.stringify([
            ...saved,
            {
              ...a,
              id: Date.now(),
              timestamp:
                new Date().toISOString()
            }
          ])
        );

        setActivityModal(false);

        setToast(
          'Activity added successfully'
        );

        load();
      }}
    />
  )}

  {investigationModal && (
    <CreateInvestigationModal
      employees={data.employees}
      onClose={() =>
        setInvestigationModal(
          false
        )
      }
      onSave={i => {
        const key =
          'sentinel_custom_investigations';

        const saved =
          JSON.parse(
            localStorage.getItem(
              key
            ) || '[]'
          );

        localStorage.setItem(
          key,
          JSON.stringify([
            ...saved,
            {
              ...i,
              id:
                `INC-${String(
                  11 +
                    saved.length
                ).padStart(
                  4,
                  '0'
                )}`,
              created_at:
                new Date().toISOString(),
              status: 'Open'
            }
          ])
        );

        setInvestigationModal(
          false
        );

        setToast(
          'Investigation created successfully'
        );

        load();
      }}
    />
  )}

</div>

);
}
/* =========================================================
LOGIN
\========================================================= */
function Login({ onLogin }) {
const [u, setU] =
useState('admin');
const [p, setP] =
useState('Admin@123');
const [busy, setBusy] =
useState(false);
const [err, setErr] =
useState('');
const submit = async e => {
e.preventDefault();
setBusy(true);
setErr('');
try {
const body = new URLSearchParams();

body.append('username', u.trim());
body.append('password', p);
body.append('scope', '');
body.append('client_id', '');
body.append('client_secret', '');

const r = await fetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: body.toString()
});

const text = await r.text();

let j = {};

try {
  j = JSON.parse(text);
} catch {
  j = {};
}

if (!r.ok) {
  const detail =
    j?.detail ||
    `Login failed (${r.status})`;

  throw new Error(detail);
}

if (!j.access_token) {
  throw new Error('Access token not received from server');
}

onLogin(
  j.access_token,
  j.role || 'Security Analyst'
);

} catch (x) {
console.error('SENTINEL LOGIN ERROR:', x);
setErr(x.message || 'Login failed');
} finally {
setBusy(false);
}
};
return (
<div className="login-page">

  <div className="login-grid"></div>

  <div className="login-card">

    <div className="brand login-brand">

      <div className="brand-mark">
        S
      </div>

      <div>
        <b>SENTINEL</b>
        <span>
          INSIDER THREAT BEHAVIORAL INTELLIGENCE
        </span>
      </div>

    </div>

    <div className="login-copy">

      <span className="eyebrow">
        SECURITY OPERATIONS CENTER
      </span>

      <h1>
        Detect. Understand.
        <br />
        <span>Respond.</span>
      </h1>

      <p>
        AI-assisted behavioral intelligence
        for identifying anomalous activity,
        insider risk and investigation priorities.
      </p>

    </div>

    <form onSubmit={submit}>

      <label>
        Operator ID
        <input
          value={u}
          onChange={e =>
            setU(e.target.value)
          }
        />
      </label>

      <label>
        Access key
        <input
          type="password"
          value={p}
          onChange={e =>
            setP(e.target.value)
          }
        />
      </label>

      {err && (
        <div className="error">
          {err}
        </div>
      )}

      <button
        className="primary full"
        disabled={busy}
      >
        {busy
          ? 'AUTHENTICATING…'
          : 'ENTER SENTINEL →'}
      </button>

    </form>

    <div className="login-foot">
      <span>
        JWT / OAuth2 protected
      </span>

      <span>
        v2.0 • Academic SOC Build
      </span>
    </div>

  </div>
</div>

);
}
/* =========================================================
COMMON COMPONENTS
\========================================================= */
const riskClass = s =>
s >= 80
? 'critical'
: s >= 60
? 'high'
: s >= 35
? 'medium'
: 'low';
const Badge = ({
children,
tone
}) => (
<span
className={
'badge ' +
(tone ||
riskClass(
typeof children ===
'number'
? children
: 0
))
}

>

{children}

  </span>
);
const Card = ({
label,
value,
sub,
icon,
tone,
onClick
}) => (
  <div
    className={
      'kpi ' +
      (onClick
        ? 'kpi-clickable'
        : '')
    }
    onClick={onClick}
    role={
      onClick
        ? 'button'
        : undefined
    }
    tabIndex={
      onClick
        ? 0
        : undefined
    }
    onKeyDown={e => {
      if (
        onClick &&
        (e.key ===
          'Enter' ||
          e.key === ' ')
      ) {
        e.preventDefault();
        onClick();
      }
    }}
  >
    <div
      className={
        'kpi-icon ' +
        (tone || '')
      }
    >
      {icon}
    </div>

<div>
  <span>{label}</span>
  <strong>{value}</strong>
  <small>{sub}</small>
</div>

{onClick && (
  <span className="kpi-arrow">
    →
  </span>
)}

  </div>
);
function PanelTitle({
title,
meta,
action,
onClick
}) {
return (
<div className="panel-title">

  <div>
    <span>{meta}</span>
    <h2>{title}</h2>
  </div>

  {action && (
    <button
      className="link-btn"
      onClick={onClick}
    >
      {action} →
    </button>
  )}

</div>

);
}
function PageTitle({
title,
text
}) {
return (
<div className="page-head simple">

  <div>
    <span className="eyebrow">
      SENTINEL INTELLIGENCE
    </span>

    <h1>{title}</h1>

    <p>{text}</p>
  </div>

</div>

);
}
function Modal({ children }) {
return (
<div
style={{
position: 'fixed',
inset: 0,
zIndex: 999,
background:
'rgba(0,0,0,.72)',
backdropFilter:
'blur(8px)',
overflowY: 'auto',
padding: 30
}}
>
{children}
</div>
);
}
function InfoBox({
label,
value
}) {
return (
<div
style={{
padding: 18,
border:
'1px solid rgba(255,255,255,.1)',
borderRadius: 12,
background:
'rgba(255,255,255,.025)'
}}
>
<small
style={{
display: 'block',
opacity: .55,
marginBottom: 7
}}
>
{label}
</small>

  <strong>
    {value}
  </strong>
</div>

);
}
function Metric({
value,
label
}) {
return (
<div
style={{
padding:
'15px 0',
borderBottom:
'1px solid rgba(255,255,255,.08)'
}}
>
<strong
style={{
display: 'block',
fontSize: 30,
color: '#12d9ff'
}}
>
{value}
</strong>

  <span
    style={{
      opacity: .65
    }}
  >
    {label}
  </span>
</div>

);
}
/* =========================================================
DASHBOARD
\========================================================= */
function Dashboard({
d,
onNav
}) {
const s =
d.summary || {};
const top =
d.risk
.slice()
.sort(
(a, b) =>
b.score - a.score
)
.slice(0, 5);
return (
<>
<div className="page-head">

    <div>

      <span className="eyebrow">
        EXECUTIVE OVERVIEW
      </span>

      <h1>
        Security Command Center
      </h1>

      <p>
        Real-time insider threat
        posture across users,
        endpoints and security events.
      </p>

    </div>

    <button
      className="ghost"
      onClick={() =>
        onNav('reports')
      }
    >
      Export intelligence ↗
    </button>

  </div>

  <div className="kpi-grid">

    <Card
      label="Monitored Employees"
      value={s.employees}
      sub="100 employee identities"
      icon="◉"
      onClick={() =>
        onNav('employees')
      }
    />

    <Card
      label="Events Ingested"
      value={s.activities?.toLocaleString()}
      sub="All monitored activity types"
      icon="↯"
      tone="blue"
      onClick={() =>
        onNav('activities')
      }
    />

    <Card
      label="Behavioral Anomalies"
      value={s.anomalies}
      sub="Unique detected anomalies"
      icon="△"
      tone="amber"
      onClick={() =>
        onNav('anomalies')
      }
    />

    <Card
      label="High / Critical Risk"
      value={s.high_risk}
      sub="Priority users"
      icon="!"
      tone="red"
      onClick={() =>
        onNav('risk')
      }
    />

  </div>

  <div className="dashboard-grid">

    <section className="panel chart-panel">

      <PanelTitle
        title="Risk posture"
        meta="USER RISK DISTRIBUTION"
      />

      <RiskBars
        risk={d.risk}
      />

    </section>

    <section className="panel">

      <PanelTitle
        title="Threat activity"
        meta="LATEST SIGNALS"
        action="View all"
        onClick={() =>
          onNav('activities')
        }
      />

      <ActivityFeed
        activities={d.activities.slice(
          0,
          7
        )}
      />

    </section>

  </div>

  <div className="dashboard-grid lower">

    <section className="panel">

      <PanelTitle
        title="Priority users"
        meta="RISK RANKING"
        action="Open risk"
        onClick={() =>
          onNav('risk')
        }
      />

      <RiskTable rows={top} />

    </section>

    <section className="panel">

      <PanelTitle
        title="Open investigations"
        meta="CASE MANAGEMENT"
        action="Investigate"
        onClick={() =>
          onNav(
            'investigations'
          )
        }
      />

      <IncidentList
        rows={d.incidents.slice(
          0,
          5
        )}
      />

    </section>

  </div>
</>

);
}
function RiskBars({
risk
}) {
const cats = [
'Low Risk',
'Medium Risk',
'High Risk',
'Critical Risk'
];
const nums =
cats.map(c =>
risk.filter(
x =>
x.category === c
).length
);
const max =
Math.max(
1,
...nums
);
return (
<div className="risk-bars">

  {cats.map(
    (c, i) => (
      <div
        className="risk-row"
        key={c}
      >

        <div>
          <span>{c}</span>
          <b>{nums[i]}</b>
        </div>

        <div className="bar">
          <i
            className={
              [
                'low',
                'medium',
                'high',
                'critical'
              ][i]
            }
            style={{
              width:
                `${Math.max(
                  7,
                  nums[i] /
                    max *
                    100
                )}%`
            }}
          />
        </div>

      </div>
    )
  )}

  <div className="score-legend">
    <span>
      ● Behavioral baseline
    </span>

    <span>
      ● Access deviation
    </span>

    <span>
      ● Privilege signals
    </span>
  </div>

</div>

);
}
function ActivityFeed({
activities
}) {
return (
<div className="feed">

  {activities.map(
    a => (
      <div
        className="feed-item"
        key={a.id}
      >

        <div className="feed-icon">
          {a.success
            ? '✓'
            : '!'}
        </div>

        <div>
          <b>
            {a.activity_type.replaceAll(
              '_',
              ' '
            )}
          </b>

          <span>
            {a.employee_id}
            {' • '}
            {a.resource}
          </span>
        </div>

        <time>
          {new Date(
            a.timestamp
          ).toLocaleTimeString(
            [],
            {
              hour:
                '2-digit',
              minute:
                '2-digit'
            }
          )}
        </time>

      </div>
    )
  )}

</div>

);
}
/* =========================================================
EMPLOYEES
\========================================================= */
function Employees({
d,
onProfile,
onAdd
}) {
const [search, setSearch] =
useState('');
const filtered =
d.employees.filter(
e =>
`${e.name} ${e.employee_id} ${e.department} ${e.device}`
.toLowerCase()
.includes(
search.toLowerCase()
)
);
return (
<>
<PageTitle
     title="Employee Intelligence"
     text="Identity, access privileges and behavioral risk posture."
   />

  <section className="panel">

    <div className="toolbar">

      <input
        className="search"
        value={search}
        onChange={e =>
          setSearch(
            e.target.value
          )
        }
        placeholder="Search employee, department or device…"
      />

      <span
        style={{
          opacity: .7,
          fontSize: 13
        }}
      >
        Showing {filtered.length}
        {' / '}
        100 employees
      </span>

      <button
        className="primary"
        onClick={onAdd}
      >
        + Add employee
      </button>

    </div>

    <div className="table-wrap">

      <table>

        <thead>
          <tr>
            <th>EMPLOYEE</th>
            <th>DEPARTMENT</th>
            <th>DESIGNATION</th>
            <th>DEVICE</th>
            <th>LOCATION</th>
            <th>PRIVILEGE</th>
            <th>RISK</th>
          </tr>
        </thead>

        <tbody>

          {filtered.map(
            e => {

              const r =
                d.risk.find(
                  x =>
                    x.employee_id ===
                    e.employee_id
                );

              return (
                <tr
                  key={
                    e.employee_id
                  }
                  onClick={() =>
                    onProfile(e)
                  }
                  style={{
                    cursor:
                      'pointer'
                  }}
                >

                  <td>
                    <b>
                      {e.name}
                    </b>

                    <small>
                      {e.employee_id}
                    </small>
                  </td>

                  <td>
                    {e.department}
                  </td>

                  <td>
                    {e.designation}
                  </td>

                  <td className="mono">
                    {e.device}
                  </td>

                  <td>
                    {e.location}
                  </td>

                  <td>
                    <Badge
                      tone={
                        e.privilege ===
                        'Privileged'
                          ? 'high'
                          : 'low'
                      }
                    >
                      {e.privilege}
                    </Badge>
                  </td>

                  <td>
                    <Badge>
                      {r?.score || 0}
                    </Badge>
                  </td>

                </tr>
              );
            }
          )}

        </tbody>

      </table>

    </div>

  </section>
</>

);
}
/* =========================================================
ACTIVITIES
\========================================================= */
function Activities({
d,
onAdd
}) {
const [search, setSearch] =
useState('');
const [type, setType] =
useState('ALL');
const [priv, setPriv] =
useState('ALL');
const filtered =
d.activities.filter(
a => {

    const s =
      !search ||
      `${a.employee_id} ${a.employee_name} ${a.resource} ${a.source_ip}`
        .toLowerCase()
        .includes(
          search.toLowerCase()
        );

    return (
      s &&
      (type === 'ALL' ||
        a.activity_type ===
          type) &&
      (priv === 'ALL' ||
        a.privilege ===
          priv)
    );
  }
);

return (
<>
<PageTitle
     title="Activity Monitoring"
     text="Normalized activity telemetry from identity, endpoint, network and communication sources."
   />

  <section className="panel">

    <div className="toolbar">

      <input
        className="search"
        placeholder="Search user, resource or IP…"
        value={search}
        onChange={e =>
          setSearch(
            e.target.value
          )
        }
      />

      <select
        value={type}
        onChange={e =>
          setType(
            e.target.value
          )
        }
      >
        <option value="ALL">
          All activity types
        </option>

        {activityTypes.map(
          x => (
            <option
              key={x}
              value={x}
            >
              {x}
            </option>
          )
        )}
      </select>

      <select
        value={priv}
        onChange={e =>
          setPriv(
            e.target.value
          )
        }
      >
        <option value="ALL">
          All privileges
        </option>

        <option value="Normal">
          Normal
        </option>

        <option value="Privileged">
          Privileged
        </option>
      </select>

      <button
        className="primary"
        onClick={onAdd}
      >
        + Add activity
      </button>

      <span
        style={{
          opacity: .7,
          fontSize: 13
        }}
      >
        {filtered.length}
        {' '}
        events
      </span>

    </div>

    <div className="table-wrap">

      <table>

        <thead>
          <tr>
            <th>TIME</th>
            <th>USER</th>
            <th>EVENT</th>
            <th>RESOURCE</th>
            <th>SOURCE IP</th>
            <th>PRIVILEGE</th>
            <th>TRANSFER</th>
            <th>RESULT</th>
          </tr>
        </thead>

        <tbody>

          {filtered
            .slice(0, 400)
            .map(a => (
              <tr key={a.id}>

                <td>
                  {new Date(
                    a.timestamp
                  ).toLocaleString()}
                </td>

                <td>
                  <b>
                    {a.employee_id}
                  </b>
                </td>

                <td>
                  {a.activity_type}
                </td>

                <td>
                  {a.resource}
                </td>

                <td className="mono">
                  {a.source_ip}
                </td>

                <td>
                  {a.privilege}
                </td>

                <td>
                  {formatBytes(
                    a.bytes_transferred
                  )}
                </td>

                <td>
                  {a.success ? (
                    <span className="ok">
                      SUCCESS
                    </span>
                  ) : (
                    <span className="danger">
                      BLOCKED
                    </span>
                  )}
                </td>

              </tr>
            ))}

        </tbody>

      </table>

    </div>

  </section>
</>

);
}
/* =========================================================
ANOMALIES
\========================================================= */
function Anomalies({
d,
onNav,
onOpen
}) {
const [search, setSearch] =
useState('');
const [filter, setFilter] =
useState('all');
const filtered =
d.anomalies.filter(
a => {

    const q =
      !search ||
      `${a.employee_name} ${a.employee_id} ${a.category}`
        .toLowerCase()
        .includes(
          search.toLowerCase()
        );

    const f =
      filter === 'all' ||
      (
        filter ===
          'priority' &&
        ['Critical', 'High'].includes(
          a.severity
        )
      ) ||
      (
        filter === 'open' &&
        a.status !==
          'Resolved'
      );

    return q && f;
  }
);

const total =
new Set(
d.anomalies.map(
a => a.id
)
).size;
const priority =
d.anomalies.filter(
a =>
['Critical', 'High'].includes(
a.severity
)
).length;
const open =
d.anomalies.filter(
a =>
a.status !==
'Resolved'
).length;
return (
<>
<PageTitle
     title="Anomaly Detection"
     text="Behavioral deviations surfaced by the detection engine."
   />

  <div className="kpi-grid compact">

    <Card
      label="Total anomalies"
      value={total}
      sub="Unique detected events"
      icon="△"
      onClick={() =>
        setFilter('all')
      }
    />

    <Card
      label="Critical / High"
      value={priority}
      sub="Priority review"
      icon="!"
      tone="red"
      onClick={() =>
        setFilter('priority')
      }
    />

    <Card
      label="Open"
      value={open}
      sub="Investigation queue"
      icon="○"
      tone="amber"
      onClick={() =>
        setFilter('open')
      }
    />

  </div>

  <section className="panel">

    <div className="toolbar">

      <input
        className="search"
        placeholder="Search anomaly or employee…"
        value={search}
        onChange={e =>
          setSearch(
            e.target.value
          )
        }
      />

      <div
        style={{
          display: 'flex',
          gap: 8
        }}
      >

        <button
          className={
            filter === 'all'
              ? 'primary'
              : 'ghost'
          }
          onClick={() =>
            setFilter('all')
          }
        >
          All
        </button>

        <button
          className={
            filter ===
            'priority'
              ? 'primary'
              : 'ghost'
          }
          onClick={() =>
            setFilter(
              'priority'
            )
          }
        >
          Critical / High
        </button>

        <button
          className={
            filter === 'open'
              ? 'primary'
              : 'ghost'
          }
          onClick={() =>
            setFilter('open')
          }
        >
          Open
        </button>

      </div>

    </div>

    <div className="table-wrap">

      <table>

        <thead>
          <tr>
            <th>ID</th>
            <th>SEVERITY</th>
            <th>USER</th>
            <th>CATEGORY</th>
            <th>DESCRIPTION</th>
            <th>SCORE</th>
            <th>STATUS</th>
          </tr>
        </thead>

        <tbody>

          {filtered.map(
            a => (
              <tr
                key={a.id}
                onClick={() =>
                  onOpen(a)
                }
                style={{
                  cursor:
                    'pointer'
                }}
              >

                <td className="mono">
                  ANM-
                  {String(
                    a.id
                  ).padStart(
                    4,
                    '0'
                  )}
                </td>

                <td>
                  <Badge
                    tone={a.severity.toLowerCase()}
                  >
                    {a.severity}
                  </Badge>
                </td>

                <td>
                  <b>
                    {a.employee_name}
                  </b>

                  <small>
                    {a.employee_id}
                  </small>
                </td>

                <td>
                  {a.category}
                </td>

                <td>
                  {a.description}
                </td>

                <td>

                  <div className="score">
                    <i
                      style={{
                        width:
                          a.score +
                          '%'
                      }}
                    />

                    <b>
                      {a.score}
                    </b>
                  </div>

                </td>

                <td>
                  <Badge
                    tone={
                      a.status ===
                      'Resolved'
                        ? 'low'
                        : 'medium'
                    }
                  >
                    {a.status}
                  </Badge>
                </td>

              </tr>
            )
          )}

        </tbody>

      </table>

    </div>

  </section>
</>

);
}
/* =========================================================
ANOMALY DETAIL + DONUT
\========================================================= */
function AnomalyModal({
anomaly,
onClose
}) {
const score =
Number(anomaly.score) || 0;
return (
<Modal>

  <div
    className="panel"
    style={{
      maxWidth: 900,
      margin: '70px auto'
    }}
  >

    <div
      style={{
        display: 'flex',
        justifyContent:
          'space-between',
        alignItems: 'center'
      }}
    >

      <div>

        <span className="eyebrow">
          ANOMALY INVESTIGATION
        </span>

        <h1>
          {anomaly.category}
        </h1>

        <p>
          {anomaly.employee_name}
          {' • '}
          {anomaly.employee_id}
        </p>

      </div>

      <button
        className="ghost"
        onClick={onClose}
      >
        ✕
      </button>

    </div>

    <div
      className="dashboard-grid"
      style={{
        marginTop: 25
      }}
    >

      <section className="panel">

        <h2>
          Anomaly Score
        </h2>

        <div
          style={{
            display:
              'grid',
            placeItems:
              'center',
            marginTop: 20
          }}
        >

          <div
            className="risk-ring"
            style={{
              width: 190,
              height: 190,
              background:
                `conic-gradient(#ff4f64 ${
                  score * 3.6
                }deg, rgba(255,255,255,.1) 0deg)`
            }}
          >

            <div
              style={{
                width: 145,
                height: 145,
                borderRadius:
                  '50%',
                background:
                  '#0a111c',
                display:
                  'grid',
                placeItems:
                  'center',
                fontSize: 38,
                fontWeight: 800
              }}
            >
              {score}
            </div>

          </div>

        </div>

      </section>

      <section className="panel">

        <h2>
          Detection Details
        </h2>

        <div className="info-grid">

          <InfoBox
            label="Anomaly ID"
            value={
              `ANM-${String(
                anomaly.id
              ).padStart(
                4,
                '0'
              )}`
            }
          />

          <InfoBox
            label="Severity"
            value={
              anomaly.severity
            }
          />

          <InfoBox
            label="Status"
            value={
              anomaly.status
            }
          />

          <InfoBox
            label="Category"
            value={
              anomaly.category
            }
          />

        </div>

      </section>

    </div>

    <section
      className="panel"
      style={{
        marginTop: 20
      }}
    >

      <h2>
        Analyst Description
      </h2>

      <p
        style={{
          lineHeight: 1.8,
          opacity: .8
        }}
      >
        {anomaly.description}
      </p>

    </section>

    <div
      style={{
        textAlign: 'right',
        marginTop: 20
      }}
    >

      <button
        className="primary"
        onClick={onClose}
      >
        Close
      </button>

    </div>

  </div>

</Modal>

);
}
/* =========================================================
RISK
\========================================================= */
function Risk({
d,
onRecalculate
}) {
const avg =
d.risk.length
? Math.round(
d.risk.reduce(
(a, b) =>
a + b.score,
0
) /
d.risk.length
)
: 0;
const sorted =
d.risk
.slice()
.sort(
(a, b) =>
b.score - a.score
);
return (
<>
<div className="page-head">

    <div>

      <span className="eyebrow">
        RISK INTELLIGENCE
      </span>

      <h1>
        Risk Intelligence
      </h1>

      <p>
        Weighted insider risk
        scoring and threat
        prioritization.
      </p>

    </div>

    <button
      className="primary"
      onClick={onRecalculate}
    >
      ↻ Recalculate risk
    </button>

  </div>

  <div className="risk-hero">

    <div className="risk-score">

      <span>
        ORGANIZATIONAL RISK
      </span>

      <strong>
        {avg}
      </strong>

      <small>
        / 100
      </small>

      <Badge>
        {avg >= 60
          ? 'Elevated'
          : 'Controlled'}
      </Badge>

    </div>

    <div className="weights">

      <span>
        SCORING MODEL
      </span>

      {[
        [
          'Behavioral anomalies',
          35
        ],
        [
          'Privilege misuse',
          25
        ],
        [
          'Data access violations',
          20
        ],
        [
          'Access deviations',
          10
        ],
        [
          'Historical events',
          10
        ]
      ].map(
        ([n, v]) => (
          <React.Fragment
            key={n}
          >

            <h3>
              {n}
              <b>
                {v}%
              </b>
            </h3>

            <div className="wbar">

              <i
                style={{
                  width:
                    v + '%'
                }}
              />

            </div>

          </React.Fragment>
        )
      )}

    </div>

  </div>

  <section className="panel">

    <PanelTitle
      title="Risk-ranked workforce"
      meta="100 EMPLOYEES"
    />

    <RiskTable
      rows={sorted}
    />

  </section>
</>

);
}
/* =========================================================
ALERTS
\========================================================= */
function Alerts({
d,
setData,
toast,
onOpen
}) {
const update =
async (
id,
status
) => {

  setData(
    p => ({
      ...p,
      alerts:
        p.alerts.map(
          a =>
            a.id === id
              ? {
                  ...a,
                  status
                }
              : a
        )
    })
  );

  toast(
    `Alert ${status.toLowerCase()}`
  );

  try {

    await fetch(
      API +
        `/api/alerts/${id}`,
      {
        method:
          'PATCH',
        headers: {
          'Content-Type':
            'application/json',
          Authorization:
            `Bearer ${localStorage.getItem(
              'sentinel_token'
            )}`
        },
        body:
          JSON.stringify({
            status
          })
      }
    );

  } catch (e) {}
};

return (
<>
<PageTitle
     title="Alert & Incident Management"
     text="Prioritize, acknowledge, escalate and resolve insider threat alerts."
   />

  <section className="panel">

    <div className="alert-grid">

      {d.alerts.map(
        a => (
          <div
            className="alert-card"
            key={a.id}
            onClick={() =>
              onOpen(a)
            }
            style={{
              cursor:
                'pointer'
            }}
          >

            <div className="alert-head">

              <Badge
                tone={
                  a.severity.toLowerCase()
                }
              >
                {a.severity}
              </Badge>

              <span>
                #{a.id}
              </span>

            </div>

            <h3>
              {a.title}
            </h3>

            <p>
              {a.message}
            </p>

            <div className="alert-meta">

              <span>
                {a.employee_id}
              </span>

              <span>
                {new Date(
                  a.created_at
                ).toLocaleString()}
              </span>

            </div>

            <div
              className="alert-actions"
              onClick={e =>
                e.stopPropagation()
              }
            >

              <button
                className="ghost"
                disabled={
                  a.status !==
                  'Open'
                }
                onClick={() =>
                  update(
                    a.id,
                    'Acknowledged'
                  )
                }
              >
                ✓ Acknowledge
              </button>

              <button
                className="primary"
                disabled={
                  a.status ===
                  'Resolved'
                }
                onClick={() =>
                  update(
                    a.id,
                    'Resolved'
                  )
                }
              >
                Resolve
              </button>

            </div>

            <small
              style={{
                display:
                  'block',
                marginTop: 12,
                opacity: .65
              }}
            >
              Status: {a.status}
            </small>

          </div>
        )
      )}

    </div>

  </section>
</>

);
}
function AlertModal({
alert,
onClose
}) {
return (
<Modal>

  <div
    className="panel"
    style={{
      maxWidth: 650,
      margin:
        '100px auto'
    }}
  >

    <span className="eyebrow">
      SECURITY ALERT
    </span>

    <h1>
      {alert.title}
    </h1>

    <div
      className="info-grid"
      style={{
        marginTop: 20
      }}
    >

      <InfoBox
        label="Alert ID"
        value={`#${alert.id}`}
      />

      <InfoBox
        label="Employee"
        value={
          alert.employee_id
        }
      />

      <InfoBox
        label="Severity"
        value={
          alert.severity
        }
      />

      <InfoBox
        label="Status"
        value={
          alert.status
        }
      />

    </div>

    <section
      className="panel"
      style={{
        marginTop: 20
      }}
    >

      <h2>
        Alert Description
      </h2>

      <p
        style={{
          lineHeight: 1.8
        }}
      >
        {alert.message}
      </p>

    </section>

    <div
      style={{
        textAlign:
          'right',
        marginTop: 20
      }}
    >

      <button
        className="primary"
        onClick={onClose}
      >
        Close
      </button>

    </div>

  </div>

</Modal>

);
}
/* =========================================================
INVESTIGATIONS
\========================================================= */
function Investigations({
d,
onCreate,
onOpen
}) {
const custom =
JSON.parse(
localStorage.getItem(
'sentinel_custom_investigations'
) || '[]'
);
const rows = [
...d.incidents,
...custom
];
return (
<>
<PageTitle
     title="Threat Investigations"
     text="Incident creation, timeline analysis, evidence correlation and analyst workflows."
   />

  <section className="panel">

    <div className="toolbar">

      <div>

        <span className="eyebrow">
          CASE MANAGEMENT
        </span>

        <h2
          style={{
            margin:
              '4px 0 0'
          }}
        >
          Investigation queue
        </h2>

      </div>

      <button
        className="primary"
        onClick={onCreate}
      >
        + Create investigation
      </button>

    </div>

    <div
      className="dashboard-grid"
      style={{
        marginTop: 18
      }}
    >

      {rows.map(
        x => (
          <div
            className="alert-card"
            key={x.id}
            onClick={() =>
              onOpen(x)
            }
            style={{
              cursor:
                'pointer'
            }}
          >

            <div className="alert-head">

              <Badge
                tone={
                  x.severity.toLowerCase()
                }
              >
                {x.severity}
              </Badge>

              <span>
                {x.id}
              </span>

            </div>

            <h3>
              {x.title}
            </h3>

            <p>
              Employee:
              {' '}
              <b>
                {x.employee_id}
              </b>
            </p>

            <div className="case-note">

              <b>
                Investigation workflow
              </b>

              <div
                style={{
                  marginTop: 8,
                  lineHeight:
                    1.8
                }}
              >
                ✓ Activity detected
                <br />
                ✓ Behavior correlated
                <br />
                ✓ Risk assessed
                <br />
                ✓ Analyst review
                <br />
                ○ Evidence collection
              </div>

            </div>

            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                marginTop: 14
              }}
            >

              <Badge tone="medium">
                {x.status}
              </Badge>

              <span
                style={{
                  opacity: .6,
                  fontSize: 12
                }}
              >
                {new Date(
                  x.created_at
                ).toLocaleString()}
              </span>

            </div>

          </div>
        )
      )}

    </div>

  </section>
</>

);
}
function IncidentModal({
incident,
onClose
}) {
return (
<Modal>

  <div
    className="panel"
    style={{
      maxWidth: 750,
      margin:
        '70px auto'
    }}
  >

    <span className="eyebrow">
      THREAT INVESTIGATION
    </span>

    <h1>
      {incident.title}
    </h1>

    <div
      className="info-grid"
      style={{
        marginTop: 20
      }}
    >

      <InfoBox
        label="Case ID"
        value={
          incident.id
        }
      />

      <InfoBox
        label="Employee"
        value={
          incident.employee_id
        }
      />

      <InfoBox
        label="Severity"
        value={
          incident.severity
        }
      />

      <InfoBox
        label="Status"
        value={
          incident.status
        }
      />

    </div>

    <section
      className="panel"
      style={{
        marginTop: 20
      }}
    >

      <h2>
        Investigation Workflow
      </h2>

      <div
        style={{
          lineHeight: 2,
          marginTop: 15
        }}
      >
        ✓ Activity detected
        <br />
        ✓ Behavior correlated
        <br />
        ✓ Risk assessed
        <br />
        ✓ Analyst review
        <br />
        ○ Evidence collection
        <br />
        ○ Resolution
      </div>

    </section>

    <div
      style={{
        textAlign:
          'right',
        marginTop: 20
      }}
    >

      <button
        className="primary"
        onClick={onClose}
      >
        Close
      </button>

    </div>

  </div>

</Modal>

);
}
/* =========================================================
UEBA
\========================================================= */
function Analytics({
d,
onProfile,
onLayer
}) {
const [
employeeId,
setEmployeeId
] = useState(
d.employees[0]
?.employee_id ||
'EMP001'
);
const employee =
d.employees.find(
e =>
e.employee_id ===
employeeId
) ||
d.employees[0];
const acts =
d.activities.filter(
a =>
a.employee_id ===
employee?.employee_id
);
const anoms =
d.anomalies.filter(
a =>
a.employee_id ===
employee?.employee_id
);
return (
<>
<div className="page-head">

    <div>

      <span className="eyebrow">
        BEHAVIORAL INTELLIGENCE
      </span>

      <h1>
        UEBA Analytics
      </h1>

      <p>
        User and entity behavior
        analytics, peer comparison
        and behavioral trends.
      </p>

    </div>

  </div>

  <div
    style={{
      display:
        'flex',
      gap: 12,
      alignItems:
        'center',
      marginBottom: 20
    }}
  >

    <select
      value={employeeId}
      onChange={e =>
        setEmployeeId(
          e.target.value
        )
      }
      style={{
        minWidth: 330
      }}
    >

      {d.employees.map(
        e => (
          <option
            key={
              e.employee_id
            }
            value={
              e.employee_id
            }
          >
            {e.name}
            {' — '}
            {e.employee_id}
          </option>
        )
      )}

    </select>

    <button
      className="primary"
      onClick={() =>
        onProfile(employee)
      }
    >
      Analyze Behavior →
    </button>

  </div>

  <section className="panel">

    <div
      style={{
        display:
          'flex',
        alignItems:
          'center',
        gap: 18
      }}
    >

      <div
        className="avatar"
        style={{
          width: 58,
          height: 58
        }}
      >
        {employee?.name?.[0]}
      </div>

      <div>

        <h2
          style={{
            margin: 0
          }}
        >
          {employee?.name}
        </h2>

        <p
          style={{
            margin:
              '5px 0 0',
            opacity: .65
          }}
        >
          {employee?.employee_id}
          {' • '}
          {employee?.department}
          {' • '}
          {employee?.designation}
        </p>

      </div>

    </div>

  </section>

  <div className="dashboard-grid">

    <section className="panel">

      <PanelTitle
        title="Behavioral Signal Map"
        meta="OBSERVED VS BASELINE"
      />

      <BehaviorGraph
        data={activityGraph(
          acts
        )}
      />

    </section>

    <section className="panel">

      <PanelTitle
        title="Intelligence Layers"
        meta="UEBA MODEL"
      />

      <div className="layer-list">

        {[
          [
            'Baseline Profiling',
            'Normal working pattern identified'
          ],
          [
            'Peer Comparison',
            `${employee?.department} peer group comparison available`
          ],
          [
            'Threat Prediction',
            'Forward-looking behavioral risk indicators'
          ],
          [
            'Trend Analysis',
            'Historical activity deviation analysis'
          ],
          [
            'Entity Correlation',
            'Device, application and network relationships'
          ]
        ].map(
          (x, i) => (
            <Layer
              key={x[0]}
              number={i + 1}
              title={x[0]}
              text={x[1]}
              onClick={() =>
                onLayer(
                  x[0]
                )
              }
            />
          )
        )}

      </div>

    </section>

  </div>

  <div className="dashboard-grid lower">

    <section className="panel">

      <PanelTitle
        title="Behavior Metrics"
        meta="CURRENT USER"
      />

      <div className="kpi-grid compact">

        <Card
          label="Activity events"
          value={acts.length}
          sub="Observed telemetry"
          icon="↯"
        />

        <Card
          label="Anomalies"
          value={anoms.length}
          sub="Detected deviations"
          icon="△"
          tone="amber"
        />

      </div>

    </section>

    <section className="panel">

      <PanelTitle
        title="Peer Intelligence"
        meta="DEPARTMENT BASELINE"
      />

      <PeerComparison
        employee={employee}
        risk={d.risk}
      />

    </section>

  </div>
</>

);
}
function activityGraph(
activities
) {
const labels = [
'Login',
'File',
'App',
'Network',
'Email',
'USB',
'Download',
'Upload'
];
const keys = [
'LOGIN',
'FILE_ACCESS',
'APP_USAGE',
'NETWORK_ACCESS',
'EMAIL_SENT',
'USB_CONNECTED',
'DOWNLOAD',
'UPLOAD'
];
return labels.map(
(label, i) => ({
label,
observed:
Math.max(
1,
activities.filter(
a =>
a.activity_type ===
keys[i]
).length
),
baseline:
2 +
((i * 3) % 5)
})
);
}
function BehaviorGraph({
data
}) {
const max =
Math.max(
5,
...data.flatMap(
x => [
x.observed,
x.baseline
]
)
);
return (
<div
style={{
padding:
'25px 10px 10px'
}}
>

  <div
    style={{
      display:
        'flex',
      alignItems:
        'flex-end',
      gap: 14,
      height: 280,
      borderBottom:
        '1px solid rgba(255,255,255,.12)',
      borderLeft:
        '1px solid rgba(255,255,255,.12)',
      padding:
        '10px 10px 0'
    }}
  >

    {data.map(
      x => (
        <div
          key={
            x.label
          }
          style={{
            flex: 1,
            height:
              '100%',
            display:
              'flex',
            alignItems:
              'flex-end',
            gap: 4
          }}
        >

          <div
            title={`Observed: ${x.observed}`}
            style={{
              width:
                '48%',
              height:
                Math.max(
                  12,
                  x.observed /
                    max *
                    220
                ),
              background:
                'linear-gradient(180deg,#12d9ff,#0874c9)',
              borderRadius:
                '6px 6px 0 0',
              position:
                'relative'
            }}
          >

            <span
              style={{
                position:
                  'absolute',
                top: -20,
                left:
                  '50%',
                transform:
                  'translateX(-50%)',
                fontSize: 11
              }}
            >
              {x.observed}
            </span>

          </div>

          <div
            title={`Baseline: ${x.baseline}`}
            style={{
              width:
                '48%',
              height:
                Math.max(
                  10,
                  x.baseline /
                    max *
                    220
                ),
              background:
                'rgba(255,255,255,.2)',
              border:
                '1px solid rgba(255,255,255,.25)',
              borderRadius:
                '6px 6px 0 0'
            }}
          />

        </div>
      )
    )}

  </div>

  <div
    style={{
      display:
        'grid',
      gridTemplateColumns:
        'repeat(8,1fr)',
      gap: 8,
      marginTop: 10
    }}
  >

    {data.map(
      x => (
        <span
          key={
            x.label
          }
          style={{
            textAlign:
              'center',
            fontSize: 10,
            opacity: .7
          }}
        >
          {x.label}
        </span>
      )
    )}

  </div>

  <div
    style={{
      display:
        'flex',
      gap: 20,
      marginTop: 20,
      fontSize: 12,
      opacity: .75
    }}
  >

    <span>
      ■ Observed activity
    </span>

    <span>
      ■ Established baseline
    </span>

  </div>

</div>

);
}
function Layer({
number,
title,
text,
onClick
}) {
return (
<div
onClick={onClick}
style={{
display:
'flex',
alignItems:
'center',
gap: 15,
padding:
'18px 5px',
borderBottom:
'1px solid rgba(255,255,255,.08)',
cursor:
'pointer'
}}
>

  <div
    style={{
      width: 45,
      height: 45,
      borderRadius:
        '50%',
      background:
        'rgba(10,211,255,.18)',
      color:
        '#12d9ff',
      display:
        'grid',
      placeItems:
        'center',
      fontWeight: 800,
      fontSize: 18
    }}
  >
    {number}
  </div>

  <div>

    <strong>
      {title}
    </strong>

    <small
      style={{
        display:
          'block',
        opacity: .65,
        marginTop: 5
      }}
    >
      {text}
    </small>

  </div>

  <span
    style={{
      marginLeft:
        'auto',
      opacity: .6
    }}
  >
    →
  </span>

</div>

);
}
/* =========================================================
UEBA PROFILE
\========================================================= */
function UEBAProfileModal({
employee,
data,
onClose,
onLayer
}) {
const acts =
data.activities.filter(
a =>
a.employee_id ===
employee.employee_id
);
const anoms =
data.anomalies.filter(
a =>
a.employee_id ===
employee.employee_id
);
const risk =
data.risk.find(
r =>
r.employee_id ===
employee.employee_id
);
const peers =
data.risk.filter(
r =>
r.department ===
employee.department
);
const avg =
peers.length
? (
peers.reduce(
(a, b) =>
a + b.score,
0
) /
peers.length
).toFixed(1)
: 0;
return (
<Modal>

  <div
    className="panel"
    style={{
      maxWidth: 1100,
      margin:
        '20px auto'
    }}
  >

    <div
      style={{
        display:
          'flex',
        justifyContent:
          'space-between',
        alignItems:
          'center'
      }}
    >

      <div>

        <span className="eyebrow">
          EMPLOYEE INTELLIGENCE
        </span>

        <h1
          style={{
            margin:
              '5px 0'
          }}
        >
          {employee.name}
        </h1>

        <p>
          {employee.employee_id}
          {' • '}
          {employee.department}
          {' • '}
          {employee.designation}
        </p>

      </div>

      <button
        className="ghost"
        onClick={onClose}
      >
        ✕
      </button>

    </div>

    <div className="info-grid">

      {[
        [
          'Manager',
          employee.manager
        ],
        [
          'Device',
          employee.device
        ],
        [
          'Location',
          employee.location
        ],
        [
          'Privilege',
          employee.privilege
        ],
        [
          'Last Login',
          employee.last_login
        ],
        [
          'Department',
          employee.department
        ]
      ].map(
        x => (
          <InfoBox
            key={x[0]}
            label={x[0]}
            value={x[1]}
          />
        )
      )}

    </div>

    <div
      className="dashboard-grid"
      style={{
        marginTop: 20
      }}
    >

      <section className="panel">

        <h2>
          Risk Profile
        </h2>

        <div
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap: 25,
            marginTop: 20
          }}
        >

          <div
            className="risk-ring"
            style={{
              background:
                `conic-gradient(#11d8ff ${
                  (risk?.score ||
                    0) *
                  3.6
                }deg,rgba(255,255,255,.12) 0deg)`
            }}
          >

            <div>
              {risk?.score ||
                0}
            </div>

          </div>

          <div>

            <Badge>
              {risk?.category ||
                'Low Risk'}
            </Badge>

            <p>
              Current calculated risk
            </p>

            <p>
              Peer average:
              {' '}
              <b>
                {avg}
              </b>
            </p>

          </div>

        </div>

      </section>

      <section className="panel">

        <h2>
          Behavior Summary
        </h2>

        <Metric
          value={
            acts.length
          }
          label="Activity events"
        />

        <Metric
          value={
            anoms.length
          }
          label="Detected anomalies"
        />

        <Metric
          value={
            peers.length
          }
          label="Department peers"
        />

      </section>

    </div>

    <section
      className="panel"
      style={{
        marginTop: 20
      }}
    >

      <h2>
        Intelligence Layers
      </h2>

      <div className="layer-list">

        {[
          'Baseline Profiling',
          'Peer Comparison',
          'Threat Prediction',
          'Trend Analysis',
          'Entity Correlation'
        ].map(
          (x, i) => (
            <Layer
              key={x}
              number="✓"
              title={x}
              text={
                i === 1
                  ? `Compared against ${peers.length} employees in ${employee.department}.`
                  : 'UEBA intelligence analysis available.'
              }
              onClick={() =>
                onLayer(x)
              }
            />
          )
        )}

      </div>

    </section>

    <div
      style={{
        textAlign:
          'right',
        marginTop: 20
      }}
    >

      <button
        className="primary"
        onClick={onClose}
      >
        Close Profile
      </button>

    </div>

  </div>

</Modal>

);
}
function LayerModal({
layer,
employee,
data,
onClose
}) {
const acts =
data.activities.filter(
a =>
a.employee_id ===
employee?.employee_id
);
const anoms =
data.anomalies.filter(
a =>
a.employee_id ===
employee?.employee_id
);
const risk =
data.risk.find(
r =>
r.employee_id ===
employee?.employee_id
);
const info = {
'Baseline Profiling':
`Observed ${acts.length} activity events across login, file, application, network and communication telemetry. Baseline comparison is active.`,

'Peer Comparison':
  `Employee risk ${risk?.score || 0} compared with department peers. Peer-normalized deviation is calculated.`,

'Threat Prediction':
  `Current risk trajectory is ${risk?.trend || 'Stable'} with ${anoms.length} detected behavioral deviation(s).`,

'Trend Analysis':
  `Historical behavior is analyzed from observed event patterns and anomaly history.`,

'Entity Correlation':
  `Correlated entities include device ${employee?.device}, applications, resources and network source activity.`

};
return (
<Modal>

  <div
    className="panel"
    style={{
      maxWidth: 700,
      margin:
        '80px auto'
    }}
  >

    <span className="eyebrow">
      UEBA INTELLIGENCE LAYER
    </span>

    <h1>
      {layer}
    </h1>

    <p
      style={{
        fontSize: 16,
        lineHeight: 1.7
      }}
    >
      {info[layer]}
    </p>

    <div
      className="info-grid"
      style={{
        marginTop: 20
      }}
    >

      <InfoBox
        label="Employee"
        value={
          employee?.name
        }
      />

      <InfoBox
        label="Employee ID"
        value={
          employee?.employee_id
        }
      />

      <InfoBox
        label="Risk"
        value={
          risk?.score || 0
        }
      />

    </div>

    <div
      style={{
        textAlign:
          'right',
        marginTop: 20
      }}
    >

      <button
        className="primary"
        onClick={onClose}
      >
        Close
      </button>

    </div>

  </div>

</Modal>

);
}
/* =========================================================
EMPLOYEE PROFILE
\========================================================= */
function EmployeeModal({
employee,
data,
onClose,
onOpenUEBA
}) {
const risk =
data.risk.find(
r =>
r.employee_id ===
employee.employee_id
);
const acts =
data.activities.filter(
a =>
a.employee_id ===
employee.employee_id
);
const anoms =
data.anomalies.filter(
a =>
a.employee_id ===
employee.employee_id
);
return (
<Modal>

  <div
    className="panel"
    style={{
      maxWidth: 1050,
      margin:
        '20px auto'
    }}
  >

    <div
      style={{
        display:
          'flex',
        justifyContent:
          'space-between'
      }}
    >

      <div>

        <span className="eyebrow">
          EMPLOYEE INTELLIGENCE
        </span>

        <h1>
          {employee.name}
        </h1>

        <p>
          {employee.employee_id}
          {' • '}
          {employee.department}
        </p>

      </div>

      <button
        className="ghost"
        onClick={onClose}
      >
        ✕
      </button>

    </div>

    <div className="info-grid">

      {[
        [
          'Designation',
          employee.designation
        ],
        [
          'Manager',
          employee.manager
        ],
        [
          'Device',
          employee.device
        ],
        [
          'Privilege',
          employee.privilege
        ],
        [
          'Location',
          employee.location
        ],
        [
          'Last Login',
          employee.last_login
        ]
      ].map(
        x => (
          <InfoBox
            key={x[0]}
            label={x[0]}
            value={x[1]}
          />
        )
      )}

    </div>

    <div
      className="dashboard-grid"
      style={{
        marginTop: 20
      }}
    >

      <section className="panel">

        <h2>
          Risk Profile
        </h2>

        <div
          style={{
            fontSize: 35,
            fontWeight: 800,
            marginTop: 20
          }}
        >
          {risk?.score || 0}

          <span
            style={{
              fontSize: 14,
              opacity: .6
            }}
          >
            {' '}
            / 100
          </span>
        </div>

        <Badge>
          {risk?.category ||
            'Low Risk'}
        </Badge>

      </section>

      <section className="panel">

        <h2>
          Behavior Summary
        </h2>

        <Metric
          value={
            acts.length
          }
          label="Activity events"
        />

        <Metric
          value={
            anoms.length
          }
          label="Detected anomalies"
        />

      </section>

    </div>

    <div
      style={{
        display:
          'flex',
        justifyContent:
          'flex-end',
        gap: 10,
        marginTop: 20
      }}
    >

      <button
        className="ghost"
        onClick={onClose}
      >
        Close
      </button>

      <button
        className="primary"
        onClick={onOpenUEBA}
      >
        Open UEBA Profile →
      </button>

    </div>

  </div>

</Modal>

);
}
/* =========================================================
ADD EMPLOYEE
\========================================================= */
function AddEmployeeModal({
onClose,
onSave
}) {
const [f, setF] =
useState({
name: '',
department:
'Finance',
designation:
'Software Engineer',
manager:
'Manager 1',
device: '',
location:
'Hyderabad',
privilege:
'Normal',
last_login:
'08:00',
email: ''
});
const set = (
k,
v
) =>
setF({
...f,
[k]: v
});
return (
<Modal>

  <div className="panel form-modal">

    <h2>
      Add Employee
    </h2>

    <p>
      Create a new employee identity
      for Employee Intelligence.
    </p>

    <div className="form-grid">

      {[
        [
          'name',
          'Employee name'
        ],
        [
          'device',
          'Device'
        ],
        [
          'email',
          'Email'
        ],
        [
          'manager',
          'Manager'
        ],
        [
          'last_login',
          'Last login'
        ]
      ].map(
        ([k, l]) => (
          <label key={k}>
            {l}

            <input
              value={f[k]}
              onChange={e =>
                set(
                  k,
                  e.target.value
                )
              }
            />

          </label>
        )
      )}

      <label>
        Department

        <select
          value={
            f.department
          }
          onChange={e =>
            set(
              'department',
              e.target.value
            )
          }
        >

          {departments.map(
            x => (
              <option
                key={x}
              >
                {x}
              </option>
            )
          )}

        </select>

      </label>

      <label>
        Designation

        <select
          value={
            f.designation
          }
          onChange={e =>
            set(
              'designation',
              e.target.value
            )
          }
        >

          {designations.map(
            x => (
              <option
                key={x}
              >
                {x}
              </option>
            )
          )}

        </select>

      </label>

      <label>
        Location

        <select
          value={
            f.location
          }
          onChange={e =>
            set(
              'location',
              e.target.value
            )
          }
        >

          {locations.map(
            x => (
              <option
                key={x}
              >
                {x}
              </option>
            )
          )}

        </select>

      </label>

      <label>
        Privilege

        <select
          value={
            f.privilege
          }
          onChange={e =>
            set(
              'privilege',
              e.target.value
            )
          }
        >

          <option>
            Normal
          </option>

          <option>
            Privileged
          </option>

        </select>

      </label>

    </div>

    <div className="modal-actions">

      <button
        className="ghost"
        onClick={onClose}
      >
        Cancel
      </button>

      <button
        className="primary"
        disabled={
          !f.name.trim() ||
          !f.device.trim()
        }
        onClick={() =>
          onSave(f)
        }
      >
        Add Employee
      </button>

    </div>

  </div>

</Modal>

);
}
/* =========================================================
ADD ACTIVITY
\========================================================= */
function AddActivityModal({
employees,
onClose,
onSave
}) {
const [f, setF] =
useState({
employee_id:
employees[0]
?.employee_id ||
'EMP001',

  activity_type:
    'LOGIN',

  resource:
    resources[0],

  source_ip:
    '10.20.1.10',

  privilege:
    'Normal',

  bytes_transferred:
    0,

  success: true
});

const set = (
k,
v
) =>
setF({
...f,
[k]: v
});
return (
<Modal>

  <div className="panel form-modal">

    <h2>
      Add Activity
    </h2>

    <p>
      Add normalized endpoint,
      identity, network or
      communication telemetry.
    </p>

    <div className="form-grid">

      <label>
        User

        <select
          value={
            f.employee_id
          }
          onChange={e =>
            set(
              'employee_id',
              e.target.value
            )
          }
        >

          {employees.map(
            x => (
              <option
                key={
                  x.employee_id
                }
              >
                {x.employee_id}
              </option>
            )
          )}

        </select>

      </label>

      <label>
        Activity type

        <select
          value={
            f.activity_type
          }
          onChange={e =>
            set(
              'activity_type',
              e.target.value
            )
          }
        >

          {activityTypes.map(
            x => (
              <option
                key={x}
              >
                {x}
              </option>
            )
          )}

        </select>

      </label>

      <label>
        Resource

        <select
          value={
            f.resource
          }
          onChange={e =>
            set(
              'resource',
              e.target.value
            )
          }
        >

          {resources.map(
            x => (
              <option
                key={x}
              >
                {x}
              </option>
            )
          )}

        </select>

      </label>

      <label>
        Source IP

        <input
          value={
            f.source_ip
          }
          onChange={e =>
            set(
              'source_ip',
              e.target.value
            )
          }
        />

      </label>

      <label>
        Privilege

        <select
          value={
            f.privilege
          }
          onChange={e =>
            set(
              'privilege',
              e.target.value
            )
          }
        >

          <option>
            Normal
          </option>

          <option>
            Privileged
          </option>

        </select>

      </label>

      <label>
        Transfer bytes

        <input
          type="number"
          value={
            f.bytes_transferred
          }
          onChange={e =>
            set(
              'bytes_transferred',
              Number(
                e.target.value
              )
            )
          }
        />

      </label>

    </div>

    <div className="modal-actions">

      <button
        className="ghost"
        onClick={onClose}
      >
        Cancel
      </button>

      <button
        className="primary"
        onClick={() => {

          const emp =
            employees.find(
              x =>
                x.employee_id ===
                f.employee_id
            );

          onSave({
            ...f,
            employee_name:
              emp?.name ||
              f.employee_id
          });

        }}
      >
        Add Activity
      </button>

    </div>

  </div>

</Modal>

);
}
/* =========================================================
CREATE INVESTIGATION
\========================================================= */
function CreateInvestigationModal({
employees,
onClose,
onSave
}) {
const [f, setF] =
useState({
title: '',
severity:
'Medium',
employee_id:
employees[0]
?.employee_id ||
'EMP001'
});
const set = (
k,
v
) =>
setF({
...f,
[k]: v
});
return (
<Modal>

  <div className="panel form-modal">

    <h2>
      Create Investigation
    </h2>

    <p>
      Open a threat investigation
      and place it in the case queue.
    </p>

    <div className="form-grid">

      <label>
        Investigation title

        <input
          value={
            f.title
          }
          onChange={e =>
            set(
              'title',
              e.target.value
            )
          }
          placeholder="e.g. Suspicious data transfer"
        />

      </label>

      <label>
        Employee

        <select
          value={
            f.employee_id
          }
          onChange={e =>
            set(
              'employee_id',
              e.target.value
            )
          }
        >

          {employees.map(
            x => (
              <option
                key={
                  x.employee_id
                }
              >
                {x.employee_id}
              </option>
            )
          )}

        </select>

      </label>

      <label>
        Severity

        <select
          value={
            f.severity
          }
          onChange={e =>
            set(
              'severity',
              e.target.value
            )
          }
        >

          <option>
            Low
          </option>

          <option>
            Medium
          </option>

          <option>
            High
          </option>

          <option>
            Critical
          </option>

        </select>

      </label>

    </div>

    <div className="modal-actions">

      <button
        className="ghost"
        onClick={onClose}
      >
        Cancel
      </button>

      <button
        className="primary"
        disabled={
          !f.title.trim()
        }
        onClick={() =>
          onSave(f)
        }
      >
        Create Investigation
      </button>

    </div>

  </div>

</Modal>

);
}
/* =========================================================
TABLES / SUPPORT
\========================================================= */
function RiskTable({
rows
}) {
return (
<div className="table-wrap">

  <table>

    <thead>

      <tr>
        <th>USER</th>
        <th>DEPARTMENT</th>
        <th>RISK</th>
        <th>STATUS</th>
      </tr>

    </thead>

    <tbody>

      {rows.map(
        r => (
          <tr
            key={
              r.employee_id
            }
          >

            <td>

              <b>
                {r.name}
              </b>

              <small>
                {r.employee_id}
              </small>

            </td>

            <td>
              {r.department}
            </td>

            <td>

              <div className="score">

                <i
                  style={{
                    width:
                      r.score +
                      '%'
                  }}
                />

                <b>
                  {r.score}
                </b>

              </div>

            </td>

            <td>

              <Badge>
                {r.category.replace(
                  ' Risk',
                  ''
                )}
              </Badge>

            </td>

          </tr>
        )
      )}

    </tbody>

  </table>

</div>

);
}
function IncidentList({
rows
}) {
return (
<div className="incident-list">

  {rows.length
    ? rows.map(
        x => (
          <div
            className="incident"
            key={x.id}
          >

            <div>

              <Badge
                tone={
                  x.severity.toLowerCase()
                }
              >
                {x.severity}
              </Badge>

              <b>
                {x.title}
              </b>

              <span>
                {x.employee_id}
                {' • '}
                {x.status}
              </span>

            </div>

            <span className="incident-arrow">
              →
            </span>

          </div>
        )
      )
    : (
      <Empty
        text="No active investigations"
      />
    )}

</div>

);
}
function PeerComparison({
employee,
risk
}) {
const peers =
risk.filter(
r =>
r.department ===
employee?.department
);
const average =
peers.length
? (
peers.reduce(
(a, b) =>
a + b.score,
0
) /
peers.length
).toFixed(1)
: 0;
const current =
risk.find(
r =>
r.employee_id ===
employee?.employee_id
)?.score || 0;
return (
<div
style={{
padding:
'15px 0'
}}
>

  <Metric
    value={
      current
    }
    label="Current employee risk"
  />

  <Metric
    value={
      average
    }
    label="Department peer average"
  />

  <Metric
    value={
      peers.length
    }
    label="Peer group size"
  />

</div>

);
}
function Empty({
text
}) {
return (
<div className="empty">
{text}
</div>
);
}
function formatBytes(n) {
if (!n) return '0 B';
const u = [
'B',
'KB',
'MB',
'GB'
];
const i =
Math.min(
u.length - 1,
Math.floor(
Math.log(n) /
Math.log(1024)
)
);
return `${(
    n /
    Math.pow(
      1024,
      i
    )
  ).toFixed(
    i ? 1 : 0
  )} ${u[i]}`;
}
/* =========================================================
REPORTS
\========================================================= */
function Reports({
token,
toast
}) {
const dl =
async kind => {

  try {

    const r =
      await fetch(
        API +
          `/api/reports/${kind}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    if (!r.ok)
      throw new Error();

    const b =
      await r.blob();

    const u =
      URL.createObjectURL(
        b
      );

    const a =
      document.createElement(
        'a'
      );

    a.href = u;

    a.download =
      kind === 'pdf'
        ? 'sentinel_insider_threat_report.pdf'
        : 'sentinel_insider_threat_report.xlsx';

    a.click();

    URL.revokeObjectURL(
      u
    );

    toast(
      `${kind.toUpperCase()} report generated`
    );

  } catch (e) {

    toast(
      'Report generation failed'
    );

  }
};

return (
<>
<PageTitle
     title="Reports & Export"
     text="Generate investigation, behavioral analytics and risk assessment deliverables."
   />

  <div className="report-grid">

    {[
      [
        'pdf',
        'Threat Intelligence Report',
        'PDF',
        'Executive risk posture, anomalies, alerts and incidents.'
      ],
      [
        'excel',
        'Behavioral Analytics Workbook',
        'XLSX',
        'Structured employee risk and activity dataset.'
      ]
    ].map(
      r => (
        <div
          className="report-card"
          key={r[0]}
        >

          <div className="file-icon">
            {r[1][0]}
          </div>

          <span>
            {r[2]}
          </span>

          <h3>
            {r[1]}
          </h3>

          <p>
            {r[3]}
          </p>

          <button
            className="primary"
            onClick={() =>
              dl(r[0])
            }
          >
            Generate report →
          </button>

        </div>
      )
    )}

  </div>
</>

);
}
/* =========================================================
START REACT
\========================================================= */
createRoot(
document.getElementById(
'root'
)
).render(
<App />
);