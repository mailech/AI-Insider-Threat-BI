import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle2, 
  RefreshCw, 
  Server, 
  Cloud, 
  ShieldCheck, 
  Radio, 
  Zap,
  Lock
} from 'lucide-react';

export const DataSources: React.FC = () => {
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const connectors = [
    {
      id: 'conn-okta',
      name: 'Okta Identity Cloud & Active Directory',
      category: 'IDENTITY_PROVIDER',
      status: 'HEALTHY',
      eps: '3,420 events/sec',
      latency: '24ms',
      lastSync: 'Just now',
      recordsTotal: '1.4M events/day'
    },
    {
      id: 'conn-crowdstrike',
      name: 'CrowdStrike Falcon EDR',
      category: 'ENDPOINT_SECURITY',
      status: 'HEALTHY',
      eps: '8,950 events/sec',
      latency: '18ms',
      lastSync: 'Just now',
      recordsTotal: '12.8M events/day'
    },
    {
      id: 'conn-aws',
      name: 'AWS CloudTrail & GuardDuty',
      category: 'CLOUD_INFRASTRUCTURE',
      status: 'HEALTHY',
      eps: '2,100 events/sec',
      latency: '45ms',
      lastSync: '1 min ago',
      recordsTotal: '4.2M events/day'
    },
    {
      id: 'conn-m365',
      name: 'Microsoft 365 & Exchange Audit',
      category: 'COLLABORATION_SUITE',
      status: 'HEALTHY',
      eps: '1,840 events/sec',
      latency: '32ms',
      lastSync: 'Just now',
      recordsTotal: '2.9M events/day'
    },
    {
      id: 'conn-zscaler',
      name: 'Zscaler Zero Trust Network Access (CASB)',
      category: 'NETWORK_CASB',
      status: 'HEALTHY',
      eps: '4,500 events/sec',
      latency: '28ms',
      lastSync: 'Just now',
      recordsTotal: '6.1M events/day'
    },
    {
      id: 'conn-vault',
      name: 'HashiCorp Vault & KMS Secrets Audit',
      category: 'SECRETS_MANAGEMENT',
      status: 'HEALTHY',
      eps: '410 events/sec',
      latency: '12ms',
      lastSync: 'Just now',
      recordsTotal: '820K events/day'
    }
  ];

  const handleSync = (id: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
    }, 600);
  };

  return (
    <div className="space-y-4 pb-12 font-mono select-none">
      
      {/* Header */}
      <div className="cyber-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#18E66A]/20 text-[#2DFF78] border border-[#18E66A]/40">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#E8FFF0] tracking-wider uppercase">
                TELEMETRY INGESTION PIPELINES & CONNECTORS
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 font-bold">
                6/6 ONLINE (14 TOTAL SOURCES)
              </span>
            </div>
            <p className="text-[11px] text-[#8CA798]">
              High-throughput streaming connectors syncing endpoint, identity, cloud, and secrets telemetry.
            </p>
          </div>
        </div>

        <div className="text-xs text-right text-[#8CA798]">
          Total Ingestion Rate: <strong className="text-[#2DFF78]">21,220 EPS</strong>
        </div>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((c) => (
          <div
            key={c.id}
            className="cyber-panel p-4 rounded-xl hover:border-[#18E66A]/50 shadow-xl transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-[#0A1C13] text-[#2DFF78] border border-[#18E66A]/30 text-[10px] font-bold">
                  {c.category}
                </span>
                <span className="flex items-center gap-1 text-[#2DFF78] text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#18E66A] animate-pulse" />
                  {c.status}
                </span>
              </div>

              <h2 className="text-sm font-bold text-[#E8FFF0]">{c.name}</h2>

              <div className="space-y-1 pt-1 text-xs text-[#8CA798]">
                <div className="flex justify-between">
                  <span>Throughput:</span>
                  <span className="font-bold text-[#2DFF78]">{c.eps}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pipeline Latency:</span>
                  <span className="text-[#E8FFF0]">{c.latency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Ingest:</span>
                  <span className="text-[#E8FFF0]">{c.recordsTotal}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#18E66A]/15 flex items-center justify-between text-[10px]">
              <span className="text-[#8CA798]">Sync: {c.lastSync}</span>
              <button
                onClick={() => handleSync(c.id)}
                disabled={syncingId === c.id}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0A1C13] hover:bg-[#0D261A] text-[#73FFA5] border border-[#18E66A]/30 font-bold transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${syncingId === c.id ? 'animate-spin' : ''}`} />
                <span>Test Ping</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
