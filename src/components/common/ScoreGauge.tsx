import React from 'react';

interface ScoreGaugeProps {
  score: number;
  label?: string;
  sublabel?: string;
  size?: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score = 87,
  label = 'SECURITY POSTURE',
  sublabel = '+4.2% from yesterday',
  size = 130,
}) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative font-mono select-none">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        
        {/* Background track circle */}
        <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#0A1C13"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Green Progress Radial */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#18E66A"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: 'drop-shadow(0 0 6px rgba(24, 230, 106, 0.6))',
            }}
          />
        </svg>

        {/* Center Numbers */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline justify-center">
            <span className="text-3xl font-black text-[#E8FFF0] tracking-tight">{score}</span>
            <span className="text-xs text-[#8CA798] font-bold">/100</span>
          </div>
          <span className="text-[9px] font-bold text-[#18E66A] tracking-wider uppercase mt-0.5">
            {label}
          </span>
        </div>
      </div>

      {sublabel && (
        <span className="text-[10px] text-[#2DFF78] font-semibold mt-1 flex items-center gap-1">
          <span>▲</span>
          <span>{sublabel}</span>
        </span>
      )}
    </div>
  );
};
