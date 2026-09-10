import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

function Dashboard() {
  // ============================================================
  // STATE
  // ============================================================

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState({
    total_employees: 0,
    active_employees: 0,
    inactive_employees: 0,
    high_risk: 0,
    critical_risk: 0,
  });

  const [alertSummary, setAlertSummary] = useState({
    total: 0,
    open: 0,
    high: 0,
    critical: 0,
  });

  const [riskDistribution, setRiskDistribution] = useState({
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  });

  const [emailActivity, setEmailActivity] = useState({
    total_emails: 0,
    emails_with_attachments: 0,
    emails_without_attachments: 0,
    total_email_size: 0,
    average_email_size: 0,
  });

  const [logonSummary, setLogonSummary] = useState({
    total: 0,
  });

  const [fileSummary, setFileSummary] = useState({
    total: 0,
  });

  const [httpSummary, setHttpSummary] = useState({
    total: 0,
  });

  const [deviceSummary, setDeviceSummary] = useState({
    total: 0,
  });

  // ============================================================
  // LOAD DASHBOARD DATA
  // ============================================================

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        summaryResponse,
        alertSummaryResponse,
        riskDistributionResponse,
        emailActivityResponse,
        logonSummaryResponse,
        fileSummaryResponse,
        httpSummaryResponse,
        deviceSummaryResponse,
      ] = await Promise.all([
        // Employee count/risk summary
        api.get("/employees/dashboard/summary"),

        // Alert counts
        api.get("/alerts/summary"),

        // Risk distribution
        api.get("/risk/dashboard/distribution"),

        // Email statistics
        api.get("/email/dashboard/activity"),

        // Logon statistics
        api.get("/logon/summary"),

        // File statistics
        api.get("/files/summary"),

        // HTTP statistics
        api.get("/http/summary"),

        // Device statistics
        api.get("/device/summary"),
      ]);

      // ========================================================
      // SAVE API RESPONSES
      // ========================================================

      setSummary(summaryResponse.data);

      setAlertSummary(alertSummaryResponse.data);

      setRiskDistribution({
        low: Number(riskDistributionResponse.data?.low || 0),
        medium: Number(riskDistributionResponse.data?.medium || 0),
        high: Number(riskDistributionResponse.data?.high || 0),
        critical: Number(
          riskDistributionResponse.data?.critical || 0
        ),
      });

      setEmailActivity(emailActivityResponse.data);

      setLogonSummary(logonSummaryResponse.data);

      setFileSummary(fileSummaryResponse.data);

      setHttpSummary(httpSummaryResponse.data);

      setDeviceSummary(deviceSummaryResponse.data);

    } catch (err) {
      console.error("Dashboard loading error:", err);

      if (err.response?.status === 401) {
        setError(
          "Authentication expired. Please login again."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            "Unable to load dashboard data."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CALCULATED VALUES
  // ============================================================

  const highRiskEmployees =
    Number(summary.high_risk || 0) +
    Number(summary.critical_risk || 0);

  const totalSecurityAlerts =
    Number(alertSummary.total || 0);

  // ============================================================
  // EMAIL CHART
  // ============================================================

  const emailChartData = [
    {
      name: "Total Emails",
      value: Number(
        emailActivity.total_emails || 0
      ),
    },
    {
      name: "With Attachments",
      value: Number(
        emailActivity.emails_with_attachments || 0
      ),
    },
    {
      name: "Without Attachments",
      value: Number(
        emailActivity.emails_without_attachments || 0
      ),
    },
  ];

  // ============================================================
  // RISK CHART
  // ============================================================

  const riskChartData = [
    {
      name: "LOW",
      value: Number(
        riskDistribution.low || 0
      ),
    },
    {
      name: "MEDIUM",
      value: Number(
        riskDistribution.medium || 0
      ),
    },
    {
      name: "HIGH",
      value: Number(
        riskDistribution.high || 0
      ),
    },
    {
      name: "CRITICAL",
      value: Number(
        riskDistribution.critical || 0
      ),
    },
  ];

  // ============================================================
  // RISK CHART COLORS
  // ============================================================

  const riskColors = {
    LOW: "#22c55e",
    MEDIUM: "#eab308",
    HIGH: "#f97316",
    CRITICAL: "#ef4444",
  };

  // ============================================================
  // FORMAT BYTES
  // ============================================================

  const formatBytes = (bytes) => {
    const value = Number(bytes || 0);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return "0 B";
    }

    const units = [
      "B",
      "KB",
      "MB",
      "GB",
      "TB",
    ];

    const index = Math.min(
      Math.floor(
        Math.log(value) /
          Math.log(1024)
      ),
      units.length - 1
    );

    return (
      (
        value /
        Math.pow(1024, index)
      ).toFixed(2) +
      " " +
      units[index]
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <MainLayout>

      <div className="space-y-8">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div>

          <h1 className="text-4xl font-bold text-white">
            Security Analyst Dashboard
          </h1>

          <p className="text-gray-400 mt-2">
            Monitor insider threats, employee behavior,
            security events, and organizational risk posture.
          </p>

        </div>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-lg p-4">
            {error}
          </div>
        )}

        {/* ====================================================
            KPI CARDS
        ==================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

          {/* TOTAL EMPLOYEES */}

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

            <p className="text-gray-400">
              Total Employees
            </p>

            <h2 className="text-4xl font-bold text-cyan-400 mt-2">

              {loading
                ? "..."
                : Number(
                    summary.total_employees || 0
                  ).toLocaleString()}

            </h2>

            <p className="text-gray-500 text-sm mt-2">
              Active:{" "}
              {Number(
                summary.active_employees || 0
              ).toLocaleString()}
            </p>

          </div>

          {/* SECURITY ALERTS */}

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

            <p className="text-gray-400">
              Security Alerts
            </p>

            <h2 className="text-4xl font-bold text-yellow-400 mt-2">

              {loading
                ? "..."
                : totalSecurityAlerts.toLocaleString()}

            </h2>

            <p className="text-gray-500 text-sm mt-2">
              Open:{" "}
              {Number(
                alertSummary.open || 0
              ).toLocaleString()}
            </p>

          </div>

          {/* HIGH RISK EMPLOYEES */}

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

            <p className="text-gray-400">
              High Risk Employees
            </p>

            <h2 className="text-4xl font-bold text-red-400 mt-2">

              {loading
                ? "..."
                : highRiskEmployees.toLocaleString()}

            </h2>

            <p className="text-gray-500 text-sm mt-2">

              High:{" "}
              {Number(
                summary.high_risk || 0
              ).toLocaleString()}

              {" | "}

              Critical:{" "}
              {Number(
                summary.critical_risk || 0
              ).toLocaleString()}

            </p>

          </div>

          {/* THREAT ALERTS */}

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

            <p className="text-gray-400">
              Threat Alerts
            </p>

            <h2 className="text-4xl font-bold text-orange-400 mt-2">

              {loading
                ? "..."
                : totalSecurityAlerts.toLocaleString()}

            </h2>

            <p className="text-gray-500 text-sm mt-2">

              High:{" "}
              {Number(
                alertSummary.high || 0
              ).toLocaleString()}

              {" | "}

              Critical:{" "}
              {Number(
                alertSummary.critical || 0
              ).toLocaleString()}

            </p>

          </div>

        </div>

        {/* ====================================================
            MONITORING SUMMARY
        ==================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

          {/* LOGON */}

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

            <h2 className="text-white text-lg font-semibold">
              Logon Monitoring
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Aggregated activity
            </p>

            <p className="text-cyan-400 text-3xl font-bold mt-4">

              {loading
                ? "..."
                : Number(
                    logonSummary.total || 0
                  ).toLocaleString()}

            </p>

            <p className="text-gray-400 text-sm mt-2">
              Total events
            </p>

          </div>

          {/* FILE */}

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

            <h2 className="text-white text-lg font-semibold">
              File Monitoring
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Aggregated activity
            </p>

            <p className="text-cyan-400 text-3xl font-bold mt-4">

              {loading
                ? "..."
                : Number(
                    fileSummary.total || 0
                  ).toLocaleString()}

            </p>

            <p className="text-gray-400 text-sm mt-2">
              File events
            </p>

          </div>

          {/* HTTP */}

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

            <h2 className="text-white text-lg font-semibold">
              HTTP Monitoring
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Aggregated activity
            </p>

            <p className="text-cyan-400 text-3xl font-bold mt-4">

              {loading
                ? "..."
                : Number(
                    httpSummary.total || 0
                  ).toLocaleString()}

            </p>

            <p className="text-gray-400 text-sm mt-2">
              HTTP events
            </p>

          </div>

          {/* DEVICE */}

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

            <h2 className="text-white text-lg font-semibold">
              Device Monitoring
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Aggregated activity
            </p>

            <p className="text-cyan-400 text-3xl font-bold mt-4">

              {loading
                ? "..."
                : Number(
                    deviceSummary.total || 0
                  ).toLocaleString()}

            </p>

            <p className="text-gray-400 text-sm mt-2">
              Device events
            </p>

          </div>

        </div>

        {/* ====================================================
            EMAIL + RISK
        ==================================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ==================================================
              EMAIL ACTIVITY
          ================================================== */}

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

            <h2 className="text-white text-xl font-semibold">
              Email Activity
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Aggregated email statistics
            </p>

            {loading ? (

              <div className="h-80 flex items-center justify-center text-gray-500">
                Loading email analytics...
              </div>

            ) : (

              <div className="h-80">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={emailChartData}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                    />

                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      stroke="#94a3b8"
                    />

                    <Tooltip />

                    <Bar
                      dataKey="value"
                      fill="#22d3ee"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            )}

            <div className="grid grid-cols-2 gap-4 mt-4">

              <div className="bg-slate-800 rounded-lg p-4">

                <p className="text-gray-400 text-sm">
                  Total Email Size
                </p>

                <p className="text-cyan-400 text-xl font-bold mt-1">
                  {formatBytes(
                    emailActivity.total_email_size
                  )}
                </p>

              </div>

              <div className="bg-slate-800 rounded-lg p-4">

                <p className="text-gray-400 text-sm">
                  Average Email Size
                </p>

                <p className="text-cyan-400 text-xl font-bold mt-1">
                  {formatBytes(
                    emailActivity.average_email_size
                  )}
                </p>

              </div>

            </div>

          </div>

          {/* ==================================================
              RISK DISTRIBUTION
          ================================================== */}

          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

            <h2 className="text-white text-xl font-semibold">
              Risk Level Distribution
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Current employee risk distribution
            </p>

            {loading ? (

              <div className="h-80 flex items-center justify-center text-gray-500">
                Loading risk distribution...
              </div>

            ) : (

              <div className="h-80">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={riskChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }) =>
                        `${name}: ${value}`
                      }
                      labelLine={true}
                    >

                      {riskChartData.map(
                        (entry) => (
                          <Cell
                            key={`risk-cell-${entry.name}`}
                            fill={
                              riskColors[
                                entry.name
                              ]
                            }
                          />
                        )
                      )}

                    </Pie>

                    <Tooltip
                      formatter={(value) => [
                        Number(
                          value
                        ).toLocaleString(),
                        "Employees",
                      ]}
                    />

                    <Legend />

                  </PieChart>

                </ResponsiveContainer>

              </div>

            )}

            {/* RISK COUNTS */}

            <div className="space-y-3 mt-4">

              {riskChartData.map(
                (item) => (

                  <div
                    key={item.name}
                    className="flex justify-between items-center"
                  >

                    <div className="flex items-center gap-3">

                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            riskColors[
                              item.name
                            ],
                        }}
                      />

                      <span className="text-gray-300">
                        {item.name}
                      </span>

                    </div>

                    <span className="text-cyan-400 font-bold">
                      {item.value.toLocaleString()}
                    </span>

                  </div>

                )
              )}

            </div>

          </div>

        </div>

        {/* ====================================================
            ALERT SUMMARY
        ==================================================== */}

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

          <h2 className="text-white text-xl font-semibold">
            Alert Overview
          </h2>

          <p className="text-gray-500 text-sm mt-1">
            Current security alert status
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">

            {/* TOTAL */}

            <div className="bg-slate-800 rounded-lg p-4">

              <p className="text-gray-400 text-sm">
                Total
              </p>

              <p className="text-cyan-400 text-2xl font-bold mt-1">

                {Number(
                  alertSummary.total || 0
                ).toLocaleString()}

              </p>

            </div>

            {/* OPEN */}

            <div className="bg-slate-800 rounded-lg p-4">

              <p className="text-gray-400 text-sm">
                Open
              </p>

              <p className="text-yellow-400 text-2xl font-bold mt-1">

                {Number(
                  alertSummary.open || 0
                ).toLocaleString()}

              </p>

            </div>

            {/* HIGH */}

            <div className="bg-slate-800 rounded-lg p-4">

              <p className="text-gray-400 text-sm">
                High
              </p>

              <p className="text-red-400 text-2xl font-bold mt-1">

                {Number(
                  alertSummary.high || 0
                ).toLocaleString()}

              </p>

            </div>

            {/* CRITICAL */}

            <div className="bg-slate-800 rounded-lg p-4">

              <p className="text-gray-400 text-sm">
                Critical
              </p>

              <p className="text-orange-400 text-2xl font-bold mt-1">

                {Number(
                  alertSummary.critical || 0
                ).toLocaleString()}

              </p>

            </div>

          </div>

        </div>

      </div>

    </MainLayout>
  );
}

export default Dashboard;