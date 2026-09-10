import { useState } from "react";
import axios from "axios";

import {
  FaSearch,
  FaUserShield,
  FaExclamationTriangle,
  FaClock,
  FaDesktop,
  FaFileAlt,
  FaHistory,
  FaBell,
} from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";


function Investigation() {

  const [employeeId, setEmployeeId] = useState("CEL0561");
  const [investigation, setInvestigation] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Persistent investigation case
  const [caseData, setCaseData] = useState(null);
  const [caseLoading, setCaseLoading] = useState(false);

  const [assignedAnalyst, setAssignedAnalyst] = useState("");
  const [caseStatus, setCaseStatus] = useState("Open");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const [workflowMessage, setWorkflowMessage] = useState("");
  const [workflowError, setWorkflowError] = useState("");


  // =====================================================
  // LOAD INVESTIGATION ANALYSIS
  // =====================================================

  const loadInvestigation = async (id) => {

    if (!id.trim()) {
      setError("Please enter an employee ID.");
      return;
    }

    try {

      setLoading(true);
      setError("");
      setInvestigation(null);

      const token = localStorage.getItem("access_token");

      const response = await axios.get(
        `http://127.0.0.1:8000/investigation/${id.trim()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setInvestigation(response.data);

    } catch (err) {

      console.error(
        "Investigation error:",
        err
      );

      if (err.response?.status === 404) {

        setError(
          "Employee investigation data not found."
        );

      } else if (err.response?.status === 401) {

        setError(
          "Authentication failed. Please login again."
        );

      } else if (err.response?.status === 403) {

        setError(
          "You do not have permission to access investigations."
        );

      } else {

        setError(
          err.response?.data?.detail ||
          "Unable to load investigation data."
        );
      }

    } finally {

      setLoading(false);
    }
  };


  // =====================================================
  // LOAD PERSISTENT INVESTIGATION CASE
  // =====================================================

  const loadInvestigationCase = async (id) => {

    if (!id.trim()) {
      return;
    }

    try {

      setCaseLoading(true);
      setWorkflowError("");
      setWorkflowMessage("");
      setCaseData(null);

      const token = localStorage.getItem("access_token");

      const response = await axios.get(
        "http://127.0.0.1:8000/investigation/cases",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const cases = response.data || [];

      // Find the persistent case belonging to this employee
      const matchingCase = cases.find(
        (item) =>
          String(item.employee_id).toUpperCase() ===
          String(id.trim()).toUpperCase()
      );

      if (matchingCase) {

        setCaseData(matchingCase);

        setAssignedAnalyst(
          matchingCase.assigned_analyst || ""
        );

        setCaseStatus(
          matchingCase.status || "Open"
        );

        setResolutionNotes(
          matchingCase.resolution_notes || ""
        );

      } else {

        setCaseData(null);
        setAssignedAnalyst("");
        setCaseStatus("Open");
        setResolutionNotes("");
      }

    } catch (err) {

      console.error(
        "Investigation case loading error:",
        err
      );

      if (err.response?.status === 401) {

        setWorkflowError(
          "Authentication failed. Please login again."
        );

      } else if (err.response?.status === 403) {

        setWorkflowError(
          "You do not have permission to access investigation cases."
        );

      } else {

        setWorkflowError(
          err.response?.data?.detail ||
          "Unable to load investigation case."
        );
      }

    } finally {

      setCaseLoading(false);
    }
  };
  // =====================================================
// ASSIGN INVESTIGATION ANALYST
// =====================================================
const handleAssignAnalyst = async () => {
  if (!caseData?.investigation_id) {
    setWorkflowError("No investigation case is selected.");
    return;
  }

  if (!assignedAnalyst.trim()) {
    setWorkflowError("Please enter an analyst name.");
    return;
  }

  try {
    setCaseLoading(true);
    setWorkflowError("");
    setWorkflowMessage("");

    const token = localStorage.getItem("access_token");

    const response = await axios.put(
      `http://127.0.0.1:8000/investigation/case/${caseData.investigation_id}/assign`,
      {
        assigned_analyst: assignedAnalyst.trim(),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    setCaseData(response.data);
    setAssignedAnalyst(response.data.assigned_analyst || "");

    setWorkflowMessage(
      "Investigation analyst assigned successfully."
    );
  } catch (err) {
    console.error("Assign analyst error:", err);

    setWorkflowError(
      err.response?.data?.detail ||
        "Unable to assign investigation analyst."
    );
  } finally {
    setCaseLoading(false);
  }
};


// =====================================================
// UPDATE INVESTIGATION STATUS
// =====================================================
const handleStatusUpdate = async () => {
  if (!caseData?.investigation_id) {
    setWorkflowError("No investigation case is selected.");
    return;
  }

  try {
    setCaseLoading(true);
    setWorkflowError("");
    setWorkflowMessage("");

    const token = localStorage.getItem("access_token");

    const response = await axios.put(
      `http://127.0.0.1:8000/investigation/case/${caseData.investigation_id}/status`,
      {
        status: caseStatus,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    setCaseData(response.data);
    setCaseStatus(response.data.status || "Open");

    setWorkflowMessage(
      `Investigation status updated to "${response.data.status}".`
    );
  } catch (err) {
    console.error("Status update error:", err);

    setWorkflowError(
      err.response?.data?.detail ||
        "Unable to update investigation status."
    );
  } finally {
    setCaseLoading(false);
  }
};


// =====================================================
// RESOLVE INVESTIGATION
// =====================================================
const handleResolveInvestigation = async () => {
  if (!caseData?.investigation_id) {
    setWorkflowError("No investigation case is selected.");
    return;
  }

  if (!resolutionNotes.trim()) {
    setWorkflowError(
      "Please enter resolution notes before resolving the investigation."
    );
    return;
  }

  try {
    setCaseLoading(true);
    setWorkflowError("");
    setWorkflowMessage("");

    const token = localStorage.getItem("access_token");

    const response = await axios.put(
      `http://127.0.0.1:8000/investigation/case/${caseData.investigation_id}/resolve`,
      {
        resolution_notes: resolutionNotes.trim(),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    setCaseData(response.data);
    setCaseStatus(response.data.status || "Resolved");
    setResolutionNotes(response.data.resolution_notes || "");

    setWorkflowMessage(
      "Investigation resolved successfully."
    );
  } catch (err) {
    console.error("Resolve investigation error:", err);

    setWorkflowError(
      err.response?.data?.detail ||
        "Unable to resolve investigation."
    );
  } finally {
    setCaseLoading(false);
  }
};


  // =====================================================
  // INVESTIGATION SEARCH HANDLER
  // =====================================================

  const handleInvestigation = async () => {

    const id = employeeId.trim();

    if (!id) {
      setError("Please enter an employee ID.");
      return;
    }

    await Promise.all([
      loadInvestigation(id),
      loadInvestigationCase(id),
    ]);
  };


  // =====================================================
  // RISK BADGE
  // =====================================================

  const getRiskClass = (level) => {

    switch (String(level || "").toUpperCase()) {

      case "CRITICAL":
        return "bg-red-500/15 text-red-400 border-red-500/30";

      case "HIGH":
        return "bg-orange-500/15 text-orange-400 border-orange-500/30";

      case "MEDIUM":
        return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";

      default:
        return "bg-green-500/15 text-green-400 border-green-500/30";
    }
  };


  // =====================================================
  // INVESTIGATION STATUS
  // =====================================================

  const getStatusClass = (status) => {

    if (
      String(status || "")
        .toLowerCase()
        .includes("critical")
    ) {
      return "text-red-400";
    }

    if (
      String(status || "")
        .toLowerCase()
        .includes("required")
    ) {
      return "text-orange-400";
    }

    if (
      String(status || "")
        .toLowerCase()
        .includes("monitoring")
    ) {
      return "text-yellow-400";
    }

    return "text-green-400";
  };


  // =====================================================
  // WORKFLOW STATUS CLASS
  // =====================================================

  const getWorkflowStatusClass = (status) => {

    switch (String(status || "").toLowerCase()) {

      case "resolved":
        return "text-green-400";

      case "in progress":
        return "text-yellow-400";

      case "open":
        return "text-cyan-400";

      default:
        return "text-gray-400";
    }
  };


  // =====================================================
  // FORMAT TIMESTAMP
  // =====================================================

  const formatTimestamp = (timestamp) => {

    if (!timestamp) {
      return "Unknown time";
    }

    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };


  // =====================================================
  // EVENT CARD
  // =====================================================

  const EventCard = ({ event, correlated = false }) => {

    return (
      <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-4">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">

          <div>

            <div className="flex items-center gap-2">

              <span className="text-cyan-400 text-sm font-semibold">
                {event.source || "Unknown"}
              </span>

              <span className="text-gray-500 text-xs">
                {event.event_id || "No Event ID"}
              </span>

            </div>

            <p className="text-white font-medium mt-1">
              {event.activity_type || "Unknown activity"}
            </p>

            <p className="text-gray-400 text-sm mt-1">
              {event.details || "No additional details"}
            </p>

          </div>


          <div className="text-left lg:text-right text-xs">

            <p className="text-gray-400">
              {formatTimestamp(event.timestamp)}
            </p>

            <p className="text-gray-500 mt-1">
              Device: {event.device || "Unknown"}
            </p>

            {correlated && (
              <span className="inline-block mt-2 px-2 py-1 rounded border border-red-500/30 bg-red-500/10 text-red-400">
                Correlated Event
              </span>
            )}

          </div>

        </div>

      </div>
    );
  };


  return (

    <MainLayout>

      <div className="space-y-6">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          <div>

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">

                <FaUserShield
                  className="text-cyan-400"
                  size={18}
                />

              </div>

              <div>

                <h1 className="text-3xl font-bold text-white">
                  Threat Investigation
                </h1>

                <p className="text-gray-400 text-sm mt-1">
                  Investigate employee behavior, security events, and threat evidence
                </p>

              </div>

            </div>

          </div>


          {/* SEARCH */}

          <div className="flex items-center gap-2">

            <input
              type="text"
              value={employeeId}
              onChange={(e) =>
                setEmployeeId(e.target.value)
              }
              onKeyDown={(e) => {

                if (e.key === "Enter") {
                  handleInvestigation();
                }

              }}
              placeholder="Employee ID"
              className="w-48 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500"
            />

            <button
              type="button"
              onClick={handleInvestigation}
              disabled={loading || caseLoading}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-sm px-4 py-2.5 rounded-lg transition"
            >

              <FaSearch size={12} />

              {loading || caseLoading
                ? "Loading..."
                : "Investigate"}

            </button>

          </div>

        </div>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-4 text-sm">
            {error}
          </div>

        )}


        {/* =================================================
            WORKFLOW ERROR
        ================================================= */}

        {workflowError && (

          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-4 text-sm">
            {workflowError}
          </div>

        )}


        {/* =================================================
            WORKFLOW MESSAGE
        ================================================= */}

        {workflowMessage && (

          <div className="bg-green-500/10 border border-green-500/30 text-green-300 rounded-lg p-4 text-sm">
            {workflowMessage}
          </div>

        )}


        {/* =================================================
            INITIAL / LOADING
        ================================================= */}

        {!investigation && !loading && !error && (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">

            <FaUserShield
              className="text-cyan-400 mx-auto mb-4"
              size={36}
            />

            <h2 className="text-xl font-semibold text-white">
              Start Threat Investigation
            </h2>

            <p className="text-gray-400 mt-2">
              Enter an employee ID to investigate behavioral activity and security events.
            </p>

          </div>

        )}


        {loading && (

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-gray-400">

            Loading investigation data...

          </div>

        )}


        {/* =================================================
            INVESTIGATION DATA
        ================================================= */}

        {investigation && (

          <>


            {/* =================================================
                EMPLOYEE + RISK + STATUS
            ================================================= */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">


              {/* EMPLOYEE */}

              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

                <p className="text-gray-400 text-sm">
                  Employee
                </p>

                <h2 className="text-3xl font-bold text-cyan-400 mt-2">
                  {investigation.employee?.employee_id}
                </h2>

                <p className="text-white mt-2">
                  {investigation.employee?.full_name}
                </p>

                <p className="text-gray-500 text-sm mt-1">
                  {investigation.employee?.department}
                </p>

              </div>


              {/* RISK */}

              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

                <div className="flex items-start justify-between">

                  <div>

                    <p className="text-gray-400 text-sm">
                      Current Risk
                    </p>

                    <h2 className="text-3xl font-bold text-white mt-2">
                      {investigation.risk?.risk_score ?? 0}

                      <span className="text-gray-500 text-base ml-1">
                        /100
                      </span>

                    </h2>

                  </div>

                  <FaExclamationTriangle
                    className="text-yellow-400"
                    size={24}
                  />

                </div>

                <span
                  className={`inline-flex mt-3 px-3 py-1.5 rounded-full border text-xs font-semibold ${getRiskClass(
                    investigation.risk?.risk_level
                  )}`}
                >
                  {investigation.risk?.risk_level || "LOW"}
                </span>

              </div>


              {/* STATUS */}

              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

                <p className="text-gray-400 text-sm">
                  Investigation Status
                </p>

                <h2
                  className={`text-xl font-bold mt-3 ${getStatusClass(
                    investigation.investigation_status
                  )}`}
                >
                  {investigation.investigation_status}
                </h2>

                <p className="text-gray-500 text-sm mt-2">
                  Current investigation state
                </p>

              </div>

            </div>


            
            {/* =================================================
    PERSISTENT INVESTIGATION WORKFLOW
================================================= */}

<div className="bg-slate-900 rounded-xl p-6 border border-cyan-500/20">

  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">

    <div>
      <div className="flex items-center gap-3">
        <FaUserShield className="text-cyan-400" />

        <h2 className="text-xl font-semibold text-white">
          Investigation Case Workflow
        </h2>
      </div>

      <p className="text-gray-500 text-sm mt-1">
        Persistent investigation case management
      </p>
    </div>

    {caseLoading && (
      <span className="text-gray-400 text-sm">
        Processing...
      </span>
    )}

  </div>


  {!caseLoading && caseData ? (

    <div className="mt-6 space-y-5">

      {/* =================================================
          CASE SUMMARY
      ================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">
            Investigation ID
          </p>

          <p className="text-cyan-400 font-semibold mt-2 break-all">
            {caseData.investigation_id}
          </p>
        </div>


        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">
            Severity
          </p>

          <p
            className={`font-semibold mt-2 ${getRiskClass(
              caseData.severity
            )} inline-flex px-2 py-1 rounded border`}
          >
            {caseData.severity}
          </p>
        </div>


        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">
            Current Status
          </p>

          <p
            className={`font-semibold mt-2 ${getWorkflowStatusClass(
              caseData.status
            )}`}
          >
            {caseData.status}
          </p>
        </div>


        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-500 text-xs">
            Alert
          </p>

          <p className="text-white font-semibold mt-2">
            {caseData.alert_id
              ? `Alert #${caseData.alert_id}`
              : "No linked alert"}
          </p>
        </div>

      </div>


      {/* =================================================
          CASE DETAILS
      ================================================= */}

      <div className="bg-slate-800 rounded-lg p-5">

        <p className="text-gray-500 text-xs">
          Case Title
        </p>

        <p className="text-white font-semibold mt-2">
          {caseData.title}
        </p>

        {caseData.description && (
          <p className="text-gray-400 text-sm mt-3 leading-6">
            {caseData.description}
          </p>
        )}

      </div>


      {/* =================================================
          ASSIGN ANALYST
      ================================================= */}

      <div className="bg-slate-800 rounded-lg p-5">

        <p className="text-gray-400 text-sm font-semibold">
          Assign Analyst
        </p>

        <p className="text-gray-500 text-xs mt-1">
          Assign this investigation case to a security analyst.
        </p>

        <div className="flex flex-col md:flex-row gap-3 mt-4">

          <input
            type="text"
            value={assignedAnalyst}
            onChange={(e) => {
              setAssignedAnalyst(e.target.value);
              setWorkflowError("");
              setWorkflowMessage("");
            }}
            placeholder="Enter analyst name"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500"
          />

          <button
            type="button"
            onClick={handleAssignAnalyst}
            disabled={caseLoading}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold px-5 py-2.5 rounded-lg transition"
          >
            {caseLoading ? "Saving..." : "Assign Analyst"}
          </button>

        </div>

        <p className="text-gray-500 text-xs mt-3">
          Current assignment:{" "}
          <span className="text-gray-300">
            {caseData.assigned_analyst || "Not assigned"}
          </span>
        </p>

      </div>


      {/* =================================================
          UPDATE STATUS
      ================================================= */}

      <div className="bg-slate-800 rounded-lg p-5">

        <p className="text-gray-400 text-sm font-semibold">
          Update Investigation Status
        </p>

        <p className="text-gray-500 text-xs mt-1">
          Move the investigation through the workflow.
        </p>

        <div className="flex flex-col md:flex-row gap-3 mt-4">

          <select
            value={caseStatus}
            onChange={(e) => {
              setCaseStatus(e.target.value);
              setWorkflowError("");
              setWorkflowMessage("");
            }}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
          >
            <option value="Open">
              Open
            </option>

            <option value="In Progress">
              In Progress
            </option>

            <option value="Resolved">
              Resolved
            </option>
          </select>


          <button
            type="button"
            onClick={handleStatusUpdate}
            disabled={caseLoading}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-950 font-semibold px-5 py-2.5 rounded-lg transition"
          >
            {caseLoading ? "Updating..." : "Update Status"}
          </button>

        </div>

      </div>


      {/* =================================================
          RESOLVE INVESTIGATION
      ================================================= */}

      <div className="bg-slate-800 rounded-lg p-5">

        <p className="text-gray-400 text-sm font-semibold">
          Resolve Investigation
        </p>

        <p className="text-gray-500 text-xs mt-1">
          Record the final resolution notes and close the investigation.
        </p>

        <textarea
          value={resolutionNotes}
          onChange={(e) => {
            setResolutionNotes(e.target.value);
            setWorkflowError("");
            setWorkflowMessage("");
          }}
          rows={4}
          placeholder="Enter resolution notes..."
          className="w-full mt-4 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500 resize-none"
        />


        <div className="flex justify-end mt-3">

          <button
            type="button"
            onClick={handleResolveInvestigation}
            disabled={caseLoading}
            className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-slate-950 font-semibold px-5 py-2.5 rounded-lg transition"
          >
            {caseLoading
              ? "Resolving..."
              : "Resolve Investigation"}
          </button>

        </div>

      </div>


      {/* =================================================
          CURRENT WORKFLOW INFORMATION
      ================================================= */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="bg-slate-800 rounded-lg p-5">

          <p className="text-gray-500 text-xs">
            Created
          </p>

          <p className="text-gray-300 mt-2 text-sm">
            {formatTimestamp(caseData.created_at)}
          </p>

        </div>


        <div className="bg-slate-800 rounded-lg p-5">

          <p className="text-gray-500 text-xs">
            Last Updated
          </p>

          <p className="text-gray-300 mt-2 text-sm">
            {formatTimestamp(caseData.updated_at)}
          </p>

        </div>

      </div>


      {/* =================================================
          RESOLUTION INFORMATION
      ================================================= */}

      {caseData.resolution_notes && (
        <div className="bg-slate-800 rounded-lg p-5">

          <p className="text-gray-500 text-xs">
            Recorded Resolution
          </p>

          <p className="text-gray-300 mt-2 text-sm leading-6">
            {caseData.resolution_notes}
          </p>

          {caseData.resolved_at && (
            <p className="text-gray-500 text-xs mt-3">
              Resolved: {formatTimestamp(caseData.resolved_at)}
            </p>
          )}

        </div>
      )}

    </div>

  ) : !caseLoading ? (

    <div className="bg-slate-800/50 rounded-lg p-5 mt-5">

      <p className="text-gray-400 text-sm">
        No persistent investigation case exists for this employee.
      </p>

      <p className="text-gray-500 text-xs mt-2">
        A case can be created from the investigation workflow.
      </p>

    </div>

  ) : null}

</div>


            {/* =================================================
                EMPLOYEE DETAILS
            ================================================= */}

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

              <h2 className="text-xl font-semibold text-white">
                Employee Investigation Profile
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mt-5">

                <div>

                  <p className="text-gray-500 text-xs">
                    Designation
                  </p>

                  <p className="text-gray-300 text-sm mt-2">
                    {investigation.employee?.designation || "Not Available"}
                  </p>

                </div>


                <div>

                  <p className="text-gray-500 text-xs">
                    Manager
                  </p>

                  <p className="text-gray-300 text-sm mt-2">
                    {investigation.employee?.manager || "Not Available"}
                  </p>

                </div>


                <div>

                  <p className="text-gray-500 text-xs">
                    Device Information
                  </p>

                  <p className="text-gray-300 text-sm mt-2">
                    {investigation.employee?.device_information || "Not Available"}
                  </p>

                </div>


                <div>

                  <p className="text-gray-500 text-xs">
                    Access Privileges
                  </p>

                  <p className="text-gray-300 text-sm mt-2">
                    {investigation.employee?.access_privileges || "Not Available"}
                  </p>

                </div>

              </div>

            </div>


            {/* =================================================
                SUMMARY
            ================================================= */}

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

              <div className="flex items-start gap-4">

                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">

                  <FaHistory
                    className="text-yellow-400"
                    size={16}
                  />

                </div>

                <div>

                  <h2 className="text-xl font-semibold text-white">
                    Investigation Summary
                  </h2>

                  <p className="text-gray-400 text-sm mt-2 leading-6">
                    {investigation.summary ||
                      "No investigation summary available."}
                  </p>

                </div>

              </div>

            </div>


            {/* =================================================
                RISK FACTORS
            ================================================= */}

            {investigation.risk && (

              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

                <h2 className="text-xl font-semibold text-white">
                  Risk Analysis
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-5">

                  <div className="bg-slate-800 rounded-lg p-4">

                    <p className="text-gray-400 text-xs">
                      Behavioral Anomalies
                    </p>

                    <p className="text-white text-2xl font-bold mt-2">
                      {investigation.risk.behavioral_anomalies ?? 0}
                    </p>

                  </div>


                  <div className="bg-slate-800 rounded-lg p-4">

                    <p className="text-gray-400 text-xs">
                      Privilege Misuse
                    </p>

                    <p className="text-white text-2xl font-bold mt-2">
                      {investigation.risk.privilege_misuse ?? 0}
                    </p>

                  </div>


                  <div className="bg-slate-800 rounded-lg p-4">

                    <p className="text-gray-400 text-xs">
                      Data Access Violations
                    </p>

                    <p className="text-white text-2xl font-bold mt-2">
                      {investigation.risk.data_access_violations ?? 0}
                    </p>

                  </div>


                  <div className="bg-slate-800 rounded-lg p-4">

                    <p className="text-gray-400 text-xs">
                      Access Pattern Deviations
                    </p>

                    <p className="text-white text-2xl font-bold mt-2">
                      {investigation.risk.access_pattern_deviations ?? 0}
                    </p>

                  </div>


                  <div className="bg-slate-800 rounded-lg p-4">

                    <p className="text-gray-400 text-xs">
                      Historical Security Events
                    </p>

                    <p className="text-white text-2xl font-bold mt-2">
                      {investigation.risk.historical_security_events ?? 0}
                    </p>

                  </div>

                </div>

              </div>

            )}


            {/* =================================================
                ALERTS
            ================================================= */}

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

              <div className="flex items-center gap-3">

                <FaBell className="text-yellow-400" />

                <h2 className="text-xl font-semibold text-white">
                  Security Alerts
                </h2>

                <span className="text-gray-500 text-sm">
                  ({investigation.alerts?.length || 0})
                </span>

              </div>


              {investigation.alerts?.length > 0 ? (

                <div className="space-y-3 mt-5">

                  {investigation.alerts.map((alert) => (

                    <div
                      key={alert.id}
                      className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                    >

                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">

                        <div>

                          <div className="flex items-center gap-2">

                            <span className="text-red-400 font-semibold">
                              {alert.severity}
                            </span>

                            <span className="text-gray-500 text-xs">
                              Alert #{alert.id}
                            </span>

                          </div>

                          <p className="text-gray-300 text-sm mt-2">
                            {alert.description}
                          </p>

                        </div>

                        <div className="text-gray-500 text-xs">
                          {alert.status}
                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              ) : (

                <p className="text-gray-500 text-sm mt-5">
                  No security alerts associated with this employee.
                </p>

              )}

            </div>


            {/* =================================================
                ACTIVITY TIMELINE
            ================================================= */}

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

              <div className="flex items-center gap-3">

                <FaClock className="text-cyan-400" />

                <div>

                  <h2 className="text-xl font-semibold text-white">
                    Activity Timeline
                  </h2>

                  <p className="text-gray-500 text-sm mt-1">
                    Recent employee activity across monitored sources
                  </p>

                </div>

                <span className="text-gray-500 text-sm ml-auto">
                  {investigation.activity_timeline?.length || 0} events
                </span>

              </div>


              <div className="space-y-3 mt-5">

                {investigation.activity_timeline?.length > 0 ? (

                  investigation.activity_timeline.map((event) => (

                    <EventCard
                      key={`${event.source}-${event.event_id}`}
                      event={event}
                    />

                  ))

                ) : (

                  <p className="text-gray-500 text-sm">
                    No activity timeline events available.
                  </p>

                )}

              </div>

            </div>


            {/* =================================================
                CORRELATED EVENTS
            ================================================= */}

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

              <div className="flex items-center gap-3">

                <FaExclamationTriangle className="text-orange-400" />

                <div>

                  <h2 className="text-xl font-semibold text-white">
                    Correlated Events
                  </h2>

                  <p className="text-gray-500 text-sm mt-1">
                    Events identified by the threat correlation logic
                  </p>

                </div>

                <span className="text-gray-500 text-sm ml-auto">
                  {investigation.correlated_events?.length || 0} events
                </span>

              </div>


              <div className="space-y-3 mt-5">

                {investigation.correlated_events?.length > 0 ? (

                  investigation.correlated_events.map((event) => (

                    <EventCard
                      key={`correlated-${event.source}-${event.event_id}`}
                      event={event}
                      correlated={true}
                    />

                  ))

                ) : (

                  <div className="bg-slate-800/50 rounded-lg p-5 text-center">

                    <p className="text-green-400 font-medium">
                      No correlated suspicious events
                    </p>

                    <p className="text-gray-500 text-sm mt-1">
                      No events currently meet the investigation correlation criteria.
                    </p>

                  </div>

                )}

              </div>

            </div>


            {/* =================================================
                DEVICES + EVIDENCE
            ================================================= */}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">


              {/* DEVICES */}

              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

                <div className="flex items-center gap-3">

                  <FaDesktop className="text-cyan-400" />

                  <h2 className="text-xl font-semibold text-white">
                    Device Analysis
                  </h2>

                </div>

                <p className="text-gray-500 text-sm mt-1">
                  Devices associated with employee activity
                </p>


                {investigation.devices?.length > 0 ? (

                  <div className="space-y-3 mt-5">

                    {investigation.devices.map((device, index) => (

                      <div
                        key={`${device}-${index}`}
                        className="bg-slate-800 rounded-lg p-4"
                      >

                        <p className="text-white">
                          {device}
                        </p>

                      </div>

                    ))}

                  </div>

                ) : (

                  <p className="text-gray-500 text-sm mt-5">
                    No devices identified.
                  </p>

                )}

              </div>


              {/* EVIDENCE */}

              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">

                <div className="flex items-center gap-3">

                  <FaFileAlt className="text-yellow-400" />

                  <h2 className="text-xl font-semibold text-white">
                    Threat Evidence
                  </h2>

                </div>

                <p className="text-gray-500 text-sm mt-1">
                  Evidence collected from alerts and correlated activities
                </p>


                {investigation.evidence?.length > 0 ? (

                  <div className="space-y-3 mt-5 max-h-96 overflow-y-auto">

                    {investigation.evidence.map((item, index) => (

                      <div
                        key={index}
                        className="bg-slate-800 rounded-lg p-4"
                      >

                        <p className="text-gray-300 text-sm leading-6">
                          {item}
                        </p>

                      </div>

                    ))}

                  </div>

                ) : (

                  <div className="bg-slate-800/50 rounded-lg p-5 mt-5">

                    <p className="text-gray-500 text-sm">
                      No threat evidence has been collected for this employee.
                    </p>

                  </div>

                )}

              </div>

            </div>


          </>

        )}

      </div>

    </MainLayout>
  );
}


export default Investigation;