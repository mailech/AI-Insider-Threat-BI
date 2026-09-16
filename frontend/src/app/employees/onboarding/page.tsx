"use client";

import React, { useState } from "react";
import { LabelStamp } from "@/components/ui/LabelStamp";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EmployeeOnboardingPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [devices, setDevices] = useState([{ name: "", type: "Laptop", hash: "" }]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/employees");
    }, 1000);
  };

  const addDevice = () => {
    setDevices([...devices, { name: "", type: "Laptop", hash: "" }]);
  };

  const removeDevice = (index: number) => {
    if (devices.length > 1) {
      setDevices(devices.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12">
      <Link href="/employees" className="flex items-center gap-2 text-fog hover:text-bone transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[13px] font-sans">Back to Employees</span>
      </Link>
      
      <div>
        <LabelStamp>Identity Management</LabelStamp>
        <h1 className="text-heading-sm font-serif text-chalk">Onboard Employee</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <Card>
          <h2 className="text-subheading font-sans font-medium text-bone mb-6">Personal Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <Input label="Employee ID" placeholder="e.g. EMP-005" required />
            <Input label="Full Name" placeholder="e.g. Jane Smith" required />
            
            <div className="flex flex-col w-full mb-4">
              <label className="font-sans text-[11px] uppercase tracking-[0.18em] text-ash mb-2">
                Department
              </label>
              <select className="w-full bg-onyx text-bone text-body rounded-sm px-4 py-[11px] border border-slate focus:border-signal-lime outline-none appearance-none cursor-pointer">
                <option>Engineering</option>
                <option>Finance</option>
                <option>HR</option>
                <option>IT</option>
              </select>
            </div>
            
            <Input label="Designation" placeholder="e.g. Software Engineer" required />
            <Input label="Manager (ID or Name)" placeholder="Search manager..." />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-subheading font-sans font-medium text-bone">Device Information</h2>
            <Button type="button" variant="outline" onClick={addDevice} className="!py-1.5 !px-3 !text-[12px]">
              + Add Device
            </Button>
          </div>
          
          <div className="flex flex-col gap-6">
            {devices.map((device, idx) => (
              <div key={idx} className="p-4 border border-graphite bg-carbon relative">
                {devices.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeDevice(idx)}
                    className="absolute top-2 right-2 text-fog hover:text-bone hover:font-bold transition-colors text-[11px] uppercase tracking-wider flex items-center gap-1"
                  >
                    Remove
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <Input label="Device Name" placeholder="e.g. DESKTOP-X1" className="!mb-0" required />
                  <div className="flex flex-col w-full">
                    <label className="font-sans text-[11px] uppercase tracking-[0.18em] text-ash mb-2">
                      Type
                    </label>
                    <select className="w-full bg-onyx text-bone text-body rounded-sm px-4 py-[11px] border border-slate focus:border-signal-lime outline-none appearance-none cursor-pointer">
                      <option>Laptop</option>
                      <option>Desktop</option>
                      <option>Mobile</option>
                      <option>Tablet</option>
                    </select>
                  </div>
                  <Input label="Hardware Hash / MAC" placeholder="e.g. 00:1A:2B:3C:4D:5E" className="!mb-0 font-mono" required />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-subheading font-sans font-medium text-bone mb-6">Access Privileges</h2>
          <div className="flex flex-col w-full mb-4">
            <label className="font-sans text-[11px] uppercase tracking-[0.18em] text-ash mb-2">
              Systems / Apps (Multi-select)
            </label>
            <select multiple className="w-full bg-carbon text-bone text-body rounded-sm px-4 py-3 border border-slate focus:border-signal-lime outline-none h-32">
              <option value="vpn">Corporate VPN</option>
              <option value="aws">AWS Production</option>
              <option value="github">GitHub Organization</option>
              <option value="finance">Finance Portal</option>
              <option value="hr">HR System (Admin)</option>
            </select>
            <p className="text-[11px] text-fog mt-2">Hold Ctrl/Cmd to select multiple.</p>
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => router.push("/employees")}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Provision Identity</Button>
        </div>
      </form>
    </div>
  );
}
