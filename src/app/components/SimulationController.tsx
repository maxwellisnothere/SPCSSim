import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Activity, CalendarDays } from 'lucide-react';
import { TimeSlot } from '../App';

interface SimulationData {
  day: string;
  timeFormatted: string;
  powerLoad: number;
  events: string[];
}

interface SimulationControllerProps {
  onSimulationUpdate: (data: SimulationData) => void;
  masterSchedule: TimeSlot[];
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const SimulationController: React.FC<SimulationControllerProps> = ({ onSimulationUpdate, masterSchedule }) => {
  const [simMinutes, setSimMinutes] = useState<number>(480); // เริ่มที่ 08:00
  const [currentDay, setCurrentDay] = useState<string>('Monday');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);

  // 1. ระบบนาฬิกาเดินหน้า
  useEffect(() => {
    if (!isPlaying) return;
    const tick = setInterval(() => {
      setSimMinutes(prev => {
        const nextTime = prev + speed;
        // ถ้าเวลาเกิน 18:00 (1080 นาที) ให้ตัดขึ้นวันใหม่
        if (nextTime >= 1080) {
           setCurrentDay(prevDay => daysOfWeek[(daysOfWeek.indexOf(prevDay) + 1) % daysOfWeek.length]);
           return 480; 
        }
        return nextTime;
      });
    }, 1000); 
    return () => clearInterval(tick);
  }, [isPlaying, speed]);

  // 2. ตรวจสอบตารางเรียนและสร้าง Log Events
  useEffect(() => {
    const h = Math.floor(simMinutes / 60);
    const m = simMinutes % 60;
    const timeFormatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    let events: string[] = [];

    // ดึงเฉพาะ "ชั่วโมง" มาเช็กกับตารางเรียน
    const simHour = timeFormatted.split(':')[0];
    
    const activeClasses = masterSchedule.filter(s => {
      const classHour = s.time.split(':')[0];
      return classHour === simHour && s.day === currentDay;
    });

    activeClasses.forEach(activeClass => {
        if (activeClass.mode === 'On-site') {
            events.push(`🔴 ${activeClass.room}: ${activeClass.subject.code} (On-site)`);
        } else {
            events.push(`🔵 ${activeClass.room}: ${activeClass.subject.code} (Online)`);
        }
    });

    if (activeClasses.length === 0) {
      if (simMinutes < 480 || simMinutes > 1080) {
        events.push('🌙 Night Mode: All classrooms empty');
      } else {
        events.push('🟢 Building Status: Idle / Standby Mode');
      }
    } else {
       events.push(`📊 Total Active Classes: ${activeClasses.length}`);
    }

    onSimulationUpdate({ 
      day: currentDay, 
      timeFormatted, 
      powerLoad: 0, 
      events 
    });

  // 💡 ลบ onSimulationUpdate ออกจาก array ด้านล่างและปิด warning ไว้เพื่อไม่ให้เกิด Infinite Loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simMinutes, currentDay, masterSchedule]);

  return (
    <div className="bg-[#151515] border border-gray-800 p-5 rounded-xl w-full shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-tighter"><Activity size={16} className="text-lime-400" /> Live Simulation</h3>
        <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${isPlaying ? 'bg-lime-500/10 text-lime-400 border-lime-500/20 animate-pulse' : 'bg-gray-800/50 text-gray-500 border-gray-700'}`}>{isPlaying ? 'LIVE' : 'STANDBY'}</span>
      </div>

      <div className="flex flex-col gap-3">
        {/* เลือกวัน */}
        <div className="flex items-center gap-2 bg-[#0a0a0a] p-1.5 rounded-lg border border-gray-800">
          <CalendarDays size={14} className="text-gray-500 ml-1" />
          <select value={currentDay} onChange={(e) => setCurrentDay(e.target.value)} disabled={isPlaying} className="bg-transparent text-xs font-bold text-white w-full focus:outline-none disabled:opacity-50">
            {daysOfWeek.map(day => <option key={day} value={day} className="bg-black">{day}</option>)}
          </select>
        </div>

        {/* ปุ่ม Play/Pause/Reset */}
        <div className="flex gap-2 items-stretch">
          <button onClick={() => setIsPlaying(!isPlaying)} className={`flex-[2] py-2.5 rounded-lg font-bold flex justify-center items-center gap-2 transition-all active:scale-95 text-xs ${isPlaying ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-lime-500 text-black hover:bg-lime-400 shadow-lg shadow-lime-500/20'}`}>
            {isPlaying ? <><Pause size={14} fill="currentColor" /> Pause</> : <><Play size={14} fill="currentColor" /> Start</>}
          </button>
          <button onClick={() => { setSimMinutes(480); setIsPlaying(false); }} className="px-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg flex items-center justify-center"><RotateCcw size={14} /></button>
        </div>

        {/* ปุ่มปรับความเร็ว (1x, 15x, 60x) */}
        <div className="flex bg-[#0a0a0a] rounded-lg border border-gray-800 p-1 justify-between">
          {[1, 15, 60].map(multiplier => (
            <button key={multiplier} onClick={() => setSpeed(multiplier)} className={`flex-1 py-1.5 text-[10px] font-black rounded-md ${speed === multiplier ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>{multiplier}x</button>
          ))}
        </div>
      </div>
    </div>
  );
};