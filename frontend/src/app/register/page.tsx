"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [password, setPassword] = useState("");
  const router = useRouter();
  
  // Calculate password strength (0-4)
  const getStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = getStrength(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock registration success
    router.push("/login");
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-carbon px-4 py-12">
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <h1 className="font-serif text-heading-sm text-chalk tracking-tight text-center mb-8">
          Complete Your <span className="text-signal-lime italic">Profile</span>
        </h1>
        
        <Card className="w-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="mb-6 flex flex-col items-center p-4 border border-dashed border-graphite bg-onyx/50 rounded-sm">
              <span className="text-[11px] font-sans uppercase tracking-wider text-ash mb-2">Pre-assigned Role</span>
              <Pill variant="active" icon="dot">Security Analyst</Pill>
            </div>

            <Input label="Full Name" type="text" placeholder="John Doe" required />
            <Input label="Email Address" type="email" placeholder="john.doe@sentrix.local" defaultValue="john.doe@sentrix.local" disabled />
            
            <div className="w-full mb-1">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mb-2"
              />
              
              {/* Password strength meter */}
              <div className="flex gap-1 w-full h-1.5 mb-6">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`flex-1 rounded-full transition-colors duration-300 ${
                      level <= strength
                        ? "bg-signal-lime" // In a real app, you might vary the lime intensity, but we only have one lime
                        : "bg-fog"
                    }`}
                  />
                ))}
              </div>
            </div>

            <Input label="Confirm Password" type="password" placeholder="••••••••" required />
            
            <Button type="submit" className="w-full mt-4">
              Create Account
            </Button>
            
            <div className="mt-6 text-center">
              <span className="text-ash text-[13px]">Already set up? </span>
              <Link href="/login" className="text-signal-lime text-[13px] hover:underline underline-offset-4">
                Sign In
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
