import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Activity, CalendarDays, Bug, Trash2, Sun, Thermometer, CloudRain, Clock, Users, RefreshCw } from 'lucide-react';
import { TimeSlot } from '../App';
import { supabaseNew } from '../../supabaseClient';
import { toast } from 'sonner';

interface SimulationData {
  day: string;
  timeFormatted: string;
  powerLoad: number;
  events: string[];
  anomalies?: string[];
  weather: 'sunny' | 'heatwave' | 'rainy';
  isRandomOccupancy: boolean;
}

interface SimulationControllerProps {
  onSimulationUpdate: (data: SimulationData) => void;
  masterSchedule: TimeSlot[];
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const SimulationController: React.FC<SimulationControllerProps> = ({ onSimulationUpdate, masterSchedule }) => {
  // 1. Load Initial State from LocalStorage
  const [simMinutes, setSimMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('pham_sim_minutes');
    return saved ? parseInt(saved) : 480;
  });
  
  const [currentDay, setCurrentDay] = useState<string>(() => {
    return localStorage.getItem('pham_sim_day') || 'Monday';
  });

  const [weather, setWeather] = useState<'sunny' | 'heatwave' | 'rainy'>(() => {
    return (localStorage.getItem('pham_sim_weather') as any) || 'sunny';
  });

