import { useEffect, useMemo, useState } from "react";

import jsPDF from "jspdf";
import * as XLSX from "xlsx";

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


function Reports() {

  // ============================================================
  // STATE
  // ============================================================

  const [activeReport, setActiveReport] = useState("risk");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [riskReport, setRiskReport] = useState(null);
  const [behaviorReport, setBehaviorReport] = useState(null);
  const [threatReport, setThreatReport] = useState(null);
  const [investigationReport, setInvestigationReport] = useState(null);
  const [complianceReport, setComplianceReport] = useState(null);


  // ============================================================
  // LOAD ALL REPORTS
  // ============================================================

  useEffect(() => {
    loadReports();
  }, []);


  const loadReports = async () => {

    try {

      setLoading(true);
      setError("");

      const [
        riskResponse,
        behaviorResponse,
        threatResponse,
        investigationResponse,
        complianceResponse,
      ] = await Promise.all([
        api.get("/reports/risk"),
        api.get("/reports/behavior"),
        api.get("/reports/threats"),
        api.get("/reports/investigations"),
        api.get("/reports/compliance"),
      ]);


      setRiskReport(riskResponse.data);
      setBehaviorReport(behaviorResponse.data);
      setThreatReport(threatResponse.data);
      setInvestigationReport(investigationResponse.data);
      setComplianceReport(complianceResponse.data);

    } catch (err) {

      console.error("Reports loading error:", err);

      if (err.response?.status === 401) {

        setError(
          "Authentication expired. Please login again."
        );

      } else {

        setError(
          err.response?.data?.detail ||
          "Unable to load reports."
        );
      }

    } finally {

      setLoading(false);
    }
  };


  // ============================================================
  // RISK CHART DATA
  // ============================================================

  const riskChartData = useMemo(() => {

    const distribution =
      riskReport?.risk_distribution || {};

    return [
      {
        name: "LOW",
        value: Number(distribution.Low || 0),
      },
      {
        name: "MEDIUM",
        value: Number(distribution.Medium || 0),
      },
      {
        name: "HIGH",
        value: Number(distribution.High || 0),
      },
      {
        name: "CRITICAL",
        value: Number(distribution.Critical || 0),
      },
    ];

  }, [riskReport]);


  const riskColors = {
    LOW: "#22c55e",
    MEDIUM: "#eab308",
    HIGH: "#f97316",
    CRITICAL: "#ef4444",
  };


  // ============================================================
  // THREAT SEVERITY DATA
  // ============================================================

  const threatSeverityData = useMemo(() => {

    const distribution =
      threatReport?.severity_distribution || {};

    return [
      {
        name: "Informational",
        value: Number(distribution.Informational || 0),
      },
      {
        name: "Low",
        value: Number(distribution.Low || 0),
      },
      {
        name: "Medium",
        value: Number(distribution.Medium || 0),
      },
      {
        name: "High",
        value: Number(distribution.High || 0),
      },
      {
        name: "Critical",
        value: Number(distribution.Critical || 0),
      },
    ];

  }, [threatReport]);


  // ============================================================
  // THREAT STATUS DATA
  // ============================================================

  const threatStatusData = useMemo(() => {

    const distribution =
      threatReport?.status_distribution || {};

    return [
      {
        name: "Open",
        value: Number(distribution.Open || 0),
      },
      {
        name: "In Progress",
        value: Number(distribution["In Progress"] || 0),
      },
      {
        name: "Resolved",
        value: Number(distribution.Resolved || 0),
      },
    ];

  }, [threatReport]);


  // ============================================================
  // INVESTIGATION STATUS DATA
  // ============================================================

  const investigationStatusData = useMemo(() => {

    const distribution =
      investigationReport?.status_distribution || {};

    return [
      {
        name: "Open",
        value: Number(distribution.Open || 0),
      },
      {
        name: "In Progress",
        value: Number(distribution["In Progress"] || 0),
      },
      {
        name: "Resolved",
        value: Number(distribution.Resolved || 0),
      },
    ];

  }, [investigationReport]);


  // ============================================================
  // BEHAVIOR TOTALS
  // ============================================================

  const behaviorTotals = useMemo(() => {

    const employees =
      behaviorReport?.employees || [];

    let logon = 0;
    let email = 0;
    let file = 0;
    let http = 0;
    let device = 0;

    employees.forEach((employee) => {

      logon += Number(
        employee.logon?.total_events || 0
      );

      email += Number(
        employee.email?.total_emails || 0
      );

      file += Number(
        employee.file?.total_events || 0
      );

      http += Number(
        employee.http?.total_events || 0
      );

      device += Number(
        employee.device?.total_events || 0
      );

    });

    return {
      logon,
      email,
      file,
      http,
      device,
    };

  }, [behaviorReport]);


  const behaviorChartData = [
    {
      name: "Logon",
      value: behaviorTotals.logon,
    },
    {
      name: "Email",
      value: behaviorTotals.email,
    },
    {
      name: "File",
      value: behaviorTotals.file,
    },
    {
      name: "HTTP",
      value: behaviorTotals.http,
    },
    {
      name: "Device",
      value: behaviorTotals.device,
    },
  ];


  // ============================================================
  // COMPLIANCE SUMMARY
  // ============================================================

  const complianceSummary = useMemo(() => {

    const employees =
      complianceReport?.employees || [];

    let active = 0;
    let highRisk = 0;
    let criticalRisk = 0;
    let openAlerts = 0;
    let openInvestigations = 0;

    employees.forEach((employee) => {

      if (
        String(employee.status || "").toLowerCase() ===
        "active"
      ) {
        active++;
      }

      const riskLevel =
        String(employee.risk_level || "").toUpperCase();

      if (riskLevel === "HIGH") {
        highRisk++;
      }

      if (riskLevel === "CRITICAL") {
        criticalRisk++;
      }

      openAlerts += Number(
        employee.open_alerts || 0
      );

      openInvestigations += Number(
        employee.open_investigations || 0
      );

    });

    return {
      active,
      highRisk,
      criticalRisk,
      openAlerts,
      openInvestigations,
    };

  }, [complianceReport]);


  // ============================================================
  // REPORT TABS
  // ============================================================

  const reports = [
    {
      id: "risk",
      title: "Risk Assessment",
      description: "Employee risk scores and risk distribution",
    },
    {
      id: "behavior",
      title: "Behavioral Analytics",
      description: "Employee activity and behavioral metrics",
    },
    {
      id: "threats",
      title: "Insider Threats",
      description: "Security alerts and threat severity",
    },
    {
      id: "investigations",
      title: "Investigations",
      description: "Investigation status and severity",
    },
    {
      id: "compliance",
      title: "Compliance",
      description: "Employee security and compliance posture",
    },
  ];


  // ============================================================
  // FORMAT NUMBER
  // ============================================================

  const formatNumber = (value) => {

    return Number(value || 0).toLocaleString();

  };


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <MainLayout>

      <div className="space-y-8">

        {/* ======================================================
            HEADER
        ====================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

  <div>

    <h1 className="text-4xl font-bold text-white">
      Security Reports
    </h1>

    <p className="text-gray-400 mt-2">
      Risk, behavioral, threat, investigation,
      and compliance intelligence reports.
    </p>

  </div>


  <div className="flex flex-wrap gap-3">

    {/* EXPORT PDF */}

    <button
      onClick={() =>
        exportToPDF(
          reports.find(
            (report) => report.id === activeReport
          )?.title,
          activeReport === "risk"
            ? riskReport
            : activeReport === "behavior"
            ? behaviorReport
            : activeReport === "threats"
            ? threatReport
            : activeReport === "investigations"
            ? investigationReport
            : complianceReport
        )
      }
      className="px-5 py-3 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold transition"
    >
      Export PDF
    </button>


    {/* EXPORT EXCEL */}

    <button
      onClick={() =>
        exportToExcel(
          reports.find(
            (report) => report.id === activeReport
          )?.title,
          activeReport === "risk"
            ? riskReport
            : activeReport === "behavior"
            ? behaviorReport
            : activeReport === "threats"
            ? threatReport
            : activeReport === "investigations"
            ? investigationReport
            : complianceReport
        )
      }
      className="px-5 py-3 rounded-lg bg-green-500 hover:bg-green-400 text-slate-950 font-semibold transition"
    >
      Export Excel
    </button>


    {/* REFRESH */}

    <button
      onClick={loadReports}
      disabled={loading}
      className="px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition disabled:opacity-50"
    >
      {loading ? "Refreshing..." : "Refresh Reports"}
    </button>

  </div>

</div>

        

        


        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (

          <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-lg p-4">
            {error}
          </div>

        )}


        {/* ======================================================
            REPORT NAVIGATION
        ====================================================== */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">

            {reports.map((report) => (

              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={`text-left rounded-lg p-4 transition border ${
                  activeReport === report.id
                    ? "bg-cyan-500/10 border-cyan-400"
                    : "bg-slate-800 border-slate-700 hover:border-slate-500"
                }`}
              >

                <p
                  className={`font-semibold ${
                    activeReport === report.id
                      ? "text-cyan-400"
                      : "text-white"
                  }`}
                >
                  {report.title}
                </p>

                <p className="text-gray-500 text-xs mt-1">
                  {report.description}
                </p>

              </button>

            ))}

          </div>

        </div>


        {/* ======================================================
            LOADING
        ====================================================== */}

        {loading && (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">

            <p className="text-gray-400">
              Loading security reports...
            </p>

          </div>

        )}


        {!loading && (

          <>


            {/* ==================================================
                RISK ASSESSMENT REPORT
            ================================================== */}

            {activeReport === "risk" && riskReport && (

              <div className="space-y-6">

                <div>

                  <h2 className="text-2xl font-bold text-white">
                    Risk Assessment Report
                  </h2>

                  <p className="text-gray-500 mt-1">
                    Current employee risk posture generated
                    from the risk scoring system.
                  </p>

                </div>


                {/* KPI CARDS */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <p className="text-gray-400">
                      Total Employees
                    </p>

                    <p className="text-cyan-400 text-3xl font-bold mt-2">
                      {formatNumber(
                        riskReport.total_employees
                      )}
                    </p>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <p className="text-gray-400">
                      Average Risk Score
                    </p>

                    <p className="text-yellow-400 text-3xl font-bold mt-2">
                      {Number(
                        riskReport.average_risk_score || 0
                      ).toFixed(2)}
                    </p>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <p className="text-gray-400">
                      Critical Employees
                    </p>

                    <p className="text-red-400 text-3xl font-bold mt-2">
                      {formatNumber(
                        riskReport.risk_distribution?.Critical
                      )}
                    </p>

                  </div>

                </div>


                {/* RISK DISTRIBUTION */}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <h3 className="text-white text-xl font-semibold">
                      Risk Level Distribution
                    </h3>

                    <p className="text-gray-500 text-sm mt-1">
                      Distribution of employees by risk level.
                    </p>


                    <div className="h-80 mt-4">

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
                            outerRadius={105}
                            label={({ name, value }) =>
                              `${name}: ${value}`
                            }
                          >

                            {riskChartData.map((entry) => (

                              <Cell
                                key={entry.name}
                                fill={riskColors[entry.name]}
                              />

                            ))}

                          </Pie>

                          <Tooltip />

                          <Legend />

                        </PieChart>

                      </ResponsiveContainer>

                    </div>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <h3 className="text-white text-xl font-semibold">
                      Risk Summary
                    </h3>

                    <p className="text-gray-500 text-sm mt-1">
                      Employee counts by risk category.
                    </p>


                    <div className="space-y-4 mt-6">

                      {riskChartData.map((item) => (

                        <div
                          key={item.name}
                          className="flex items-center justify-between bg-slate-800 rounded-lg p-4"
                        >

                          <div className="flex items-center gap-3">

                            <span
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  riskColors[item.name],
                              }}
                            />

                            <span className="text-gray-300">
                              {item.name}
                            </span>

                          </div>

                          <span className="text-cyan-400 font-bold">
                            {formatNumber(item.value)}
                          </span>

                        </div>

                      ))}

                    </div>

                  </div>

                </div>


                {/* TOP RISK EMPLOYEES */}

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                  <h3 className="text-white text-xl font-semibold">
                    Highest Risk Employees
                  </h3>

                  <p className="text-gray-500 text-sm mt-1">
                    Employees with the highest calculated risk scores.
                  </p>


                  <div className="overflow-x-auto mt-5">

                    <table className="w-full text-left">

                      <thead>

                        <tr className="border-b border-slate-800 text-gray-400 text-sm">

                          <th className="py-3 px-3">
                            Employee ID
                          </th>

                          <th className="py-3 px-3">
                            Risk Score
                          </th>

                          <th className="py-3 px-3">
                            Risk Level
                          </th>

                          <th className="py-3 px-3">
                            Behavioral Anomalies
                          </th>

                          <th className="py-3 px-3">
                            Privilege Misuse
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {(riskReport.employees || [])
                          .slice(0, 10)
                          .map((employee) => (

                            <tr
                              key={employee.employee_id}
                              className="border-b border-slate-800/70"
                            >

                              <td className="py-3 px-3 text-white font-medium">
                                {employee.employee_id}
                              </td>

                              <td className="py-3 px-3 text-cyan-400 font-bold">
                                {employee.risk_score}
                              </td>

                              <td className="py-3 px-3">

                                <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold">
                                  {employee.risk_level}
                                </span>

                              </td>

                              <td className="py-3 px-3 text-gray-300">
                                {employee.behavioral_anomalies}
                              </td>

                              <td className="py-3 px-3 text-gray-300">
                                {employee.privilege_misuse}
                              </td>

                            </tr>

                          ))}

                      </tbody>

                    </table>

                  </div>

                </div>

              </div>

            )}


            {/* ==================================================
                BEHAVIORAL ANALYTICS REPORT
            ================================================== */}

            {activeReport === "behavior" && behaviorReport && (

              <div className="space-y-6">

                <div>

                  <h2 className="text-2xl font-bold text-white">
                    Behavioral Analytics Report
                  </h2>

                  <p className="text-gray-500 mt-1">
                    Aggregated employee activity across monitored
                    behavioral data sources.
                  </p>

                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

                    <p className="text-gray-400 text-sm">
                      Employees
                    </p>

                    <p className="text-cyan-400 text-2xl font-bold mt-2">
                      {formatNumber(
                        behaviorReport.total_employees
                      )}
                    </p>

                  </div>


                  {behaviorChartData.slice(0, 4).map((item) => (

                    <div
                      key={item.name}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-5"
                    >

                      <p className="text-gray-400 text-sm">
                        {item.name} Events
                      </p>

                      <p className="text-cyan-400 text-2xl font-bold mt-2">
                        {formatNumber(item.value)}
                      </p>

                    </div>

                  ))}

                </div>


                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <h3 className="text-white text-xl font-semibold">
                      Activity Distribution
                    </h3>

                    <p className="text-gray-500 text-sm mt-1">
                      Aggregated activity volume across employees.
                    </p>


                    <div className="h-80 mt-5">

                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >

                        <BarChart data={behaviorChartData}>

                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#334155"
                          />

                          <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                          />

                          <YAxis
                            stroke="#94a3b8"
                          />

                          <Tooltip />

                          <Bar
                            dataKey="value"
                            fill="#22d3ee"
                            radius={[6, 6, 0, 0]}
                          />

                        </BarChart>

                      </ResponsiveContainer>

                    </div>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <h3 className="text-white text-xl font-semibold">
                      Employee Behavioral Records
                    </h3>

                    <p className="text-gray-500 text-sm mt-1">
                      Sample of employee behavioral analytics.
                    </p>


                    <div className="overflow-x-auto mt-5">

                      <table className="w-full text-left">

                        <thead>

                          <tr className="border-b border-slate-800 text-gray-400 text-sm">

                            <th className="py-3 px-3">
                              Employee
                            </th>

                            <th className="py-3 px-3">
                              Logon
                            </th>

                            <th className="py-3 px-3">
                              Email
                            </th>

                            <th className="py-3 px-3">
                              File
                            </th>

                            <th className="py-3 px-3">
                              HTTP
                            </th>

                          </tr>

                        </thead>


                        <tbody>

                          {(behaviorReport.employees || [])
                            .slice(0, 10)
                            .map((employee) => (

                              <tr
                                key={employee.employee_id}
                                className="border-b border-slate-800/70"
                              >

                                <td className="py-3 px-3 text-white">
                                  {employee.employee_id}
                                </td>

                                <td className="py-3 px-3 text-gray-300">
                                  {formatNumber(
                                    employee.logon?.total_events
                                  )}
                                </td>

                                <td className="py-3 px-3 text-gray-300">
                                  {formatNumber(
                                    employee.email?.total_emails
                                  )}
                                </td>

                                <td className="py-3 px-3 text-gray-300">
                                  {formatNumber(
                                    employee.file?.total_events
                                  )}
                                </td>

                                <td className="py-3 px-3 text-gray-300">
                                  {formatNumber(
                                    employee.http?.total_events
                                  )}
                                </td>

                              </tr>

                            ))}

                        </tbody>

                      </table>

                    </div>

                  </div>

                </div>

              </div>

            )}


            {/* ==================================================
                THREAT REPORT
            ================================================== */}

            {activeReport === "threats" && threatReport && (

              <div className="space-y-6">

                <div>

                  <h2 className="text-2xl font-bold text-white">
                    Insider Threat Report
                  </h2>

                  <p className="text-gray-500 mt-1">
                    Security alerts categorized by severity and status.
                  </p>

                </div>


                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <p className="text-gray-400">
                      Total Alerts
                    </p>

                    <p className="text-cyan-400 text-3xl font-bold mt-2">
                      {formatNumber(
                        threatReport.total_alerts
                      )}
                    </p>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <p className="text-gray-400">
                      High Alerts
                    </p>

                    <p className="text-orange-400 text-3xl font-bold mt-2">
                      {formatNumber(
                        threatReport.severity_distribution?.High
                      )}
                    </p>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <p className="text-gray-400">
                      Critical Alerts
                    </p>

                    <p className="text-red-400 text-3xl font-bold mt-2">
                      {formatNumber(
                        threatReport.severity_distribution?.Critical
                      )}
                    </p>

                  </div>

                </div>


                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <h3 className="text-white text-xl font-semibold">
                      Alert Severity
                    </h3>

                    <div className="h-80 mt-5">

                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >

                        <BarChart data={threatSeverityData}>

                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#334155"
                          />

                          <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                          />

                          <YAxis
                            stroke="#94a3b8"
                          />

                          <Tooltip />

                          <Bar
                            dataKey="value"
                            fill="#f97316"
                            radius={[6, 6, 0, 0]}
                          />

                        </BarChart>

                      </ResponsiveContainer>

                    </div>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <h3 className="text-white text-xl font-semibold">
                      Alert Status
                    </h3>

                    <div className="h-80 mt-5">

                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >

                        <PieChart>

                          <Pie
                            data={threatStatusData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, value }) =>
                              `${name}: ${value}`
                            }
                          >

                            <Cell fill="#eab308" />
                            <Cell fill="#f97316" />
                            <Cell fill="#22c55e" />

                          </Pie>

                          <Tooltip />

                          <Legend />

                        </PieChart>

                      </ResponsiveContainer>

                    </div>

                  </div>

                </div>


                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                  <h3 className="text-white text-xl font-semibold">
                    Recent Threat Alerts
                  </h3>


                  <div className="overflow-x-auto mt-5">

                    <table className="w-full text-left">

                      <thead>

                        <tr className="border-b border-slate-800 text-gray-400 text-sm">

                          <th className="py-3 px-3">
                            Employee
                          </th>

                          <th className="py-3 px-3">
                            Severity
                          </th>

                          <th className="py-3 px-3">
                            Status
                          </th>

                          <th className="py-3 px-3">
                            Analyst
                          </th>

                          <th className="py-3 px-3">
                            Description
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {(threatReport.alerts || [])
                          .slice(0, 10)
                          .map((alert) => (

                            <tr
                              key={alert.id}
                              className="border-b border-slate-800/70"
                            >

                              <td className="py-3 px-3 text-white">
                                {alert.employee_id}
                              </td>

                              <td className="py-3 px-3 text-orange-300">
                                {alert.severity}
                              </td>

                              <td className="py-3 px-3 text-gray-300">
                                {alert.status}
                              </td>

                              <td className="py-3 px-3 text-gray-300">
                                {alert.assigned_analyst || "Unassigned"}
                              </td>

                              <td className="py-3 px-3 text-gray-400 max-w-md">
                                {alert.description}
                              </td>

                            </tr>

                          ))}

                      </tbody>

                    </table>

                  </div>

                </div>

              </div>

            )}


            {/* ==================================================
                INVESTIGATION REPORT
            ================================================== */}

            {activeReport === "investigations" &&
              investigationReport && (

              <div className="space-y-6">

                <div>

                  <h2 className="text-2xl font-bold text-white">
                    Investigation Report
                  </h2>

                  <p className="text-gray-500 mt-1">
                    Investigation cases, severity, status,
                    assignments, and resolution information.
                  </p>

                </div>


                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <p className="text-gray-400">
                      Total Investigations
                    </p>

                    <p className="text-cyan-400 text-3xl font-bold mt-2">
                      {formatNumber(
                        investigationReport.total_investigations
                      )}
                    </p>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <p className="text-gray-400">
                      Open Investigations
                    </p>

                    <p className="text-yellow-400 text-3xl font-bold mt-2">
                      {formatNumber(
                        investigationReport.status_distribution?.Open
                      )}
                    </p>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <p className="text-gray-400">
                      Resolved Investigations
                    </p>

                    <p className="text-green-400 text-3xl font-bold mt-2">
                      {formatNumber(
                        investigationReport.status_distribution?.Resolved
                      )}
                    </p>

                  </div>

                </div>


                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <h3 className="text-white text-xl font-semibold">
                      Investigation Status
                    </h3>

                    <div className="h-80 mt-5">

                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >

                        <PieChart>

                          <Pie
                            data={investigationStatusData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, value }) =>
                              `${name}: ${value}`
                            }
                          >

                            <Cell fill="#eab308" />
                            <Cell fill="#f97316" />
                            <Cell fill="#22c55e" />

                          </Pie>

                          <Tooltip />

                          <Legend />

                        </PieChart>

                      </ResponsiveContainer>

                    </div>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                    <h3 className="text-white text-xl font-semibold">
                      Investigation Cases
                    </h3>

                    <div className="overflow-x-auto mt-5">

                      <table className="w-full text-left">

                        <thead>

                          <tr className="border-b border-slate-800 text-gray-400 text-sm">

                            <th className="py-3 px-3">
                              Case ID
                            </th>

                            <th className="py-3 px-3">
                              Employee
                            </th>

                            <th className="py-3 px-3">
                              Severity
                            </th>

                            <th className="py-3 px-3">
                              Status
                            </th>

                          </tr>

                        </thead>


                        <tbody>

                          {(investigationReport.investigations || [])
                            .map((investigation) => (

                              <tr
                                key={investigation.id}
                                className="border-b border-slate-800/70"
                              >

                                <td className="py-3 px-3 text-white">
                                  {investigation.investigation_id}
                                </td>

                                <td className="py-3 px-3 text-cyan-300">
                                  {investigation.employee_id}
                                </td>

                                <td className="py-3 px-3 text-gray-300">
                                  {investigation.severity}
                                </td>

                                <td className="py-3 px-3 text-gray-300">
                                  {investigation.status}
                                </td>

                              </tr>

                            ))}

                        </tbody>

                      </table>

                    </div>

                  </div>

                </div>


                {/* RESOLUTION DETAILS */}

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                  <h3 className="text-white text-xl font-semibold">
                    Investigation Resolution Details
                  </h3>


                  <div className="space-y-4 mt-5">

                    {(investigationReport.investigations || [])
                      .map((investigation) => (

                        <div
                          key={investigation.id}
                          className="bg-slate-800 rounded-lg p-5"
                        >

                          <div className="flex flex-col md:flex-row md:justify-between gap-2">

                            <div>

                              <p className="text-white font-semibold">
                                {investigation.title}
                              </p>

                              <p className="text-gray-500 text-sm mt-1">
                                {investigation.employee_id}
                              </p>

                            </div>

                            <span className="text-gray-300 text-sm">
                              {investigation.status}
                            </span>

                          </div>


                          {investigation.resolution_notes && (

                            <p className="text-gray-400 text-sm mt-4">
                              {investigation.resolution_notes}
                            </p>

                          )}

                        </div>

                      ))}

                  </div>

                </div>

              </div>

            )}


            {/* ==================================================
                COMPLIANCE REPORT
            ================================================== */}

            {activeReport === "compliance" &&
              complianceReport && (

              <div className="space-y-6">

                <div>

                  <h2 className="text-2xl font-bold text-white">
                    Compliance Report
                  </h2>

                  <p className="text-gray-500 mt-1">
                    Employee security posture, risk status,
                    alerts, and investigations.
                  </p>

                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

                    <p className="text-gray-400 text-sm">
                      Employees
                    </p>

                    <p className="text-cyan-400 text-2xl font-bold mt-2">
                      {formatNumber(
                        complianceReport.total_employees
                      )}
                    </p>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

                    <p className="text-gray-400 text-sm">
                      Active
                    </p>

                    <p className="text-green-400 text-2xl font-bold mt-2">
                      {formatNumber(
                        complianceSummary.active
                      )}
                    </p>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

                    <p className="text-gray-400 text-sm">
                      High Risk
                    </p>

                    <p className="text-orange-400 text-2xl font-bold mt-2">
                      {formatNumber(
                        complianceSummary.highRisk
                      )}
                    </p>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

                    <p className="text-gray-400 text-sm">
                      Critical Risk
                    </p>

                    <p className="text-red-400 text-2xl font-bold mt-2">
                      {formatNumber(
                        complianceSummary.criticalRisk
                      )}
                    </p>

                  </div>


                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

                    <p className="text-gray-400 text-sm">
                      Open Alerts
                    </p>

                    <p className="text-yellow-400 text-2xl font-bold mt-2">
                      {formatNumber(
                        complianceSummary.openAlerts
                      )}
                    </p>

                  </div>

                </div>


                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                  <h3 className="text-white text-xl font-semibold">
                    Compliance Employee Records
                  </h3>

                  <p className="text-gray-500 text-sm mt-1">
                    Employee-level security posture.
                  </p>


                  <div className="overflow-x-auto mt-5">

                    <table className="w-full text-left">

                      <thead>

                        <tr className="border-b border-slate-800 text-gray-400 text-sm">

                          <th className="py-3 px-3">
                            Employee
                          </th>

                          <th className="py-3 px-3">
                            Name
                          </th>

                          <th className="py-3 px-3">
                            Department
                          </th>

                          <th className="py-3 px-3">
                            Status
                          </th>

                          <th className="py-3 px-3">
                            Risk
                          </th>

                          <th className="py-3 px-3">
                            Score
                          </th>

                          <th className="py-3 px-3">
                            Alerts
                          </th>

                          <th className="py-3 px-3">
                            Investigations
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {(complianceReport.employees || [])
                          .slice(0, 20)
                          .map((employee) => (

                            <tr
                              key={employee.employee_id}
                              className="border-b border-slate-800/70"
                            >

                              <td className="py-3 px-3 text-cyan-300 font-medium">
                                {employee.employee_id}
                              </td>

                              <td className="py-3 px-3 text-white">
                                {employee.full_name}
                              </td>

                              <td className="py-3 px-3 text-gray-300">
                                {employee.department}
                              </td>

                              <td className="py-3 px-3 text-gray-300">
                                {employee.status}
                              </td>

                              <td className="py-3 px-3 text-gray-300">
                                {employee.risk_level}
                              </td>

                              <td className="py-3 px-3 text-cyan-400 font-bold">
                                {employee.risk_score ?? "-"}
                              </td>

                              <td className="py-3 px-3 text-gray-300">
                                {employee.total_alerts}
                              </td>

                              <td className="py-3 px-3 text-gray-300">
                                {employee.total_investigations}
                              </td>

                            </tr>

                          ))}

                      </tbody>

                    </table>

                  </div>

                </div>


                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

                  <h3 className="text-white text-xl font-semibold">
                    Compliance Summary
                  </h3>


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">

                    <div className="bg-slate-800 rounded-lg p-4">

                      <p className="text-gray-400 text-sm">
                        Open Alerts
                      </p>

                      <p className="text-yellow-400 text-2xl font-bold mt-1">
                        {formatNumber(
                          complianceSummary.openAlerts
                        )}
                      </p>

                    </div>


                    <div className="bg-slate-800 rounded-lg p-4">

                      <p className="text-gray-400 text-sm">
                        Open Investigations
                      </p>

                      <p className="text-orange-400 text-2xl font-bold mt-1">
                        {formatNumber(
                          complianceSummary.openInvestigations
                        )}
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            )}

          </>

        )}

      </div>

    </MainLayout>
  );
}
const exportToExcel = (reportName, data) => {
  try {
    const workbook = XLSX.utils.book_new();

    let rows = [];

    // ============================================================
    // RISK ASSESSMENT
    // ============================================================

    if (reportName === "Risk Assessment") {
      rows = (data?.employees || []).map((employee) => ({
        "Employee ID": employee.employee_id || "",
        "Risk Score": employee.risk_score ?? "",
        "Risk Level": employee.risk_level || "",
        "Behavioral Anomalies":
          employee.behavioral_anomalies ?? "",
        "Privilege Misuse":
          employee.privilege_misuse ?? "",
        "Data Access Violations":
          employee.data_access_violations ?? "",
        "Access Pattern Deviations":
          employee.access_pattern_deviations ?? "",
        "Historical Security Events":
          employee.historical_security_events ?? "",
      }));
    }

    // ============================================================
    // BEHAVIORAL ANALYTICS
    // ============================================================

    else if (reportName === "Behavioral Analytics") {
      rows = (data?.employees || []).map((employee) => ({
        "Employee ID": employee.employee_id || "",

        "Logon Events":
          employee.logon?.total_events ?? 0,

        "Email Events":
          employee.email?.total_emails ?? 0,

        "File Events":
          employee.file?.total_events ?? 0,

        "HTTP Events":
          employee.http?.total_events ?? 0,

        "Device Events":
          employee.device?.total_events ?? 0,
      }));
    }

    // ============================================================
    // INSIDER THREATS
    // ============================================================

    else if (reportName === "Insider Threats") {
      rows = (data?.alerts || []).map((alert) => ({
        "Alert ID": alert.id ?? "",
        "Employee ID": alert.employee_id || "",
        "Severity": alert.severity || "",
        "Status": alert.status || "",
        "Assigned Analyst":
          alert.assigned_analyst || "Unassigned",
        "Description": alert.description || "",
        "Created At": alert.created_at || "",
        "Resolved At": alert.resolved_at || "",
      }));
    }

    // ============================================================
    // INVESTIGATIONS
    // ============================================================

    else if (reportName === "Investigations") {
      rows = (data?.investigations || []).map(
        (investigation) => ({
          "Investigation ID":
            investigation.investigation_id || "",

          "Employee ID":
            investigation.employee_id || "",

          "Alert ID":
            investigation.alert_id ?? "",

          "Title":
            investigation.title || "",

          "Description":
            investigation.description || "",

          "Severity":
            investigation.severity || "",

          "Status":
            investigation.status || "",

          "Assigned Analyst":
            investigation.assigned_analyst ||
            "Unassigned",

          "Resolution Notes":
            investigation.resolution_notes || "",

          "Created At":
            investigation.created_at || "",

          "Updated At":
            investigation.updated_at || "",

          "Resolved At":
            investigation.resolved_at || "",
        })
      );
    }

    // ============================================================
    // COMPLIANCE
    // ============================================================

    else if (reportName === "Compliance") {
      rows = (data?.employees || []).map((employee) => ({
        "Employee ID":
          employee.employee_id || "",

        "Full Name":
          employee.full_name || "",

        "Department":
          employee.department || "",

        "Status":
          employee.status || "",

        "Risk Level":
          employee.risk_level || "",

        "Risk Score":
          employee.risk_score ?? "",

        "Total Alerts":
          employee.total_alerts ?? 0,

        "Open Alerts":
          employee.open_alerts ?? 0,

        "Total Investigations":
          employee.total_investigations ?? 0,

        "Open Investigations":
          employee.open_investigations ?? 0,
      }));
    }

    if (!rows.length) {
      alert("No data available to export.");
      return;
    }

    const worksheet =
      XLSX.utils.json_to_sheet(rows);

    // Make columns readable
    const columnWidths = Object.keys(rows[0]).map(
      (key) => ({
        wch: Math.max(
          key.length + 2,
          ...rows.map((row) =>
            String(row[key] ?? "").length
          )
        ),
      })
    );

    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      reportName.substring(0, 31)
    );

    XLSX.writeFile(
      workbook,
      `${reportName.replace(/\s+/g, "_")}_Report.xlsx`
    );

  } catch (error) {

    console.error(
      "Excel export failed:",
      error
    );

    alert(
      "Failed to export Excel report."
    );
  }
};


