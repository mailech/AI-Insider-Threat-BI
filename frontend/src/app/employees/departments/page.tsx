"use client";

import React, { useState } from "react";
import { LabelStamp } from "@/components/ui/LabelStamp";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableActionMenu
} from "@/components/ui/Table";
import { ArrowLeft, Building2, Plus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { NotAuthorized } from "@/components/layout/NotAuthorized";

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Admin only
  if (user?.role !== "Administrator") {
    return <NotAuthorized />;
  }

  const handleSave = () => {
    alert("Department saved.");
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <Link href="/employees" className="flex items-center gap-2 text-fog hover:text-bone transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[13px] font-sans">Back to Employees</span>
      </Link>
      
      <div className="flex items-end justify-between">
        <div>
          <LabelStamp>Administration</LabelStamp>
          <h1 className="text-heading-sm font-serif text-chalk">Department Mapping</h1>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Department
        </Button>
      </div>

      <Card className="!p-0 border-0 bg-transparent mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Department Name</TableHead>
              <TableHead>Head of Dept</TableHead>
              <TableHead>Active Employees</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { code: "ENG-01", name: "Engineering", head: "EMP-045", count: 124 },
              { code: "FIN-02", name: "Finance", head: "EMP-012", count: 18 },
              { code: "HR-03", name: "Human Resources", head: "EMP-005", count: 8 },
              { code: "IT-04", name: "Information Technology", head: "EMP-045", count: 32 },
            ].map((dept) => (
              <TableRow key={dept.code}>
                <TableCell monospace>{dept.code}</TableCell>
                <TableCell className="font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-fog" />
                  {dept.name}
                </TableCell>
                <TableCell monospace>{dept.head}</TableCell>
                <TableCell>{dept.count}</TableCell>
                <TableCell className="text-right">
                  <TableActionMenu 
                    options={[
                      { label: "Edit Department", onClick: () => setIsModalOpen(true) },
                      { label: "View Employees", onClick: () => {} },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add/Edit Department">
        <div className="flex flex-col gap-4 mt-2">
          <Input label="Department Code" placeholder="e.g. ENG-01" className="font-mono" />
          <Input label="Department Name" placeholder="e.g. Engineering" />
          <Input label="Head of Department (ID)" placeholder="e.g. EMP-045" className="font-mono" />
          
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-graphite">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Department</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
