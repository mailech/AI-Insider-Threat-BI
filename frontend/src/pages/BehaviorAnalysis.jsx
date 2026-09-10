import { useEffect, useState } from "react";
import axios from "axios";

import {
  FaBrain,
  FaSearch,
  FaExclamationTriangle,
  FaDesktop,
  FaEnvelope,
  FaGlobe,
  FaFileAlt,
  FaSignInAlt,
} from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";


function BehaviorAnalysis() {

  const [employeeId, setEmployeeId] = useState("");
  const [behavior, setBehavior] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  // =====================================================
  // LOAD BEHAVIOR
  // =====================================================

  const loadBehavior = async (id) => {

    if (!id.trim()) {
      setError("Please enter an employee ID.");
      return;
    }

    try {

      setLoading(true);
      setError("");
      setBehavior(null);

      const token = localStorage.getItem("access_token");

      const response = await axios.get(
        `http://127.0.0.1:8000/behavior/${id.trim()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setBehavior(response.data);

    } catch (err) {

      console.error("Behavior analysis error:", err);

      if (err.response?.status === 404) {

        setError(
          "Behavior data not found for this employee."
        );

      } else if (err.response?.status === 401) {

        setError(
          "Authentication failed. Please login again."
        );

      } else {

        setError(
          err.response?.data?.detail ||
          "Unable to load behavioral analysis."
        );

      }

    } finally {

      setLoading(false);

    }
  };


  // =====================================================
  // LOAD DEFAULT EMPLOYEE
  // =====================================================

  useEffect(() => {

    loadBehavior("CEL0561");

  }, []);


  // =====================================================
  // ANOMALY BADGE
  // =====================================================

  const getAnomalyClass = (level) => {

    switch (level) {

      case "CRITICAL":

        return (
          "bg-red-500/15 text-red-400 " +
          "border-red-500/30"
        );

      case "HIGH":

        return (
          "bg-orange-500/15 text-orange-400 " +
          "border-orange-500/30"
        );

      case "MEDIUM":

        return (
          "bg-yellow-500/15 text-yellow-400 " +
          "border-yellow-500/30"
        );

      default:

        return (
          "bg-green-500/15 text-green-400 " +
          "border-green-500/30"
        );
    }
  };


  // =====================================================
  // METRIC CARD
  // =====================================================

  const MetricCard = ({
    icon,
    title,
    value,
  }) => {

    return (

      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">

            {icon}

          </div>

          <div>

            <p className="text-gray-400 text-xs">
              {title}
            </p>

            <p className="text-white text-2xl font-bold mt-1">
              {value}
            </p>

          </div>

        </div>

      </div>

    );
  };


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <MainLayout>

      <div className="space-y-6">

        {/* =================================================
            HEADER
        ================================================== */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          <div>

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">

                <FaBrain
                  className="text-cyan-400"
                  size={18}
                />

              </div>

              <div>

                <h1 className="text-3xl font-bold text-white">
                  Behavior Analysis
                </h1>

                <p className="text-gray-400 text-sm mt-1">
                  Employee behavioral intelligence and anomaly analysis
                </p>

              </div>

            </div>

          </div>


          {/* =================================================
              EMPLOYEE SEARCH
          ================================================== */}

          <div className="flex items-center gap-2">

            <input
              type="text"
              value={employeeId}
              onChange={(e) =>
                setEmployeeId(e.target.value)
              }
              onKeyDown={(e) => {

                if (e.key === "Enter") {

                  loadBehavior(employeeId);

                }

              }}
              placeholder="Employee ID"
              className="w-48 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500"
            />

            <button
              type="button"
              onClick={() =>
                loadBehavior(employeeId)
              }
              disabled={loading}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-sm px-4 py-2.5 rounded-lg transition"
            >

              <FaSearch size={12} />

              {loading
                ? "Loading..."
                : "Analyze"}

            </button>

          </div>

        </div>


        {/* =================================================
            ERROR
        ================================================== */}

        {error && (

          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-4 text-sm">

            {error}

          </div>

        )}


        {/* =================================================
            LOADING
        ================================================== */}

        {loading && !behavior && (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-gray-400">

            Loading behavioral analysis...

          </div>

        )}


        {/* =================================================
            BEHAVIOR DATA
        ================================================== */}

        {behavior && (

          <>

            {/* =================================================
                SUMMARY
            ================================================== */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {/* Employee */}

              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

                <p className="text-gray-400 text-sm">
                  Employee
                </p>

                <h2 className="text-3xl font-bold text-cyan-400 mt-2">
                  {behavior.employee_id}
                </h2>

                <p className="text-gray-500 text-sm mt-2">
                  Behavioral profile
                </p>

              </div>


              {/* ML Score */}

              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-gray-400 text-sm">
                      ML Anomaly Score
                    </p>

                    <h2 className="text-3xl font-bold text-white mt-2">

                      {behavior.anomaly_score}

                      <span className="text-gray-500 text-base ml-1">
                        /100
                      </span>

                    </h2>

                  </div>

                  <FaBrain
                    size={28}
                    className="text-cyan-400"
                  />

                </div>

              </div>


              {/* Anomaly Level */}

              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

                <p className="text-gray-400 text-sm">
                  Anomaly Level
                </p>

                <div className="mt-3">

                  <span
                    className={
                      `inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${getAnomalyClass(
                        behavior.anomaly_level
                      )}`
                    }
                  >

                    <FaExclamationTriangle size={11} />

                    {behavior.anomaly_level}

                  </span>

                </div>

                <p className="text-gray-500 text-sm mt-3">
                  {behavior.behavioral_status}
                </p>

              </div>

            </div>


            {/* =================================================
                BEHAVIORAL METRICS
            ================================================== */}

            <div>

              <div className="mb-4">

                <h2 className="text-xl font-semibold text-white">
                  Behavioral Metrics
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                  Aggregated employee activity profile
                </p>

              </div>


              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

                <MetricCard
                  icon={<FaSignInAlt size={16} />}
                  title="Logon Activity"
                  value={behavior.logon_activity}
                />

                <MetricCard
                  icon={<FaEnvelope size={16} />}
                  title="Email Activity"
                  value={behavior.email_activity}
                />

                <MetricCard
                  icon={<FaFileAlt size={16} />}
                  title="File Activity"
                  value={behavior.file_activity}
                />

                <MetricCard
                  icon={<FaGlobe size={16} />}
                  title="HTTP Activity"
                  value={behavior.http_activity}
                />

                <MetricCard
                  icon={<FaDesktop size={16} />}
                  title="Device Activity"
                  value={behavior.device_activity}
                />

              </div>

            </div>


            {/* =================================================
                ACTIVITY + DEVICE PROFILE
            ================================================== */}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Activity Profile */}

              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

                <h2 className="text-xl font-semibold text-white">
                  Activity Profile
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                  Behavioral activity indicators
                </p>


                <div className="space-y-6 mt-6">

                  {/* Activity Volume */}

                  <div>

                    <div className="flex justify-between mb-2">

                      <span className="text-gray-400 text-sm">
                        Activity Volume
                      </span>

                      <span className="text-white text-sm font-semibold">
                        {behavior.activity_volume}
                      </span>

                    </div>

                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">

                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            Number(
                              behavior.activity_volume || 0
                            ),
                            100
                          )}%`,
                        }}
                      />

                    </div>

                  </div>


                  {/* Activity Diversity */}

                  <div>

                    <div className="flex justify-between mb-2">

                      <span className="text-gray-400 text-sm">
                        Activity Diversity
                      </span>

                      <span className="text-white text-sm font-semibold">
                        {behavior.activity_diversity}
                      </span>

                    </div>

                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">

                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            Number(
                              behavior.activity_diversity || 0
                            ),
                            100
                          )}%`,
                        }}
                      />

                    </div>

                  </div>


                  {/* Device Diversity */}

                  <div>

                    <div className="flex justify-between mb-2">

                      <span className="text-gray-400 text-sm">
                        Device Diversity
                      </span>

                      <span className="text-white text-sm font-semibold">
                        {behavior.device_diversity}
                      </span>

                    </div>

                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">

                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            Number(
                              behavior.device_diversity || 0
                            ),
                            100
                          )}%`,
                        }}
                      />

                    </div>

                  </div>

                </div>

              </div>


              {/* Device Profile */}

              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

                <h2 className="text-xl font-semibold text-white">
                  Device Profile
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                  Unique devices associated with activity
                </p>


                <div className="grid grid-cols-2 gap-4 mt-6">

                  <div className="bg-slate-800 rounded-lg p-4">

                    <p className="text-gray-400 text-xs">
                      Logon Devices
                    </p>

                    <p className="text-white text-2xl font-bold mt-1">
                      {behavior.logon_unique_devices}
                    </p>

                  </div>


                  <div className="bg-slate-800 rounded-lg p-4">

                    <p className="text-gray-400 text-xs">
                      Email Devices
                    </p>

                    <p className="text-white text-2xl font-bold mt-1">
                      {behavior.email_unique_devices}
                    </p>

                  </div>


                  <div className="bg-slate-800 rounded-lg p-4">

                    <p className="text-gray-400 text-xs">
                      File Devices
                    </p>

                    <p className="text-white text-2xl font-bold mt-1">
                      {behavior.file_unique_devices}
                    </p>

                  </div>


                  <div className="bg-slate-800 rounded-lg p-4">

                    <p className="text-gray-400 text-xs">
                      HTTP Devices
                    </p>

                    <p className="text-white text-2xl font-bold mt-1">
                      {behavior.http_unique_devices}
                    </p>

                  </div>


                  <div className="bg-slate-800 rounded-lg p-4 col-span-2">

                    <p className="text-gray-400 text-xs">
                      Device Activity Devices
                    </p>

                    <p className="text-white text-2xl font-bold mt-1">
                      {behavior.device_unique_devices}
                    </p>

                  </div>

                </div>

              </div>

            </div>


            {/* =================================================
                EXPLANATION
            ================================================== */}

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

              <div className="flex items-start gap-4">

                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">

                  <FaExclamationTriangle
                    className="text-yellow-400"
                    size={16}
                  />

                </div>

                <div>

                  <h2 className="text-xl font-semibold text-white">
                    Behavioral Analysis Explanation
                  </h2>

                  <p className="text-gray-400 text-sm mt-2 leading-6">
                    {behavior.explanation}
                  </p>

                </div>

              </div>

            </div>


            {/* =================================================
                LAST ACTIVITY
            ================================================== */}

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

              <h2 className="text-xl font-semibold text-white">
                Last Recorded Activity
              </h2>

              <p className="text-gray-500 text-sm mt-1">
                Most recent recorded activity by category
              </p>


              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mt-6">

                <div>

                  <p className="text-gray-500 text-xs">
                    Last Logon
                  </p>

                  <p className="text-gray-300 text-sm mt-2">
                    {behavior.last_logon_activity ||
                      "No data"}
                  </p>

                </div>


                <div>

                  <p className="text-gray-500 text-xs">
                    Last Email
                  </p>

                  <p className="text-gray-300 text-sm mt-2">
                    {behavior.last_email_activity ||
                      "No data"}
                  </p>

                </div>


                <div>

                  <p className="text-gray-500 text-xs">
                    Last File
                  </p>

                  <p className="text-gray-300 text-sm mt-2">
                    {behavior.last_file_activity ||
                      "No data"}
                  </p>

                </div>


                <div>

                  <p className="text-gray-500 text-xs">
                    Last HTTP
                  </p>

                  <p className="text-gray-300 text-sm mt-2">
                    {behavior.last_http_activity ||
                      "No data"}
                  </p>

                </div>


                <div>

                  <p className="text-gray-500 text-xs">
                    Last Device
                  </p>

                  <p className="text-gray-300 text-sm mt-2">
                    {behavior.last_device_activity ||
                      "No data"}
                  </p>

                </div>

              </div>

            </div>

          </>

        )}

      </div>

    </MainLayout>

  );
}


export default BehaviorAnalysis;