import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Cpu, 
  CheckCircle2, 
  Zap, 
  Activity, 
  Layers, 
  Radio, 
  Maximize2 
} from 'lucide-react';

export const AICodingConsole: React.FC = () => {
  const [lines, setLines] = useState<string[]>([
    '> Initializing Behavioral Intelligence Engine...',
    '> Loading UEBA Baseline Vectors [1,420 Identities]...',
    '> Loading Isolation Forest v2.4 (Unsupervised Anomaly)...',
    '> Loading XGBoost Multi-Class Privilege Classifier...',
    '> Connecting telemetry stream (12.8k events/min)...',
    '> Extracting 148 behavioral features across S3, Auth, KMS, USB...',
    '> Comparing 90-day individual & peer group rolling baselines...',
    '> Detecting statistical anomalies (EMP-1042: +34% deviation)...',
    '> Calculating insider risk score (Authar Morgan: 78/100 HIGH)...',
    '> Correlating threat indicators with MITRE ATT&CK T1567.002...',
    '> Synchronizing threat intelligence feeds with DragonForce IOCs...',
    '> Sentinel AI Behavioral Engine ACTIVE [Latency: 0.08ms]'
  ]);

  const modelStatuses = [
    { name: 'Isolation Forest v2.4', type: 'Unsupervised Anomaly', status: 'ONLINE', latency: '0.08ms' },
    { name: 'XGBoost Privilege Net', type: 'Supervised Classifier', status: 'ONLINE', latency: '0.12ms' },
    { name: 'UEBA Ensemble Engine', type: 'Behavioral Peer GNN', status: 'ONLINE', latency: '1.20ms' },
    { name: 'Behavioral Baseline Model', type: 'Rolling 90-Day Filter', status: 'ONLINE', latency: '0.45ms' },
    { name: 'Threat Correlation Graph', type: 'Real-Time Graph Resolver', status: 'ONLINE', latency: '0.88ms' },
    { name: 'Risk Scoring Engine v4.2', type: 'Bayesian Composite', status: 'ONLINE', latency: '0.05ms' },
  ];

  // Dynamic log simulation ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const liveLogs = [
        `> Telemetry packet received: IP 10.240.14.82 [DESKTOP-7G8H2] volume: 12.4GB verified`,
        `> Real-time inference: Isolation Forest score: 0.964 [ANOMALY CONFIRMED]`,
        `> Auto-correlating active session tokens for user Authar Morgan (EMP-1042)...`,
        `> Threat matrix updated: T1558.001 Pass-the-Ticket detected on DC-01`,
        `> CASB firewall policy synced: egress quarantine armed for s3://temp-sync-8841`
      ];
      const randomLog = liveLogs[Math.floor(Math.random() * liveLogs.length)];
      setLines(prev => [...prev.slice(prev.length > 20 ? 1 : 0), randomLog]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono select-none">
      
      {/* LEFT: AI Security Engine Terminal Console */}
      <div className="lg:col-span-8 cyber-panel rounded-xl p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
        {/* Subtle Matrix scanline background */}
        <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
        
        {/* Terminal Title Bar */}
        <div className="relative z-10 flex items-center justify-between border-b border-[#18E66A]/20 pb-2 mb-3">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-[#2DFF78]">
              <Terminal className="w-4 h-4 text-[#18E66A]" />
              <span className="font-bold tracking-wider uppercase text-[#E8FFF0]">
                AI SECURITY ENGINE / CODING CONSOLE
              </span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30">
              LIVE RUNTIME
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-[#8CA798]">
            <span className="w-2 h-2 rounded-full bg-[#18E66A] animate-ping" />
            <span>STREAMING TELEMETRY (0.08ms)</span>
          </div>
        </div>

        {/* Terminal Log Stream */}
        <div className="relative z-10 bg-[#020605] p-3 rounded-lg border border-[#18E66A]/20 font-mono text-[11px] text-[#73FFA5] space-y-1 max-h-56 overflow-y-auto">
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-start gap-2 leading-relaxed">
              <span className="text-[#18E66A] select-none font-bold">»</span>
              <span className={line.includes('ANOMALY') || line.includes('HIGH') ? 'text-[#FF7043] font-bold' : ''}>
                {line}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1 text-[#2DFF78] pt-1">
            <span>root@sentinel-ai-core:~$</span>
            <span className="w-2 h-3.5 bg-[#2DFF78] inline-block animate-cursor" />
          </div>
        </div>

        {/* Bottom stats footer */}
        <div className="relative z-10 flex items-center justify-between text-[10px] text-[#8CA798] pt-3 mt-2 border-t border-[#18E66A]/15">
          <span>Inference Engine: PyTorch / ONNX TensorRT Runtime</span>
          <span className="text-[#2DFF78] font-bold">148 Active Features Ingested</span>
        </div>
      </div>

      {/* RIGHT: AI Model Status Cards */}
      <div className="lg:col-span-4 cyber-panel rounded-xl p-4 flex flex-col justify-between shadow-2xl">
        <div>
          <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2 mb-3">
            <div className="flex items-center gap-2 text-xs">
              <Cpu className="w-4 h-4 text-[#18E66A]" />
              <span className="font-bold tracking-wider uppercase text-[#E8FFF0]">
                AI MODEL STATUS
              </span>
            </div>
            <span className="text-[10px] text-[#2DFF78] font-bold">6/6 ONLINE</span>
          </div>

          <div className="space-y-2">
            {modelStatuses.map((m, idx) => (
              <div 
                key={idx}
                className="p-2 rounded bg-[#0A1C13]/60 border border-[#18E66A]/20 hover:border-[#18E66A]/40 flex items-center justify-between text-xs transition-colors"
              >
                <div>
                  <div className="font-bold text-[#E8FFF0] text-[11px]">{m.name}</div>
                  <div className="text-[9px] text-[#8CA798]">{m.type}</div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#18E66A]/15 text-[#2DFF78] border border-[#18E66A]/30 text-[9px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#18E66A] animate-pulse" />
                    {m.status}
                  </span>
                  <div className="text-[9px] text-[#4C7D60] mt-0.5">{m.latency}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 text-[10px] text-[#8CA798] flex items-center justify-between">
          <span>Zero Concept Drift</span>
          <span className="text-[#2DFF78]">Auto-Calibrated</span>
        </div>
      </div>

    </div>
  );
};
