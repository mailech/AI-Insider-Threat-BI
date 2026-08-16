const state = {
  token: localStorage.getItem("itbi_token"),
  user: null,
  employees: [],
  activity: [],
  dashboard: null,
  trends: [],
};

const viewTitles = {
  dashboardView: "Command overview",
  employeesView: "Employee profiles",
  activityView: "Activity monitoring",
  ingestionView: "Log ingestion",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function levelClass(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "-");
}

function formatDate(value) {
  if (!value) return "";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.add("hidden"), 3200);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = payload?.detail;
    const message = typeof detail === "string" ? detail : "Request failed.";
    if (response.status === 401) {
      logout(false);
    }
    throw new Error(message);
  }
  return payload;
}

function setAuthenticatedView(enabled) {
  $("#loginScreen").classList.toggle("hidden", enabled);
  $("#appShell").classList.toggle("hidden", !enabled);
}

function applyUser(user) {
  state.user = user;
  $("#userName").textContent = user.full_name;
  $("#userRole").textContent = user.role_label;
  $("#rolePill").textContent = user.role_label;
  $("#userInitials").textContent = initials(user.full_name);
}

function logout(showMessage = true) {
  state.token = null;
  state.user = null;
  localStorage.removeItem("itbi_token");
  setAuthenticatedView(false);
  if (showMessage) showToast("Signed out.");
}

async function login(event) {
  event.preventDefault();
  $("#loginError").textContent = "";
  const email = $("#loginEmail").value.trim();
  const password = $("#loginPassword").value;

  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    state.token = result.access_token;
    localStorage.setItem("itbi_token", state.token);
    applyUser(result.user);
    setAuthenticatedView(true);
    await hydrate();
    showToast("Session ready.");
  } catch (error) {
    $("#loginError").textContent = error.message;
  }
}

async function boot() {
  bindEvents();
  if (!state.token) {
    setAuthenticatedView(false);
    return;
  }

  try {
    const user = await api("/api/auth/me");
    applyUser(user);
    setAuthenticatedView(true);
    await hydrate();
  } catch {
    setAuthenticatedView(false);
  }
}

async function hydrate() {
  await Promise.all([
    loadDashboard(),
    loadEmployees(),
    loadActivity(),
    loadSources(),
  ]);
}

async function loadDashboard() {
  const [summary, trends] = await Promise.all([
    api("/api/dashboard/summary"),
    api("/api/dashboard/trends"),
  ]);
  state.dashboard = summary;
  state.trends = trends.trend;
  renderDashboard();
}

function renderDashboard() {
  const kpis = state.dashboard.kpis;
  const cards = [
    ["Employees monitored", kpis.employees, "Active identity profiles"],
    ["Events in 24h", kpis.events_24h, "Recent telemetry"],
    ["Active alerts", kpis.active_alerts, "High and critical events"],
    ["Average risk", `${kpis.average_risk}%`, "Profile risk index"],
  ];
  $("#kpiGrid").innerHTML = cards.map(([label, value, note]) => `
    <article class="kpi-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <em>${escapeHtml(note)}</em>
    </article>
  `).join("");

  renderTrend();
  renderSeverityBars();
  renderWatchlist();
  renderLatestActivity();
}

function renderTrend() {
  const max = Math.max(1, ...state.trends.map((item) => item.events));
  $("#trendChart").innerHTML = state.trends.map((item) => {
    const eventHeight = Math.max(4, (item.events / max) * 100);
    const elevatedHeight = Math.max(item.elevated ? 4 : 0, (item.elevated / max) * 100);
    const date = new Date(`${item.day}T00:00:00`);
    const label = date.toLocaleDateString([], { weekday: "short" });
    return `
      <div class="bar-slot" title="${escapeHtml(item.events)} events">
        <div class="bar-track">
          <div class="bar-fill" style="height:${eventHeight}%"></div>
          <div class="bar-fill elevated" style="height:${elevatedHeight}%"></div>
        </div>
        <div class="bar-label">${escapeHtml(label)}</div>
      </div>
    `;
  }).join("");
}

function renderSeverityBars() {
  const distribution = state.dashboard.severity_distribution;
  const entries = Object.entries(distribution);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  $("#severityBars").innerHTML = entries.map(([level, value]) => {
    const percent = Math.max(value ? 4 : 0, (value / max) * 100);
    const cls = level === "Informational" ? "info" : levelClass(level);
    return `
      <div class="severity-row">
        <strong>${escapeHtml(level)}</strong>
        <div class="severity-track">
          <div class="severity-fill ${cls}" style="width:${percent}%"></div>
        </div>
        <span>${escapeHtml(value)}</span>
      </div>
    `;
  }).join("");
}

function renderWatchlist() {
  const items = state.dashboard.elevated_employees;
  $("#watchlist").innerHTML = items.length ? items.map((employee) => `
    <div class="watch-item">
      <div>
        <strong>${escapeHtml(employee.full_name)}</strong>
        <span>${escapeHtml(employee.employee_id)} - ${escapeHtml(employee.department)} - ${escapeHtml(employee.designation)}</span>
      </div>
      <span class="risk-badge ${levelClass(employee.risk_level)}">${escapeHtml(employee.risk_score)} ${escapeHtml(employee.risk_level)}</span>
    </div>
  `).join("") : `<p class="form-note">No elevated profiles.</p>`;
}

