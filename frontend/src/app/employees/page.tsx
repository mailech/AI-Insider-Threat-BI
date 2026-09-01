"use client";

import React, { useState } from "react";
import { LabelStamp } from "@/components/ui/LabelStamp";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Input } from "@/components/ui/Input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TablePagination,
  TableActionMenu
} from "@/components/ui/Table";
import { api, getFleetRiskScores } from "@/lib/api/client";
import { Employee, FleetRiskData, RiskBand } from "@/lib/types";
import { UserPlus, Download, Building2, Loader2, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function RiskBandPill({ band }: { band: RiskBand }) {
  return (
    <Pill variant={band === "CRITICAL" || band === "HIGH" ? "active" : "neutral"}>
      {band}
    </Pill>
  );
}

export default function EmployeesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [riskData, setRiskData] = useState<FleetRiskData | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    Promise.all([
      api.getEmployees(),
      getFleetRiskScores(30),
    ]).then(([empData, fleetRisk]) => {
      setEmployees(empData);
      setRiskData(fleetRisk);
      setLoading(false);
    });
  }, []);

  const getRiskForEmployee = (empId: string) => {
    if (!riskData?.serviceAvailable) return null;
    return riskData.results.find(r => r.employeeId === empId) || null;
  };
  
  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <LabelStamp>Identity Management</LabelStamp>
          <h1 className="text-heading-sm font-serif text-chalk">Employees</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/employees/departments">
            <Button variant="outline" className="gap-2">
              <Building2 className="w-4 h-4" />
              Departments
            </Button>
          </Link>
          <Link href="/employees/onboarding">
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Onboard Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* ML Service Offline Banner */}
      {riskData && !riskData.serviceAvailable && (
        <div className="flex items-center gap-3 p-3 border border-graphite bg-onyx rounded-sm">
          <WifiOff className="w-4 h-4 text-fog flex-shrink-0" />
          <p className="text-[12px] text-ash">Risk scoring service offline — risk scores unavailable.</p>
        </div>
      )}

      <Card className="!p-0 border-0 bg-transparent flex flex-col">
        {/* Filters Bar */}
        <div className="bg-onyx border border-graphite border-b-0 p-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-64">
            <Input 
              label="Search" 
              placeholder="Name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="!mb-0"
            />
          </div>
          <div className="w-full md:w-48 flex flex-col mb-4">
            <label className="font-sans text-[11px] uppercase tracking-[0.18em] text-ash mb-2">
              Department
            </label>
            <select className="w-full bg-onyx text-bone text-body rounded-sm px-4 py-[11px] border border-slate focus:border-signal-lime outline-none appearance-none cursor-pointer">
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
              <option value="IT">IT</option>
            </select>
          </div>
          <div className="w-full md:w-48 flex flex-col mb-4">
            <label className="font-sans text-[11px] uppercase tracking-[0.18em] text-ash mb-2">
              Access Level
            </label>
            <select className="w-full bg-onyx text-bone text-body rounded-sm px-4 py-[11px] border border-slate focus:border-signal-lime outline-none appearance-none cursor-pointer">
              <option value="">All Levels</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div className="mb-4 ml-auto">
            <Button variant="ghost" className="gap-2">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead>Access Level</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-signal-lime mx-auto" />
                </TableCell>
              </TableRow>
            ) : (
              employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.id.toLowerCase().includes(searchTerm.toLowerCase())).map((emp) => {
                const risk = getRiskForEmployee(emp.id);
                return (
                  <TableRow 
                    key={emp.id} 
                    className="cursor-pointer" 
                    onClick={() => router.push(`/employees/${emp.id}`)}
                  >
                    <TableCell monospace>{emp.id}</TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.designation}</TableCell>
                    <TableCell>
                      {risk ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] text-bone">{risk.riskScore}%</span>
                          <RiskBandPill band={risk.riskBand} />
                        </div>
                      ) : (
                        <span className="text-ash text-[12px]" title="ML scoring service offline">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Pill 
                        variant={
                          emp.accessLevel === "Critical" ? "active" : 
                          emp.accessLevel === "High" ? "active" : "neutral"
                        }
                      >
                        {emp.accessLevel}
                      </Pill>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <TableActionMenu 
                        options={[
                          { label: "View Profile", onClick: () => router.push(`/employees/${emp.id}`) },
                          { label: "Edit Details", onClick: () => {} },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination currentPage={1} totalPages={1} onPageChange={() => {}} />
      </Card>
    </div>
  );
}
