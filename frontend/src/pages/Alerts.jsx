import { useEffect, useState } from "react";
import {
  FaExclamationTriangle,
  FaSearch,
  FaSyncAlt,
  FaUserShield,
  FaClock,
  FaCheckCircle,
} from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

function Alerts() {
  // ============================================================
  // STATE
  // ============================================================

  const [alerts, setAlerts] = useState([]);

  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    high: 0,
    critical: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedAlert, setSelectedAlert] = useState(null);

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [analystName, setAnalystName] = useState("");

  const [page, setPage] = useState(0);

  const limit = 20;

  // ============================================================
  // LOAD ALERT DATA
  // ============================================================

  useEffect(() => {
    loadAlerts();
  }, [page]);

  const loadAlerts = async () => {
    try {
      setError("");

      if (alerts.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const [alertsResponse, summaryResponse] =
        await Promise.all([
          api.get("/alerts/", {
            params: {
              skip: page * limit,
              limit,
            },
          }),

          api.get("/alerts/summary"),
        ]);

      setAlerts(
        Array.isArray(alertsResponse.data)
          ? alertsResponse.data
          : []
      );

      setSummary({
        total: Number(
          summaryResponse.data?.total || 0
        ),

        open: Number(
          summaryResponse.data?.open || 0
        ),

        in_progress: Number(
          summaryResponse.data?.in_progress || 0
        ),

        resolved: Number(
          summaryResponse.data?.resolved || 0
        ),

        high: Number(
          summaryResponse.data?.high || 0
        ),

        critical: Number(
          summaryResponse.data?.critical || 0
        ),
      });

    } catch (err) {
      console.error(
        "Alert loading error:",
        err
      );

      if (err.response?.status === 401) {
        setError(
          "Authentication expired. Please login again."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            "Unable to load alert data."
        );
      }

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ============================================================
  // GET SINGLE ALERT
  // ============================================================

  const viewAlert = async (alertId) => {
    try {
      setError("");

      const response = await api.get(
        `/alerts/${alertId}`
      );

      setSelectedAlert(response.data);

      setAnalystName(
        response.data?.assigned_analyst || ""
      );

    } catch (err) {
      console.error(
        "Alert details error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to load alert details."
      );
    }
  };

  // ============================================================
  // UPDATE STATUS
  // ============================================================

  const updateStatus = async (status) => {
    if (!selectedAlert) {
      return;
    }

    try {
      setStatusUpdating(true);
      setError("");

      const response = await api.put(
        `/alerts/${selectedAlert.id}/status`,
        {
          status,
        }
      );

      setSelectedAlert(response.data);

      await loadAlerts();

    } catch (err) {
      console.error(
        "Status update error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to update alert status."
      );

    } finally {
      setStatusUpdating(false);
    }
  };

  // ============================================================
  // ASSIGN ANALYST
  // ============================================================

  const assignAnalyst = async () => {
    if (!selectedAlert) {
      return;
    }

    if (!analystName.trim()) {
      setError(
        "Please enter an analyst name."
      );

      return;
    }

    try {
      setAssigning(true);
      setError("");

      const response = await api.put(
        `/alerts/${selectedAlert.id}/assign`,
        {
          assigned_analyst:
            analystName.trim(),
        }
      );

      setSelectedAlert(response.data);

      await loadAlerts();

    } catch (err) {
      console.error(
        "Assignment error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to assign analyst."
      );

    } finally {
      setAssigning(false);
    }
  };

  // ============================================================
  // STATUS BADGE
  // ============================================================

  const getStatusClass = (status) => {
    if (status === "Open") {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }

    if (status === "In Progress") {
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    }

    if (status === "Resolved") {
      return "bg-green-500/10 text-green-400 border-green-500/20";
    }

    return "bg-slate-700 text-gray-300 border-slate-600";
  };

  // ============================================================
  // SEVERITY BADGE
  // ============================================================

  const getSeverityClass = (severity) => {
    if (severity === "Critical") {
      return "bg-red-500/15 text-red-400 border-red-500/30";
    }

    return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  };

  // ============================================================
  // DATE FORMATTER
  // ============================================================

  const formatDate = (value) => {
    if (!value) {
      return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <MainLayout>

      {/* ======================================================
          HEADER
      ======================================================= */}

      <div className="mb-6">

        <div className="flex items-center justify-between gap-4">

          <div>

            <h1 className="text-2xl font-bold text-white">
              Alerts
            </h1>

            <p className="text-gray-500 text-sm mt-1">
              Insider threat alerts and incident management
            </p>

          </div>

          <button
            type="button"
            onClick={loadAlerts}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-gray-300 hover:text-white hover:bg-slate-700 transition disabled:opacity-50"
          >

            <FaSyncAlt
              size={13}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh

          </button>

        </div>

      </div>


      {/* ======================================================
          ERROR
      ======================================================= */}

      {error && (

        <div className="mb-5 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">

          {error}

        </div>

      )}


      {/* ======================================================
          SUMMARY CARDS
      ======================================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">

          <p className="text-gray-500 text-xs">
            Total Alerts
          </p>

          <p className="text-white text-2xl font-bold mt-2">
            {summary.total}
          </p>

        </div>


        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-4">

          <p className="text-gray-500 text-xs">
            Open
          </p>

          <p className="text-red-400 text-2xl font-bold mt-2">
            {summary.open}
          </p>

        </div>


        <div className="bg-slate-900 border border-yellow-500/20 rounded-xl p-4">

          <p className="text-gray-500 text-xs">
            In Progress
          </p>

          <p className="text-yellow-400 text-2xl font-bold mt-2">
            {summary.in_progress}
          </p>

        </div>


        <div className="bg-slate-900 border border-green-500/20 rounded-xl p-4">

          <p className="text-gray-500 text-xs">
            Resolved
          </p>

          <p className="text-green-400 text-2xl font-bold mt-2">
            {summary.resolved}
          </p>

        </div>


        <div className="bg-slate-900 border border-orange-500/20 rounded-xl p-4">

          <p className="text-gray-500 text-xs">
            High
          </p>

          <p className="text-orange-400 text-2xl font-bold mt-2">
            {summary.high}
          </p>

        </div>


        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-4">

          <p className="text-gray-500 text-xs">
            Critical
          </p>

          <p className="text-red-400 text-2xl font-bold mt-2">
            {summary.critical}
          </p>

        </div>

      </div>


      {/* ======================================================
          ALERT TABLE
      ======================================================= */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

        <div className="px-5 py-4 border-b border-slate-800">

          <div className="flex items-center gap-2">

            <FaExclamationTriangle
              className="text-cyan-400"
            />

            <h2 className="text-white font-semibold">
              Security Alerts
            </h2>

          </div>

        </div>


        {loading ? (

          <div className="p-10 text-center text-gray-500">
            Loading alerts...
          </div>

        ) : alerts.length === 0 ? (

          <div className="p-10 text-center">

            <FaCheckCircle
              className="mx-auto text-green-400 mb-3"
              size={28}
            />

            <p className="text-white font-medium">
              No alerts found
            </p>

            <p className="text-gray-500 text-sm mt-1">
              There are no alert records for this page.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="text-left text-gray-500 text-xs border-b border-slate-800">

                  <th className="px-5 py-3">
                    ID
                  </th>

                  <th className="px-5 py-3">
                    Employee
                  </th>

                  <th className="px-5 py-3">
                    Severity
                  </th>

                  <th className="px-5 py-3">
                    Status
                  </th>

                  <th className="px-5 py-3">
                    Assigned Analyst
                  </th>

                  <th className="px-5 py-3">
                    Created
                  </th>

                  <th className="px-5 py-3 text-right">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {alerts.map((alert) => (

                  <tr
                    key={alert.id}
                    className="border-b border-slate-800/70 hover:bg-slate-800/40 transition"
                  >

                    <td className="px-5 py-4 text-gray-400 text-sm">
                      #{alert.id}
                    </td>


                    <td className="px-5 py-4">

                      <div className="flex items-center gap-2">

                        <FaUserShield
                          className="text-cyan-400"
                          size={13}
                        />

                        <span className="text-white text-sm font-medium">
                          {alert.employee_id}
                        </span>

                      </div>

                    </td>


                    <td className="px-5 py-4">

                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-medium ${getSeverityClass(
                          alert.severity
                        )}`}
                      >
                        {alert.severity}
                      </span>

                    </td>


                    <td className="px-5 py-4">

                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-medium ${getStatusClass(
                          alert.status
                        )}`}
                      >
                        {alert.status}
                      </span>

                    </td>


                    <td className="px-5 py-4 text-gray-400 text-sm">

                      {alert.assigned_analyst ||
                        "Unassigned"}

                    </td>


                    <td className="px-5 py-4 text-gray-500 text-sm">

                      <div className="flex items-center gap-2">

                        <FaClock size={11} />

                        {formatDate(
                          alert.created_at
                        )}

                      </div>

                    </td>


                    <td className="px-5 py-4 text-right">

                      <button
                        type="button"
                        onClick={() =>
                          viewAlert(alert.id)
                        }
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/20 transition"
                      >

                        <FaSearch size={11} />

                        View

                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}


        {/* ====================================================
            PAGINATION
        ===================================================== */}

        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800">

          <button
            type="button"
            disabled={page === 0 || loading}
            onClick={() =>
              setPage(
                (current) =>
                  Math.max(
                    current - 1,
                    0
                  )
              )
            }
            className="px-3 py-1.5 rounded-md bg-slate-800 text-gray-300 text-xs hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>


          <span className="text-gray-500 text-xs">
            Page {page + 1}
          </span>


          <button
            type="button"
            disabled={
              loading ||
              alerts.length < limit ||
              (page + 1) * limit >= summary.total
            }
            onClick={() =>
              setPage(
                (current) =>
                  current + 1
              )
            }
            className="px-3 py-1.5 rounded-md bg-slate-800 text-gray-300 text-xs hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>

        </div>

      </div>


      {/* ======================================================
          ALERT DETAILS MODAL
      ======================================================= */}

      {selectedAlert && (

        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">

          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">

            {/* Modal Header */}

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">

              <div>

                <p className="text-gray-500 text-xs">
                  Alert #{selectedAlert.id}
                </p>

                <h2 className="text-white font-semibold text-lg mt-1">
                  {selectedAlert.employee_id}
                </h2>

              </div>


              <button
                type="button"
                onClick={() =>
                  setSelectedAlert(null)
                }
                className="text-gray-500 hover:text-white text-xl"
              >
                ×
              </button>

            </div>


            {/* Modal Content */}

            <div className="p-6 space-y-6">

              <div className="flex flex-wrap gap-2">

                <span
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium ${getSeverityClass(
                    selectedAlert.severity
                  )}`}
                >
                  Severity: {selectedAlert.severity}
                </span>


                <span
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium ${getStatusClass(
                    selectedAlert.status
                  )}`}
                >
                  Status: {selectedAlert.status}
                </span>

              </div>


              {/* Description */}

              <div>

                <p className="text-gray-500 text-xs uppercase tracking-wider">
                  Description
                </p>

                <div className="mt-2 p-4 rounded-lg bg-slate-800 text-gray-300 text-sm leading-6">
                  {selectedAlert.description ||
                    "No description available."}
                </div>

              </div>


              {/* Metadata */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="bg-slate-800 rounded-lg p-4">

                  <p className="text-gray-500 text-xs">
                    Created
                  </p>

                  <p className="text-white text-sm mt-1">
                    {formatDate(
                      selectedAlert.created_at
                    )}
                  </p>

                </div>


                <div className="bg-slate-800 rounded-lg p-4">

                  <p className="text-gray-500 text-xs">
                    Resolved
                  </p>

                  <p className="text-white text-sm mt-1">
                    {formatDate(
                      selectedAlert.resolved_at
                    )}
                  </p>

                </div>

              </div>


              {/* Assign Analyst */}

              <div>

                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                  Assign Analyst
                </p>

                <div className="flex gap-2">

                  <input
                    type="text"
                    value={analystName}
                    onChange={(event) =>
                      setAnalystName(
                        event.target.value
                      )
                    }
                    placeholder="Enter analyst name"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500"
                  />

                  <button
                    type="button"
                    onClick={assignAnalyst}
                    disabled={assigning}
                    className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {assigning
                      ? "Saving..."
                      : "Assign"}
                  </button>

                </div>

              </div>


              {/* Status Actions */}

              <div>

                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                  Update Status
                </p>

                <div className="flex flex-wrap gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      updateStatus("Open")
                    }
                    disabled={statusUpdating}
                    className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Open
                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      updateStatus("In Progress")
                    }
                    disabled={statusUpdating}
                    className="px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm hover:bg-yellow-500/20 disabled:opacity-50"
                  >
                    In Progress
                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      updateStatus("Resolved")
                    }
                    disabled={statusUpdating}
                    className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm hover:bg-green-500/20 disabled:opacity-50"
                  >
                    Resolve
                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>

      )}

    </MainLayout>
  );
}

export default Alerts;