function renderLatestActivity() {
  const items = state.dashboard.latest_activity;
  $("#latestActivity").innerHTML = items.map((event) => `
    <div class="activity-item">
      <div>
        <strong>${escapeHtml(event.event_type)}</strong>
        <span>${escapeHtml(event.employee_name)} - ${escapeHtml(event.description)}</span>
      </div>
      <span class="severity-badge ${levelClass(event.severity)}">${escapeHtml(event.severity)}</span>
    </div>
  `).join("");
}

async function loadEmployees() {
  state.employees = await api("/api/employees");
  renderEmployees();
  renderEmployeeOptions();
}

function renderEmployees(source = state.employees) {
  $("#employeesTable").innerHTML = source.map((employee) => `
    <tr>
      <td>
        <strong>${escapeHtml(employee.full_name)}</strong>
        <small>${escapeHtml(employee.employee_id)} - ${escapeHtml(employee.designation)}</small>
      </td>
      <td>${escapeHtml(employee.department)}</td>
      <td>${escapeHtml(employee.device_info)}</td>
      <td>${escapeHtml(employee.access_privileges)}</td>
      <td><span class="risk-badge ${levelClass(employee.risk_level)}">${escapeHtml(employee.risk_score)} ${escapeHtml(employee.risk_level)}</span></td>
      <td>${escapeHtml(employee.status.replace("_", " "))}</td>
    </tr>
  `).join("");
}

function filterEmployees() {
  const term = $("#employeeSearch").value.trim().toLowerCase();
  if (!term) {
    renderEmployees();
    return;
  }
  const filtered = state.employees.filter((employee) => [
    employee.employee_id,
    employee.full_name,
    employee.department,
    employee.designation,
    employee.manager,
  ].some((value) => String(value).toLowerCase().includes(term)));
  renderEmployees(filtered);
}

function renderEmployeeOptions() {
  const options = state.employees.map((employee) => `
    <option value="${escapeHtml(employee.employee_id)}">${escapeHtml(employee.employee_id)} - ${escapeHtml(employee.full_name)}</option>
  `).join("");
  $("#ingestEmployeeSelect").innerHTML = options;
}

async function createEmployee(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  data.risk_score = Number(data.risk_score);

  try {
    await api("/api/employees", {
      method: "POST",
      body: JSON.stringify(data),
    });
    form.reset();
    form.elements.risk_score.value = 25;
    $("#employeeFormStatus").textContent = "Profile created.";
    await Promise.all([loadEmployees(), loadDashboard()]);
  } catch (error) {
    $("#employeeFormStatus").textContent = error.message;
  }
}

async function loadActivity() {
  const params = new URLSearchParams({ limit: "100" });
  const employee = $("#activityEmployeeFilter")?.value.trim();
  const severity = $("#activitySeverityFilter")?.value;
  if (employee) params.set("employee_id", employee);
  if (severity) params.set("severity", severity);
  state.activity = await api(`/api/activity?${params.toString()}`);
  renderActivity();
}

function renderActivity() {
  $("#activityTable").innerHTML = state.activity.map((event) => `
    <tr>
      <td>${escapeHtml(formatDate(event.event_time))}</td>
      <td>
        <strong>${escapeHtml(event.employee_name)}</strong>
        <small>${escapeHtml(event.employee_ref)} - ${escapeHtml(event.department)}</small>
      </td>
      <td>
        <strong>${escapeHtml(event.event_type)}</strong>
        <small>${escapeHtml(event.description)}</small>
      </td>
      <td>${escapeHtml(event.source)}</td>
      <td>${escapeHtml(event.asset || "-")}</td>
      <td><span class="severity-badge ${levelClass(event.severity)}">${escapeHtml(event.severity)}</span></td>
    </tr>
  `).join("");
}

async function ingestActivity(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {
    source: data.source,
    events: [
      {
        employee_id: data.employee_id,
        event_type: data.event_type,
        severity: data.severity,
        asset: data.asset,
        description: data.description,
      },
    ],
  };

  try {
    const result = await api("/api/activity/ingest", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    $("#ingestionStatus").textContent = `Batch ${result.batch_id}: ${result.accepted} accepted.`;
    await Promise.all([loadDashboard(), loadEmployees(), loadActivity(), loadSources()]);
  } catch (error) {
    $("#ingestionStatus").textContent = error.message;
  }
}

async function loadSources() {
  const result = await api("/api/activity/sources");
  $("#sourcesList").innerHTML = result.sources.map((source) => `
    <div class="source-row">
      <div>
        <strong>${escapeHtml(source.source)}</strong>
        <span>Last seen ${escapeHtml(formatDate(source.last_seen))}</span>
      </div>
      <span class="role-pill">${escapeHtml(source.event_count)} events</span>
    </div>
  `).join("");
}

function switchView(viewId) {
  $$(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
  $$(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });
  $("#viewTitle").textContent = viewTitles[viewId];
}

function bindEvents() {
  $("#loginForm").addEventListener("submit", login);
  $("#logoutButton").addEventListener("click", () => logout());
  $("#refreshDashboard").addEventListener("click", () => {
    loadDashboard().then(() => showToast("Dashboard refreshed.")).catch((error) => showToast(error.message));
  });
  $("#employeeSearch").addEventListener("input", filterEmployees);
  $("#employeeForm").addEventListener("submit", createEmployee);
  $("#ingestionForm").addEventListener("submit", ingestActivity);
  $("#filterActivityButton").addEventListener("click", () => {
    loadActivity().catch((error) => showToast(error.message));
  });
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
  $("#newEmployeeButton").addEventListener("click", () => {
    $("#employeeFormPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

document.addEventListener("DOMContentLoaded", boot);
