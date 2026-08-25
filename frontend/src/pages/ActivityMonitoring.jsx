import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";

const API_BASE_URL = "http://127.0.0.1:8000";
const PAGE_SIZE = 20;

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("access_token")
  );
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString();
}

function formatDate(value) {
  if (!value) {
    return "No data";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function ActivityMonitoring() {
  const [activityType, setActivityType] = useState("all");

  const [employeeId, setEmployeeId] = useState("");
  const [searchEmployee, setSearchEmployee] = useState("");

  const [summaryLoading, setSummaryLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);

  const [error, setError] = useState("");

  const [data, setData] = useState({
    logon: [],
    email: [],
    file: [],
    http: [],
    device: [],
  });

  const [summary, setSummary] = useState({
    logon: 0,
    email: 0,
    file: 0,
    http: 0,
    device: 0,
  });

  // ============================================================
  // API HELPER
  // ============================================================

  async function fetchJSON(endpoint) {
    const token = getToken();

    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "Authentication expired. Please login again."
        );
      }

      const message = await response.text();

      throw new Error(
        message || `Request failed: ${response.status}`
      );
    }

    return response.json();
  }

  // ============================================================
  // LOAD SUMMARY ONLY
  // ============================================================

  async function loadSummaries() {
    setSummaryLoading(true);
    setError("");

    try {
      const [
        logonSummary,
        emailSummary,
        fileSummary,
        httpSummary,
        deviceSummary,
      ] = await Promise.all([
        fetchJSON("/logon/summary"),
        fetchJSON("/email/summary"),
        fetchJSON("/files/summary"),
        fetchJSON("/http/summary"),
        fetchJSON("/device/summary"),
      ]);

      setSummary({
        logon: Number(logonSummary.total || 0),
        email: Number(emailSummary.total || 0),
        file: Number(fileSummary.total || 0),
        http: Number(httpSummary.total || 0),
        device: Number(deviceSummary.total || 0),
      });
    } catch (err) {
      console.error("Summary loading error:", err);

      setError(
        err.message ||
          "Unable to load activity summary."
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  // ============================================================
  // LOAD ACTIVITY DATA
  // ============================================================

  async function loadActivity(
    selectedType = activityType,
    selectedEmployee = employeeId
  ) {
    setActivityLoading(true);
    setError("");

    try {
      const types =
        selectedType === "all"
          ? ["logon", "email", "file", "http", "device"]
          : [selectedType];

      const requests = types.map(async (type) => {
        let endpoint = "";

        if (selectedEmployee.trim()) {
          endpoint =
            `/${getEndpointName(type)}/user/` +
            encodeURIComponent(
              selectedEmployee.trim()
            );
        } else {
          endpoint =
            `/${getEndpointName(type)}/` +
            `?skip=0&limit=${PAGE_SIZE}`;
        }

        const result = await fetchJSON(endpoint);

        return {
          type,
          data: Array.isArray(result)
            ? result
            : [],
        };
      });

      const results = await Promise.all(requests);

      const newData = {
        logon: [],
        email: [],
        file: [],
        http: [],
        device: [],
      };

      results.forEach((result) => {
        newData[result.type] = result.data;
      });

      setData(newData);
    } catch (err) {
      console.error("Activity loading error:", err);

      setError(
        err.message ||
          "Unable to load activity data."
      );
    } finally {
      setActivityLoading(false);
    }
  }

  function getEndpointName(type) {
    const endpoints = {
      logon: "logon",
      email: "email",
      file: "files",
      http: "http",
      device: "device",
    };

    return endpoints[type];
  }

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadSummaries();
    loadActivity("all", "");
  }, []);

  // ============================================================
  // ACTIVITY TYPE CHANGE
  // ============================================================

  useEffect(() => {
    if (!summaryLoading) {
      loadActivity(
        activityType,
        employeeId
      );
    }
  }, [activityType]);

  // ============================================================
  // SEARCH
  // ============================================================

  async function applyEmployeeSearch() {
    const value =
      searchEmployee.trim();

    setEmployeeId(value);

    await loadActivity(
      activityType,
      value
    );
  }

  // ============================================================
  // CLEAR SEARCH
  // ============================================================

  async function clearEmployeeSearch() {
    setSearchEmployee("");
    setEmployeeId("");

    await loadActivity(
      activityType,
      ""
    );
  }

  // ============================================================
  // REFRESH
  // ============================================================

  async function refreshPage() {
    await Promise.all([
      loadSummaries(),
      loadActivity(
        activityType,
        employeeId
      ),
    ]);
  }

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div>
          <p className="text-cyan-400 text-sm font-medium">
            SECURITY OPERATIONS
          </p>

          <h1 className="text-3xl font-bold text-white mt-1">
            Activity Monitoring
          </h1>

          <p className="text-gray-500 mt-2">
            Monitor employee logon, email, file,
            web and device activities.
          </p>
        </div>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4">
            <p className="text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* ====================================================
            FILTER
        ==================================================== */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Employee */}

            <div>
              <label className="text-gray-400 text-sm">
                Employee ID
              </label>

              <input
                value={searchEmployee}
                onChange={(event) =>
                  setSearchEmployee(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    applyEmployeeSearch();
                  }
                }}
                placeholder="Example: MOH0273"
                className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-cyan-400"
              />
            </div>

            {/* Activity */}

            <div>
              <label className="text-gray-400 text-sm">
                Activity Type
              </label>

              <select
                value={activityType}
                onChange={(event) =>
                  setActivityType(
                    event.target.value
                  )
                }
                className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-400"
              >
                <option value="all">
                  All Activities
                </option>

                <option value="logon">
                  Logon
                </option>

                <option value="email">
                  Email
                </option>

                <option value="file">
                  File
                </option>

                <option value="http">
                  HTTP
                </option>

                <option value="device">
                  Device
                </option>
              </select>
            </div>

            {/* Buttons */}

            <div className="flex items-end gap-2">

              <button
                onClick={applyEmployeeSearch}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg px-4 py-3 transition"
              >
                Search
              </button>

              <button
                onClick={clearEmployeeSearch}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg transition"
              >
                Clear
              </button>

              <button
                onClick={refreshPage}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg transition"
                title="Refresh"
              >
                ↻
              </button>

            </div>

          </div>

          {employeeId && (
            <div className="mt-4 text-sm">

              <span className="text-gray-500">
                Showing activity for:
              </span>

              <span className="text-cyan-400 ml-2 font-semibold">
                {employeeId}
              </span>

            </div>
          )}

        </div>

        {/* ====================================================
            SUMMARY
        ==================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">

          <SummaryCard
            title="Logon Events"
            value={summary.logon}
            textColor="text-cyan-400"
            loading={summaryLoading}
          />

          <SummaryCard
            title="Email Events"
            value={summary.email}
            textColor="text-blue-400"
            loading={summaryLoading}
          />

          <SummaryCard
            title="File Events"
            value={summary.file}
            textColor="text-orange-400"
            loading={summaryLoading}
          />

          <SummaryCard
            title="HTTP Events"
            value={summary.http}
            textColor="text-purple-400"
            loading={summaryLoading}
          />

          <SummaryCard
            title="Device Events"
            value={summary.device}
            textColor="text-green-400"
            loading={summaryLoading}
          />

        </div>

        {/* ====================================================
            ACTIVITY LOADING
        ==================================================== */}

        {activityLoading && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">

            <p className="text-cyan-400">
              Loading selected activity...
            </p>

            <p className="text-gray-500 text-sm mt-1">
              Fetching monitoring events from the server.
            </p>

          </div>
        )}

        {/* ====================================================
            LOGON
        ==================================================== */}

        {!activityLoading &&
          (activityType === "all" ||
            activityType === "logon") && (
            <LogonTable
              data={data.logon}
            />
          )}

        {/* ====================================================
            EMAIL
        ==================================================== */}

        {!activityLoading &&
          (activityType === "all" ||
            activityType === "email") && (
            <EmailTable
              data={data.email}
            />
          )}

        {/* ====================================================
            FILE
        ==================================================== */}

        {!activityLoading &&
          (activityType === "all" ||
            activityType === "file") && (
            <FileTable
              data={data.file}
            />
          )}

        {/* ====================================================
            HTTP
        ==================================================== */}

        {!activityLoading &&
          (activityType === "all" ||
            activityType === "http") && (
            <HttpTable
              data={data.http}
            />
          )}

        {/* ====================================================
            DEVICE
        ==================================================== */}

        {!activityLoading &&
          (activityType === "all" ||
            activityType === "device") && (
            <DeviceTable
              data={data.device}
            />
          )}

      </div>
    </MainLayout>
  );
}


