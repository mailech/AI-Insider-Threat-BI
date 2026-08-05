"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { LabelStamp } from "@/components/ui/LabelStamp";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { EmptyState } from "@/components/ui/Skeleton";
import { ArrowLeft, User as UserIcon, MonitorSmartphone, Key, Database, Activity } from "lucide-react";
import Link from "next/link";
import { MOCK_EMPLOYEES } from "@/lib/mock-data/employees";

export default function EmployeeProfilePage() {
  const pathname = usePathname();
  // Extract ID from path like /employees/EMP-001
  const id = pathname.split("/").pop() || "";
  
  const employee = MOCK_EMPLOYEES.find(e => e.id === id) || MOCK_EMPLOYEES[0];
  
  const [activeTab, setActiveTab] = useState("profile");

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
          { id: "devices", label: "Devices", icon: MonitorSmartphone },
          { id: "access", label: "Access Privileges", icon: Key },
          { id: "assets", label: "Asset Association", icon: Database },
          { id: "behavior", label: "Behavioral Profile", icon: Activity },
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
          <EmptyState
            icon={Activity}
            title="Monitoring Data Required"
            description="Behavioral profile will appear here once monitoring data is available (Milestone 2)."
          />
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
