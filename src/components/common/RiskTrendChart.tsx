import React from 'react';
import { TrendingUp, PieChart, Users, ArrowUpRight } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const RiskTrendChart: React.FC = () => {
  const { employees, setSelectedEmployeeId, setActiveNav } = useSecurity();

  // 7-Day Trend data points
  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Today'];

  const riskyUsers = [
    { name: 'Authar Morgan', id: 'EMP-1042', dept: 'Finance & Cloud', score: 78, barWidth: '78%', color: '#FF7043' },
    { name: 'Marcus Wilson', id: 'EMP-1033', dept: 'Customer Support', score: 82, barWidth: '82%', color: '#FF334B' },
    { name: 'Jordan Lee', id: 'EMP-1091', dept: 'Core Infrastructure', score: 78, barWidth: '78%', color: '#FF7043' },
    { name: 'Devon Vance', id: 'EMP-1120', dept: 'Sales', score: 68, barWidth: '68%', color: '#F5A623' },
    { name: 'Elena Rostova', id: 'EMP-1007', dept: 'Customer Support', score: 32, barWidth: '32%', color: '#18E66A' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono select-none">
      
      {/* 1. RISK SCORE TREND (7 DAYS) */}
      <div className="lg:col-span-5 cyber-panel rounded-xl p-4 flex flex-col justify-between shadow-xl">
        <div>
          <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2 mb-3">
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="w-4 h-4 text-[#18E66A]" />
              <span className="font-bold tracking-wider uppercase text-[#E8FFF0]">
                RISK SCORE TREND (7 DAYS)
              </span>
            </div>
            <span className="text-[10px] text-[#2DFF78] font-bold">Rolling 168h Window</span>
          </div>

          {/* SVG Multi-Line Chart */}
          <div className="w-full h-44 relative bg-[#020605] rounded-lg border border-[#18E66A]/20 p-2 flex flex-col justify-between">
            <svg className="w-full h-32" viewBox="0 0 100 50" preserveAspectRatio="none">
              {/* Horizontal Grid lines */}
              <line x1="0" y1="10" x2="100" y2="10" stroke="#18E66A10" strokeWidth="0.5" />
              <line x1="0" y1="25" x2="100" y2="25" stroke="#18E66A10" strokeWidth="0.5" />
              <line x1="0" y1="40" x2="100" y2="40" stroke="#18E66A10" strokeWidth="0.5" />

              {/* Critical Line (Red) */}
              <polyline
                fill="none"
                stroke="#FF334B"
                strokeWidth="1.5"
                points="0,42 16,40 33,38 50,30 66,22 83,18 100,12"
              />

              {/* High Risk Line (Orange - Authar Morgan cluster) */}
              <polyline
                fill="none"
                stroke="#FF7043"
                strokeWidth="1.5"
                points="0,35 16,36 33,32 50,28 66,24 83,20 100,15"
              />

              {/* Medium Line (Yellow) */}
              <polyline
                fill="none"
                stroke="#F5A623"
                strokeWidth="1.2"
                points="0,28 16,29 33,26 50,24 66,25 83,27 100,26"
              />

              {/* Low / Baseline Line (Green) */}
              <polyline
                fill="none"
                stroke="#18E66A"
                strokeWidth="1.2"
                strokeDasharray="2,2"
                points="0,12 16,14 33,12 50,15 66,13 83,14 100,12"
              />
            </svg>

            {/* X-Axis labels */}
            <div className="flex justify-between text-[9px] text-[#8CA798] px-1">
              {days.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="pt-2 text-[10px] flex items-center justify-between border-t border-[#18E66A]/15 mt-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#FF334B] font-bold"><span className="w-2 h-0.5 bg-[#FF334B]" />Critical</span>
            <span className="flex items-center gap-1 text-[#FF7043] font-bold"><span className="w-2 h-0.5 bg-[#FF7043]" />High</span>
            <span className="flex items-center gap-1 text-[#F5A623] font-bold"><span className="w-2 h-0.5 bg-[#F5A623]" />Med</span>
            <span className="flex items-center gap-1 text-[#18E66A] font-bold"><span className="w-2 h-0.5 bg-[#18E66A]" />Low</span>
          </div>
          <span className="text-[#8CA798]">Authar Morgan: +31 pts</span>
        </div>
      </div>

      {/* 2. RISK DISTRIBUTION (DONUT CHART) */}
      <div className="lg:col-span-3 cyber-panel rounded-xl p-4 flex flex-col justify-between shadow-xl">
        <div>
          <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2 mb-3">
            <div className="flex items-center gap-2 text-xs">
              <PieChart className="w-4 h-4 text-[#18E66A]" />
              <span className="font-bold tracking-wider uppercase text-[#E8FFF0]">
                RISK DISTRIBUTION
              </span>
            </div>
            <span className="text-[10px] text-[#8CA798]">1,420 Users</span>
          </div>

          {/* Donut graphic */}
          <div className="relative flex items-center justify-center my-2">
            <svg className="w-32 h-32 -rotate-90 transform" viewBox="0 0 36 36">
              {/* Background circle */}
              <path
                className="text-[#07140E]"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* Low Risk 74% (Green) */}
              <path
                strokeWidth="4"
                strokeDasharray="74, 100"
                stroke="#18E66A"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* Medium 16% (Yellow) */}
              <path
                strokeWidth="4"
                strokeDasharray="16, 100"
                strokeDashoffset="-74"
                stroke="#F5A623"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* High & Critical 10% (Orange/Red) */}
              <path
                strokeWidth="4"
                strokeDasharray="10, 100"
                strokeDashoffset="-90"
                stroke="#FF334B"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-lg font-black text-[#E8FFF0]">90.8%</span>
              <span className="text-[8px] text-[#2DFF78] font-bold uppercase">SAFE POPULATION</span>
            </div>
          </div>
        </div>

        <div className="space-y-1 text-[10px] text-[#8CA798] pt-2 border-t border-[#18E66A]/15">
          <div className="flex justify-between"><span className="text-[#18E66A] font-bold">● Low Risk:</span><span>1,050 (74%)</span></div>
          <div className="flex justify-between"><span className="text-[#F5A623] font-bold">● Moderate:</span><span>228 (16%)</span></div>
          <div className="flex justify-between"><span className="text-[#FF7043] font-bold">● High:</span><span>114 (8%)</span></div>
          <div className="flex justify-between"><span className="text-[#FF334B] font-bold">● Critical:</span><span>28 (2%)</span></div>
        </div>
      </div>

      {/* 3. TOP RISKY USERS (HORIZONTAL BARS - Authar Morgan at top) */}
      <div className="lg:col-span-4 cyber-panel rounded-xl p-4 flex flex-col justify-between shadow-xl">
        <div>
          <div className="flex items-center justify-between border-b border-[#18E66A]/20 pb-2 mb-3">
            <div className="flex items-center gap-2 text-xs">
              <Users className="w-4 h-4 text-[#18E66A]" />
              <span className="font-bold tracking-wider uppercase text-[#E8FFF0]">
                TOP RISKY USERS
              </span>
            </div>
            <span className="text-[10px] text-[#FF334B] font-bold">Priority Triage</span>
          </div>

          <div className="space-y-2.5">
            {riskyUsers.map((user) => (
              <div 
                key={user.id}
                onClick={() => {
                  setSelectedEmployeeId(user.id);
                  setActiveNav('employees');
                }}
                className="p-1.5 rounded hover:bg-[#0A1C13] cursor-pointer transition-colors space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#E8FFF0] text-[11px]">{user.name}</span>
                    <span className="text-[9px] text-[#8CA798]">({user.id})</span>
                  </div>
                  <span className="font-bold text-xs" style={{ color: user.color }}>
                    {user.score} / 100
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-[#020605] overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-700" 
                    style={{ width: user.barWidth, backgroundColor: user.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 text-[10px] text-[#8CA798] flex items-center justify-between border-t border-[#18E66A]/15 mt-2">
          <span>Click identity to open forensics profile</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#18E66A]" />
        </div>
      </div>

    </div>
  );
};
