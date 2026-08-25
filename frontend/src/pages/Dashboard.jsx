import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";


function Dashboard() {

  // ============================================================
  // EMPLOYEE SUMMARY
  // ============================================================

  const [summary, setSummary] = useState({
    total_employees: 0,
    active_employees: 0,
    inactive_employees: 0,
    high_risk: 0,
    critical_risk: 0,
  });


  // ============================================================
  // RISK DISTRIBUTION
  // ============================================================

  const [riskDistribution, setRiskDistribution] = useState({
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  });


  // ============================================================
  // ALERT SUMMARY
  // ============================================================

  const [alertSummary, setAlertSummary] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    high: 0,
    critical: 0,
  });


  // ============================================================
  // EMAIL SUMMARY
  // ============================================================

  const [emailActivity, setEmailActivity] = useState({
    total_emails: 0,
    emails_with_attachments: 0,
    emails_without_attachments: 0,
    total_email_size: 0,
    average_email_size: 0,
  });


  // ============================================================
  // LOGON SUMMARY
  // ============================================================

  const [logonSummary, setLogonSummary] = useState({
    total: 0,
    logon_events: 0,
    logoff_events: 0,
    unique_users: 0,
    unique_devices: 0,
  });


  // ============================================================
  // FILE SUMMARY
  // ============================================================

  const [fileSummary, setFileSummary] = useState({
    total: 0,
    unique_users: 0,
    unique_files: 0,
    unique_devices: 0,
  });


  // ============================================================
  // HTTP SUMMARY
  // ============================================================

  const [httpSummary, setHttpSummary] = useState({
    total: 0,
    unique_users: 0,
    unique_websites: 0,
  });


  // ============================================================
  // DEVICE SUMMARY
  // ============================================================

  const [deviceSummary, setDeviceSummary] = useState({
    total: 0,
    unique_users: 0,
    unique_devices: 0,
  });


  // ============================================================
  // UI STATE
  // ============================================================

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");


  // ============================================================
  // LOAD DASHBOARD ONCE + EVERY 30 SECONDS
  // ============================================================

  useEffect(() => {

    loadDashboardData();

    const interval = setInterval(
      () => {
        loadDashboardData();
      },
      30000
    );

    return () => {
      clearInterval(interval);
    };

  }, []);


  // ============================================================
  // LOAD DASHBOARD DATA
  //
  // IMPORTANT:
  // No raw activity endpoints are called here.
  //
  // Dashboard uses ONLY summary/count endpoints.
  // ============================================================

  const loadDashboardData = async () => {

    try {

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
        api.get(
          "/employees/dashboard/summary"
        ),

        // Alert COUNTS only
        api.get(
          "/alerts/summary"
        ),

        // Risk distribution
        api.get(
          "/risk/dashboard/distribution"
        ),

        // Aggregated email statistics
        api.get(
          "/email/dashboard/activity"
        ),

        // Aggregated logon statistics
        api.get(
          "/logon/summary"
        ),

        // Aggregated file statistics
        api.get(
          "/files/summary"
        ),

        // Aggregated HTTP statistics
        api.get(
          "/http/summary"
        ),

        // Aggregated device statistics
        api.get(
          "/device/summary"
        ),

      ]);


      // ========================================================
      // SAVE RESPONSES
      // ========================================================

      setSummary(
        summaryResponse.data
      );

      setAlertSummary(
        alertSummaryResponse.data
      );

      setRiskDistribution(
        riskDistributionResponse.data
      );

      setEmailActivity(
        emailActivityResponse.data
      );

      setLogonSummary(
        logonSummaryResponse.data
      );

      setFileSummary(
        fileSummaryResponse.data
      );

      setHttpSummary(
        httpSummaryResponse.data
      );

      setDeviceSummary(
        deviceSummaryResponse.data
      );


    } catch (err) {

      console.error(
        "Dashboard loading error:",
        err
      );

      if (
        err.response?.status === 401
      ) {

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
        riskDistribution.LOW || 0
      ),
    },

    {
      name: "MEDIUM",
      value: Number(
        riskDistribution.MEDIUM || 0
      ),
    },

    {
      name: "HIGH",
      value: Number(
        riskDistribution.HIGH || 0
      ),
    },

    {
      name: "CRITICAL",
      value: Number(
        riskDistribution.CRITICAL || 0
      ),
    },

  ];


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
                  ).toLocaleString()
              }

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
                : totalSecurityAlerts.toLocaleString()
              }

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
                : highRiskEmployees.toLocaleString()
              }

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
                : totalSecurityAlerts.toLocaleString()
              }

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
                  ).toLocaleString()
              }

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
                  ).toLocaleString()
              }

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
                  ).toLocaleString()
              }

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
                  ).toLocaleString()
              }

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

              <div className="h-72 flex items-center justify-center text-gray-500">

                Loading email analytics...

              </div>

            ) : (

              <div className="h-72">

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
                        fontSize: 12
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
                        0
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

              <div className="h-72 flex items-center justify-center text-gray-500">

                Loading risk distribution...

              </div>

            ) : (

              <div className="h-72">

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
                      outerRadius={90}
                      label
                    >

                      {riskChartData.map(
                        (_, index) => (

                          <Cell
                            key={
                              `risk-cell-${index}`
                            }
                          />

                        )
                      )}

                    </Pie>

                    <Tooltip />

                    <Legend />

                  </PieChart>

                </ResponsiveContainer>

              </div>

            )}


            <div className="space-y-3 mt-4">

              {riskChartData.map(
                (item) => (

                  <div
                    key={item.name}
                    className="flex justify-between"
                  >

                    <span className="text-gray-300">

                      {item.name}

                    </span>

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