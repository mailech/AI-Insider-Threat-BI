import React, { useState } from 'react';
import { 
  Activity, 
  Play, 
  Pause, 
  Trash2, 
  Filter, 
  Search, 
  Download, 
  Radio, 
  CheckCircle2, 
  ShieldAlert,
  ArrowUpRight,
  FileCode
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { SecurityBadge } from '../components/common/SecurityBadge';
import { TelemetryEvent } from '../types';

export const LiveTelemetry: React.FC = () => {
  const { 
    telemetryEvents, 
    isTelemetryLive, 
    setIsTelemetryLive, 
    clearTelemetry, 
    setSelectedEmployeeId,
    setActiveNav 
  } = useSecurity();

  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectEvent, setInspectEvent] = useState<TelemetryEvent | null>(null);

  const filteredEvents = telemetryEvents.filter(e => {
    const matchesFilter = filterType === 'ALL' || e.type === filterType;
    const matchesSearch = 
      e.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.device.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const downloadJsonLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredEvents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sentinel_telemetry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4 pb-12 font-mono select-none">
      
      {/* Header */}
      <div className="cyber-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/40">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8FFF0] tracking-wider uppercase">
                LIVE TELEMETRY INGESTION FEED
              </h1>
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 font-bold">
                <span className="w-2 h-2 rounded-full bg-[#18E66A] animate-ping" />
                12.8K EVENTS/MIN
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              High-frequency behavioral telemetry stream aggregating endpoint, CASB, identity, and cloud audit logs.
            </p>
          </div>
        </div>

        {/* Stream Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTelemetryLive(!isTelemetryLive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border transition-all ${
              isTelemetryLive
                ? 'bg-[#18E66A]/20 text-[#2DFF78] border-[#18E66A]/40'
                : 'bg-[#0A1C13] text-[#8CA798] border-[#18E66A]/20'
            }`}
          >
            {isTelemetryLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isTelemetryLive ? 'Streaming Live' : 'Paused'}</span>
          </button>

          <button
            onClick={downloadJsonLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A1C13] hover:bg-[#0D261A] text-[#73FFA5] border border-[#18E66A]/30 text-xs font-bold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={clearTelemetry}
            className="p-1.5 rounded-lg bg-[#0A1C13] hover:bg-[#0D261A] text-[#8CA798] hover:text-[#FF334B] border border-[#18E66A]/30 text-xs transition-all"
            title="Clear Buffer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="cyber-panel p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-[#18E66A]" />
          <input
            type="text"
            placeholder="Filter by user (e.g. Authar Morgan), host, event type, or destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-[#E8FFF0] placeholder-[#567363] w-full focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-[10px]">
          {['ALL', 'FILE_TRANSFER', 'PRIVILEGE_CHANGE', 'UNUSUAL_LOGIN', 'USB_ACTIVITY', 'DATABASE_QUERY', 'EMAIL_EXFILTRATION'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2 py-1 rounded border whitespace-nowrap transition-colors ${
                filterType === t
                  ? 'bg-[#18E66A]/20 text-[#2DFF78] border-[#18E66A]/50 font-bold'
                  : 'bg-[#0A1C13] text-[#8CA798] border-[#18E66A]/20 hover:text-[#E8FFF0]'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Telemetry Events Table */}
      <div className="cyber-panel rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A1C13] text-[#8CA798] uppercase text-[10px] font-bold tracking-wider border-b border-[#18E66A]/20">
              <tr>
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">EVENT TYPE</th>
                <th className="py-2.5 px-3">IDENTITY</th>
                <th className="py-2.5 px-3">HOST / IP</th>
                <th className="py-2.5 px-3">DETAILS & TELEMETRY PAYLOAD</th>
                <th className="py-2.5 px-3">SEVERITY</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18E66A]/10 text-[11px]">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-[#0A1C13]/60 transition-colors">
                  <td className="py-2 px-3 text-[#8CA798]">{evt.timestamp}</td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-[#020605] border border-[#18E66A]/30 text-[9px] text-[#2DFF78] font-bold">
                      {evt.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-bold text-[#E8FFF0]">
                    <span 
                      onClick={() => {
                        setSelectedEmployeeId(evt.employeeId);
                        setActiveNav('employees');
                      }}
                      className="hover:text-[#2DFF78] cursor-pointer hover:underline"
                    >
                      {evt.employeeName}
                    </span>
                    <span className="text-[9px] text-[#4C7D60] ml-1">({evt.employeeId})</span>
                  </td>
                  <td className="py-2 px-3 text-[#8CA798]">
                    <span>{evt.device}</span>
                    <span className="text-[9px] text-[#4C7D60] block">{evt.ipAddress}</span>
                  </td>
                  <td className="py-2 px-3 text-[#73FFA5] max-w-md truncate">
                    {evt.details}
                  </td>
                  <td className="py-2 px-3">
                    <SecurityBadge severity={evt.risk} size="sm" />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => setInspectEvent(evt)}
                      className="px-2 py-1 rounded bg-[#0A1C13] hover:bg-[#0D261A] text-[#73FFA5] border border-[#18E66A]/30 text-[10px] font-bold"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw JSON Modal Inspector */}
      {inspectEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="cyber-panel rounded-xl max-w-xl w-full p-4 space-y-3 shadow-2xl border border-[#18E66A]/40">
            <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#18E66A]" />
                <h3 className="font-bold text-xs text-[#E8FFF0]">
                  RAW TELEMETRY INSPECTOR: {inspectEvent.id}
                </h3>
              </div>
              <button
                onClick={() => setInspectEvent(null)}
                className="text-[#8CA798] hover:text-[#FF334B] text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <pre className="bg-[#020605] p-3 rounded-lg border border-[#18E66A]/20 text-[#73FFA5] text-[11px] font-mono overflow-x-auto max-h-80">
              {JSON.stringify(inspectEvent, null, 2)}
            </pre>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setInspectEvent(null)}
                className="px-3 py-1 rounded bg-[#18E66A] text-[#020605] font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