/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  title,
  value,
  textColor,
  loading,
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

      <p className="text-gray-500 text-sm">
        {title}
      </p>

      {loading ? (
        <p className="text-gray-600 text-2xl font-bold mt-2">
          ...
        </p>
      ) : (
        <p
          className={`text-3xl font-bold mt-2 ${textColor}`}
        >
          {formatNumber(value)}
        </p>
      )}

    </div>
  );
}


/* ============================================================
   EMPTY TABLE
============================================================ */

function EmptyTable({
  columns,
  message,
}) {
  return (
    <tr>
      <td
        colSpan={columns}
        className="px-5 py-8 text-center text-gray-600"
      >
        {message}
      </td>
    </tr>
  );
}


/* ============================================================
   TABLE HEADER
============================================================ */

function TableHeader({
  title,
  description,
}) {
  return (
    <div className="px-5 py-4 border-b border-slate-800">

      <h2 className="text-white font-semibold">
        {title}
      </h2>

      <p className="text-gray-500 text-sm mt-1">
        {description}
      </p>

    </div>
  );
}


/* ============================================================
   TABLE CELL
============================================================ */

function Td({
  children,
  cyan = false,
}) {
  return (
    <td
      className={`px-5 py-3 text-sm ${
        cyan
          ? "text-cyan-400"
          : "text-gray-300"
      }`}
    >
      {children}
    </td>
  );
}