  const [isRandomOccupancy, setIsRandomOccupancy] = useState<boolean>(() => {
    return localStorage.getItem('pham_sim_random') === 'true';
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [isAnomalyMode, setIsAnomalyMode] = useState(false); // 💡 กลับมาแล้ว!
  const [brokenRooms, setBrokenRooms] = useState<string[]>([]);

  // Sync with DB on Load
  const syncWithDatabase = async () => {
    if (!supabaseNew) return;
    try {
      const { data, error } = await supabaseNew
        .from('room_energy_logs')
        .select('timestamp, day_of_week')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && !error) {
        const lastLog = data[0];
        const lastDate = new Date(lastLog.timestamp);
        const totalMinutes = (lastDate.getHours() * 60) + lastDate.getMinutes();
        setSimMinutes(totalMinutes + 1);
        setCurrentDay(lastLog.day_of_week || 'Monday');
      }
    } catch (err) { console.error("Sync Error:", err); }
  };

  useEffect(() => {
    syncWithDatabase();
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('pham_sim_minutes', simMinutes.toString());
    localStorage.setItem('pham_sim_day', currentDay);
    localStorage.setItem('pham_sim_weather', weather);
    localStorage.setItem('pham_sim_random', isRandomOccupancy.toString());
  }, [simMinutes, currentDay, weather, isRandomOccupancy]);

  // Ticker
  useEffect(() => {
    if (!isPlaying) return;
    const tick = setInterval(() => {
      setSimMinutes(prev => {
        const nextTime = prev + speed;
        if (nextTime >= 1080) {
           setCurrentDay(prevDay => daysOfWeek[(daysOfWeek.indexOf(prevDay) + 1) % daysOfWeek.length]);
           return 480; 
        }
        return nextTime;
      });
    }, 1000); 
    return () => clearInterval(tick);
  }, [isPlaying, speed]);

  // Logic & Events
  useEffect(() => {
    const h = Math.floor(simMinutes / 60);
    const m = simMinutes % 60;
    const timeFormatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    let events: string[] = [];

    // แอร์พัง Logic (Anomaly)
    if (isAnomalyMode && Math.random() < 0.05 && brokenRooms.length < 2) {
      const simHour = timeFormatted.split(':')[0];
      const activeClasses = masterSchedule.filter(s => s.time.split(':')[0] === simHour && s.day === currentDay);
      if (activeClasses.length > 0) {
        const target = activeClasses[Math.floor(Math.random() * activeClasses.length)].room;
        if (!brokenRooms.includes(target)) {
          setBrokenRooms(prev => [...prev, target]);
          toast.error(`Anomaly: HVAC failure at ${target}`);
        }
      }
    }

    if (brokenRooms.length > 0) brokenRooms.forEach(r => events.push(`⚠️ ALERT: ${r} HVAC Failure`));
    if (isRandomOccupancy) events.push('🎲 Mode: Random Occupancy');

    onSimulationUpdate({ 
      day: currentDay, timeFormatted, powerLoad: 0, events,
      anomalies: brokenRooms, weather, isRandomOccupancy 
    });
  }, [simMinutes, currentDay, weather, isRandomOccupancy, brokenRooms, isAnomalyMode]);

  const handleHardReset = () => {
    if (window.confirm("Hard Reset Simulation?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleClearDatabase = async () => {
    if (window.confirm("ลบประวัติการใช้ไฟใน DB ทั้งหมด?")) {
      await supabaseNew?.from('energy_logs').delete().neq('timestamp', 'dummy');
      toast.success("Database Cleaned!");
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="bg-[#151515] border border-gray-800 p-5 rounded-2xl w-full shadow-2xl space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
          <Activity size={14} className="text-lime-500" /> Environment Engine
        </h3>
        <div className="flex gap-2">
           <button onClick={syncWithDatabase} className="p-1 hover:bg-white/10 rounded transition-colors text-gray-500 hover:text-lime-500" title="Sync with DB">
            <RefreshCw size={12} />
          </button>
          <span className="text-[9px] font-black text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded border border-gray-700">CONTINUOUS</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Time Display */}
        <div className="grid grid-cols-2 gap-2 text-white font-bold text-[11px]">
          <div className="bg-black/40 p-2 rounded-xl border border-gray-800 flex items-center gap-2">
            <CalendarDays size={14} className="text-lime-500" /> {currentDay}
          </div>
          <div className="bg-black/40 p-2 rounded-xl border border-gray-800 flex items-center gap-2 font-mono">
            <Clock size={14} className="text-lime-500" /> {Math.floor(simMinutes/60).toString().padStart(2,'0')}:{(simMinutes%60).toString().padStart(2,'0')}
          </div>
        </div>

        {/* Scrubber */}
        <input type="range" min={480} max={1079} value={simMinutes} onChange={(e) => setSimMinutes(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-lime-500" />

        {/* Weather */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-gray-800">
          {(['sunny', 'heatwave', 'rainy'] as const).map(w => (
            <button key={w} onClick={() => setWeather(w)} className={`flex-1 py-1.5 text-[9px] font-black rounded-lg transition-all ${weather === w ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500'}`}>{w.toUpperCase()}</button>
          ))}
        </div>

        {/* Playback & Random Mode */}
        <div className="flex gap-2">
          <button onClick={() => setIsPlaying(!isPlaying)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${isPlaying ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-lime-500 text-black shadow-xl'}`}>
            {isPlaying ? 'Stop' : 'Run'}
          </button>
          <button onClick={() => setIsRandomOccupancy(!isRandomOccupancy)} className={`px-4 rounded-xl border transition-all ${isRandomOccupancy ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-black/40 border-gray-800 text-gray-500'}`} title="Random People">
            <Users size={16} />
          </button>
          <button onClick={handleHardReset} className="px-4 bg-gray-800 text-gray-400 rounded-xl border border-gray-700 flex items-center justify-center transition-colors"><RotateCcw size={14} /></button>
        </div>

        {/* 💡 Speed, Bug (Anomaly), and Trash */}
        <div className="flex items-center gap-2">
           <div className="flex flex-1 bg-black/40 rounded-xl border border-gray-800 p-1">
              {[1, 15, 60].map(m => (
                <button key={m} onClick={() => setSpeed(m)} className={`flex-1 py-1.5 text-[9px] font-black rounded-lg ${speed === m ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>{m}x</button>
              ))}
           </div>
           
           {/* 💡 ปุ่มรูปแมลง กลับมาประจำการแล้ว! */}
           <button 
             onClick={() => setIsAnomalyMode(!isAnomalyMode)} 
             className={`p-2.5 rounded-xl border transition-all ${isAnomalyMode ? 'bg-red-500/20 border-red-500/50 text-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-black/40 border-gray-800 text-gray-500 hover:text-gray-400'}`}
             title="Anomaly Mode"
           >
              <Bug size={16} />
           </button>

           <button onClick={handleClearDatabase} className="p-2.5 rounded-xl border border-gray-800 bg-black/40 text-gray-500 hover:text-red-400 transition-all" title="Clear DB">
              <Trash2 size={16} />
           </button>
        </div>
      </div>
    </div>
  );
};