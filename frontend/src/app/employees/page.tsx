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
import { MOCK_EMPLOYEES } from "@/lib/mock-data/employees";
import { UserPlus, Download, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EmployeesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  
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
              <TableHead>Manager</TableHead>
              <TableHead>Devices</TableHead>
              <TableHead>Access Level</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_EMPLOYEES.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.id.toLowerCase().includes(searchTerm.toLowerCase())).map((emp) => (
              <TableRow 
                key={emp.id} 
                className="cursor-pointer" 
                onClick={() => router.push(`/employees/${emp.id}`)}
              >
                <TableCell monospace>{emp.id}</TableCell>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>{emp.department}</TableCell>
                <TableCell>{emp.designation}</TableCell>
                <TableCell monospace>{emp.manager}</TableCell>
                <TableCell>{emp.devicesCount}</TableCell>
                <TableCell>
                  <Pill 
                    variant={
                      emp.accessLevel === "Critical" ? "warning" : 
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
            ))}
          </TableBody>
        </Table>
        <TablePagination currentPage={1} totalPages={1} onPageChange={() => {}} />
      </Card>
    </div>
  );
}
