"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Plus, AlertCircle, Loader2 } from "lucide-react";
import { LabelStamp } from "@/components/ui/LabelStamp";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableActionMenu } from "@/components/ui/Table";
import { api } from "@/lib/api/client";
import { ManagedDepartment } from "@/lib/api/realClient";
import { useAuth } from "@/lib/auth/AuthContext";
import { NotAuthorized } from "@/components/layout/NotAuthorized";

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<ManagedDepartment[]>([]);
  const [selected, setSelected] = useState<ManagedDepartment | null>(null);
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => { setLoading(true); setError(null); try { setDepartments(await api.getDepartments()); } catch (e) { setError(e instanceof Error ? e.message : "Failed to load departments."); } finally { setLoading(false); } };
  useEffect(() => { if (user?.role === "Administrator") void load(); }, [user?.role]);
  if (user?.role !== "Administrator") return <NotAuthorized />;
  const save = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(null); const form = new FormData(event.currentTarget); const values = { code: String(form.get("code") || "").trim(), name: String(form.get("name") || "").trim(), head_employee_id: String(form.get("head") || "").trim() || null }; try { selected ? await api.updateDepartment(selected.id, values) : await api.createDepartment(values); setOpen(false); setSelected(null); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save department."); } finally { setSaving(false); } };
  return <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
    <Link href="/employees" className="flex items-center gap-2 text-fog hover:text-bone w-fit"><ArrowLeft className="w-4 h-4" />Back to Employees</Link>
    <div className="flex items-end justify-between"><div><LabelStamp>Administration</LabelStamp><h1 className="text-heading-sm font-serif text-chalk">Department Mapping</h1></div><Button onClick={() => { setSelected(null); setOpen(true); }} className="gap-2"><Plus className="w-4 h-4" />Add Department</Button></div>
    {error && <div className="flex gap-2 p-3 border border-red-500/30 text-red-400"><AlertCircle className="w-4 h-4" />{error}<Button variant="ghost" onClick={load}>Retry</Button></div>}
    <Card className="!p-0 border-0 bg-transparent"><Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Department Name</TableHead><TableHead>Head of Dept</TableHead><TableHead>Active Employees</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow> : departments.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-10 text-ash">No departments have been configured.</TableCell></TableRow> : departments.map(dept => <TableRow key={dept.id}><TableCell monospace>{dept.code}</TableCell><TableCell className="font-medium flex items-center gap-2"><Building2 className="w-4 h-4 text-fog" />{dept.name}</TableCell><TableCell monospace>{dept.head_employee_id || "—"}</TableCell><TableCell>{dept.employee_count}</TableCell><TableCell className="text-right"><TableActionMenu options={[{ label: "Edit Department", onClick: () => { setSelected(dept); setOpen(true); } }, { label: "View Employees", onClick: () => { window.location.href = `/employees?department=${encodeURIComponent(dept.name)}`; } }]} /></TableCell></TableRow>)}</TableBody></Table></Card>
    <Modal isOpen={open} onClose={() => { setOpen(false); setSelected(null); }} title={selected ? "Edit Department" : "Add Department"}><form onSubmit={save} className="flex flex-col gap-4 mt-2"><Input label="Department Code" name="code" defaultValue={selected?.code} required /><Input label="Department Name" name="name" defaultValue={selected?.name} required /><Input label="Head of Department UUID (optional)" name="head" defaultValue={selected?.head_employee_id || ""} /><div className="flex justify-end gap-3 mt-4 pt-4 border-t border-graphite"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" isLoading={saving}>Save Department</Button></div></form></Modal>
  </div>;
}
