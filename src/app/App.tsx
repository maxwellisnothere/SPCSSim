import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Layers, Settings, Zap, BarChart2, Sun, Wrench, Bell } from 'lucide-react'; 
import { Toaster, toast } from 'sonner'; 
import { DarkEnergyCard } from './components/DarkEnergyCard'; 
import { FloorPlanDark } from './components/FloorPlanDark'; 
import { EnergyDataPanel } from './components/EnergyDataPanel'; 
import { RecentActivities } from './components/RecentActivities'; 
import { ScheduleModal } from './components/ScheduleModal'; 
import MeetingRoomCluster from "./components/MeetingRoomCluster"; 
import { SimulationController } from './components/SimulationController'; 
import { RoomConfigModal, RoomDeviceState } from './components/RoomConfigModal'; 
import { AnalyticsDashboard } from './components/AnalyticsDashboard'; 
import { NotificationHub } from './components/NotificationHub'; 
import { supabaseNew } from '../supabaseClient'; 

const TEACHER_MAPPING: Record<string, { name: string; teacher: string }> = {
  'CPE201': { name: 'Programming Fundamentals', teacher: 'อ.สมชาย' },
  'CPE495': { name: 'Senior Project', teacher: 'อ.สมชาย' },
  'MTH101': { name: 'Calculus I', teacher: 'อ.สุดา' },
  'CPE301': { name: 'Data Structures', teacher: 'อ.วิชัย' },
  'CPE401': { name: 'AI Fundamentals', teacher: 'อ.นภา' },
};

export interface TimeSlot {
  id: string; day: string; time: string; room: string; mode: 'On-site' | 'Online';
  teacher_name?: string; 
  subject: { code: string; name: string; students: number; };
}

export const AVAILABLE_CLASSROOMS = [
  'Classroom 101', 'Classroom 102', 'Classroom 103', 'Classroom 104', 'Classroom 105', 'Classroom 106',
  'Computer Lab A', 'Computer Lab B', 'Computer Lab C', 'Computer Lab D'
];

const ALL_SIMULATION_ROOMS = [
  'Cafe', 'Lounge', 'Meeting Room 1', 'Meeting Room 2', 'Meeting Room 3', 'Meeting Room 4', 'Meeting Room 5', 'Meeting Room 6',
  ...AVAILABLE_CLASSROOMS
];

