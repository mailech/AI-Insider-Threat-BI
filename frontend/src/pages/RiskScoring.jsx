import { useEffect, useState } from "react";
import {
  FaShieldAlt,
  FaSyncAlt,
  FaUserShield,
  FaExclamationTriangle,
} from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

function RiskScoring() {
  const [risks, setRisks] = useState([]);

  const [summary, setSummary] = useState({
    total: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(0);

  const limit = 20;

  // ============================================================
  // LOAD RISK DATA
  // ============================================================

  useEffect(() => {
    loadRiskData();
  }, [page]);

  const loadRiskData = async () => {
    try {
      setError("");

      if (risks.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const [riskResponse, summaryResponse] =
        await Promise.all([
          api.get("/risk/", {
            params: {
              skip: page * limit,
              limit: limit,
            },
          }),

          api.get("/risk/dashboard/distribution"),
        ]);

      setRisks(
        Array.isArray(riskResponse.data)
          ? riskResponse.data
          : []
      );

      setSummary({
        total: Number(
          summaryResponse.data?.total || 0
        ),

        low: Number(
          summaryResponse.data?.low || 0
        ),

        medium: Number(
          summaryResponse.data?.medium || 0
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
        "Risk loading error:",
        err
      );

      if (err.response?.status === 401) {
        setError(
          "Authentication expired. Please login again."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            "Unable to load risk data."
        );
      }

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ============================================================
  // RISK LEVEL CLASS
  // ============================================================

  const getRiskClass = (level) => {
    const normalized =
      String(level || "").toUpperCase();

    if (normalized === "CRITICAL") {
      return "bg-red-500/15 text-red-400 border-red-500/30";
    }

    if (normalized === "HIGH") {
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    }

    if (normalized === "MEDIUM") {
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    }

    return "bg-green-500/15 text-green-400 border-green-500/30";
  };

  // ============================================================
  // SCORE CLASS
  // ============================================================

  const getScoreClass = (score) => {
    const value = Number(score || 0);

    if (value >= 80) {
      return "text-red-400";
    }

    if (value >= 60) {
      return "text-orange-400";
    }

    if (value >= 30) {
      return "text-yellow-400";
    }

    return "text-green-400";
  };

  // ============================================================
  // FORMAT VALUE
  // ============================================================

  const formatValue = (value) => {
    const number = Number(value || 0);

    return number.toFixed(2);
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

            <div className="flex items-center gap-3">

              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">

                <FaShieldAlt
                  className="text-cyan-400"
                  size={16}
                />

              </div>

              <div>

                <h1 className="text-2xl font-bold text-white">
                  Risk Scoring
                </h1>

                <p className="text-gray-500 text-sm mt-1">
                  ML-based employee insider threat risk assessment
                </p>

              </div>

            </div>

          </div>


          <button
            type="button"
            onClick={loadRiskData}
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
          SUMMARY
      ======================================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

          <p className="text-gray-500 text-sm">
            Total Employees
          </p>

          <p className="text-cyan-400 text-3xl font-bold mt-2">
            {summary.total}
          </p>

        </div>


        <div className="bg-slate-900 border border-green-500/20 rounded-xl p-5">

          <p className="text-gray-500 text-sm">
            Low Risk
          </p>

          <p className="text-green-400 text-3xl font-bold mt-2">
            {summary.low}
          </p>

        </div>


        <div className="bg-slate-900 border border-yellow-500/20 rounded-xl p-5">

          <p className="text-gray-500 text-sm">
            Medium Risk
          </p>

          <p className="text-yellow-400 text-3xl font-bold mt-2">
            {summary.medium}
          </p>

        </div>


        <div className="bg-slate-900 border border-orange-500/20 rounded-xl p-5">

          <p className="text-gray-500 text-sm">
            High Risk
          </p>

          <p className="text-orange-400 text-3xl font-bold mt-2">
            {summary.high}
          </p>

        </div>


        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-5">

          <p className="text-gray-500 text-sm">
            Critical Risk
          </p>

          <p className="text-red-400 text-3xl font-bold mt-2">
            {summary.critical}
          </p>

        </div>

      </div>


      {/* ======================================================
          RISK TABLE
      ======================================================= */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

        <div className="px-5 py-4 border-b border-slate-800">

          <div className="flex items-center gap-2">

            <FaExclamationTriangle
              className="text-cyan-400"
            />

            <h2 className="text-white font-semibold">
              Employee Risk Assessment
            </h2>

          </div>

          <p className="text-gray-500 text-xs mt-1">
            Risk scores generated by the machine learning risk engine
          </p>

        </div>


        {loading ? (

          <div className="p-10 text-center text-gray-500">
            Loading risk assessments...
          </div>

        ) : risks.length === 0 ? (

          <div className="p-10 text-center text-gray-500">
            No risk records found.
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="text-left text-gray-500 text-xs border-b border-slate-800">

                  <th className="px-5 py-3">
                    Employee
                  </th>

                  <th className="px-5 py-3">
                    Risk Score
                  </th>

                  <th className="px-5 py-3">
                    Risk Level
                  </th>

                  <th className="px-5 py-3">
                    Behavioral
                  </th>

                  <th className="px-5 py-3">
                    Privilege
                  </th>

                  <th className="px-5 py-3">
                    Data Access
                  </th>

                  <th className="px-5 py-3">
                    HTTP Pattern
                  </th>

                  <th className="px-5 py-3">
                    Historical
                  </th>

                </tr>

              </thead>


              <tbody>

                {risks.map((risk) => (

                  <tr
                    key={
                      risk.id ||
                      risk.employee_id
                    }
                    className="border-b border-slate-800/70 hover:bg-slate-800/40 transition"
                  >

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-2">

                        <FaUserShield
                          className="text-cyan-400"
                          size={13}
                        />

                        <span className="text-white text-sm font-medium">
                          {risk.employee_id}
                        </span>

                      </div>

                    </td>


                    <td className="px-5 py-4">

                      <span
                        className={`text-lg font-bold ${getScoreClass(
                          risk.risk_score
                        )}`}
                      >
                        {risk.risk_score}
                      </span>

                      <span className="text-gray-600 text-xs ml-1">
                        /100
                      </span>

                    </td>


                    <td className="px-5 py-4">

                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-medium ${getRiskClass(
                          risk.risk_level
                        )}`}
                      >
                        {risk.risk_level}
                      </span>

                    </td>


                    <td className="px-5 py-4 text-gray-400 text-sm">
                      {formatValue(
                        risk.behavioral_anomalies
                      )}
                    </td>


                    <td className="px-5 py-4 text-gray-400 text-sm">
                      {formatValue(
                        risk.privilege_misuse
                      )}
                    </td>


                    <td className="px-5 py-4 text-gray-400 text-sm">
                      {formatValue(
                        risk.data_access_violations
                      )}
                    </td>


                    <td className="px-5 py-4 text-gray-400 text-sm">
                      {formatValue(
                        risk.access_pattern_deviations
                      )}
                    </td>


                    <td className="px-5 py-4 text-gray-400 text-sm">
                      {formatValue(
                        risk.historical_security_events
                      )}
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
            disabled={
              page === 0 ||
              loading
            }
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
              risks.length < limit ||
              (page + 1) * limit >=
                summary.total
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

    </MainLayout>
  );
}

export default RiskScoring;