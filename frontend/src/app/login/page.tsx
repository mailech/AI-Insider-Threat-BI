"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

// Dotted globe background decoration
function GlobeBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center opacity-50">
      <svg
        width="800"
        height="800"
        viewBox="0 0 800 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-chalk"
      >
        <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="currentColor" opacity="0.4" />
        </pattern>
        <circle cx="400" cy="400" r="380" fill="url(#dots)" />
        {/* Simulate some globe lines with dots by using masks or just paths with stroke-dasharray */}
        <circle cx="400" cy="400" r="380" stroke="currentColor" strokeWidth="1" strokeDasharray="2 8" opacity="0.5" />
        <ellipse cx="400" cy="400" rx="180" ry="380" stroke="currentColor" strokeWidth="1" strokeDasharray="2 8" opacity="0.5" />
        <ellipse cx="400" cy="400" rx="380" ry="120" stroke="currentColor" strokeWidth="1" strokeDasharray="2 8" opacity="0.5" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-carbon px-4">
      <GlobeBackground />
      
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <h1 className="font-serif text-heading-sm md:text-heading text-chalk tracking-tight text-center mb-8">
          Secure Access to <br/>
          <span className="text-signal-lime italic">Insider Intelligence</span>.
        </h1>
        
        <Card className="w-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {error && (
              <div className="mb-4 p-3 border border-validation-error bg-validation-error/10 flex items-start gap-3 rounded-sm">
                <AlertTriangle className="w-5 h-5 text-validation-error flex-shrink-0 mt-0.5" />
                <p className="text-body text-validation-error">{error}</p>
              </div>
            )}
            
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@insideriq.local"
              autoComplete="email"
            />
            
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            
            <div className="flex items-center justify-between mt-2 mb-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded-sm border-slate bg-onyx text-signal-lime focus:ring-signal-lime focus:ring-offset-onyx cursor-pointer"
                />
                <span className="text-[13px] font-sans text-ash group-hover:text-bone transition-colors">
                  Remember me
                </span>
              </label>
              <Link href="#" className="text-[13px] font-sans text-ash hover:text-bone transition-colors underline underline-offset-4">
                Forgot password?
              </Link>
            </div>
            
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Sign In
            </Button>
            
            <div className="mt-8 pt-6 border-t border-graphite">
              <Button type="button" variant="outline" className="w-full !text-[13px] !py-2.5">
                Continue with SSO / Active Directory
              </Button>
            </div>
            
            <div className="mt-6 text-center">
              <span className="text-ash text-[13px]">Don&apos;t have an account? </span>
              <Link href="/register" className="text-signal-lime text-[13px] hover:underline underline-offset-4">
                Accept Invite
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