export default function App() {
  const [activeMenu, setActiveMenu] = useState('overview'); 
  const [selectedFloor, setSelectedFloor] = useState<'floor1' | 'floor2' | 'floor3'>('floor1');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [masterSchedule, setMasterSchedule] = useState<TimeSlot[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<any[]>([]);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);

  // 💡 [SOLVED] ให้ App.tsx อ่านค่าวัน-เวลาจาก localStorage ตั้งแต่ตอนเริ่มโหลดหน้าเว็บครับ!
  const [simDay, setSimDay] = useState<string>(() => {
    return localStorage.getItem('pham_sim_day') || 'Monday';
  });
  const [simTime, setSimTime] = useState<string>(() => {
    const savedMinutes = localStorage.getItem('pham_sim_minutes');
    if (savedMinutes) {
      const min = parseInt(savedMinutes);
      const h = Math.floor(min / 60);
      const m = min % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return '08:00';
  });
  
  const [currentWeather, setCurrentWeather] = useState<'sunny' | 'heatwave' | 'rainy'>(() => {
    return (localStorage.getItem('pham_sim_weather') as any) || 'sunny';
  });
  const [isRandomOccupancy, setIsRandomOccupancy] = useState<boolean>(() => {
    return localStorage.getItem('pham_sim_random') === 'true';
  });

  const [anomalies, setAnomalies] = useState<string[]>([]); 
  const [simEvents, setSimEvents] = useState<string[]>([]);
  
  const [roomTemps, setRoomTemps] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('pham_room_temps');
    return saved ? JSON.parse(saved) : {};
  });

  const [currentPower, setCurrentPower] = useState<number>(0); 
  const [baselinePower, setBaselinePower] = useState<number>(0); 
  const [savingsPercent, setSavingsPercent] = useState<number>(0);
  const [liveRoomData, setLiveRoomData] = useState<any[]>([]);
  const [powerHistory, setPowerHistory] = useState<number[]>(new Array(7).fill(0));
  const [optHistory, setOptHistory] = useState<number[]>(new Array(7).fill(0));
  const [savingsHistory, setSavingsHistory] = useState<number[]>(new Array(7).fill(0));

  const lastLoggedTime = useRef<string>('');
  const loggedAnomalies = useRef<Set<string>>(new Set());

  const [globalBypass, setGlobalBypass] = useState(false);
  const [roomsConfig, setRoomsConfig] = useState<Record<string, RoomDeviceState>>({
    'Classroom 101': { 
      occupancy: 0, acOn: false, acTemp: 25, projectorOn: false, lightsOn: false, 
      isAiOptimized: true, isLoggedIn: true, maintenanceBypass: false, authorizedUser: 'Ajarn Admin'
    }
  });

  const syncSimTimeToDatabase = async (day: string, time: string) => {
    if (!supabaseNew) return;
    try {
      const { error } = await supabaseNew
        .from('simulation_status')
        .update({ sim_day: day, sim_time: time, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) console.error('Error syncing simulation time:', error);
    } catch (e) {
      console.error('Exception syncing simulation time:', e);
    }
  };

  const getOutsideTemp = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    const baseTemps = [25, 24, 24, 24, 25, 26, 28, 30, 32, 34, 36, 37, 38, 39, 38, 36, 34, 32, 30, 28, 27, 26, 25, 25];
    let temp = baseTemps[hour] || 30;
    if (currentWeather === 'heatwave') temp += 5; else if (currentWeather === 'rainy') temp -= 5; 
    return temp;
  };

  const calculateNextRoomTemp = (roomName: string, currentTemp: number, outdoorTemp: number, acOn: boolean, acSetpoint: number, occupancy: number, currentAcLoadW: number, maxAcPowerW: number) => {
    if (currentTemp === undefined) return outdoorTemp - 2;
    const kGain = 0.015;
    const thermalGain = (outdoorTemp - currentTemp) * kGain;
    const coolingPowerRatio = currentAcLoadW / maxAcPowerW;
    const thermalCooling = acOn ? coolingPowerRatio * 0.12 : 0;
    const thermalOccupancy = occupancy * 0.002;
    const thermalEquipment = roomName.includes('Lab') ? occupancy * 0.003 : 0; 
    let nextTemp = currentTemp + thermalGain + thermalOccupancy + thermalEquipment - thermalCooling;
    return Math.max(acOn ? acSetpoint - 0.5 : 18, Math.min(nextTemp, outdoorTemp + 2));
  };

  const calculateLivePower = (currentDay: string, currentTime: string) => {
    let totalOptimizedW = 0; let totalBaselineW = 0;
    const currentHour = currentTime.split(':')[0];
    const outdoorTemp = getOutsideTemp(currentTime);
    const roomLogs: any[] = [];
    const newRoomTemps: Record<string, number> = { ...roomTemps };

    totalOptimizedW += 3000; totalBaselineW += 3000;

    ALL_SIMULATION_ROOMS.forEach(roomName => {
      const activeClass = masterSchedule.find(s => s.room === roomName && s.day === currentDay && s.time.split(':')[0] === currentHour);
      let isMeetingBooked = false;
      if (roomName.includes('Meeting')) {
        const mRoom = meetingRooms.find(r => r.name === roomName);
        isMeetingBooked = mRoom?.bookedSlots?.some((slot: any) => slot.day === currentDay && parseInt(currentHour) >= slot.start && parseInt(currentHour) < slot.end) || false;
      }

      const is247 = roomName === 'Cafe' || roomName === 'Lounge';
      const config = roomsConfig[roomName] || {} as Partial<RoomDeviceState>;
      let defOcc = 0;
      if (activeClass) defOcc = activeClass.subject.students;
      else if (isMeetingBooked) defOcc = 5; 
      else if (is247) defOcc = (parseInt(currentHour) >= 7 && parseInt(currentHour) <= 20) ? (roomName === 'Cafe' ? 30 : 15) : (roomName === 'Cafe' ? 5 : 2);

      const occupancy = isRandomOccupancy ? Math.floor(Math.random() * (roomName.includes('Cafe') ? 61 : 46)) : (config.occupancy ?? defOcc);
      const isAiOptimized = config.isAiOptimized ?? true;
      let acIntent = config.acOn ?? (!!activeClass || isMeetingBooked || is247);
      let lightsIntent = config.lightsOn ?? (!!activeClass || isMeetingBooked || is247);
      let projIntent = config.projectorOn ?? (activeClass?.mode === 'On-site' || isMeetingBooked);
      let acTemp = config.acTemp ?? 24;

      if (isAiOptimized && occupancy > 0) {
        acIntent = true; lightsIntent = true; if (!is247) projIntent = true; 
        acTemp = occupancy >= 30 ? 23 : (occupancy >= 15 ? 24 : 25);
      }

      const isPowerAllowed = config.maintenanceBypass || (config.isLoggedIn ?? (!!activeClass || isMeetingBooked || is247)); 
      let maxAcPower = (roomName.includes('Cafe') || roomName.includes('Lab')) ? 5400 : (roomName.includes('Meeting') || roomName.includes('Lounge') ? 1800 : 3600); 

      const currentRoomTemp = roomTemps[roomName] || outdoorTemp - 2;
      const tempDelta = Math.max(0, currentRoomTemp - acTemp);
      let currentAcLoad = anomalies.includes(roomName) ? 6500 : (tempDelta >= 4 ? maxAcPower : (tempDelta > 0 ? (maxAcPower * 0.4) + (tempDelta * 300) : maxAcPower * 0.25));

      let finalAc = false; let finalLights = false; let finalProj = false;
      if (isPowerAllowed) {
        const aiOff = isAiOptimized && occupancy === 0;
        if (config.maintenanceBypass) { finalAc = acIntent; finalLights = lightsIntent; finalProj = projIntent; }
        else { finalAc = acIntent && !aiOff; finalLights = lightsIntent && !aiOff; finalProj = projIntent && !aiOff; }
      }

      const nextTemp = calculateNextRoomTemp(roomName, currentRoomTemp, outdoorTemp, finalAc, acTemp, occupancy, currentAcLoad, maxAcPower);
      newRoomTemps[roomName] = nextTemp;

      let optW = finalAc ? currentAcLoad : 0;
      if (finalLights) optW += (isAiOptimized && finalProj && !is247) ? (roomName.includes('Cafe') ? 300 : 108) * 0.5 : (roomName.includes('Cafe') ? 300 : 108);
      if (finalProj && !is247) optW += 300;
      if (occupancy > 0) optW += occupancy * 51;

      let baseW = (activeClass || isMeetingBooked || is247 || occupancy > 0 || acIntent) ? (maxAcPower + (is247 ? 300 : 108) + (is247 ? 0 : 300) + (occupancy * 51)) : 0;

      optW += (Math.random() * 60 - 30); baseW += (Math.random() * 60 - 30);
      totalOptimizedW += Math.max(0, optW); totalBaselineW += Math.max(0, baseW);

      roomLogs.push({
        room_id: roomName, day_of_week: currentDay, sim_time: currentTime, 
        occupancy_count: occupancy, outside_temp: outdoorTemp, indoor_temp: parseFloat(nextTemp.toFixed(2)),
        ac_status: finalAc, ac_setpoint: acTemp, lights_status: finalLights, projector_status: finalProj, ai_mode_active: isAiOptimized,
        power_consumption_w: parseFloat(optW.toFixed(2)), auth_username: config.authorizedUser || 'System' 
      });
    });

    return { optimizedKw: totalOptimizedW / 1000, baselineKw: totalBaselineW / 1000, roomLogs, newRoomTemps };
  };

  const handleSimulationData = async (data: any) => {
    setSimDay(data.day); 
    setSimTime(data.timeFormatted); 
    setSimEvents(data.events);
    
    syncSimTimeToDatabase(data.day, data.timeFormatted);

    if (data.weather) setCurrentWeather(data.weather);
    if (data.isRandomOccupancy !== undefined) setIsRandomOccupancy(data.isRandomOccupancy);

    if (data.anomalies) {
      setAnomalies(data.anomalies);
      if (supabaseNew) {
        for (const room of data.anomalies) {
          if (!loggedAnomalies.current.has(room)) {
            await supabaseNew.from('maintenance_logs').insert([{ room_id: room, status: 'Pending', severity: 'High' }]);
            loggedAnomalies.current.add(room);
            toast.error(`HVAC Maintenance Alert: ${room}`);
          }
        }
      }
      loggedAnomalies.current.forEach(room => { if (!data.anomalies.includes(room)) loggedAnomalies.current.delete(room); });
    }

    const { optimizedKw, baselineKw, roomLogs, newRoomTemps } = calculateLivePower(data.day, data.timeFormatted);
    setRoomTemps(newRoomTemps);

    const randomF = optimizedKw > 0 ? (Math.random() * 0.4) - 0.2 : 0;
    const finalOpt = Math.max(0, optimizedKw + randomF);
    const finalBase = Math.max(0, baselinePower + randomF + 0.3); 
    const savingsKw = Math.max(0, finalBase - finalOpt);
    const savingsPct = finalBase > 0 ? (savingsKw / finalBase) * 100 : 0;

    setCurrentPower(finalOpt); setBaselinePower(finalBase); setSavingsPercent(savingsPct);
    setPowerHistory(prev => [...prev.slice(1), finalBase]); setOptHistory(prev => [...prev.slice(1), finalOpt]); setSavingsHistory(prev => [...prev.slice(1), savingsPct]);

    if (data.timeFormatted !== lastLoggedTime.current) {
      lastLoggedTime.current = data.timeFormatted;
      const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      if (supabaseNew) {
        try {
          const currentClass = masterSchedule.find(s => s.day === data.day && s.time.split(':')[0] === data.timeFormatted.split(':')[0]);
          await supabaseNew.from('energy_logs').insert([{
            timestamp: ts, energy_baseline: Math.round(finalBase * 1000), energy_ai: Math.round(finalOpt * 1000),
            energy_saved_w: Math.round(savingsKw * 1000), energy_saved_pct: parseFloat(savingsPct.toFixed(2)),
            cost_baseline: parseFloat((finalBase * 4.5).toFixed(2)), cost_ai: parseFloat((finalOpt * 4.5).toFixed(2)),
            teacher_name: currentClass?.teacher_name || null 
          }]);
          await supabaseNew.from('room_energy_logs').insert(roomLogs.map(l => ({ ...l, timestamp: ts })));
        } catch (err) { console.error(err); }
      }
    }
  };

  const handleUpdateSchedule = async (newSchedule: TimeSlot[]) => {
    const enhancedSchedule = newSchedule.map(slot => ({
      ...slot,
      teacher_name: TEACHER_MAPPING[slot.subject.code]?.teacher || 'ไม่ระบุชื่ออาจารย์'
    }));

    setMasterSchedule(enhancedSchedule);
    if (!supabaseNew) return;
    try {
      const toastId = toast.loading("Syncing Schedule with Teacher Data...");
      await supabaseNew.from('master_schedule').delete().neq('id', 'dummy'); 
      const { error } = await supabaseNew.from('master_schedule').insert(enhancedSchedule);
      if (error) throw error;
      toast.success("Schedule Updated", { id: toastId });
    } catch (e: any) { toast.error(`Sync failed: ${e.message}`); }
  };

  const handleSaveRoomConfig = (roomName: string, newState: RoomDeviceState) => {
    setRoomsConfig(prev => ({ ...prev, [roomName]: newState })); setEditingRoom(null);
  };

  useEffect(() => {
    const fetchS = async () => {
      if (!supabaseNew) return;
      const { data, error } = await supabaseNew.from('master_schedule').select('*');
      if (!error && data) setMasterSchedule(data as TimeSlot[]);
    };
    fetchS();
  }, [showScheduleModal]); 

  useEffect(() => {
    localStorage.setItem('pham_room_temps', JSON.stringify(roomTemps));
  }, [roomTemps]);

  useEffect(() => {
    const { optimizedKw, baselineKw, roomLogs } = calculateLivePower(simDay, simTime);
    setCurrentPower(optimizedKw); setBaselinePower(baselineKw); setLiveRoomData(roomLogs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomsConfig, masterSchedule, simTime, simDay, anomalies, currentWeather, isRandomOccupancy]); 

  const summaryData = [
    { title: 'Total Savings', value: savingsPercent.toFixed(1), unit: '%', sparklineData: savingsHistory },
    { title: 'Baseline Power', value: baselinePower.toFixed(1), unit: 'kW', sparklineData: powerHistory },
    { title: 'Optimized Power', value: currentPower.toFixed(1), unit: 'kW', sparklineData: optHistory }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex font-sans text-gray-100 selection:bg-lime-500/30">
      <Toaster position="bottom-right" richColors /> 
      <div className="w-20 bg-[#151515] border-r border-gray-800 flex flex-col items-center py-6 z-50">
        <div className="mb-8 w-10 h-10 rounded-lg bg-lime-500 flex items-center justify-center shadow-lg shadow-lime-500/30"><Zap className="w-6 h-6 text-black" /></div>
        <nav className="flex flex-col gap-3 w-full px-2">
          {[ { id: 'overview', icon: LayoutDashboard, label: 'Overview' }, { id: 'analytics', icon: BarChart2, label: 'Analytics' }, { id: 'notifications', icon: Bell, label: 'Notifications' }, { id: 'floors', icon: Layers, label: 'Floors' }, { id: 'settings', icon: Settings, label: 'Settings' } ].map(item => (
            <button key={item.id} onClick={() => setActiveMenu(item.id)} className={`w-full h-12 rounded-xl flex items-center justify-center transition-all ${activeMenu === item.id ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30' : 'text-gray-500 hover:bg-gray-800/50'}`}><item.icon size={22} /></button>
          ))}
        </nav>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-end mb-8">
            <div><h1 className="text-3xl font-bold text-white tracking-tight mb-1">{activeMenu === 'analytics' ? 'System Analytics' : activeMenu === 'notifications' ? 'Maintenance Hub' : 'Smart Building Energy'}</h1><p className="text-gray-500 text-sm font-medium">PHAM Management Console</p></div>
            {activeMenu === 'overview' && (
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 bg-[#151515] p-3 rounded-2xl border border-gray-800"><Sun size={24} className={currentWeather === 'sunny' ? "text-yellow-400" : currentWeather === 'heatwave' ? "text-orange-500" : "text-blue-400"} /><div><p className="text-[10px] text-gray-500 font-bold uppercase">Outdoor</p><p className="text-xl font-mono font-bold text-white">{getOutsideTemp(simTime)}°C</p></div></div>
                <div className="text-right"><div className="text-lime-400 text-4xl font-mono font-bold tracking-tight"><span className="text-xl text-lime-400/60 uppercase mr-3">{simDay}</span>{simTime}</div><div className="text-gray-500 text-[10px] font-black uppercase tracking-widest">LIVE POWER: <span className="text-red-500">{currentPower.toFixed(1)} kW</span></div></div>
              </div>
            )}
          </div>
          {activeMenu === 'overview' ? (
            <div className="animate-in fade-in duration-500">
              <div className="grid grid-cols-3 gap-4 mb-8">{summaryData.map((data, index) => <DarkEnergyCard key={index} {...data} />)}</div>
              <div className="mb-6 flex justify-between items-center w-full gap-4">
                <div className="flex bg-[#151515] p-1.5 rounded-xl border border-gray-800 w-fit gap-1">{['floor1', 'floor2', 'floor3'].map((f) => (<button key={f} onClick={() => setSelectedFloor(f as any)} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${selectedFloor === f ? 'bg-lime-500 text-black' : 'text-gray-500 hover:text-gray-300'}`}>{f.replace('floor', 'Floor ')}</button>))}</div>
                <button onClick={() => setGlobalBypass(!globalBypass)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black border transition-all ${globalBypass ? 'bg-orange-500/10 text-orange-400 border-orange-500/50' : 'bg-[#151515] text-gray-500 border-gray-800'}`}><Wrench size={16} />{globalBypass ? 'Global Bypass: ON' : 'Global Bypass: OFF'}</button>
              </div>
              <FloorPlanDark selectedFloor={selectedFloor} simTime={simTime} simDay={simDay} masterSchedule={masterSchedule} meetingRooms={meetingRooms} onRoomClick={(roomName) => setEditingRoom(roomName)} liveRoomData={liveRoomData} />
              {(selectedFloor === 'floor2' || selectedFloor === 'floor3') && (
                <div className="mt-8">
                  <button onClick={() => setShowScheduleModal(true)} className="w-full bg-[#1a1a1a] hover:bg-black text-lime-400 border border-lime-500/20 font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 group">
                    <Layers size={20} className="group-hover:scale-110 transition-transform" /> Manage Building Class Schedule
                  </button>
                </div>
              )}
              <div className="mt-10 pt-8 border-t border-gray-800/50"><MeetingRoomCluster currentSimDay={simDay} onRoomsUpdate={setMeetingRooms} /></div>
            </div>
          ) : activeMenu === 'analytics' ? ( <AnalyticsDashboard /> ) 
            : activeMenu === 'notifications' ? ( <NotificationHub /> )
            : ( <div className="flex flex-col items-center justify-center h-[60vh] text-gray-600 font-mono text-sm uppercase">Loading Module...</div> )}
        </div>
        {activeMenu === 'overview' && (
          <div className="w-85 bg-[#151515] border-l border-gray-800 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            <SimulationController onSimulationUpdate={handleSimulationData} masterSchedule={masterSchedule} />
            {simEvents.length > 0 && (
              <div className="bg-black/40 p-5 rounded-2xl border border-gray-800/50">
                <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span> Live System Events</h3>
                <div className="text-xs text-gray-400 space-y-3 font-medium">{simEvents.map((ev, i) => (<div key={i} className="pl-3 border-l-2 border-lime-500/30 py-1 leading-relaxed">{ev}</div>))}</div>
              </div>
            )}
            <EnergyDataPanel selectedFloor={selectedFloor} liveRoomData={liveRoomData} />
            <RecentActivities />
          </div>
        )}
      </div>
      {showScheduleModal && ( <ScheduleModal schedule={masterSchedule} availableRooms={AVAILABLE_CLASSROOMS} onUpdateSchedule={handleUpdateSchedule} onClose={() => setShowScheduleModal(false)} /> )}
      {editingRoom && ( <RoomConfigModal roomName={editingRoom} simTime={simTime} initialState={roomsConfig[editingRoom] || { occupancy: 0, acOn: false, acTemp: 25, projectorOn: false, lightsOn: false, isAiOptimized: true, isLoggedIn: false, maintenanceBypass: false, authorizedUser: '' }} onSave={handleSaveRoomConfig} onClose={() => setEditingRoom(null)} /> )}
    </div>
  );
}