"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { LabelStamp } from "@/components/ui/LabelStamp";
import { RiskGauge } from "@/components/ui/RiskGauge";
import { AnomalyFeed } from "@/components/ui/AnomalyFeed";
import { Pill } from "@/components/ui/Pill";
import { api, getFleetRiskScores } from "@/lib/api/client";
import { Users, AlertTriangle, ShieldAlert, Activity, ArrowRight, WifiOff, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";
import { Anomaly, FleetRiskData, RiskBand } from "@/lib/types";
import { MOCK_EMPLOYEES } from "@/lib/mock-data/employees";

export default function DashboardPage() {
  const [summary, setSummary] = useState<{totalMonitored: number, activeAnomalies: number, usersFlagged: number, avgAnomalyDensity: number} | null>(null);
  const [trend, setTrend] = useState<{date: string, anomalies: number}[]>([]);
  const [recentAnomalies, setRecentAnomalies] = useState<Anomaly[]>([]);
  const [riskData, setRiskData] = useState<FleetRiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryData, trendData, anomaliesData, fleetRisk] = await Promise.all([
          api.getDashboardSummary(),
          api.getAnomalyTrend(7),
          api.getAnomalies(),
          getFleetRiskScores(30),
        ]);
        setSummary(summaryData);
        setTrend(trendData);
        setRecentAnomalies(anomaliesData.slice(0, 5));
        setRiskData(fleetRisk);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute department risk rankings from real scored data
  const departmentRankings = React.useMemo(() => {
    if (!riskData?.serviceAvailable || riskData.results.length === 0) return null;

    const deptScores: Record<string, { total: number; count: number }> = {};
    for (const result of riskData.results) {
      const emp = MOCK_EMPLOYEES.find(e => e.id === result.employeeId);
      if (emp) {
        if (!deptScores[emp.department]) {
          deptScores[emp.department] = { total: 0, count: 0 };
        }
        deptScores[emp.department].total += result.riskScore;
        deptScores[emp.department].count++;
      }
    }

    return Object.entries(deptScores)
      .map(([dept, { total, count }]) => ({
        dept,
        avgScore: Math.round((total / count) * 10) / 10,
        count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [riskData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-ash">
        <Activity className="w-6 h-6 animate-spin text-signal-lime mr-3" />
        <span className="font-sans">Loading security overview...</span>
      </div>
    );
  }

  const bandLabel = (band: RiskBand) => {
    if (!riskData?.serviceAvailable) return "—";
    return riskData.bandDistribution[band] ?? 0;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-heading font-serif text-chalk">Security Overview</h1>
        <div className="flex items-center gap-2 px-3 py-1 bg-signal-lime/10 border border-signal-lime/20 rounded-sm">
          <div className="w-2 h-2 rounded-full bg-signal-lime animate-pulse" />
          <span className="text-[11px] uppercase tracking-wider text-signal-lime font-medium">Telemetry Stream Active</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 mb-4">
        <h2 className="text-heading-sm font-sans font-medium text-bone">Risk Analytics & Behavioral Intelligence</h2>
        <p className="text-[13px] text-ash">ML-powered risk scoring, 7-day organizational threat velocity, and incident density</p>
      </div>

      {/* ML Service Status Banner */}
      {riskData && !riskData.serviceAvailable && (
        <div className="flex items-center gap-3 p-3 border border-graphite bg-onyx rounded-sm">
          <WifiOff className="w-5 h-5 text-fog flex-shrink-0" />
          <div>
            <p className="text-[13px] text-bone font-medium">Risk scoring service unavailable</p>
            <p className="text-[11px] text-ash">The ML scoring service at {process.env.NEXT_PUBLIC_ML_SERVICE_URL || "localhost:8001"} is not responding. Risk scores and band distributions are temporarily offline.</p>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-fog mb-1 font-semibold flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Total Monitored
            </p>
            <p className="text-3xl font-mono text-bone font-medium">{summary?.totalMonitored}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-graphite/50 text-[11px] text-signal-lime">
            100% telemetry coverage
          </div>
        </Card>
        
        <Card className="flex flex-col justify-between border-signal-lime/30 bg-onyx/50">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-signal-lime mb-1 font-semibold flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" /> Critical Risk Alerts
            </p>
            <p className="text-3xl font-mono text-signal-lime font-medium">{summary?.activeAnomalies}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-signal-lime/20 text-[11px] text-ash">
            Requires immediate SOC review
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-fog mb-1 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> High Risk Users
            </p>
            <p className="text-3xl font-mono text-bone font-medium">{summary?.usersFlagged}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-graphite/50 text-[11px] text-ash">
            With elevated incident density
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-fog mb-1 font-semibold flex items-center gap-2">
              <Target className="w-3.5 h-3.5" /> Fleet Risk Score
            </p>
            <p className="text-3xl font-mono text-bone font-medium">
              {riskData?.serviceAvailable ? `${riskData.fleetAvgScore}%` : "—"}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-graphite/50 text-[11px] text-ash">
            {riskData?.serviceAvailable ? "ML-scored fleet average" : "Service offline"}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* Fleet Risk Gauge */}
        <Card className="col-span-1 flex flex-col items-center justify-center p-8">
          <LabelStamp className="self-start mb-8">Fleet Risk Index</LabelStamp>
          <RiskGauge
            value={riskData?.serviceAvailable ? riskData.fleetAvgScore : 0}
            label={riskData?.serviceAvailable ? getRiskLabel(riskData.fleetAvgScore) : "Offline"}
          />
          {riskData?.serviceAvailable && (
            <div className="flex items-center gap-4 mt-8">
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as RiskBand[]).map(band => (
                <div key={band} className="flex flex-col items-center">
                  <span className="text-[18px] font-mono text-bone font-medium">{bandLabel(band)}</span>
                  <span className="text-[9px] uppercase tracking-wider text-ash">{band}</span>
                </div>
              ))}
            </div>
          )}
          {riskData && !riskData.serviceAvailable && (
            <p className="text-center text-[12px] text-ash mt-8 leading-relaxed">
              Risk scoring service unavailable. Start the ML service to enable real-time scoring.
            </p>
          )}
        </Card>

        {/* 7-Day Trend */}
        <Card className="col-span-1 lg:col-span-2 flex flex-col h-[350px]">
          <LabelStamp className="mb-6">7-Day Organizational Threat Velocity</LabelStamp>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252525" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#5e5e5e" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#5e5e5e" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#131313', borderColor: '#333333', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}
                  itemStyle={{ color: '#c5ff4a' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="anomalies" 
                  stroke="#c5ff4a" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#131313', stroke: '#c5ff4a', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#c5ff4a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* Live Anomaly Feed */}
        <Card className="col-span-1 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <LabelStamp>SOC Behavioral Telemetry Feed</LabelStamp>
            <Link href="/anomalies" className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-fog hover:text-signal-lime transition-colors">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <AnomalyFeed anomalies={recentAnomalies} />
        </Card>

        {/* Department Exposure */}
        <Card className="col-span-1 flex flex-col">
          <LabelStamp className="mb-6">Departmental Exposure</LabelStamp>
          <div className="flex flex-col gap-0 border border-graphite rounded-sm overflow-hidden">
            <div className="grid grid-cols-3 gap-4 bg-onyx p-3 border-b border-graphite text-[10px] uppercase tracking-wider text-fog font-semibold">
              <div className="col-span-2">Department</div>
              <div className="text-right">{departmentRankings ? "Avg Risk" : "Events"}</div>
            </div>
            {departmentRankings ? (
              departmentRankings.map((d, i) => (
                <div key={d.dept} className={`grid grid-cols-3 gap-4 p-3 text-[13px] font-sans text-bone ${i !== departmentRankings.length - 1 ? 'border-b border-graphite/50' : ''}`}>
                  <div className="col-span-2">{d.dept}</div>
                  <div className="text-right font-mono text-signal-lime">{d.avgScore}%</div>
                </div>
              ))
            ) : (
              [
                { dept: "Engineering", count: 12 },
                { dept: "Sales", count: 8 },
                { dept: "Finance", count: 5 },
                { dept: "Executive", count: 2 },
              ].map((d, i) => (
                <div key={d.dept} className={`grid grid-cols-3 gap-4 p-3 text-[13px] font-sans text-bone ${i !== 3 ? 'border-b border-graphite/50' : ''}`}>
                  <div className="col-span-2">{d.dept}</div>
                  <div className="text-right font-mono text-signal-lime">{d.count}</div>
                </div>
              ))
            )}
          </div>
          {!departmentRankings && (
            <p className="text-[11px] text-ash mt-4 italic">
              Start the ML service for real risk-scored department rankings.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function getRiskLabel(score: number): string {
  if (score >= 75) return "Critical Risk";
  if (score >= 50) return "High Risk";
  if (score >= 25) return "Medium Risk";
  return "Low Risk";
}
