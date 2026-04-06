import React from 'react';
import { Zap, AlertTriangle } from 'lucide-react';

interface EnergyPredictionGaugeProps {
  totalClasses: number;
  estimatedCost: number;
}

export function EnergyPredictionGauge({ totalClasses, estimatedCost }: EnergyPredictionGaugeProps) {
  const maxLoad = 30;
  const percentage = Math.min((estimatedCost / maxLoad) * 100, 100);
  const rotation = (percentage * 1.8) - 90; 

  const getStatusColor = () => {
    if (percentage < 40) return 'text-lime-400';
    if (percentage < 75) return 'text-yellow-400';
    return 'text-red-500';
  };

  const getStatusText = () => {
    if (percentage < 40) return 'Efficient';
    if (percentage < 75) return 'Moderate';
    return 'High Demand';
  };

  // --- ปรับจูนสัดส่วนใหม่ทั้งหมดเพื่อให้ "วงหนาแต่ไม่ล้น" ---
  const strokeWidth = 22;      // 1. เพิ่มความหนาให้สะใจตามโจทย์ (จากเดิม 18 -> 22)
  const svgSize = 160;         // 2. ลดขนาดรวมของ SVG ลงเพื่อให้มีพื้นที่หายใจในกรอบ (จาก 180 -> 160)
  const center = svgSize / 2;
  const radius = 55;           // 3. ปรับรัศมีให้เล็กลงเพื่อให้เส้นหนาๆ ไม่ล้นขอบ SVG (จาก 65 -> 55)
  const circumference = Math.PI * radius; // คำนวณระยะเส้นรอบรูปครึ่งวงกลม

  return (
    <div className="bg-[#151515] p-5 rounded-2xl border border-gray-800 shadow-xl w-full flex flex-col items-center">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 w-full">
        <h3 className="text-white font-bold flex items-center gap-2 text-[11px] uppercase tracking-wider">
          <Zap size={14} className="text-lime-400" /> Prediction
        </h3>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-black border border-gray-800 ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Gauge Container - จัดตำแหน่งให้กึ่งกลางพอดี */}
      <div className="relative flex justify-center items-center h-28 w-full overflow-hidden">
        <svg 
          width={svgSize} 
          height={svgSize} 
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="absolute -bottom-12" // ดันฐานลงไปเพื่อโชว์แค่ครึ่งวงกลมบน
        >
          {/* Background Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeLinecap="round"
            className="rotate-[180deg] origin-center"
          />
          {/* Active Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference - (circumference * (percentage / 100))}
            strokeLinecap="round"
            className={`rotate-[180deg] origin-center transition-all duration-1000 ease-out ${getStatusColor()}`}
          />
        </svg>

        {/* Needle - ปรับให้สั้นลงเข้ากับรัศมีใหม่ */}
        <div 
          className="absolute bottom-4 w-0.5 h-10 bg-white origin-bottom rounded-full transition-transform duration-1000 ease-out shadow-[0_0_8px_rgba(255,255,255,0.3)]"
          style={{ transform: `rotate(${rotation}deg)`, zIndex: 10 }}
        >
          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white rounded-full border border-[#151515] shadow-lg"></div>
        </div>
      </div>

      {/* Summary Data */}
      <div className="grid grid-cols-2 gap-2 w-full mt-2 pt-4 border-t border-gray-800">
        <div className="text-center border-r border-gray-800">
          <p className="text-gray-500 text-[9px] uppercase font-bold mb-0.5">Classes</p>
          <p className="text-base font-bold text-white">{totalClasses}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-500 text-[9px] uppercase font-bold mb-0.5">Load</p>
          <p className={`text-base font-bold ${getStatusColor()}`}>
            {estimatedCost.toFixed(1)} <span className="text-[9px]">kWh</span>
          </p>
        </div>
      </div>

      {percentage > 85 && (
        <div className="mt-3 w-full p-1.5 bg-red-500/10 border border-red-500/20 rounded-lg flex justify-center items-center gap-2 text-red-400 text-[8px] animate-pulse">
          <AlertTriangle size={10} />
          <span className="font-bold uppercase">Peak Demand</span>
        </div>
      )}
    </div>
  );
}