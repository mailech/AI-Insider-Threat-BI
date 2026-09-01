"use client";

import React, { useState, useEffect } from "react";
import { LabelStamp } from "@/components/ui/LabelStamp";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TablePagination,
} from "@/components/ui/Table";
import { api } from "@/lib/api/client";
import { Investigation, InvestigationStatus, RiskBand } from "@/lib/types";
import { Search, Plus, Clock, FileText, MessageSquare, ChevronRight, X, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import Link from "next/link";

// Roles that can perform investigation actions (create, update status, add notes)
const ACTION_ROLES = ["Administrator", "Security Manager", "SOC Engineer"];

function StatusPill({ status }: { status: InvestigationStatus }) {
  const variant = status === "Resolved" ? "active" : status === "In Progress" ? "neutral" : "neutral";
  const icon = status === "Open" ? "dot" as const : "none" as const;
  return <Pill variant={variant} icon={icon}>{status}</Pill>;
}

function BandPill({ band }: { band: RiskBand }) {
  return (
    <Pill variant={band === "CRITICAL" || band === "HIGH" ? "active" : "neutral"}>
      {band}
    </Pill>
  );
}

export default function InvestigationsPage() {
  const { user } = useAuth();
  const canAct = user ? ACTION_ROLES.includes(user.role) : false;

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInv, setSelectedInv] = useState<Investigation | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.getInvestigations().then(data => {
      setInvestigations(data);
      setLoading(false);
    });
  }, []);

  const handleStatusChange = async (invId: string, newStatus: InvestigationStatus) => {
    setIsSubmitting(true);
    await api.updateInvestigationStatus(invId, newStatus);
    const updated = await api.getInvestigations();
    setInvestigations(updated);
    if (selectedInv?.id === invId) {
      setSelectedInv(updated.find(i => i.id === invId) || null);
    }
    setIsSubmitting(false);
  };

  const handleAddNote = async () => {
    if (!selectedInv || !noteText.trim() || !user) return;
    setIsSubmitting(true);
    await api.addInvestigationNote(selectedInv.id, user.email, noteText.trim());
    const updated = await api.getInvestigations();
    setInvestigations(updated);
    setSelectedInv(updated.find(i => i.id === selectedInv.id) || null);
    setNoteText("");
    setIsSubmitting(false);
  };

  const handleCreateInvestigation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    await api.createInvestigation({
      title: formData.get("title") as string,
      employeeId: formData.get("employeeId") as string,
      employeeName: formData.get("employeeName") as string,
      status: "Open",
      createdBy: user.email,
      riskBand: "HIGH",
      description: formData.get("description") as string,
      relatedAnomalyIds: [],
    });
    const updated = await api.getInvestigations();
    setInvestigations(updated);
    setIsCreateModalOpen(false);
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto pb-12">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <LabelStamp>Threat Response</LabelStamp>
          <h1 className="text-heading-sm font-serif text-chalk">Investigations</h1>
        </div>
        {canAct && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Investigation
          </Button>
        )}
      </div>

      {!canAct && (
        <div className="p-3 border border-graphite bg-onyx rounded-sm">
          <p className="text-[12px] text-ash italic">
            Read-only view (Role: {user?.role}). Contact a Security Manager or Administrator to create or update investigations.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Investigations List */}
        <div className="lg:col-span-2">
          <Card className="!p-0 border-0 bg-transparent">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-signal-lime mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : investigations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-ash">
                      No investigations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  investigations.map(inv => (
                    <TableRow
                      key={inv.id}
                      className={`cursor-pointer ${selectedInv?.id === inv.id ? "bg-onyx" : ""}`}
                      onClick={() => setSelectedInv(inv)}
                    >
                      <TableCell monospace>{inv.id}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{inv.title}</TableCell>
                      <TableCell>
                        <Link
                          href={`/employees/${inv.employeeId}`}
                          className="text-signal-lime hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          {inv.employeeName}
                        </Link>
                      </TableCell>
                      <TableCell><BandPill band={inv.riskBand} /></TableCell>
                      <TableCell><StatusPill status={inv.status} /></TableCell>
                      <TableCell monospace className="text-[12px]">
                        {new Date(inv.updatedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination currentPage={1} totalPages={1} onPageChange={() => {}} />
          </Card>
        </div>

        {/* Investigation Detail Panel */}
        <div className="lg:col-span-1">
          {selectedInv ? (
            <Card className="!p-0 flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-graphite">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[12px] text-pearl">{selectedInv.id}</span>
                  <button onClick={() => setSelectedInv(null)} className="text-fog hover:text-bone">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-[14px] font-sans font-medium text-bone mb-2">{selectedInv.title}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <StatusPill status={selectedInv.status} />
                  <BandPill band={selectedInv.riskBand} />
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-ash">
                  <span>Employee: <Link href={`/employees/${selectedInv.employeeId}`} className="text-signal-lime hover:underline">{selectedInv.employeeName}</Link></span>
                  <span>Created by: <span className="font-mono">{selectedInv.createdBy}</span></span>
                  <span>Created: {new Date(selectedInv.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 border-b border-graphite">
                <p className="text-[12px] text-ash leading-relaxed">{selectedInv.description}</p>
                {selectedInv.relatedAnomalyIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-fog uppercase tracking-wider">Related:</span>
                    {selectedInv.relatedAnomalyIds.map(id => (
                      <span key={id} className="px-1.5 py-0.5 bg-onyx border border-graphite text-pearl font-mono text-[10px]">{id}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Actions */}
              {canAct && selectedInv.status !== "Resolved" && (
                <div className="p-4 border-b border-graphite flex gap-2">
                  {selectedInv.status === "Open" && (
                    <Button
                      variant="outline"
                      className="!py-1.5 !px-3 !text-[11px] flex-1"
                      onClick={() => handleStatusChange(selectedInv.id, "In Progress")}
                      isLoading={isSubmitting}
                    >
                      Start Investigation
                    </Button>
                  )}
                  {selectedInv.status === "In Progress" && (
                    <Button
                      className="!py-1.5 !px-3 !text-[11px] flex-1"
                      onClick={() => handleStatusChange(selectedInv.id, "Resolved")}
                      isLoading={isSubmitting}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              )}

              {/* Notes Timeline */}
              <div className="p-4 flex-1 overflow-y-auto">
                <h4 className="text-[11px] uppercase tracking-wider text-fog font-semibold mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Investigation Notes
                </h4>
                {selectedInv.notes.length === 0 ? (
                  <p className="text-[12px] text-ash italic">No notes yet.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {selectedInv.notes.map(note => (
                      <div key={note.id} className="p-3 bg-onyx border border-graphite rounded-sm">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[10px] text-pearl">{note.author}</span>
                          <span className="text-[10px] text-fog">{new Date(note.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-[12px] text-bone leading-relaxed">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Note */}
                {canAct && (
                  <div className="mt-4 pt-4 border-t border-graphite">
                    <textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add investigation note..."
                      className="w-full bg-carbon text-bone text-[12px] font-sans rounded-sm px-3 py-2 border border-slate focus:border-signal-lime outline-none resize-none h-20"
                    />
                    <Button
                      className="mt-2 !py-1.5 !px-3 !text-[11px]"
                      onClick={handleAddNote}
                      isLoading={isSubmitting}
                      disabled={!noteText.trim()}
                    >
                      Add Note
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[300px]">
              <FileText className="w-8 h-8 text-fog mb-3" />
              <p className="text-[13px] text-ash">Select an investigation to view details</p>
            </Card>
          )}
        </div>
      </div>

      {/* Create Investigation Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Investigation">
        <form onSubmit={handleCreateInvestigation} className="flex flex-col gap-4 mt-2">
          <Input label="Title" name="title" placeholder="e.g., Unusual after-hours data exfiltration" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Employee ID" name="employeeId" placeholder="EMP-001" required />
            <Input label="Employee Name" name="employeeName" placeholder="Jane Doe" required />
          </div>
          <div className="flex flex-col w-full mb-4">
            <label className="font-sans text-[11px] uppercase tracking-[0.18em] text-ash mb-2">
              Description
            </label>
            <textarea
              name="description"
              required
              placeholder="Describe the observed behavior and why an investigation is warranted..."
              className="w-full bg-onyx text-bone text-body rounded-sm px-4 py-3 border border-slate focus:border-signal-lime outline-none resize-none h-28"
            />
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-graphite">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>Create Investigation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
