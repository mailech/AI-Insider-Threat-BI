"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LabelStamp } from "@/components/ui/LabelStamp";
import { Table } from "@/components/ui/Table";
import { Clock, Key, MonitorSmartphone, Server, DownloadCloud, MessageSquare } from "lucide-react";
import { api } from "@/lib/api/client";
import { Employee } from "@/lib/types";

export default function BehavioralIndicatorsPage() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => { api.getEmployees().then(setEmployees).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load employee profiles.")); }, []);
  const indicators = [
    { name: "Login Times", icon: Clock, desc: "Measures typical authentication windows and flags off-hour or anomalous timezone logins." },
    { name: "Resource Access Frequency", icon: Key, desc: "Tracks the rate and volume of access to sensitive systems compared to historical baselines." },
    { name: "Device Usage", icon: MonitorSmartphone, desc: "Monitors the set of physical and virtual devices associated with an identity." },
    { name: "Application Usage", icon: Server, desc: "Baselines the standard suite of applications an employee uses for their specific role." },
    { name: "Data Transfer Volume", icon: DownloadCloud, desc: "Flags anomalous spikes in upload/download bytes indicative of exfiltration." },
    { name: "Communication Patterns", icon: MessageSquare, desc: "Analyzes typical interaction frequencies across email and messaging platforms." },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-heading font-serif text-chalk">Behavioral Profiling Reference</h1>
        <p className="text-[13px] text-ash">System-wide definitions used by the persisted per-employee behavioral profiles. Open an employee profile to inspect its live baseline.</p>
      </div>

      <Card>
        <LabelStamp className="mb-6">Indicator Taxonomy</LabelStamp>
        <Table>
          <thead>
            <tr className="border-b border-graphite bg-onyx/50">
              <th className="text-left p-3 text-[10px] uppercase tracking-wider text-fog font-semibold">Indicator Type</th>
              <th className="text-left p-3 text-[10px] uppercase tracking-wider text-fog font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {indicators.map((ind, i) => (
              <tr key={i} className="border-b border-graphite/30">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <ind.icon className="w-4 h-4 text-signal-lime" />
                    <span className="font-medium text-[13px] text-bone font-sans">{ind.name}</span>
                  </div>
                </td>
                <td className="text-ash text-[13px] font-sans p-3">{ind.desc}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card>
        <LabelStamp className="mb-3">Live employee profiles</LabelStamp>
        <p className="text-[13px] text-ash mb-4">Select an employee to view the persisted behavior baseline and analysis served by the UEBA API.</p>
        {error ? <p className="text-[13px] text-red-400">{error}</p> : <div className="flex flex-wrap gap-2">{employees.map((employee) => <Link key={employee.id} href={`/employees/${employee.id}`} className="px-2 py-1 border border-graphite text-[12px] text-signal-lime hover:bg-onyx">{employee.name}</Link>)}</div>}
      </Card>
    </div>
  );
}