/* ============================================================
   TABLE HEADER CELL
============================================================ */

function Th({ children }) {
  return (
    <th className="text-left px-5 py-3 text-gray-500 text-xs uppercase tracking-wider">
      {children}
    </th>
  );
}


/* ============================================================
   LOGON TABLE
============================================================ */

function LogonTable({ data }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

      <TableHeader
        title="Logon Activity"
        description="User login and logout events"
      />

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead>
            <tr className="border-b border-slate-800">
              <Th>Event ID</Th>
              <Th>User</Th>
              <Th>Computer</Th>
              <Th>Activity</Th>
              <Th>Time</Th>
            </tr>
          </thead>

          <tbody>

            {data.length === 0 ? (
              <EmptyTable
                columns={5}
                message="No logon activity found."
              />
            ) : (
              data
                .slice(0, PAGE_SIZE)
                .map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-800 hover:bg-slate-800/40"
                  >
                    <Td cyan>
                      {item.event_id}
                    </Td>

                    <Td>
                      {item.user_id}
                    </Td>

                    <Td>
                      {item.pc}
                    </Td>

                    <Td>
                      <span
                        className={
                          String(item.activity)
                            .toLowerCase() ===
                          "logon"
                            ? "text-green-400"
                            : "text-orange-400"
                        }
                      >
                        {item.activity}
                      </span>
                    </Td>

                    <Td>
                      {formatDate(
                        item.event_time
                      )}
                    </Td>
                  </tr>
                ))
            )}

          </tbody>

        </table>
      </div>
    </section>
  );
}


/* ============================================================
   EMAIL TABLE
============================================================ */

