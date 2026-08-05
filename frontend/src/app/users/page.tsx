"use client";

import React, { useState } from "react";
import { LabelStamp } from "@/components/ui/LabelStamp";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
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
import { MOCK_USERS } from "@/lib/mock-data/users";
import { Shield, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { NotAuthorized } from "@/components/layout/NotAuthorized";

export default function UsersPage() {
  const { user } = useAuth();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // RBAC protection - Admin only
  if (user?.role !== "Administrator") {
    return <NotAuthorized />;
  }

  const handleAction = (action: string, userName: string) => {
    alert(`Mocked Action: ${action} for ${userName}`);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <LabelStamp>Administration</LabelStamp>
          <h1 className="text-heading-sm font-serif text-chalk">Users & Roles</h1>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Invite User
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Users Table */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <Card className="!p-0 border-0 bg-transparent">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_USERS.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-bone">{u.name}</span>
                        <span className="text-ash text-[12px]">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Pill variant={u.role === "Administrator" ? "active" : "neutral"}>
                        {u.role}
                      </Pill>
                    </TableCell>
                    <TableCell>
                      <Pill variant={u.status === "Active" ? "active" : "warning"} icon={u.status === "Active" ? "dot" : "none"}>
                        {u.status}
                      </Pill>
                    </TableCell>
                    <TableCell monospace>{new Date(u.lastLogin).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <TableActionMenu 
                        options={[
                          { label: "Edit Role", onClick: () => handleAction("Edit Role", u.name) },
                          { label: "Resend Invite", onClick: () => handleAction("Resend Invite", u.name) },
                          { label: "Disable Access", onClick: () => handleAction("Disable", u.name), danger: true },
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

        {/* Roles Reference Panel */}
        <div className="lg:col-span-1">
          <Card className="!p-6 h-full">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-signal-lime" />
              <h3 className="text-subheading font-sans font-medium text-bone">Role Permissions</h3>
            </div>
            <div className="flex flex-col gap-6 mt-6">
              {[
                { role: "Administrator", desc: "Full system access, user & integration management." },
                { role: "Security Manager", desc: "Policy configuration, reporting, and escalations." },
                { role: "SOC Engineer", desc: "Log sources, sensor health, and data engineering." },
                { role: "Security Analyst", desc: "Alert triage, investigations, and employee profiles." },
              ].map((r, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 pb-4 border-b border-graphite last:border-0 last:pb-0">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-bone">{r.role}</span>
                  <span className="text-[12px] text-ash">{r.desc}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite New User">
        <div className="flex flex-col gap-4 mt-2">
          <Input label="Email Address" type="email" placeholder="colleague@sentrix.local" />
          
          <div className="flex flex-col w-full mb-4">
            <label className="font-sans text-[11px] uppercase tracking-[0.18em] text-ash mb-2">
              Assign Role
            </label>
            <select className="w-full bg-onyx text-bone text-body rounded-sm px-4 py-3 border border-slate focus:border-signal-lime outline-none appearance-none cursor-pointer">
              <option>Security Analyst</option>
              <option>SOC Engineer</option>
              <option>Security Manager</option>
              <option>Administrator</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-graphite">
            <Button variant="ghost" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              alert("User invited successfully.");
              setIsInviteModalOpen(false);
            }}>Send Invitation</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
