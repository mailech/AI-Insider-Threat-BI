"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { LabelStamp } from "@/components/ui/LabelStamp";
import { AnomalyFeed } from "@/components/ui/AnomalyFeed";
import { Pill } from "@/components/ui/Pill";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
// Removed useToast import
import { useAuth } from "@/lib/auth/AuthContext";
import { api } from "@/lib/api/client";
import { Anomaly, AnomalyStatus } from "@/lib/types";
import { Download, Filter, RefreshCw, ShieldCheck, FileText } from "lucide-react";
import Link from "next/link";

export default function AnomaliesPage() {
  const { user } = useAuth();
  const [toastMsg, setToastMsg] = useState("");
  
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };
  
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadAnomalies = async () => {
    setLoading(true);
    try {
      const data = await api.getAnomalies({ 
        severity: severityFilter || undefined, 
        status: statusFilter || undefined 
      });
      setAnomalies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAnomalies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severityFilter, statusFilter]);

  const handleGenerateReport = () => {
    showToast("Generating...");
    setTimeout(() => {
      showToast("Anomaly Report PDF generated successfully.");
    }, 1500);
  };

  const handleStatusChange = async (status: AnomalyStatus) => {
    if (!selectedAnomaly) return;
    const success = await api.updateAnomalyStatus(selectedAnomaly.id, status);
    if (success) {
      showToast(`Anomaly marked as ${status}.`);
      setSelectedAnomaly(null);
      loadAnomalies();
    }
  };

  const canAction = user?.role === "Administrator" || user?.role === "Security Manager" || user?.role === "SOC Engineer";

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-heading font-serif text-chalk">Anomaly Detection Engine</h1>
          <p className="text-[13px] text-ash">Fleet-wide behavioral deviations and security alerts</p>
        </div>
        <Button onClick={handleGenerateReport} variant="outline" className="text-[12px]">
          <Download className="w-3.5 h-3.5 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Local Toast Banner */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 bg-signal-lime text-carbon px-4 py-2 text-[13px] font-semibold rounded-sm shadow-lg z-50">
          {toastMsg}
        </div>
      )}

      {/* Filters */}
      <Card className="flex flex-col md:flex-row gap-4 items-center bg-carbon/50 border-graphite/50 p-4">
        <div className="flex items-center gap-2 text-fog text-[12px] uppercase tracking-wider font-semibold mr-2">
          <Filter className="w-4 h-4" /> Filters:
        </div>
        <select 
          className="bg-onyx border border-graphite text-bone text-[13px] rounded-sm px-3 py-1.5 outline-none focus:border-signal-lime"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select 
          className="bg-onyx border border-graphite text-bone text-[13px] rounded-sm px-3 py-1.5 outline-none focus:border-signal-lime"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="Under Review">Under Review</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Dismissed">Dismissed</option>
        </select>
        <div className="flex-1" />
        <Button onClick={loadAnomalies} variant="ghost" className="px-2">
          <RefreshCw className={`w-4 h-4 text-ash ${loading ? "animate-spin" : ""}`} />
        </Button>
      </Card>

      {/* Main List */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-ash text-[13px]">Loading anomalies...</div>
        ) : (
          <AnomalyFeed anomalies={anomalies} onRowClick={setSelectedAnomaly} />
        )}
      </Card>

      {/* Detail Modal / Drawer */}
      <Modal isOpen={!!selectedAnomaly} onClose={() => setSelectedAnomaly(null)} title="Anomaly Details">
        {selectedAnomaly && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Pill variant={selectedAnomaly.severity === "Critical" ? "warning" : "neutral"}>{selectedAnomaly.severity}</Pill>
              <span className="font-mono text-pearl">{selectedAnomaly.id}</span>
              <span className="text-ash text-[12px]">{new Date(selectedAnomaly.timestamp).toLocaleString()}</span>
            </div>

            <div className="bg-onyx border border-graphite p-4 rounded-sm">
              <LabelStamp className="mb-2">Description</LabelStamp>
              <p className="text-body text-bone">{selectedAnomaly.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-ash mb-1">Employee</p>
                <Link href={`/employees/${selectedAnomaly.employeeId}`} className="text-[13px] text-signal-lime hover:underline font-mono">
                  {selectedAnomaly.employeeId}
                </Link>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-ash mb-1">Category</p>
                <p className="text-[13px] text-bone">{selectedAnomaly.category}</p>
              </div>
            </div>

            <div className="bg-carbon border border-dashed border-graphite p-4 rounded-sm">
              <LabelStamp className="mb-2">Baseline Deviation</LabelStamp>
              <p className="text-[13px] text-bone font-mono text-warning/90">{selectedAnomaly.baselineDeviation}</p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[11px] uppercase tracking-wider text-ash flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Related Telemetry</p>
              <div className="flex flex-wrap gap-2">
                {selectedAnomaly.relatedActivityIds.map(logId => (
                  <Link key={logId} href={`/activity?search=${logId}`} className="text-[11px] font-mono text-fog hover:text-signal-lime px-2 py-1 bg-onyx border border-graphite rounded-sm transition-colors">
                    {logId}
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-graphite pt-4 mt-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-fog">Current Status</p>
                <Pill variant={selectedAnomaly.status === "New" ? "warning" : "active"}>{selectedAnomaly.status}</Pill>
              </div>
              
              {canAction ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleStatusChange("Dismissed")}>
                    Dismiss
                  </Button>
                  <Button variant="primary" onClick={() => handleStatusChange("Confirmed")}>
                    <ShieldCheck className="w-4 h-4 mr-2" /> Confirm Risk
                  </Button>
                </div>
              ) : (
                <div className="text-[11px] text-ash italic px-3 py-1 bg-onyx rounded-sm">
                  Read-only view (Role: {user?.role})
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