function EmailTable({ data }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

      <TableHeader
        title="Email Activity"
        description="Employee email communication and attachments"
      />

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead>
            <tr className="border-b border-slate-800">
              <Th>Event ID</Th>
              <Th>User</Th>
              <Th>Sender</Th>
              <Th>Computer</Th>
              <Th>Size</Th>
              <Th>Time</Th>
            </tr>
          </thead>

          <tbody>

            {data.length === 0 ? (
              <EmptyTable
                columns={6}
                message="No email activity found."
              />
            ) : (
              data
                .slice(0, PAGE_SIZE)
                .map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-800 hover:bg-slate-800/40"
                  >
                    <Td cyan>
                      {item.event_id}
                    </Td>

                    <Td>
                      {item.user_id}
                    </Td>

                    <Td>
                      {item.sender}
                    </Td>

                    <Td>
                      {item.pc}
                    </Td>

                    <Td>
                      {formatNumber(
                        item.email_size
                      )}
                    </Td>

                    <Td>
                      {formatDate(
                        item.event_time
                      )}
                    </Td>
                  </tr>
                ))
            )}

          </tbody>

        </table>
      </div>
    </section>
  );
}


/* ============================================================
   FILE TABLE
============================================================ */

function FileTable({ data }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

      <TableHeader
        title="File Activity"
        description="Employee file access and operations"
      />

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead>
            <tr className="border-b border-slate-800">
              <Th>Event ID</Th>
              <Th>User</Th>
              <Th>Computer</Th>
              <Th>File</Th>
              <Th>Time</Th>
            </tr>
          </thead>

          <tbody>

            {data.length === 0 ? (
              <EmptyTable
                columns={5}
                message="No file activity found."
              />
            ) : (
              data
                .slice(0, PAGE_SIZE)
                .map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-800 hover:bg-slate-800/40"
                  >
                    <Td cyan>
                      {item.event_id}
                    </Td>

                    <Td>
                      {item.user_id}
                    </Td>

                    <Td>
                      {item.pc}
                    </Td>

                    <Td>
                      {item.filename}
                    </Td>

                    <Td>
                      {formatDate(
                        item.event_time
                      )}
                    </Td>
                  </tr>
                ))
            )}

          </tbody>

        </table>
      </div>
    </section>
  );
}


/* ============================================================
   HTTP TABLE
============================================================ */

function HttpTable({ data }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

      <TableHeader
        title="HTTP Activity"
        description="Employee web access and browsing activity"
      />

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead>
            <tr className="border-b border-slate-800">
              <Th>Event ID</Th>
              <Th>User</Th>
              <Th>Computer</Th>
              <Th>Website</Th>
              <Th>Time</Th>
            </tr>
          </thead>

          <tbody>

            {data.length === 0 ? (
              <EmptyTable
                columns={5}
                message="No HTTP activity found."
              />
            ) : (
              data
                .slice(0, PAGE_SIZE)
                .map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-800 hover:bg-slate-800/40"
                  >
                    <Td cyan>
                      {item.event_id}
                    </Td>

                    <Td>
                      {item.user_id}
                    </Td>

                    <Td>
                      {item.pc}
                    </Td>

                    <Td>
                      <span
                        className="max-w-xs block truncate"
                        title={item.url}
                      >
                        {item.url}
                      </span>
                    </Td>

                    <Td>
                      {formatDate(
                        item.event_time
                      )}
                    </Td>
                  </tr>
                ))
            )}

          </tbody>

        </table>
      </div>
    </section>
  );
}


/* ============================================================
   DEVICE TABLE
============================================================ */

function DeviceTable({ data }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

      <TableHeader
        title="Device Activity"
        description="Employee device connection activity"
      />

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead>
            <tr className="border-b border-slate-800">
              <Th>Event ID</Th>
              <Th>User</Th>
              <Th>Computer</Th>
              <Th>Activity</Th>
              <Th>Time</Th>
            </tr>
          </thead>

          <tbody>

            {data.length === 0 ? (
              <EmptyTable
                columns={5}
                message="No device activity found."
              />
            ) : (
              data
                .slice(0, PAGE_SIZE)
                .map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-800 hover:bg-slate-800/40"
                  >
                    <Td cyan>
                      {item.event_id}
                    </Td>

                    <Td>
                      {item.user_id}
                    </Td>

                    <Td>
                      {item.pc}
                    </Td>

                    <Td>
                      {item.activity}
                    </Td>

                    <Td>
                      {formatDate(
                        item.event_time
                      )}
                    </Td>
                  </tr>
                ))
            )}

          </tbody>

        </table>
      </div>
    </section>
  );
}

export default ActivityMonitoring;