"use client";

import React from "react";
import { LabelStamp } from "@/components/ui/LabelStamp";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { NotAuthorized } from "@/components/layout/NotAuthorized";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const { user } = useAuth();

  // Settings typically restricted to Admins and Security Managers
  if (user?.role !== "Administrator" && user?.role !== "Security Manager") {
    return <NotAuthorized />;
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12">
      <div>
        <LabelStamp>System</LabelStamp>
        <h1 className="text-heading-sm font-serif text-chalk">Settings</h1>
      </div>

      <Card>
        <h2 className="text-subheading font-sans font-medium text-bone mb-6">Organization Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-ash mb-1">Organization Name</p>
            <p className="text-body text-bone">Acme Global Enterprise</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-ash mb-1">Industry</p>
            <p className="text-body text-bone">Financial Services</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-ash mb-1">Total Employees Monitored</p>
            <p className="text-body font-mono text-pearl">1,402</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-ash mb-1">Tenant ID</p>
            <p className="text-body font-mono text-pearl">T-9824B100</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-6 border-b border-graphite pb-4">
          <div>
            <h2 className="text-subheading font-sans font-medium text-bone mb-1">Security Policies</h2>
            <p className="text-body text-ash">Manage platform-wide security and access controls.</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body font-medium text-bone">Strict Password Policy</p>
              <p className="text-[12px] text-ash mt-1">Requires 12+ chars, special characters, and numbers.</p>
            </div>
            <ToggleSwitch defaultChecked={true} />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body font-medium text-bone">Session Timeout</p>
              <p className="text-[12px] text-ash mt-1">Automatically log out users after 15 minutes of inactivity.</p>
            </div>
            <ToggleSwitch defaultChecked={true} />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body font-medium text-bone">Require MFA</p>
              <p className="text-[12px] text-ash mt-1">Force all users to configure multi-factor authentication.</p>
            </div>
            <ToggleSwitch defaultChecked={false} />
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-graphite flex justify-end">
          <Button onClick={() => alert("Settings saved.")}>Save Changes</Button>
        </div>
      </Card>
    </div>
  );
}

// Simple toggle switch component for the settings page
function ToggleSwitch({ defaultChecked }: { defaultChecked: boolean }) {
  const [checked, setChecked] = React.useState(defaultChecked);
  
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => setChecked(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-signal-lime ${
        checked ? "bg-signal-lime" : "bg-slate"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-void-black shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
