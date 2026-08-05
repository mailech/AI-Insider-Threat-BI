"use client";

import React, { useState } from "react";
import { LabelStamp } from "@/components/ui/LabelStamp";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TablePagination
} from "@/components/ui/Table";
import { MOCK_ACTIVITY_LOGS, MOCK_LOG_SOURCES } from "@/lib/mock-data/activity";
import { Search, Database, RefreshCw, Settings2 } from "lucide-react";

export default function ActivityMonitoringPage() {
  const [activeTab, setActiveTab] = useState("feed");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(MOCK_LOG_SOURCES[0]);
  
  // Drawer state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"none" | "success" | "error">("none");

  const handleConfigure = (source: any) => {
    setSelectedSource(source);
    setIsDrawerOpen(true);
    setTestResult("none");
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResult("none");
    
    // Mock network request
    setTimeout(() => {
      setIsTesting(false);
      // Random success/fail for demo, or hardcoded success
      setTestResult(Math.random() > 0.3 ? "success" : "error");
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <div>
        <LabelStamp>Monitoring</LabelStamp>
        <h1 className="text-heading-sm font-serif text-chalk">Activity Logs</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-graphite gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("feed")}
          className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-[13px] font-sans uppercase tracking-wider transition-colors outline-none focus-visible:ring-2 focus-visible:ring-signal-lime ${
            activeTab === "feed" 
              ? "border-signal-lime text-signal-lime" 
              : "border-transparent text-ash hover:text-bone"
          }`}
        >
          <Search className="w-4 h-4" />
          Raw Activity Feed
        </button>
        <button
          onClick={() => setActiveTab("sources")}
          className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-[13px] font-sans uppercase tracking-wider transition-colors outline-none focus-visible:ring-2 focus-visible:ring-signal-lime ${
            activeTab === "sources" 
              ? "border-signal-lime text-signal-lime" 
              : "border-transparent text-ash hover:text-bone"
          }`}
        >
          <Database className="w-4 h-4" />
          Log Sources
        </button>
      </div>

      {activeTab === "sources" && (
        <Card className="!p-0 border-0 bg-transparent">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_LOG_SOURCES.map((src) => (
                <TableRow key={src.id}>
                  <TableCell className="font-medium text-bone">{src.name}</TableCell>
                  <TableCell>
                    <span className="text-[11px] uppercase tracking-wider text-ash bg-onyx px-2 py-1 rounded-sm border border-graphite">
                      {src.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Pill 
                      variant={src.status === "Connected" ? "active" : src.status === "Error" ? "warning" : "neutral"}
                      icon={src.status !== "Not Configured" ? "dot" : "none"}
                    >
                      {src.status}
                    </Pill>
                  </TableCell>
                  <TableCell monospace>{src.lastSync ? new Date(src.lastSync).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" className="!py-1.5 !px-3 !text-[12px] gap-2" onClick={() => handleConfigure(src)}>
                      <Settings2 className="w-3.5 h-3.5" />
                      Configure
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {activeTab === "feed" && (
        <Card className="!p-0 border-0 bg-transparent flex flex-col">
          {/* Filters Bar */}
          <div className="bg-onyx border border-graphite border-b-0 p-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-48 flex flex-col mb-4">
              <label className="font-sans text-[11px] uppercase tracking-[0.18em] text-ash mb-2">
                Activity Type
              </label>
              <select className="w-full bg-onyx text-bone text-body rounded-sm px-4 py-[11px] border border-slate focus:border-signal-lime outline-none appearance-none cursor-pointer">
                <option value="">All Activities</option>
                <option value="Login">Login</option>
                <option value="File Download">File Download</option>
                <option value="Privilege Change">Privilege Change</option>
              </select>
            </div>
            <div className="w-full md:w-64">
              <Input label="Search Employee or IP" placeholder="Search..." className="!mb-0" />
            </div>
            <div className="mb-4 ml-auto">
              <Button variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" /> Refresh Feed
              </Button>
            </div>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Activity Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ACTIVITY_LOGS.map((log) => (
                <TableRow key={log.id}>
                  <TableCell monospace>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell monospace>{log.employeeId}</TableCell>
                  <TableCell>
                    <span className="text-[11px] uppercase tracking-wider text-ash bg-carbon px-2 py-1 rounded-sm border border-graphite">
                      {log.activityType}
                    </span>
                  </TableCell>
                  <TableCell>{log.source}</TableCell>
                  <TableCell>{log.device}</TableCell>
                  <TableCell monospace>{log.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination currentPage={1} totalPages={1} onPageChange={() => {}} />
        </Card>
      )}

      {/* Drawer for Configuration */}
      <Modal isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={`Configure: ${selectedSource.name}`} position="right">
        <div className="flex flex-col gap-6 mt-2 h-full">
          <div>
            <p className="text-body text-ash mb-6">
              Enter the connection details for this log source. The data will be ingested in real-time.
            </p>
            <div className="flex flex-col gap-2">
              <Input label="Host URL / Endpoint" placeholder="e.g. logserver.sentrix.local" defaultValue={selectedSource.status === "Connected" ? "logserver.sentrix.local" : ""} />
              <Input label="Port" placeholder="e.g. 514" defaultValue={selectedSource.status === "Connected" ? "514" : ""} />
              
              <div className="flex flex-col w-full mb-4">
                <label className="font-sans text-[11px] uppercase tracking-[0.18em] text-ash mb-2">
                  Authentication Method
                </label>
                <select className="w-full bg-onyx text-bone text-body rounded-sm px-4 py-3 border border-slate focus:border-signal-lime outline-none appearance-none cursor-pointer">
                  <option>API Key</option>
                  <option>OAuth2</option>
                  <option>Basic Auth</option>
                  <option>Mutual TLS</option>
                </select>
              </div>
              
              <Input label="API Key / Secret" type="password" placeholder="••••••••••••••••" defaultValue={selectedSource.status === "Connected" ? "secret" : ""} />
            </div>
          </div>

          {testResult === "success" && (
            <div className="mt-4">
              <Toast type="success" title="Connection Successful" message="Successfully authenticated with the log source." />
            </div>
          )}
          
          {testResult === "error" && (
            <div className="mt-4">
              <Toast type="error" title="Connection Failed" message="Could not reach the host or authentication failed. Check credentials." />
            </div>
          )}

          <div className="mt-auto pt-6 border-t border-graphite flex flex-col gap-3">
            <Button variant="outline" onClick={handleTestConnection} isLoading={isTesting}>
              Test Connection
            </Button>
            <Button onClick={() => setIsDrawerOpen(false)}>
              Save Configuration
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
