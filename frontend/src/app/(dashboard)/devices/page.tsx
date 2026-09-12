'use client';

import React, { useState, useEffect } from 'react';
import {
  Laptop,
  HardDrive,
  Server,
  Smartphone,
  ShieldAlert,
  Search,
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Filter,
  Layers,
  Cpu,
  Wifi
} from 'lucide-react';
import { api } from '@/lib/api';
import { DeviceFleetItem, DeviceFleetListResponse } from '@/lib/types';
import { DeviceDrawer } from '@/components/drawer/DeviceDrawer';
import { cn, formatTimestamp, formatRelativeTime } from '@/lib/utils';

export default function DevicesPage() {
  const [fleetData, setFleetData] = useState<DeviceFleetListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Milestone 3 Polish: Device Inspection Drawer State
  const [selectedDevice, setSelectedDevice] = useState<DeviceFleetItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Filters
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('All');
  const [riskStatusFilter, setRiskStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');


  const fetchDevices = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (deviceTypeFilter !== 'All') params.device_type = deviceTypeFilter;
      if (riskStatusFilter !== 'All') params.risk_status = riskStatusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getDeviceFleet(params);
      setFleetData(res);
    } catch (err) {
      console.error('Failed to load device fleet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [deviceTypeFilter, riskStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDevices();
  };

  const getDeviceIcon = (dType: string) => {
    switch (dType.toLowerCase()) {
      case 'workstation':
        return <Cpu size={16} className="text-indigo-400" />;
      case 'cloud bastion':
        return <Server size={16} className="text-violet-400" />;
      case 'mobile':
        return <Smartphone size={16} className="text-sky-400" />;
      default:
        return <Laptop size={16} className="text-blue-400" />;
    }
  };

  const getRiskStatusBadge = (status: string) => {
    switch (status) {
      case 'HIGH_ANOMALY_DENSITY':
        return (
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 animate-pulse">
            HIGH ANOMALY DENSITY
          </span>
        );
      case 'ELEVATED':
        return (
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
            ELEVATED RISK
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Device Fleet & Hardware Assets</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300">
              Entity-Centric
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Hardware asset inventory mapping endpoint anomaly density and device-level telemetry activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDevices}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
            Refresh Fleet
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Monitored Hardware */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Endpoints</span>
            <div className="p-2 rounded-lg bg-violet-600/15 text-violet-400">
              <Laptop size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {fleetData?.total_devices || 0}
            </span>
            <span className="text-[11px] text-slate-400">Hardware assets</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">100% telemetry coverage</p>
        </div>

        {/* High Anomaly Density */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Elevated Endpoints</span>
            <div className="p-2 rounded-lg bg-rose-600/15 text-rose-400">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-300">
              {fleetData?.elevated_devices_count || 0}
            </span>
            <span className="text-[11px] text-rose-400 font-semibold">Anomaly density ≥ 1</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Endpoints exhibiting security deviations</p>
        </div>

        {/* Laptops & Workstations */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workstations & Laptops</span>
            <div className="p-2 rounded-lg bg-indigo-600/15 text-indigo-400">
              <HardDrive size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-300">
              {(fleetData?.device_type_counts['Laptop'] || 0) + (fleetData?.device_type_counts['Workstation'] || 0)}
            </span>
            <span className="text-[11px] text-slate-400">Standard user nodes</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Domain-joined corporate workstations</p>
        </div>

        {/* Cloud Bastions & Mobile */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bastions & Mobile</span>
            <div className="p-2 rounded-lg bg-sky-600/15 text-sky-400">
              <Server size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-sky-300">
              {(fleetData?.device_type_counts['Cloud Bastion'] || 0) + (fleetData?.device_type_counts['Mobile'] || 0)}
            </span>
            <span className="text-[11px] text-slate-400">Privileged / remote nodes</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cloud infrastructure & MDM devices</p>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Device Type Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5 text-xs font-semibold">
            {[
              { label: 'All Devices', value: 'All' },
              { label: 'Laptops', value: 'Laptop' },
              { label: 'Workstations', value: 'Workstation' },
              { label: 'Cloud Bastions', value: 'Cloud Bastion' },
              { label: 'Mobile', value: 'Mobile' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setDeviceTypeFilter(tab.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all',
                  deviceTypeFilter === tab.value
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Risk Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={riskStatusFilter}
              onChange={(e) => setRiskStatusFilter(e.target.value)}
              className="text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-violet-500"
            >
              <option value="All">All Risk Statuses</option>
              <option value="HIGH_ANOMALY_DENSITY">High Anomaly Density Only</option>
              <option value="ELEVATED">Elevated Risk Only</option>
              <option value="NORMAL">Normal Status Only</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search devices by Asset ID (e.g. LAPTOP-FIN-8821), IP Address, MAC Address, or Employee Name..."
            className="w-full text-xs bg-black/30 border border-white/10 rounded-xl pl-10 pr-24 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-violet-600/80 hover:bg-violet-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

      </div>

      {/* Device Fleet Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.04] border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Asset ID & Model</th>
                <th className="py-3.5 px-4">Device Type</th>
                <th className="py-3.5 px-4">Network Bindings (IP / MAC)</th>
                <th className="py-3.5 px-4">Assigned Employee</th>
                <th className="py-3.5 px-4">Telemetry Activity</th>
                <th className="py-3.5 px-4">Anomaly Density</th>
                <th className="py-3.5 px-4">Security Status</th>
                <th className="py-3.5 px-4 text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-3" />
                      <span>Scanning hardware fleet asset registry...</span>
                    </div>
                  </td>
                </tr>
              ) : fleetData?.devices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    <Laptop size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-slate-400">No Hardware Assets Found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting the filter criteria above.</p>
                  </td>
                </tr>
              ) : (
                fleetData?.devices.map((device) => (
                  <tr
                    key={device.id}
                    onClick={() => {
                      setSelectedDevice(device);
                      setIsDrawerOpen(true);
                    }}
                    className="hover:bg-violet-500/[0.08] transition-colors group cursor-pointer"
                    title={`Click to inspect ${device.asset_id} hardware & telemetry drill-down`}
                  >
                    {/* Asset ID & Model */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-violet-300 group-hover:text-violet-200">{device.asset_id}</div>
                      <div className="text-[11px] text-slate-400">{device.model_name}</div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.device_type)}
                        <span className="font-medium text-slate-200">{device.device_type}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{device.os_version}</div>
                    </td>

                    {/* IP & MAC */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="text-slate-200">{device.assigned_ip}</div>
                      <div className="text-slate-500 text-[10px]">{device.mac_address}</div>
                    </td>

                    {/* Assigned Employee */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{device.employee_name}</div>
                      <div className="text-[11px] text-slate-400">{device.department}</div>
                    </td>

                    {/* Activity */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-200">{device.total_telemetry_events} events</div>
                      <div className="text-[10px] text-slate-500">Ingested telemetry logs</div>
                    </td>

                    {/* Anomaly Density */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          'font-mono font-bold text-xs',
                          device.anomaly_events_count >= 4 ? 'text-rose-400' :
                          device.anomaly_events_count >= 1 ? 'text-amber-400' : 'text-emerald-400'
                        )}>
                          {device.anomaly_events_count} anomalies
                        </span>
                      </div>
                      {device.recent_anomaly_categories.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {device.recent_anomaly_categories.slice(0, 2).map((cat, i) => (
                            <span key={i} className="text-[9px] bg-violet-500/10 text-violet-300 px-1.5 py-0.2 rounded border border-violet-500/20">
                              {cat.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Risk Status */}
                    <td className="py-3.5 px-4">
                      {getRiskStatusBadge(device.risk_status)}
                    </td>

                    {/* Last Seen */}
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400">
                      <div>{formatRelativeTime(device.last_seen)}</div>
                      <div className="text-slate-500 text-[10px]">{formatTimestamp(device.last_seen).split(' ')[0]}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Hardware & Telemetry Drill-Down Drawer */}
      <DeviceDrawer
        device={selectedDevice}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

    </div>
  );
}

