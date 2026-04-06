import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Activity, CalendarDays, Bug, Trash2, Sun, Thermometer, CloudRain, Clock } from 'lucide-react';
import { TimeSlot } from '../App';
import { supabaseNew } from '../../supabaseClient';
import { toast } from 'sonner';

interface SimulationData {
  day: string;
  timeFormatted: string;
  powerLoad: number;
  events: string[];
  anomalies?: string[];
  weather: 'sunny' | 'heatwave' | 'rainy'; // 💡 เพิ่มสภาพอากาศส่งออกไป
}

interface SimulationControllerProps {
  onSimulationUpdate: (data: SimulationData) => void;
  masterSchedule: TimeSlot[];
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const SimulationController: React.FC<SimulationControllerProps> = ({ onSimulationUpdate, masterSchedule }) => {
  const [simMinutes, setSimMinutes] = useState<number>(480); // 08:00
  const [currentDay, setCurrentDay] = useState<string>('Monday');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [weather, setWeather] = useState<'sunny' | 'heatwave' | 'rainy'>('sunny'); // 💡 State ใหม่

  const [isAnomalyMode, setIsAnomalyMode] = useState(false);
  const [brokenRooms, setBrokenRooms] = useState<string[]>([]);

  // 1. ระบบนาฬิกาเดินหน้า
  useEffect(() => {
    if (!isPlaying) return;
    const tick = setInterval(() => {
      setSimMinutes(prev => {
        const nextTime = prev + speed;
        if (nextTime >= 1080) { // เกิน 18:00
           setCurrentDay(prevDay => daysOfWeek[(daysOfWeek.indexOf(prevDay) + 1) % daysOfWeek.length]);
           if (Math.random() > 0.7) setBrokenRooms([]); // สุ่มล้างห้องเสียเมื่อขึ้นวันใหม่
           return 480; 
        }
        return nextTime;
      });
    }, 1000); 
    return () => clearInterval(tick);
  }, [isPlaying, speed]);

  // 2. ประมวลผลเหตุการณ์ (Logic & Events)
  useEffect(() => {
    const h = Math.floor(simMinutes / 60);
    const m = simMinutes % 60;
    const timeFormatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    let events: string[] = [];
    const simHour = timeFormatted.split(':')[0];
    
    // เช็คตารางเรียน
    const activeClasses = masterSchedule.filter(s => {
      const classHour = s.time.split(':')[0];
      return classHour === simHour && s.day === currentDay;
    });

    activeClasses.forEach(activeClass => {
        events.push(`${activeClass.mode === 'On-site' ? '🔴' : '🔵'} ${activeClass.room}: ${activeClass.subject.code}`);
    });

    // 💡 Logic แอร์พัง (Anomaly)
    if (isAnomalyMode && activeClasses.length > 0 && Math.random() < 0.05 && brokenRooms.length < 2) {
        const randomClass = activeClasses[Math.floor(Math.random() * activeClasses.length)];
        if (!brokenRooms.includes(randomClass.room)) {
          setBrokenRooms(prev => [...prev, randomClass.room]);
          toast.error(`HVAC Anomaly Detected at ${randomClass.room}`, {
            icon: <Bug size={16} />,
            style: { background: '#450a0a', color: '#fecaca', border: '1px solid #991b1b' }
          });
        }
    }

    if (brokenRooms.length > 0) {
      brokenRooms.forEach(room => events.push(`⚠️ ALERT: ${room} HVAC System Failure`));
    }

    // แจ้งสถานะอากาศ
    if (weather === 'heatwave') events.push('🔥 Climate Alert: Extreme Heat (+5°C)');
    if (weather === 'rainy') events.push('🌧️ Climate Info: Natural Cooling (-5°C)');

    onSimulationUpdate({ 
      day: currentDay, 
      timeFormatted, 
      powerLoad: 0, 
      events,
      anomalies: brokenRooms,
      weather 
    });

  }, [simMinutes, currentDay, masterSchedule, isAnomalyMode, brokenRooms, weather]);

  const handleClearDatabase = async () => {
    if (window.confirm("คุณต้องการลบประวัติการใช้พลังงานทั้งหมดเพื่อเริ่มพรีเซนต์ใหม่ใช่หรือไม่?")) {
      if (!supabaseNew) return;
      toast.loading("Clearing data...");
      await supabaseNew.from('energy_logs').delete().neq('timestamp', 'dummy');
      await supabaseNew.from('room_energy_logs').delete().neq('room_id', 'dummy');
      toast.dismiss();
      toast.success("Database Cleaned!");
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="bg-[#151515] border border-gray-800 p-5 rounded-2xl w-full shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-lime-500 animate-ping' : 'bg-gray-600'}`}></div>
          <h3 className="text-white font-bold text-xs uppercase tracking-widest">Environment Engine</h3>
        </div>
        <span className="text-[9px] font-black text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded border border-gray-700">V.2.0-DYNAMIC</span>
      </div>

      <div className="space-y-4">
        {/* 1. เวลาและวัน */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/40 p-2 rounded-xl border border-gray-800 flex items-center gap-2">
            <CalendarDays size={14} className="text-lime-500" />
            <select value={currentDay} onChange={(e) => setCurrentDay(e.target.value)} disabled={isPlaying} className="bg-transparent text-[11px] font-bold text-white w-full outline-none">
              {daysOfWeek.map(day => <option key={day} value={day} className="bg-[#151515]">{day}</option>)}
            </select>
          </div>
          <div className="bg-black/40 p-2 rounded-xl border border-gray-800 flex items-center gap-2">
            <Clock size={14} className="text-lime-500" />
            <span className="text-[11px] font-mono font-bold text-white">
               {Math.floor(simMinutes/60).toString().padStart(2,'0')}:{(simMinutes%60).toString().padStart(2,'0')}
            </span>
          </div>
        </div>

        {/* 2. 💡 Time Scrubber (NEW!) */}
        <div className="px-1">
          <input 
            type="range" min={480} max={1079} value={simMinutes} 
            onChange={(e) => setSimMinutes(parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-lime-500"
          />
          <div className="flex justify-between text-[8px] text-gray-600 font-bold mt-1 uppercase">
            <span>08:00</span>
            <span>Time Scrubber</span>
            <span>18:00</span>
          </div>
        </div>

        {/* 3. 💡 Weather Control (NEW!) */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-gray-800">
          <button onClick={() => setWeather('sunny')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] font-black rounded-lg transition-all ${weather === 'sunny' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-gray-300'}`}>
            <Sun size={12} /> SUNNY
          </button>
          <button onClick={() => setWeather('heatwave')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] font-black rounded-lg transition-all ${weather === 'heatwave' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-gray-500 hover:text-gray-300'}`}>
            <Thermometer size={12} /> HEAT
          </button>
          <button onClick={() => setWeather('rainy')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] font-black rounded-lg transition-all ${weather === 'rainy' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-gray-300'}`}>
            <CloudRain size={12} /> RAINY
          </button>
        </div>

        {/* 4. Playback Controls */}
        <div className="flex gap-2">
          <button onClick={() => setIsPlaying(!isPlaying)} className={`flex-1 py-3 rounded-xl font-black flex justify-center items-center gap-2 transition-all active:scale-95 text-[10px] uppercase tracking-widest ${isPlaying ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-lime-500 text-black shadow-xl shadow-lime-500/20'}`}>
            {isPlaying ? <><Pause size={14} fill="currentColor" /> Stop Sim</> : <><Play size={14} fill="currentColor" /> Run Sim</>}
          </button>
          <button onClick={() => { setSimMinutes(480); setIsPlaying(false); setBrokenRooms([]); }} className="px-4 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl border border-gray-700 flex items-center justify-center transition-colors"><RotateCcw size={14} /></button>
        </div>

        {/* 5. Speed & Tools */}
        <div className="flex items-center gap-2">
           <div className="flex flex-1 bg-black/40 rounded-xl border border-gray-800 p-1">
              {[1, 15, 60].map(m => (
                <button key={m} onClick={() => setSpeed(m)} className={`flex-1 py-1.5 text-[9px] font-black rounded-lg ${speed === m ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>{m}x</button>
              ))}
           </div>
           <button onClick={() => setIsAnomalyMode(!isAnomalyMode)} className={`p-2.5 rounded-xl border transition-all ${isAnomalyMode ? 'bg-red-500/20 border-red-500/50 text-red-500 animate-pulse' : 'bg-black/40 border-gray-800 text-gray-500'}`} title="Toggle Anomaly Mode">
              <Bug size={16} />
           </button>
           <button onClick={handleClearDatabase} className="p-2.5 rounded-xl border border-gray-800 bg-black/40 text-gray-500 hover:text-red-400 hover:border-red-500/30 transition-all" title="Reset Database">
              <Trash2 size={16} />
           </button>
        </div>

      </div>
    </div>
  );
};