import { useEffect, useMemo, useState } from "react";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import MainLayout from "../layouts/MainLayout";


const API_BASE_URL = "http://127.0.0.1:8000";


/* ============================================================
   HELPER FUNCTIONS
============================================================ */

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("access_token")
  );
}


function getRiskColor(level) {
  switch (String(level || "").toUpperCase()) {
    case "CRITICAL":
      return "text-red-500";

    case "HIGH":
      return "text-orange-400";

    case "MEDIUM":
      return "text-yellow-400";

    case "LOW":
      return "text-green-400";

    default:
      return "text-gray-400";
  }
}


function getRiskBackground(level) {
  switch (String(level || "").toUpperCase()) {
    case "CRITICAL":
      return "bg-red-950/40 border-red-700";

    case "HIGH":
      return "bg-orange-950/40 border-orange-700";

    case "MEDIUM":
      return "bg-yellow-950/40 border-yellow-700";

    case "LOW":
      return "bg-green-950/40 border-green-700";

    default:
      return "bg-slate-800 border-slate-700";
  }
}


function getRiskScoreWidth(score) {
  const numericScore = Number(score) || 0;

  return `${Math.min(
    Math.max(numericScore, 0),
    100
  )}%`;
}


function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString();
}


function formatDecimal(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}


function formatDateTime(value) {
  if (!value) {
    return "No data";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}


/* ============================================================
   COMPONENT
============================================================ */

function EmployeeProfiles() {

  const [employees, setEmployees] = useState([]);

  const [searchKeyword, setSearchKeyword] = useState("");

  const [loading, setLoading] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [intelligence, setIntelligence] = useState(null);

  const [error, setError] = useState("");


  /* ==========================================================
     LOAD EMPLOYEES
  ========================================================== */

  async function loadEmployees() {

    setLoading(true);

    setError("");

    try {

      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/employees/`,
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

        throw new Error(
          `Unable to load employees (${response.status})`
        );
      }


      const data = await response.json();

      setEmployees(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {

      console.error(
        "Employee loading error:",
        error
      );

      setError(
        error.message ||
        "Unable to load employees."
      );

    } finally {

      setLoading(false);

    }
  }


  /* ==========================================================
     LOAD EMPLOYEE INTELLIGENCE
  ========================================================== */

  async function loadEmployeeIntelligence(employee) {

    setSelectedEmployee(employee);

    setIntelligence(null);

    setProfileLoading(true);

    setError("");

    try {

      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/employees/${encodeURIComponent(
          employee.employee_id
        )}/intelligence`,
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

        throw new Error(
          `Unable to load employee intelligence (${response.status})`
        );
      }


      const data = await response.json();

      setIntelligence(data);

    } catch (error) {

      console.error(
        "Employee intelligence error:",
        error
      );

      setError(
        error.message ||
        "Unable to load employee intelligence."
      );

    } finally {

      setProfileLoading(false);

    }
  }


  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {

    loadEmployees();

  }, []);


  /* ==========================================================
     FILTER EMPLOYEES
  ========================================================== */

  const filteredEmployees = useMemo(() => {

    const keyword =
      searchKeyword
        .trim()
        .toLowerCase();


    if (!keyword) {
      return employees;
    }


    return employees.filter(
      (employee) => {

        const employeeId =
          String(
            employee.employee_id || ""
          ).toLowerCase();

        const fullName =
          String(
            employee.full_name || ""
          ).toLowerCase();

        const department =
          String(
            employee.department || ""
          ).toLowerCase();

        const designation =
          String(
            employee.designation || ""
          ).toLowerCase();


        return (
          employeeId.includes(keyword) ||
          fullName.includes(keyword) ||
          department.includes(keyword) ||
          designation.includes(keyword)
        );
      }
    );

  }, [
    employees,
    searchKeyword,
  ]);


  /* ==========================================================
     PSYCHOMETRIC DATA
  ========================================================== */

  const psychometricData = useMemo(() => {

    const psychometric =
      intelligence?.psychometric;


    if (!psychometric) {
      return [];
    }


    return [

      {
        trait: "Openness",
        value: Number(
          psychometric.openness
        ) || 0,
      },

      {
        trait: "Conscientiousness",
        value: Number(
          psychometric.conscientiousness
        ) || 0,
      },

      {
        trait: "Extraversion",
        value: Number(
          psychometric.extraversion
        ) || 0,
      },

      {
        trait: "Agreeableness",
        value: Number(
          psychometric.agreeableness
        ) || 0,
      },

      {
        trait: "Neuroticism",
        value: Number(
          psychometric.neuroticism
        ) || 0,
      },

    ];

  }, [
    intelligence,
  ]);


  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <MainLayout>

      <div className="space-y-6">


        {/* ======================================================
            PAGE HEADER
        ======================================================= */}

        <div>

          <p className="text-cyan-400 text-sm font-medium">
            SECURITY ANALYTICS
          </p>

          <h1 className="text-3xl font-bold text-white mt-1">
            Employee Profiles
          </h1>

          <p className="text-gray-500 mt-2">
            Analyze employee identity, behavioral activity,
            psychometric characteristics and security risk.
          </p>

        </div>


        {/* ======================================================
            ERROR
        ======================================================= */}

        {error && (

          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4">

            <p className="text-red-400">
              {error}
            </p>

          </div>

        )}


        {/* ======================================================
            SEARCH
        ======================================================= */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

          <label className="text-gray-400 text-sm">
            Search Employees
          </label>

          <input
            type="text"
            value={searchKeyword}
            onChange={(event) =>
              setSearchKeyword(
                event.target.value
              )
            }
            placeholder="Search by employee ID, name, department or designation..."
            className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-cyan-400"
          />

        </div>


        {/* ======================================================
            EMPLOYEE TABLE
        ======================================================= */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

          <div className="p-6 border-b border-slate-800">

            <div className="flex justify-between items-center">

              <div>

                <h2 className="text-xl font-semibold text-white">
                  Employee Directory
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                  {filteredEmployees.length} employee(s)
                </p>

              </div>


              <button
                onClick={loadEmployees}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-lg font-semibold transition"
              >
                Refresh
              </button>

            </div>

          </div>


          {loading ? (

            <div className="p-10 text-center text-gray-500">
              Loading employees...
            </div>

          ) : filteredEmployees.length === 0 ? (

            <div className="p-10 text-center text-gray-500">
              No employees found.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b border-slate-800 text-left">

                    <th className="px-6 py-4 text-gray-400 font-medium">
                      Employee ID
                    </th>

                    <th className="px-6 py-4 text-gray-400 font-medium">
                      Name
                    </th>

                    <th className="px-6 py-4 text-gray-400 font-medium">
                      Department
                    </th>

                    <th className="px-6 py-4 text-gray-400 font-medium">
                      Designation
                    </th>

                    <th className="px-6 py-4 text-gray-400 font-medium">
                      Status
                    </th>

                    <th className="px-6 py-4 text-gray-400 font-medium">
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredEmployees.map(
                    (employee) => (

                      <tr
                        key={employee.id}
                        className="border-b border-slate-800 hover:bg-slate-800/40 transition"
                      >

                        <td className="px-6 py-4 text-cyan-400 font-medium">
                          {employee.employee_id}
                        </td>

                        <td className="px-6 py-4 text-white">
                          {employee.full_name}
                        </td>

                        <td className="px-6 py-4 text-gray-300">
                          {employee.department || "-"}
                        </td>

                        <td className="px-6 py-4 text-gray-300">
                          {employee.designation || "-"}
                        </td>

                        <td className="px-6 py-4">

                          <span
                            className={
                              employee.status === "Active"
                                ? "text-green-400"
                                : "text-gray-500"
                            }
                          >
                            {employee.status || "-"}
                          </span>

                        </td>

                        <td className="px-6 py-4">

                          <button
                            onClick={() =>
                              loadEmployeeIntelligence(
                                employee
                              )
                            }
                            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-lg font-semibold text-sm transition"
                          >
                            View Profile
                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* ======================================================
            EMPLOYEE INTELLIGENCE
        ======================================================= */}

        {selectedEmployee && (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">


            {/* ==================================================
                PROFILE HEADER
            =================================================== */}

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">

              <div>

                <p className="text-gray-500 text-sm">
                  Selected Employee
                </p>

                <h2 className="text-3xl font-bold text-white mt-1">
                  {selectedEmployee.full_name}
                </h2>

                <p className="text-cyan-400 mt-1 font-medium">
                  {selectedEmployee.employee_id}
                </p>

              </div>


              <div
                className={`border rounded-xl px-6 py-4 ${getRiskBackground(
                  intelligence?.risk?.risk_level
                )}`}
              >

                <p className="text-gray-400 text-sm">
                  Current Risk
                </p>

                <p
                  className={`text-2xl font-bold mt-1 ${getRiskColor(
                    intelligence?.risk?.risk_level
                  )}`}
                >
                  {intelligence?.risk?.risk_level ||
                    "Not Calculated"}
                </p>

              </div>

            </div>


            {profileLoading ? (

              <div className="py-16 text-center">

                <p className="text-cyan-400 text-lg">
                  Loading employee intelligence...
                </p>

                <p className="text-gray-500 text-sm mt-2">
                  Retrieving employee, psychometric,
                  behavioral and risk information.
                </p>

              </div>

            ) : intelligence ? (

              <div className="space-y-8">


                {/* ==================================================
                    EMPLOYEE INFORMATION
                =================================================== */}

                <section>

                  <h3 className="text-xl font-semibold text-white mb-4">
                    Employee Information
                  </h3>


                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">


                    <div className="bg-slate-800 rounded-xl p-5">

                      <p className="text-gray-500 text-sm">
                        Employee ID
                      </p>

                      <p className="text-cyan-400 font-semibold mt-2">
                        {intelligence.employee.employee_id}
                      </p>

                    </div>


                    <div className="bg-slate-800 rounded-xl p-5">

                      <p className="text-gray-500 text-sm">
                        Department
                      </p>

                      <p className="text-white font-medium mt-2">
                        {intelligence.employee.department}
                      </p>

                    </div>


                    <div className="bg-slate-800 rounded-xl p-5">

                      <p className="text-gray-500 text-sm">
                        Designation
                      </p>

                      <p className="text-white font-medium mt-2">
                        {intelligence.employee.designation}
                      </p>

                    </div>


                    <div className="bg-slate-800 rounded-xl p-5">

                      <p className="text-gray-500 text-sm">
                        Status
                      </p>

                      <p
                        className={
                          intelligence.employee.status === "Active"
                            ? "text-green-400 font-medium mt-2"
                            : "text-gray-400 font-medium mt-2"
                        }
                      >
                        {intelligence.employee.status}
                      </p>

                    </div>


                    <div className="bg-slate-800 rounded-xl p-5">

                      <p className="text-gray-500 text-sm">
                        Manager
                      </p>

                      <p className="text-white font-medium mt-2">
                        {intelligence.employee.manager}
                      </p>

                    </div>


                    <div className="bg-slate-800 rounded-xl p-5">

                      <p className="text-gray-500 text-sm">
                        Device
                      </p>

                      <p className="text-white font-medium mt-2">
                        {intelligence.employee.device_information}
                      </p>

                    </div>


                    <div className="bg-slate-800 rounded-xl p-5 md:col-span-2">

                      <p className="text-gray-500 text-sm">
                        Access Privileges
                      </p>

                      <p className="text-white font-medium mt-2">
                        {intelligence.employee.access_privileges}
                      </p>

                    </div>

                  </div>

                </section>


                {/* ==================================================
                    PSYCHOMETRIC PROFILE
                =================================================== */}

                <section>

                  <div className="flex items-center justify-between mb-4">

                    <div>

                      <h3 className="text-xl font-semibold text-white">
                        Psychometric Profile
                      </h3>

                      <p className="text-gray-500 text-sm mt-1">
                        Big Five personality characteristics
                      </p>

                    </div>

                  </div>


                  {intelligence.psychometric ? (

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">


                      {/* Radar */}

                      <div className="bg-slate-800 rounded-xl p-5">

                        <div className="h-80">

                          <ResponsiveContainer
                            width="100%"
                            height="100%"
                          >

                            <RadarChart
                              data={psychometricData}
                            >

                              <PolarGrid />

                              <PolarAngleAxis
                                dataKey="trait"
                                tick={{
                                  fill: "#cbd5e1",
                                  fontSize: 11,
                                }}
                              />

                              <PolarRadiusAxis
                                angle={30}
                                domain={[0, 100]}
                                tick={{
                                  fill: "#64748b",
                                  fontSize: 10,
                                }}
                              />

                              <Radar
                                name="Personality"
                                dataKey="value"
                                stroke="#22d3ee"
                                fill="#22d3ee"
                                fillOpacity={0.25}
                              />

                              <Tooltip />

                            </RadarChart>

                          </ResponsiveContainer>

                        </div>

                      </div>


                      {/* Trait Values */}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        {psychometricData.map(
                          (trait) => (

                            <div
                              key={trait.trait}
                              className="bg-slate-800 rounded-xl p-5"
                            >

                              <p className="text-gray-400 text-sm">
                                {trait.trait}
                              </p>

                              <p className="text-3xl font-bold text-cyan-400 mt-2">
                                {trait.value}
                              </p>

                              <div className="w-full h-2 bg-slate-700 rounded-full mt-3 overflow-hidden">

                                <div
                                  className="h-full bg-cyan-400 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      Math.max(
                                        Number(
                                          trait.value
                                        ) || 0,
                                        0
                                      ),
                                      100
                                    )}%`,
                                  }}
                                />

                              </div>

                            </div>

                          )
                        )}

                      </div>

                    </div>

                  ) : (

                    <div className="bg-slate-800 rounded-xl p-6 text-gray-500">
                      No psychometric profile available
                      for this employee.
                    </div>

                  )}

                </section>


                {/* ==================================================
                    RISK INTELLIGENCE
                =================================================== */}

                <section>

                  <h3 className="text-xl font-semibold text-white mb-4">
                    Risk Intelligence
                  </h3>


                  {intelligence.risk ? (

                    <div className="space-y-6">


                      {/* Risk Summary */}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">


                        <div
                          className={`rounded-xl border p-6 ${getRiskBackground(
                            intelligence.risk.risk_level
                          )}`}
                        >

                          <p className="text-gray-400">
                            Risk Level
                          </p>

                          <p
                            className={`text-3xl font-bold mt-2 ${getRiskColor(
                              intelligence.risk.risk_level
                            )}`}
                          >
                            {intelligence.risk.risk_level}
                          </p>

                        </div>


                        <div className="bg-slate-800 rounded-xl p-6">

                          <p className="text-gray-400">
                            Risk Score
                          </p>

                          <p className="text-3xl font-bold text-cyan-400 mt-2">

                            {formatNumber(
                              intelligence.risk.risk_score
                            )}

                            <span className="text-lg text-gray-500">
                              /100
                            </span>

                          </p>

                        </div>


                        <div className="bg-slate-800 rounded-xl p-6">

                          <p className="text-gray-400">
                            Risk Progress
                          </p>

                          <div className="w-full h-3 bg-slate-700 rounded-full mt-4 overflow-hidden">

                            <div
                              className="h-full bg-cyan-400 rounded-full"
                              style={{
                                width:
                                  getRiskScoreWidth(
                                    intelligence.risk.risk_score
                                  ),
                              }}
                            />

                          </div>

                        </div>

                      </div>


                      {/* Risk Indicators */}

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">


                        <div className="bg-slate-800 rounded-xl p-5">

                          <p className="text-gray-400 text-sm">
                            Behavioral Anomalies
                          </p>

                          <p className="text-2xl font-bold text-white mt-2">
                            {formatDecimal(
                              intelligence.risk
                                .behavioral_anomalies
                            )}
                          </p>

                        </div>


                        <div className="bg-slate-800 rounded-xl p-5">

                          <p className="text-gray-400 text-sm">
                            Privilege Misuse
                          </p>

                          <p className="text-2xl font-bold text-orange-400 mt-2">
                            {formatDecimal(
                              intelligence.risk
                                .privilege_misuse
                            )}
                          </p>

                        </div>


                        <div className="bg-slate-800 rounded-xl p-5">

                          <p className="text-gray-400 text-sm">
                            Data Access Violations
                          </p>

                          <p className="text-2xl font-bold text-yellow-400 mt-2">
                            {formatDecimal(
                              intelligence.risk
                                .data_access_violations
                            )}
                          </p>

                        </div>


                        <div className="bg-slate-800 rounded-xl p-5">

                          <p className="text-gray-400 text-sm">
                            Access Pattern Deviations
                          </p>

                          <p className="text-2xl font-bold text-red-400 mt-2">
                            {formatDecimal(
                              intelligence.risk
                                .access_pattern_deviations
                            )}
                          </p>

                        </div>


                        <div className="bg-slate-800 rounded-xl p-5">

                          <p className="text-gray-400 text-sm">
                            Historical Security Events
                          </p>

                          <p className="text-2xl font-bold text-cyan-400 mt-2">
                            {formatDecimal(
                              intelligence.risk
                                .historical_security_events
                            )}
                          </p>

                        </div>

                      </div>


                      {/* Explanation */}

                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">

                        <h4 className="text-lg font-semibold text-white mb-3">
                          Risk Explanation
                        </h4>

                        <p className="text-gray-300 leading-7">
                          {intelligence.risk.explanation ||
                            "No risk explanation available."}
                        </p>

                      </div>

                    </div>

                  ) : (

                    <div className="bg-slate-800 rounded-xl p-6">

                      <p className="text-gray-500">
                        Risk has not been calculated for this
                        employee yet.
                      </p>

                      <p className="text-gray-600 text-sm mt-2">
                        Run risk calculation from the Risk
                        Scoring module to generate intelligence.
                      </p>

                    </div>

                  )}

                </section>


                {/* ==================================================
                    BEHAVIORAL ACTIVITY
                =================================================== */}

                <section>

                  <div className="flex items-center justify-between mb-4">

                    <div>

                      <h3 className="text-xl font-semibold text-white">
                        Behavioral Activity
                      </h3>

                      <p className="text-gray-500 text-sm mt-1">
                        Activity patterns collected from employee
                        monitoring data
                      </p>

                    </div>

                  </div>


                  {intelligence.activity ? (

                    <div className="space-y-5">


                      {/* ==================================================
                          ACTIVITY CARDS
                      =================================================== */}

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">


                        {/* LOGON */}

                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">

                          <p className="text-gray-400 text-sm">
                            Logon Activity
                          </p>

                          <p className="text-3xl font-bold text-cyan-400 mt-2">
                            {formatNumber(
                              intelligence.activity.logon.total_events
                            )}
                          </p>

                          <p className="text-gray-500 text-xs mt-1">
                            Total Events
                          </p>


                          <div className="mt-4 space-y-2 text-sm">

                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                Logons
                              </span>

                              <span className="text-green-400">
                                {formatNumber(
                                  intelligence.activity.logon.logon_events
                                )}
                              </span>
                            </div>


                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                Logoffs
                              </span>

                              <span className="text-yellow-400">
                                {formatNumber(
                                  intelligence.activity.logon.logoff_events
                                )}
                              </span>
                            </div>


                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                Devices
                              </span>

                              <span className="text-white">
                                {formatNumber(
                                  intelligence.activity.logon.unique_devices
                                )}
                              </span>
                            </div>

                          </div>

                        </div>


                        {/* EMAIL */}

                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">

                          <p className="text-gray-400 text-sm">
                            Email Activity
                          </p>

                          <p className="text-3xl font-bold text-cyan-400 mt-2">
                            {formatNumber(
                              intelligence.activity.email.total_emails
                            )}
                          </p>

                          <p className="text-gray-500 text-xs mt-1">
                            Total Emails
                          </p>


                          <div className="mt-4 space-y-2 text-sm">

                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                Attachments
                              </span>

                              <span className="text-orange-400">
                                {formatNumber(
                                  intelligence.activity.email
                                    .emails_with_attachments
                                )}
                              </span>
                            </div>


                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                No Attachments
                              </span>

                              <span className="text-green-400">
                                {formatNumber(
                                  intelligence.activity.email
                                    .emails_without_attachments
                                )}
                              </span>
                            </div>


                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                Avg Size
                              </span>

                              <span className="text-white">
                                {formatNumber(
                                  intelligence.activity.email
                                    .average_email_size
                                )} bytes
                              </span>
                            </div>

                          </div>

                        </div>


                        {/* FILE */}

                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">

                          <p className="text-gray-400 text-sm">
                            File Activity
                          </p>

                          <p className="text-3xl font-bold text-cyan-400 mt-2">
                            {formatNumber(
                              intelligence.activity.file
                                .total_file_events
                            )}
                          </p>

                          <p className="text-gray-500 text-xs mt-1">
                            Total File Events
                          </p>


                          <div className="mt-4 space-y-2 text-sm">

                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                Unique Files
                              </span>

                              <span className="text-orange-400">
                                {formatNumber(
                                  intelligence.activity.file
                                    .unique_files
                                )}
                              </span>
                            </div>


                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                Devices
                              </span>

                              <span className="text-white">
                                {formatNumber(
                                  intelligence.activity.file
                                    .unique_devices
                                )}
                              </span>
                            </div>

                          </div>

                        </div>


                        {/* HTTP */}

                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">

                          <p className="text-gray-400 text-sm">
                            Web Activity
                          </p>

                          <p className="text-3xl font-bold text-cyan-400 mt-2">
                            {formatNumber(
                              intelligence.activity.http
                                .total_http_events
                            )}
                          </p>

                          <p className="text-gray-500 text-xs mt-1">
                            HTTP Events
                          </p>


                          <div className="mt-4 space-y-2 text-sm">

                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                Websites
                              </span>

                              <span className="text-orange-400">
                                {formatNumber(
                                  intelligence.activity.http
                                    .unique_websites
                                )}
                              </span>
                            </div>


                            <div className="flex justify-between">
                              <span className="text-gray-500">
                                Devices
                              </span>

                              <span className="text-white">
                                {formatNumber(
                                  intelligence.activity.http
                                    .unique_devices
                                )}
                              </span>
                            </div>

                          </div>

                        </div>


                        {/* DEVICE */}

                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">

                          <p className="text-gray-400 text-sm">
                            Device Activity
                          </p>

                          <p className="text-3xl font-bold text-cyan-400 mt-2">
                            {formatNumber(
                              intelligence.activity.device
                                .total_device_events
                            )}
                          </p>

                          <p className="text-gray-500 text-xs mt-1">
                            Device Events
                          </p>


                          <div className="mt-4 space-y-3">

                            <div className="flex justify-between text-sm">

                              <span className="text-gray-500">
                                Devices
                              </span>

                              <span className="text-white">
                                {formatNumber(
                                  intelligence.activity.device
                                    .unique_devices
                                )}
                              </span>

                            </div>


                            <div>

                              <p className="text-gray-500 text-xs mb-2">
                                Activity Types
                              </p>


                              <div className="flex flex-wrap gap-2">

                                {Array.isArray(
                                  intelligence.activity.device
                                    .activity_types
                                ) &&
                                intelligence.activity.device
                                  .activity_types.length > 0 ? (

                                  intelligence.activity.device
                                    .activity_types.map(
                                      (activityType) => (

                                        <span
                                          key={activityType}
                                          className="px-2 py-1 bg-slate-700 rounded text-xs text-cyan-300"
                                        >
                                          {activityType}
                                        </span>

                                      )
                                    )

                                ) : (

                                  <span className="text-gray-600 text-xs">
                                    No device activity
                                  </span>

                                )}

                              </div>

                            </div>

                          </div>

                        </div>

                      </div>


                      {/* ==================================================
                          LAST ACTIVITY
                      =================================================== */}

                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">

                        <h4 className="text-white font-semibold mb-4">
                          Last Recorded Activity
                        </h4>


                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">


                          <div>

                            <p className="text-gray-500 text-xs">
                              Logon
                            </p>

                            <p className="text-gray-300 text-sm mt-1">
                              {formatDateTime(
                                intelligence.activity.logon
                                  .last_activity
                              )}
                            </p>

                          </div>


                          <div>

                            <p className="text-gray-500 text-xs">
                              Email
                            </p>

                            <p className="text-gray-300 text-sm mt-1">
                              {formatDateTime(
                                intelligence.activity.email
                                  .last_activity
                              )}
                            </p>

                          </div>


                          <div>

                            <p className="text-gray-500 text-xs">
                              File
                            </p>

                            <p className="text-gray-300 text-sm mt-1">
                              {formatDateTime(
                                intelligence.activity.file
                                  .last_activity
                              )}
                            </p>

                          </div>


                          <div>

                            <p className="text-gray-500 text-xs">
                              Web
                            </p>

                            <p className="text-gray-300 text-sm mt-1">
                              {formatDateTime(
                                intelligence.activity.http
                                  .last_activity
                              )}
                            </p>

                          </div>


                          <div>

                            <p className="text-gray-500 text-xs">
                              Device
                            </p>

                            <p className="text-gray-300 text-sm mt-1">
                              {formatDateTime(
                                intelligence.activity.device
                                  .last_activity
                              )}
                            </p>

                          </div>

                        </div>

                      </div>


                    </div>

                  ) : (

                    <div className="bg-slate-800 rounded-xl p-6 text-gray-500">
                      No behavioral activity data available
                      for this employee.
                    </div>

                  )}

                </section>


              </div>

            ) : (

              <div className="py-12 text-center text-gray-500">

                Select an employee and click

                <span className="text-cyan-400 mx-1">
                  View Profile
                </span>

                to load the employee intelligence profile.

              </div>

            )}

          </div>

        )}

      </div>

    </MainLayout>

  );
}


export default EmployeeProfiles;