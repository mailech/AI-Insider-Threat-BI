"use client";

import React from "react";
import { EmptyState } from "@/components/ui/Skeleton";
import { LineChart } from "lucide-react";
import { LabelStamp } from "@/components/ui/LabelStamp";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      <div>
        <LabelStamp>Overview</LabelStamp>
        <h1 className="text-heading-sm font-serif text-chalk">Intelligence Dashboard</h1>
      </div>
      
      <div className="mt-8">
        <EmptyState
          icon={LineChart}
          title="Analytics Dashboard"
          description="Behavioral analytics, anomaly detection, and real-time threat dashboards are scheduled for Milestone 2. Continue to Activity Monitoring or Employee Management for current capabilities."
          actionLabel="View Activity Feed"
          onAction={() => window.location.href = "/activity"}
        />
      </div>
    </div>
  );
}
