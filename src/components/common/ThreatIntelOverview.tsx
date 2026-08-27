import React from 'react';
import { Crosshair, Bug, Radio, ShieldAlert, Globe, ExternalLink, ArrowUpRight } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';
import { SecurityBadge } from './SecurityBadge';

export const ThreatIntelOverview: React.FC = () => {
  const { threatFeed, setActiveNav } = useSecurity();

  const intelCards = [
    { title: 'THREAT ACTORS', count: '24 Active', sub: 'DragonForce, Volt Typhoon, Scattered Spider', icon: Crosshair, color: '#FF334B' },
    { title: 'MALWARE FAMILIES', count: '37 Detected', sub: 'Mimikatz, Cobalt Strike, AiTM Proxies', icon: Bug, color: '#FF7043' },
    { title: 'IOC COUNT', count: '18.2K Indicators', sub: 'IPs, Hashes, Domains, Staging Buckets', icon: Radio, color: '#F5A623' },
    { title: 'VULNERABILITIES', count: '16 Critical', sub: 'CVE-2024-3094, Kerberos Forgery T1558', icon: ShieldAlert, color: '#18E66A' },
  ];

  return (
    <div className="space-y-4 font-mono select-none">
      
      {/* 4 Compact Intelligence KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {intelCards.map((card, i) => {
          const Icon = card.icon;

          return (
            <div
              key={i}
              className="cyber-panel rounded-xl p-3.5 flex items-center justify-between shadow-lg"
            >
              <div>
                <span className="text-[10px] font-bold text-[#8CA798] uppercase tracking-wider block">
                  {card.title}
                </span>
                <div className="text-xl font-black text-[#E8FFF0] mt-0.5" style={{ color: card.color }}>
                  {card.count}
                </div>
                <div className="text-[9px] text-[#8CA798] truncate max-w-[180px] mt-0.5">
                  {card.sub}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-[#0A1C13] border border-[#18E66A]/30" style={{ color: card.color }}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Threat Intelligence Live Feed */}
      <div className="cyber-panel rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#18E66A]" />
            <h3 className="font-bold text-xs text-[#E8FFF0] uppercase tracking-wider">
              THREAT INTELLIGENCE FEED
            </h3>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30">
              SIMULATED INTEL SYNC
            </span>
          </div>

          <button
            onClick={() => setActiveNav('threat-intel')}
            className="text-[10px] text-[#2DFF78] hover:underline flex items-center gap-1 font-bold"
          >
            <span>View Full Threat Intel Repository</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {threatFeed.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg bg-[#0A1C13]/60 border border-[#18E66A]/20 hover:border-[#18E66A]/40 space-y-1.5 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-xs text-[#E8FFF0] leading-snug">
                  {item.title}
                </span>
                <SecurityBadge severity={item.severity} size="sm" />
              </div>

              <p className="text-[10px] text-[#8CA798] leading-relaxed">
                {item.description}
              </p>

              <div className="flex items-center justify-between text-[9px] text-[#4C7D60] pt-1 border-t border-[#18E66A]/10">
                <span>Source: {item.source}</span>
                <span className="text-[#2DFF78]">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
