"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { LabelStamp } from "@/components/ui/LabelStamp";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ArrowLeft, User as UserIcon, MonitorSmartphone, Key, Database, Activity, Clock, Server, DownloadCloud, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { MOCK_EMPLOYEES } from "@/lib/mock-data/employees";
import { api } from "@/lib/api/client";
import { BehavioralBaseline } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function EmployeeProfilePage() {
  const pathname = usePathname();
  const id = pathname.split("/").pop() || "";
  
  const employee = MOCK_EMPLOYEES.find(e => e.id === id) || MOCK_EMPLOYEES[0];
  
  const [activeTab, setActiveTab] = useState("profile");
  const [baseline, setBaseline] = useState<BehavioralBaseline | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "behavior" && !baseline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      api.getBehavioralBaseline(employee.id).then(data => {
        setBaseline(data);
        setLoading(false);
      });
    }
  }, [activeTab, employee.id, baseline]);

  // Mock Sparkline data for Productivity Pattern
  const sparklineData = React.useMemo(() => {
    // Generate deterministic pseudo-random data based on ID
    const seed = employee.id.charCodeAt(employee.id.length - 1);
    return Array.from({ length: 24 }).map((_, i) => ({
      time: `${i}:00`,
      activity: Math.floor(((seed * i * 7) % 100))
    }));
  }, [employee.id]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12">
      <Link href="/employees" className="flex items-center gap-2 text-fog hover:text-bone transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[13px] font-sans">Back to Employees</span>
      </Link>
      
      {/* Header Card */}
      <Card className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="flex items-center justify-center w-16 h-16 bg-onyx border border-slate text-bone font-medium text-xl rounded-sm">
          {employee.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-heading-sm font-serif text-chalk">{employee.name}</h1>
            <Pill variant={employee.accessLevel === "Critical" ? "warning" : "active"}>
              {employee.accessLevel} Risk
            </Pill>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ash">
            <span className="flex items-center gap-1.5"><span className="font-mono text-pearl">{employee.id}</span></span>
            <span className="flex items-center gap-1.5">{employee.designation}</span>
            <span className="flex items-center gap-1.5">{employee.department}</span>
            <span className="flex items-center gap-1.5">Mgr: <span className="font-mono">{employee.manager}</span></span>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-graphite gap-6 overflow-x-auto">
        {[
          { id: "profile", label: "Profile Info", icon: UserIcon },
          { id: "behavior", label: "Behavioral Profile", icon: Activity },
          { id: "devices", label: "Devices", icon: MonitorSmartphone },
          { id: "access", label: "Access Privileges", icon: Key },
          { id: "assets", label: "Asset Association", icon: Database },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-[13px] font-sans uppercase tracking-wider transition-colors outline-none focus-visible:ring-2 focus-visible:ring-signal-lime ${
              activeTab === tab.id 
                ? "border-signal-lime text-signal-lime" 
                : "border-transparent text-ash hover:text-bone"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "profile" && (
          <Card>
            <LabelStamp>General Information</LabelStamp>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-ash mb-1">Full Name</p>
                <p className="text-body text-bone">{employee.name}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-ash mb-1">Employee ID</p>
                <p className="text-body font-mono text-pearl">{employee.id}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-ash mb-1">Department</p>
                <p className="text-body text-bone">{employee.department}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-ash mb-1">Designation</p>
                <p className="text-body text-bone">{employee.designation}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-ash mb-1">Reporting Manager</p>
                <p className="text-body font-mono text-pearl">{employee.manager}</p>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "behavior" && (
          <div className="flex flex-col gap-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Activity className="w-5 h-5 animate-spin text-signal-lime" />
              </div>
            ) : !baseline ? (
              <Card>
                <div className="p-8 text-center text-ash font-sans">
                  No behavioral baseline found for this user.
                </div>
              </Card>
            ) : (
              <>
                <Card>
                  <div className="flex items-center justify-between mb-6">
                    <LabelStamp>User Behavior Baseline Generator</LabelStamp>
                    <span className="text-[10px] uppercase tracking-wider text-signal-lime bg-signal-lime/10 px-2 py-1 rounded-sm border border-signal-lime/20">
                      Baseline Active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-fog mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Typical Login</p>
                      <p className="text-body font-mono text-bone">{baseline.typicalLoginWindow}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-fog mb-1 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> Core Hours</p>
                      <p className="text-body font-mono text-bone">{baseline.typicalWorkingHours}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-fog mb-1 flex items-center gap-1.5"><DownloadCloud className="w-3.5 h-3.5"/> Avg Data/Day</p>
                      <p className="text-body font-mono text-bone">{baseline.typicalDailyDataVolume}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-fog mb-1 flex items-center gap-1.5"><MonitorSmartphone className="w-3.5 h-3.5"/> Devices</p>
                      <p className="text-body font-mono text-bone">{baseline.typicalDeviceCount}</p>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Work Pattern Analysis */}
                  <Card className="flex flex-col h-[300px]">
                    <LabelStamp className="mb-4">Work Pattern Analysis</LabelStamp>
                    <div className="flex-1 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={baseline.workPattern} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                          <XAxis dataKey="day" stroke="#5e5e5e" fontSize={11} tickLine={false} axisLine={false} dy={5} />
                          <YAxis stroke="#5e5e5e" fontSize={11} tickLine={false} axisLine={false} />
                          <RechartsTooltip cursor={{ fill: '#1a1a1a' }} contentStyle={{ backgroundColor: '#131313', borderColor: '#333333' }} />
                          <Bar dataKey="hours" fill="#c5ff4a" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Productivity Pattern Monitoring */}
                  <Card className="flex flex-col h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                      <LabelStamp>Productivity Pattern</LabelStamp>
                      <span className="text-[10px] text-fog uppercase tracking-wider">24h Volumetric</span>
                    </div>
                    <div className="flex-1 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklineData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                          <XAxis dataKey="time" stroke="#5e5e5e" fontSize={11} tickLine={false} axisLine={false} tick={false} />
                          <YAxis stroke="#5e5e5e" fontSize={11} tickLine={false} axisLine={false} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#131313', borderColor: '#333333' }} />
                          <Line type="monotone" dataKey="activity" stroke="#c5ff4a" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#c5ff4a' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Access & Devices Pattern */}
                  <Card className="col-span-1 md:col-span-2">
                    <LabelStamp className="mb-4">Access & Device Patterns</LabelStamp>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-[13px] font-sans text-fog mb-3 flex items-center gap-2"><Server className="w-4 h-4"/> Typical Application Set</h4>
                        <div className="flex flex-wrap gap-2">
                          {baseline.typicalApplicationSet.map(app => (
                            <span key={app} className="px-2 py-1 bg-onyx border border-graphite text-bone text-[12px] font-mono rounded-sm">
                              {app}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[13px] font-sans text-fog mb-3 flex items-center gap-2"><LinkIcon className="w-4 h-4"/> Current Period Deviation</h4>
                        <div className="p-3 bg-onyx border border-signal-lime/30 rounded-sm">
                          <p className="text-[12px] font-mono text-signal-lime">No significant deviations detected in application or device sets over the past 7 days.</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}
        
        {["devices", "access", "assets"].includes(activeTab) && (
          <Card>
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-graphite bg-carbon">
              <p className="text-body text-ash">
                Detailed data for {activeTab} is mocked and simplified for Milestone 1.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
