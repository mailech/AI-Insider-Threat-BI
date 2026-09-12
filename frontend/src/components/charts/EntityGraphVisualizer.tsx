'use client';

import React, { useState, useMemo } from 'react';
import { EmployeeDetail, TelemetryLog, Incident } from '@/lib/types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Network
} from 'lucide-react';

export interface GraphNode {
  id: string;
  type: 'employee' | 'device' | 'ip' | 'resource' | 'alert';
  label: string;
  sublabel?: string;
  severity?: string;
  color: string;
  iconType: string;
  details: Record<string, any>;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: 'OWNS_DEVICE' | 'ACCESSED_IP' | 'ACCESSED_RESOURCE' | 'FLAGGED_TRANSFER' | 'TRIGGERED_ALERT';
  color: string;
  dashed?: boolean;
}

interface EntityGraphVisualizerProps {
  employee: EmployeeDetail;
  logs?: TelemetryLog[];
  anomalies?: TelemetryLog[];
  incidents?: Incident[];
  onEnlarge?: () => void;
  height?: number | string;
}

export function EntityGraphVisualizer({
  employee,
  logs = [],
  anomalies = [],
  incidents = [],
  onEnlarge,
  height = 460
}: EntityGraphVisualizerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // 1. Build genuine graph nodes and edges strictly from real data
  const { nodes, edges } = useMemo(() => {
    const nodeList: GraphNode[] = [];
    const edgeList: GraphEdge[] = [];

    // Center Node: Employee Identity
    const empColor =
      employee.risk_category === 'Critical'
        ? '#F43F5E'
        : employee.risk_category === 'High'
        ? '#F59E0B'
        : employee.risk_category === 'Medium'
        ? '#38BDF8'
        : '#10B981';

    const empNode: GraphNode = {
      id: employee.id,
      type: 'employee',
      label: employee.full_name,
      sublabel: `${employee.department} • ${employee.designation}`,
      severity: employee.risk_category,
      color: empColor,
      iconType: 'user',
      details: {
        'Employee ID': employee.id,
        'Threat Score': `${employee.threat_score} / 100`,
        'Risk Tier': employee.risk_category,
        'Direct Manager': employee.direct_manager,
        'Department': employee.department,
        'Enrolled': employee.enrolled_date?.slice(0, 10),
      }
    };
    nodeList.push(empNode);

    // Connected Nodes 1: Assigned Device Assets
    if (employee.device_assets && employee.device_assets.length > 0) {
      employee.device_assets.forEach((asset, idx) => {
        const devId = `dev-${asset.asset_id}`;
        nodeList.push({
          id: devId,
          type: 'device',
          label: asset.asset_id,
          sublabel: `${asset.asset_type} (${asset.status})`,
          color: '#818CF8', // Indigo
          iconType: 'device',
          details: {
            'Asset ID': asset.asset_id,
            'Type': asset.asset_type,
            'Primary IP': asset.ip_address,
            'MAC Address': asset.mac_address || 'Unspecified',
            'OS': asset.os_name || 'Standard Enterprise Image',
            'Status': asset.status,
          }
        });
        edgeList.push({
          id: `e-dev-${idx}`,
          source: employee.id,
          target: devId,
          label: 'OWNS_DEVICE',
          color: '#818CF8'
        });
      });
    }

    // Connected Nodes 2: Real Network IPs Accessed from logs
    const allLogs = logs.length > 0 ? logs : (employee.recent_logs || []);
    const uniqueIps = new Map<string, TelemetryLog>();
    allLogs.forEach((log) => {
      if (log.source_ip && !uniqueIps.has(log.source_ip)) {
        uniqueIps.set(log.source_ip, log);
      }
    });

    // Take up to 4 most significant unique IPs to maintain layout legibility
    Array.from(uniqueIps.entries()).slice(0, 4).forEach(([ip, sampleLog], idx) => {
      const ipId = `ip-${ip.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const isInternal = ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.');
      nodeList.push({
        id: ipId,
        type: 'ip',
        label: ip,
        sublabel: isInternal ? 'Corporate Intranet' : 'External Egress IP',
        color: '#06B6D4', // Cyan
        iconType: 'network',
        details: {
          'IP Address': ip,
          'Network Domain': isInternal ? 'Internal Enterprise VPC' : 'External WAN Gateway',
          'Sample Event': sampleLog.event_type,
          'Last Seen': sampleLog.timestamp,
        }
      });
      edgeList.push({
        id: `e-ip-${idx}`,
        source: employee.id,
        target: ipId,
        label: 'ACCESSED_IP',
        color: '#06B6D4'
      });
    });

    // Connected Nodes 3: Real Resources / Files Touched
    const uniqueResources = new Map<string, { name: string; isAnomaly: boolean; log: TelemetryLog }>();
    allLogs.forEach((log) => {
      let resName: string | null = null;
      if (log.payload && typeof log.payload === 'object') {
        resName = log.payload.file_name || log.payload.target_file || log.payload.resource || log.payload.repository || null;
      }
      if (!resName && log.description) {
        const fileMatch = log.description.match(/(?:file|document|repo|dataset|downloaded|uploaded)\s+([a-zA-Z0-9_\-\.\/]+)/i);
        if (fileMatch) resName = fileMatch[1];
      }
      if (resName && !uniqueResources.has(resName)) {
        const isAnomaly = log.anomaly_category === 'ABNORMAL_DATA_DOWNLOAD' || log.anomaly_category === 'EXCESSIVE_FILE_TRANSFER';
        uniqueResources.set(resName, { name: resName, isAnomaly, log });
      }
    });

    // Limit to 3 resources for clean visual balance
    Array.from(uniqueResources.entries()).slice(0, 3).forEach(([name, meta], idx) => {
      const resId = `res-${idx}`;
      nodeList.push({
        id: resId,
        type: 'resource',
        label: name.length > 22 ? `${name.slice(0, 20)}...` : name,
        sublabel: meta.isAnomaly ? 'Flagged Data Target' : 'Enterprise Resource',
        color: meta.isAnomaly ? '#F59E0B' : '#A78BFA', // Amber if flagged, Violet otherwise
        iconType: 'file',
        details: {
          'Target Resource': name,
          'Event Type': meta.log.event_type,
          'Transfer Flag': meta.isAnomaly ? 'Elevated Volume / Off-Baseline' : 'Authorized Access',
          'Timestamp': meta.log.timestamp,
        }
      });
      edgeList.push({
        id: `e-res-${idx}`,
        source: employee.id,
        target: resId,
        label: meta.isAnomaly ? 'FLAGGED_TRANSFER' : 'ACCESSED_RESOURCE',
        color: meta.isAnomaly ? '#F59E0B' : '#A78BFA',
        dashed: meta.isAnomaly
      });
    });

    // Connected Nodes 4: Real Anomalies & Active Incidents
    const uniqueAnomalies = new Map<string, TelemetryLog>();
    const alertSourceLogs = anomalies.length > 0 ? anomalies : allLogs.filter(l => Boolean(l.anomaly_category));
    alertSourceLogs.forEach((anom) => {
      if (anom.anomaly_category && !uniqueAnomalies.has(anom.anomaly_category)) {
        uniqueAnomalies.set(anom.anomaly_category, anom);
      }
    });

    Array.from(uniqueAnomalies.entries()).slice(0, 3).forEach(([cat, anomLog], idx) => {
      const alertId = `anom-${idx}`;
      const isCritical = anomLog.severity === 'CRITICAL' || anomLog.severity === 'HIGH';
      const cleanCat = cat.replace(/_/g, ' ');
      nodeList.push({
        id: alertId,
        type: 'alert',
        label: cleanCat.length > 20 ? `${cleanCat.slice(0, 18)}...` : cleanCat,
        sublabel: `${anomLog.severity} Severity Flag`,
        severity: anomLog.severity,
        color: isCritical ? '#F43F5E' : '#F59E0B',
        iconType: 'alert',
        details: {
          'Category': cat,
          'Severity': anomLog.severity,
          'Event Type': anomLog.event_type,
          'Description': anomLog.description,
          'Timestamp': anomLog.timestamp,
          'Source IP': anomLog.source_ip,
        }
      });
      edgeList.push({
        id: `e-anom-${idx}`,
        source: employee.id,
        target: alertId,
        label: 'TRIGGERED_ALERT',
        color: isCritical ? '#F43F5E' : '#F59E0B',
        dashed: true
      });
    });

    // If active formal incidents exist, add up to 2 incident nodes
    if (incidents && incidents.length > 0) {
      incidents.slice(0, 2).forEach((inc, idx) => {
        const incNodeId = `inc-${inc.incident_id}`;
        nodeList.push({
          id: incNodeId,
          type: 'alert',
          label: inc.incident_id,
          sublabel: `${inc.status} (${inc.severity})`,
          severity: inc.severity,
          color: inc.status === 'Resolved' ? '#10B981' : '#F43F5E',
          iconType: 'alert',
          details: {
            'Incident Case': inc.incident_id,
            'Title': inc.title,
            'Status': inc.status,
            'Severity': inc.severity,
            'MITRE Code': inc.mitre_technique_id || 'T1078',
            'Created At': inc.created_at,
          }
        });
        edgeList.push({
          id: `e-inc-${idx}`,
          source: employee.id,
          target: incNodeId,
          label: 'TRIGGERED_ALERT',
          color: inc.status === 'Resolved' ? '#10B981' : '#F43F5E',
          dashed: true
        });
      });
    }

    // 2. Position nodes in a radial constellation centered on (0, 0)
    empNode.x = 0;
    empNode.y = 0;

    const peripheralNodes = nodeList.filter(n => n.id !== employee.id);
    const totalPeripheral = peripheralNodes.length;

    // Radius rings: Devices & IPs inner ring (145px), Resources & Alerts outer ring (215px)
    peripheralNodes.forEach((node, i) => {
      const angle = (i / totalPeripheral) * 2 * Math.PI - Math.PI / 2;
      const radius = node.type === 'device' || node.type === 'ip' ? 145 : 215;
      node.x = Math.cos(angle) * radius;
      node.y = Math.sin(angle) * radius;
    });

    return { nodes: nodeList, edges: edgeList };
  }, [employee, logs, anomalies, incidents]);

  // Pan and drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName !== 'circle' && (e.target as HTMLElement).tagName !== 'text') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  return (
    <div className="relative w-full rounded-2xl bg-[#0B0A13] border border-white/5 overflow-hidden select-none">
      {/* Visualizer Header Controls */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-[#141222]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg pointer-events-auto">
          <Network size={14} className="text-violet-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Entity Relationship Graph
          </span>
          <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
            {nodes.length} Nodes • {edges.length} Edges
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#141222]/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg pointer-events-auto">
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw size={14} />
          </button>
          {onEnlarge && (
            <button
              type="button"
              onClick={onEnlarge}
              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors border-l border-white/10 pl-2 cursor-pointer"
              title="Full-Screen Graph Explorer"
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        className="w-full relative cursor-grab active:cursor-grabbing overflow-hidden"
        style={{ height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          className="w-full h-full"
          viewBox="-280 -250 560 500"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="graph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="0.8" fill="rgba(255,255,255,0.06)" />
            </pattern>
            <radialGradient id="center-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(139,92,246,0.18)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Grid Background */}
          <rect x="-1000" y="-1000" width="2000" height="2000" fill="url(#graph-grid)" />
          <circle cx="0" cy="0" r="230" fill="url(#center-halo)" />

          {/* Concentric Reference Rings */}
          <circle cx="0" cy="0" r="145" fill="none" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
          <circle cx="0" cy="0" r="215" fill="none" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />

          {/* Transform group for Pan and Zoom */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* 1. Draw Edges */}
            {edges.map((edge) => {
              const src = nodeMap.get(edge.source);
              const tgt = nodeMap.get(edge.target);
              if (!src || !tgt) return null;

              const isHighlighted =
                selectedNode?.id === edge.source ||
                selectedNode?.id === edge.target ||
                hoveredNode?.id === edge.source ||
                hoveredNode?.id === edge.target;

              const sx = src.x || 0;
              const sy = src.y || 0;
              const tx = tgt.x || 0;
              const ty = tgt.y || 0;

              const mx = (sx + tx) / 2;
              const my = (sy + ty) / 2;

              return (
                <g key={edge.id} className="transition-opacity duration-200">
                  <line
                    x1={sx}
                    y1={sy}
                    x2={tx}
                    y2={ty}
                    stroke={edge.color}
                    strokeWidth={isHighlighted ? 2.5 : 1.2}
                    strokeOpacity={isHighlighted ? 0.9 : 0.4}
                    strokeDasharray={edge.dashed ? '4 3' : undefined}
                  />
                  {/* Edge Label Pill */}
                  <g transform={`translate(${mx}, ${my})`}>
                    <rect
                      x="-38"
                      y="-7"
                      width="76"
                      height="14"
                      rx="7"
                      fill="#0B0A13"
                      stroke={edge.color}
                      strokeWidth="0.8"
                      strokeOpacity={isHighlighted ? 0.8 : 0.3}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isHighlighted ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
                      fontSize="7.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {edge.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* 2. Draw Peripheral Nodes */}
            {nodes.filter(n => n.id !== employee.id).map((node) => {
              const nx = node.x || 0;
              const ny = node.y || 0;
              const isHovered = hoveredNode?.id === node.id;
              const isSelected = selectedNode?.id === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${nx}, ${ny})`}
                  className="cursor-pointer transition-transform duration-150"
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(selectedNode?.id === node.id ? null : node);
                  }}
                >
                  {(isSelected || isHovered || node.severity === 'CRITICAL') && (
                    <circle
                      r="22"
                      fill={node.color}
                      fillOpacity={isSelected ? 0.25 : 0.15}
                      className={node.severity === 'CRITICAL' ? 'animate-pulse' : ''}
                    />
                  )}

                  <circle
                    r="15"
                    fill="#151324"
                    stroke={node.color}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                    filter="drop-shadow(0 2px 8px rgba(0,0,0,0.5))"
                  />

                  <circle r="6" fill={node.color} fillOpacity={0.8} />

                  <text
                    y="25"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="9.5"
                    fontWeight="600"
                    fontFamily="sans-serif"
                    className="pointer-events-none drop-shadow"
                  >
                    {node.label}
                  </text>
                  {node.sublabel && (
                    <text
                      y="35"
                      textAnchor="middle"
                      fill="rgba(148,163,184,0.8)"
                      fontSize="7.5"
                      fontFamily="monospace"
                      className="pointer-events-none"
                    >
                      {node.sublabel}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 3. Draw Center Employee Node */}
            {(() => {
              const emp = nodeMap.get(employee.id);
              if (!emp) return null;
              const isSelected = selectedNode?.id === emp.id;

              return (
                <g
                  transform="translate(0, 0)"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredNode(emp)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(selectedNode?.id === emp.id ? null : emp);
                  }}
                >
                  <circle
                    r="34"
                    fill={emp.color}
                    fillOpacity="0.15"
                    stroke={emp.color}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />

                  <circle
                    r="24"
                    fill="#1E1B38"
                    stroke={emp.color}
                    strokeWidth={isSelected ? 3 : 2}
                    filter="drop-shadow(0 4px 12px rgba(0,0,0,0.6))"
                  />

                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#FFFFFF"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {employee.avatar_initials || 'ID'}
                  </text>

                  <text
                    y="39"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    className="drop-shadow"
                  >
                    {employee.full_name}
                  </text>
                  <text
                    y="50"
                    textAnchor="middle"
                    fill={emp.color}
                    fontSize="8.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {employee.risk_category.toUpperCase()} RISK ({employee.threat_score}%)
                  </text>
                </g>
              );
            })()}
          </g>
        </svg>
      </div>

      {/* Floating Node Detail Tooltip / Card */}
      {(hoveredNode || selectedNode) && (
        <div className="absolute bottom-3 left-3 max-w-xs w-full p-3 rounded-xl bg-[#141222]/95 border border-white/10 backdrop-blur-xl shadow-2xl space-y-2 z-20 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: (hoveredNode || selectedNode)?.color }}
              />
              <span className="text-xs font-bold text-white truncate max-w-[170px]">
                {(hoveredNode || selectedNode)?.label}
              </span>
            </div>
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase"
              style={{
                backgroundColor: `${(hoveredNode || selectedNode)?.color}20`,
                color: (hoveredNode || selectedNode)?.color
              }}
            >
              {(hoveredNode || selectedNode)?.type}
            </span>
          </div>

          <div className="space-y-1 text-[10px] text-slate-300 font-mono">
            {Object.entries((hoveredNode || selectedNode)?.details || {}).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-slate-500">{key}:</span>
                <span className="text-white truncate max-w-[150px] font-semibold">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Right Legend Strip */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2.5 bg-[#141222]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-violet-400" /> Identity
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-400" /> Device
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400" /> IP
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> Resource
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-400" /> Alert
        </span>
      </div>
    </div>
  );
}
