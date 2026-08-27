import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  ShieldAlert, 
  CheckCircle2, 
  Lock, 
  ArrowRight,
  BrainCircuit,
  MessageSquare,
  Crosshair,
  Calendar,
  Layers
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const SentinelCopilot: React.FC = () => {
  const { 
    selectedEmployee, 
    openContainmentModal, 
    setActiveNav,
    setSelectedIncidentId
  } = useSecurity();

  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([
    {
      sender: 'user',
      text: `Why is ${selectedEmployee.name} considered high risk?`,
      time: '09:44 UTC'
    },
    {
      sender: 'assistant',
      text: `${selectedEmployee.name}'s risk increased by 31 points over the last 24 hours. Primary contributors include abnormal data transfer (12.4 GB staging egress), unusual login timing (02:14 UTC from Zurich VPN), and external device connection (SanDisk USB storage write burst).`,
      time: '09:44 UTC'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = inputValue;
    const now = new Date().toTimeString().split(' ')[0];
    setMessages(prev => [...prev, { sender: 'user', text: userMsg, time: now }]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      let response = `Telemetry analysis confirms baseline deviation on host ${selectedEmployee.device}. Correlating network flow records with Active Directory DC-01 shows anomalous privilege escalation signatures. Recommended immediate containment.`;
      if (userMsg.toLowerCase().includes('isolate') || userMsg.toLowerCase().includes('contain')) {
        response = `Executing containment workflow. Initiating host network isolation and revoking active Kerberos TGT tickets for ${selectedEmployee.id}.`;
      } else if (userMsg.toLowerCase().includes('mitre')) {
        response = `Mapped techniques: T1078.004 (Valid Accounts: Cloud Accounts), T1558.001 (Steal or Forge Kerberos Tickets), T1567.002 (Exfiltration to Cloud Storage).`;
      }

      setMessages(prev => [...prev, { sender: 'assistant', text: response, time: new Date().toTimeString().split(' ')[0] }]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="cyber-panel rounded-xl overflow-hidden font-mono text-xs flex flex-col justify-between shadow-xl">
      {/* Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-[#0A1C13] border-b border-[#18E66A]/20 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#18E66A]/20 border border-[#18E66A]/40 flex items-center justify-center text-[#2DFF78]">
            <Sparkles className="w-3 h-3 text-[#2DFF78]" />
          </div>
          <h3 className="font-bold text-[#E8FFF0] tracking-wider text-[11px] uppercase">
            SENTINEL COPILOT (AI SOC REASONING)
          </h3>
        </div>

        <button className="text-[#8CA798] hover:text-[#2DFF78]">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
          
          {/* Chat Messages Log */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#0A1C13] border border-[#18E66A]/30 text-[#E8FFF0] ml-4'
                    : 'bg-[#020605] border border-[#18E66A]/20 text-[#73FFA5] mr-4'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#8CA798] mb-1 font-bold">
                  <span>{msg.sender === 'user' ? 'AUTHAR MORGAN (ANALYST)' : 'SENTINEL AI ENGINE'}</span>
                  <span>{msg.time}</span>
                </div>
                <p>{msg.text}</p>
              </div>
            ))}

            {isTyping && (
              <div className="p-2 rounded bg-[#020605] border border-[#18E66A]/20 text-[#2DFF78] text-[11px] flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#18E66A]" />
                <span>AI synthesizing telemetry correlation...</span>
              </div>
            )}
          </div>

          {/* Action Buttons: VIEW TIMELINE, CORRELATE EVENTS, CREATE INCIDENT */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => setActiveNav('investigation')}
              className="py-1.5 px-2 rounded bg-[#0A1C13] hover:bg-[#0D261A] text-[#73FFA5] hover:text-[#2DFF78] border border-[#18E66A]/30 text-[10px] font-bold transition-colors text-center"
            >
              VIEW TIMELINE
            </button>
            <button
              onClick={() => setActiveNav('investigation')}
              className="py-1.5 px-2 rounded bg-[#18E66A]/20 hover:bg-[#18E66A]/30 text-[#2DFF78] border border-[#18E66A]/40 text-[10px] font-bold transition-colors text-center"
            >
              CORRELATE EVENTS
            </button>
            <button
              onClick={() => {
                setSelectedIncidentId('INC-2026-0891');
                setActiveNav('incidents');
              }}
              className="py-1.5 px-2 rounded bg-[#FF334B]/20 hover:bg-[#FF334B]/30 text-[#FF334B] border border-[#FF334B]/40 text-[10px] font-bold transition-colors text-center"
            >
              CREATE INCIDENT
            </button>
          </div>

          {/* Chat Input form */}
          <form onSubmit={handleSendMessage} className="relative pt-1">
            <input
              type="text"
              placeholder="Ask Copilot about threat vectors, baselines, or playbooks..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-[#020605] text-[#E8FFF0] placeholder-[#567363] text-xs rounded-lg pl-3 pr-8 py-2 border border-[#18E66A]/30 focus:outline-none focus:border-[#2DFF78]"
            />
            <button
              type="submit"
              className="absolute right-2 top-3 text-[#18E66A] hover:text-[#2DFF78]"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
};