// ============================================================
// PDF EXPORT
// ============================================================

const exportToPDF = (reportName, data) => {
  try {

    const doc = new jsPDF();

    doc.setFontSize(18);

    doc.text(
      reportName,
      14,
      20
    );

    doc.setFontSize(10);

    doc.text(
      "Insider Threat Behavioral Intelligence System",
      14,
      28
    );

    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      35
    );

    let y = 48;

    // ==========================================================
    // RISK ASSESSMENT
    // ==========================================================

    if (reportName === "Risk Assessment") {

      doc.setFontSize(12);

      doc.text(
        `Total Employees: ${data?.total_employees ?? 0}`,
        14,
        y
      );

      y += 8;

      doc.text(
        `Average Risk Score: ${Number(
          data?.average_risk_score ?? 0
        ).toFixed(2)}`,
        14,
        y
      );

      y += 8;

      const distribution =
        data?.risk_distribution || {};

      doc.text(
        `Low: ${distribution.Low ?? 0}`,
        14,
        y
      );

      y += 7;

      doc.text(
        `Medium: ${distribution.Medium ?? 0}`,
        14,
        y
      );

      y += 7;

      doc.text(
        `High: ${distribution.High ?? 0}`,
        14,
        y
      );

      y += 7;

      doc.text(
        `Critical: ${distribution.Critical ?? 0}`,
        14,
        y
      );

      y += 12;

      doc.setFontSize(11);

      doc.text(
        "Highest Risk Employees",
        14,
        y
      );

      y += 8;

      (data?.employees || [])
        .slice(0, 15)
        .forEach((employee) => {

          if (y > 275) {
            doc.addPage();
            y = 20;
          }

          doc.setFontSize(9);

          doc.text(
            `${employee.employee_id || ""} | Score: ${
              employee.risk_score ?? ""
            } | ${employee.risk_level || ""}`,
            14,
            y
          );

          y += 6;
        });
    }

    // ==========================================================
    // BEHAVIORAL ANALYTICS
    // ==========================================================

    else if (
      reportName === "Behavioral Analytics"
    ) {

      doc.setFontSize(12);

      doc.text(
        `Total Employees: ${
          data?.total_employees ?? 0
        }`,
        14,
        y
      );

      y += 12;

      doc.setFontSize(11);

      doc.text(
        "Employee Behavioral Records",
        14,
        y
      );

      y += 8;

      (data?.employees || [])
        .slice(0, 20)
        .forEach((employee) => {

          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          doc.setFontSize(8);

          doc.text(
            `Employee: ${employee.employee_id || ""}`,
            14,
            y
          );

          y += 5;

          doc.text(
            `Logon: ${
              employee.logon?.total_events ?? 0
            } | Email: ${
              employee.email?.total_emails ?? 0
            } | File: ${
              employee.file?.total_events ?? 0
            }`,
            14,
            y
          );

          y += 5;

          doc.text(
            `HTTP: ${
              employee.http?.total_events ?? 0
            } | Device: ${
              employee.device?.total_events ?? 0
            }`,
            14,
            y
          );

          y += 8;
        });
    }

    // ==========================================================
    // INSIDER THREATS
    // ==========================================================

    else if (
      reportName === "Insider Threats"
    ) {

      doc.setFontSize(12);

      doc.text(
        `Total Alerts: ${
          data?.total_alerts ?? 0
        }`,
        14,
        y
      );

      y += 8;

      const severity =
        data?.severity_distribution || {};

      doc.text(
        `High: ${severity.High ?? 0}`,
        14,
        y
      );

      y += 7;

      doc.text(
        `Critical: ${severity.Critical ?? 0}`,
        14,
        y
      );

      y += 12;

      doc.setFontSize(11);

      doc.text(
        "Security Alerts",
        14,
        y
      );

      y += 8;

      (data?.alerts || [])
        .slice(0, 20)
        .forEach((alert) => {

          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          doc.setFontSize(8);

          doc.text(
            `${alert.employee_id || ""} | ${
              alert.severity || ""
            } | ${alert.status || ""}`,
            14,
            y
          );

          y += 5;

          const description =
            String(
              alert.description || ""
            ).substring(0, 100);

          doc.text(
            description,
            14,
            y
          );

          y += 8;
        });
    }

    // ==========================================================
    // INVESTIGATIONS
    // ==========================================================

    else if (
      reportName === "Investigations"
    ) {

      doc.setFontSize(12);

      doc.text(
        `Total Investigations: ${
          data?.total_investigations ?? 0
        }`,
        14,
        y
      );

      y += 8;

      const status =
        data?.status_distribution || {};

      doc.text(
        `Open: ${status.Open ?? 0}`,
        14,
        y
      );

      y += 7;

      doc.text(
        `In Progress: ${
          status["In Progress"] ?? 0
        }`,
        14,
        y
      );

      y += 7;

      doc.text(
        `Resolved: ${status.Resolved ?? 0}`,
        14,
        y
      );

      y += 12;

      doc.setFontSize(11);

      doc.text(
        "Investigation Cases",
        14,
        y
      );

      y += 8;

      (data?.investigations || [])
        .forEach((investigation) => {

          if (y > 260) {
            doc.addPage();
            y = 20;
          }

          doc.setFontSize(8);

          doc.text(
            `Case: ${
              investigation.investigation_id || ""
            }`,
            14,
            y
          );

          y += 5;

          doc.text(
            `Employee: ${
              investigation.employee_id || ""
            } | Severity: ${
              investigation.severity || ""
            } | Status: ${
              investigation.status || ""
            }`,
            14,
            y
          );

          y += 5;

          doc.text(
            `Analyst: ${
              investigation.assigned_analyst ||
              "Unassigned"
            }`,
            14,
            y
          );

          y += 8;
        });
    }

    // ==========================================================
    // COMPLIANCE
    // ==========================================================

    else if (
      reportName === "Compliance"
    ) {

      doc.setFontSize(12);

      doc.text(
        `Total Employees: ${
          data?.total_employees ?? 0
        }`,
        14,
        y
      );

      y += 7;

      doc.text(
        `Total Alerts: ${
          data?.total_alerts ?? 0
        }`,
        14,
        y
      );

      y += 7;

      doc.text(
        `Total Investigations: ${
          data?.total_investigations ?? 0
        }`,
        14,
        y
      );

      y += 12;

      doc.setFontSize(11);

      doc.text(
        "Compliance Employee Records",
        14,
        y
      );

      y += 8;

      (data?.employees || [])
        .slice(0, 20)
        .forEach((employee) => {

          if (y > 265) {
            doc.addPage();
            y = 20;
          }

          doc.setFontSize(8);

          doc.text(
            `${employee.employee_id || ""} | ${
              employee.full_name || ""
            }`,
            14,
            y
          );

          y += 5;

          doc.text(
            `Department: ${
              employee.department || ""
            } | Status: ${
              employee.status || ""
            }`,
            14,
            y
          );

          y += 5;

          doc.text(
            `Risk: ${
              employee.risk_level || ""
            } | Score: ${
              employee.risk_score ?? "-"
            } | Alerts: ${
              employee.total_alerts ?? 0
            } | Investigations: ${
              employee.total_investigations ?? 0
            }`,
            14,
            y
          );

          y += 8;
        });
    }

    doc.save(
      `${reportName.replace(
        /\s+/g,
        "_"
      )}_Report.pdf`
    );

  } catch (error) {

    console.error(
      "PDF export failed:",
      error
    );

    alert(
      "Failed to export PDF report."
    );
  }
};


export default Reports;


