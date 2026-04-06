import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Layers, Settings, Zap, BarChart2, Sun, AlertTriangle, Wrench } from 'lucide-react'; 
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
import { supabase, supabaseNew } from '../supabaseClient'; 

export interface TimeSlot {
  id: string; 
  day: string;
  time: string;
  room: string;
  mode: 'On-site' | 'Online';
  subject: { code: string; name: string; students: number; };
}

export const AVAILABLE_CLASSROOMS = [
  'Classroom 101', 'Classroom 102', 'Classroom 103', 
  'Classroom 104', 'Classroom 105', 'Classroom 106',
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

  const [simDay, setSimDay] = useState<string>('Monday');
  const [simTime, setSimTime] = useState<string>('08:00');
  
  const [currentPower, setCurrentPower] = useState<number>(0); 
  const [baselinePower, setBaselinePower] = useState<number>(0); 
  const [savingsPercent, setSavingsPercent] = useState<number>(0);

  const [simEvents, setSimEvents] = useState<string[]>([]);
  const [anomalies, setAnomalies] = useState<string[]>([]); 
  const [currentWeather, setCurrentWeather] = useState<'sunny' | 'heatwave' | 'rainy'>('sunny'); // 💡 เพิ่ม State สภาพอากาศ

  const [powerHistory, setPowerHistory] = useState<number[]>(new Array(7).fill(0));
  const [optHistory, setOptHistory] = useState<number[]>(new Array(7).fill(0));
  const [savingsHistory, setSavingsHistory] = useState<number[]>(new Array(7).fill(0));

  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const lastLoggedTime = useRef<string>('');

  const [globalBypass, setGlobalBypass] = useState(false);
  const [liveRoomData, setLiveRoomData] = useState<any[]>([]);

  const [roomsConfig, setRoomsConfig] = useState<Record<string, RoomDeviceState>>({
    'Classroom 101': { 
      occupancy: 0, acOn: false, acTemp: 25, projectorOn: false, lightsOn: false, 
      isAiOptimized: true, isLoggedIn: true, maintenanceBypass: false,
      authorizedUser: 'Ajarn Admin'
    }
  });

  // 💡 อัปเกรดฟังก์ชันอุณหภูมิให้รับผลจากสภาพอากาศ
  const getOutsideTemp = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    const baseTemps = [25, 24, 24, 24, 25, 26, 28, 30, 32, 34, 36, 37, 38, 39, 38, 36, 34, 32, 30, 28, 27, 26, 25, 25];
    let temp = baseTemps[hour] || 30;

    if (currentWeather === 'heatwave') temp += 5; 
    else if (currentWeather === 'rainy') temp -= 5; 

    return temp;
  };

  const calculateLivePower = (currentDay: string, currentTime: string) => {
    let totalOptimizedW = 0;
    let totalBaselineW = 0;
    const currentHour = currentTime.split(':')[0];
    const outdoorTemp = getOutsideTemp(currentTime);
    const roomLogs: any[] = [];

    const buildingBaseLoad = 3000; 
    totalOptimizedW += buildingBaseLoad;
    totalBaselineW += buildingBaseLoad;

    ALL_SIMULATION_ROOMS.forEach(roomName => {
      const activeClass = masterSchedule.find(s => {
        const classHour = s.time.split(':')[0];
        return s.room === roomName && s.day === currentDay && classHour === currentHour;
      });

      let isMeetingRoomBooked = false;
      if (roomName.includes('Meeting')) {
        const mRoom = meetingRooms.find(r => r.name === roomName);
        if (mRoom) {
          const simHourNum = parseInt(currentHour, 10);
          isMeetingRoomBooked = mRoom.bookedSlots?.some((slot: any) =>
            slot.day === currentDay && simHourNum >= slot.start && simHourNum < slot.end
          ) || false;
        }
      }

      const is247 = roomName === 'Cafe' || roomName === 'Lounge';
      const config = roomsConfig[roomName] || {} as Partial<RoomDeviceState>;
      let optRoomW = 0;
      let baseRoomW = 0;

      let defaultOccupancy = 0;
      if (activeClass) defaultOccupancy = activeClass.subject.students;
      else if (isMeetingRoomBooked) defaultOccupancy = 5; 
      else if (is247 && parseInt(currentHour) >= 7 && parseInt(currentHour) <= 20) {
        defaultOccupancy = roomName === 'Cafe' ? 30 : 15; 
      } else if (is247) {
        defaultOccupancy = roomName === 'Cafe' ? 5 : 2;   
      }

      const occupancy = config.occupancy !== undefined ? config.occupancy : defaultOccupancy;
      const isAiOptimized = config.isAiOptimized !== undefined ? config.isAiOptimized : true;
      
      let acIntent = config.acOn !== undefined ? config.acOn : (!!activeClass || isMeetingRoomBooked || is247);
      let lightsIntent = config.lightsOn !== undefined ? config.lightsOn : (!!activeClass || isMeetingRoomBooked || is247);
      let projectorIntent = config.projectorOn !== undefined ? config.projectorOn : (activeClass?.mode === 'On-site' || isMeetingRoomBooked);
      let acTemp = config.acTemp !== undefined ? config.acTemp : 24;

      if (isAiOptimized && occupancy > 0) {
        acIntent = true;
        lightsIntent = true;
        if (!is247) projectorIntent = true; 
        if (occupancy >= 30) acTemp = 23;
        else if (occupancy >= 15) acTemp = 24;
        else acTemp = 25;
      }

      const isLoggedIn = config.isLoggedIn !== undefined ? config.isLoggedIn : (!!activeClass || isMeetingRoomBooked || is247); 
      const maintenanceBypass = config.maintenanceBypass ?? false;
      const isPowerAllowed = maintenanceBypass || isLoggedIn; 

      let maxAcPower = 3600; 
      if (roomName.includes('Cafe') || roomName.includes('Lab')) maxAcPower = 5400; 
      else if (roomName.includes('Meeting') || roomName.includes('Lounge')) maxAcPower = 1800; 

      const tempDelta = Math.max(0, outdoorTemp - acTemp);
      let currentAcLoad = 0;

      if (anomalies.includes(roomName)) {
        currentAcLoad = 6500; 
      } else if (tempDelta >= 4) {
        currentAcLoad = maxAcPower; 
      } else if (tempDelta > 0) {
        currentAcLoad = (maxAcPower * 0.4) + (tempDelta * 300); 
      } else {
        currentAcLoad = maxAcPower * 0.25; 
      }

      const baselineAcLoad = maxAcPower; 

      if (activeClass || isMeetingRoomBooked || is247 || occupancy > 0 || acIntent) {
         baseRoomW += baselineAcLoad; 
         if (lightsIntent || activeClass || is247) baseRoomW += (is247 ? 300 : 108);
         if (projectorIntent || activeClass || isMeetingRoomBooked) baseRoomW += (is247 ? 0 : 300);
         baseRoomW += occupancy * 51;
      }

      let finalAcOn = false;
      let finalLightsOn = false;
      let finalProjectorOn = false;

      if (isPowerAllowed) {
        const aiForceOff = isAiOptimized && occupancy === 0;

        if (maintenanceBypass) {
          finalAcOn = acIntent; finalLightsOn = lightsIntent; finalProjectorOn = projectorIntent;
        } else {
          finalAcOn = acIntent && !aiForceOff;
          finalLightsOn = lightsIntent && !aiForceOff;
          finalProjectorOn = projectorIntent && !aiForceOff;
        }
      }

      if (finalAcOn) optRoomW += currentAcLoad;
      if (finalLightsOn) {
        let lightPower = is247 ? 300 : 108;
        if (isAiOptimized && finalProjectorOn && !maintenanceBypass && !is247) optRoomW += (lightPower * 0.5); 
        else optRoomW += lightPower;
      }
      if (finalProjectorOn && !is247) optRoomW += 300;
      if (occupancy > 0) optRoomW += occupancy * 51;

      if (optRoomW > 0) {
        const noiseW = (Math.random() * 80) - 40; 
        optRoomW = Math.max(10, optRoomW + noiseW); 
      }
      if (baseRoomW > 0) {
        const noiseW = (Math.random() * 80) - 40;
        baseRoomW = Math.max(10, baseRoomW + noiseW);
      }

      totalOptimizedW += optRoomW;
      totalBaselineW += baseRoomW;

      roomLogs.push({
        room_id: roomName,
        day_of_week: currentDay,
        is_holiday: false,
        occupancy_count: occupancy,
        is_class_scheduled: !!activeClass,
        outside_temp: outdoorTemp, 
        indoor_temp: finalAcOn ? acTemp : outdoorTemp - 2, 
        ac_status: finalAcOn,
        ac_setpoint: acTemp,
        lights_status: finalLightsOn,
        projector_status: finalProjectorOn,
        ai_mode_active: isAiOptimized,
        power_consumption_w: parseFloat(optRoomW.toFixed(2)),
        is_card_inserted: isLoggedIn,
        maintenance_bypass: maintenanceBypass,
        auth_username: config.authorizedUser || 'System' 
      });
    });

    return { optimizedKw: totalOptimizedW / 1000, baselineKw: totalBaselineW / 1000, roomLogs, outdoorTemp };
  };

  const handleSimulationData = async (data: any) => {
    setSimDay(data.day);
    setSimTime(data.timeFormatted);
    setSimEvents(data.events);
    if (data.anomalies) setAnomalies(data.anomalies);
    if (data.weather) setCurrentWeather(data.weather); // 💡 รับค่า Weather จาก Controller

    const { optimizedKw, baselineKw, roomLogs } = calculateLivePower(data.day, data.timeFormatted);
    
    const randomFluctuation = optimizedKw > 0 ? (Math.random() * 0.5) - 0.25 : 0;
    const finalOptimizedKw = optimizedKw > 0 ? optimizedKw + randomFluctuation : 0;
    const finalBaselineKw = baselineKw > 0 ? baselineKw + randomFluctuation + 0.5 : 0;

    const savingsKw = finalBaselineKw - finalOptimizedKw;
    const savingsPct = finalBaselineKw > 0 ? (savingsKw / finalBaselineKw) * 100 : 0;

    setCurrentPower(finalOptimizedKw);
    setBaselinePower(finalBaselineKw);
    setSavingsPercent(savingsPct);

    setPowerHistory(prev => [...prev.slice(1), finalBaselineKw]);
    setOptHistory(prev => [...prev.slice(1), finalOptimizedKw]);
    setSavingsHistory(prev => [...prev.slice(1), savingsPct]);

    if (data.timeFormatted !== lastLoggedTime.current) {
      lastLoggedTime.current = data.timeFormatted;
      
      const fakeTimestamp = new Date();
      const [hours, minutes] = data.timeFormatted.split(':');
      fakeTimestamp.setHours(parseInt(hours), parseInt(minutes), 0);
      const formattedTime = fakeTimestamp.toISOString().replace('T', ' ').substring(0, 19);

      try {
        if (supabaseNew) {
          const activeTeacher = roomsConfig['Classroom 101']?.authorizedUser || null;
          await supabaseNew.from('energy_logs').insert([{
            timestamp: formattedTime, 
            teacher_name: activeTeacher !== 'System' ? activeTeacher : null,
            energy_baseline: Math.round(finalBaselineKw * 1000), 
            energy_ai: Math.round(finalOptimizedKw * 1000),
            energy_saved_w: Math.round((savingsKw > 0 ? savingsKw : 0) * 1000),
            energy_saved_pct: parseFloat(savingsPct.toFixed(2)),
            cost_baseline: parseFloat((finalBaselineKw * 4.5).toFixed(2)), 
            cost_ai: parseFloat((finalOptimizedKw * 4.5).toFixed(2))
          }]);
          const roomLogsWithTime = roomLogs.map(log => ({ ...log, timestamp: formattedTime }));
          await supabaseNew.from('room_energy_logs').insert(roomLogsWithTime);
        }
      } catch (error) { console.error("❌ Log Error:", error); }
    }
  };

  useEffect(() => {
    const { optimizedKw, baselineKw, roomLogs } = calculateLivePower(simDay, simTime);
    setCurrentPower(optimizedKw);
    setBaselinePower(baselinePower);
    setSavingsPercent(baselinePower > 0 ? ((baselinePower - optimizedKw) / baselinePower) * 100 : 0);
    setLiveRoomData(roomLogs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomsConfig, masterSchedule, simTime, simDay, anomalies, currentWeather]); 

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const { data, error } = await supabase.from('master_schedule').select('*');
        if (!error && data) setMasterSchedule(data as TimeSlot[]);
      } catch (error) { console.error('Error fetching schedules:', error); }
    };
    fetchSchedules();
  }, []);

  const handleUpdateSchedule = async (newSchedule: TimeSlot[]) => {
    setMasterSchedule(newSchedule);
    try {
      if (!supabaseNew) return;
      await supabaseNew.from('master_schedule').delete().neq('id', 'dummy'); 
      await supabaseNew.from('master_schedule').insert(newSchedule);
    } catch (error) { console.error('Error updating database:', error); }
  };

  const handleSaveRoomConfig = (roomName: string, newState: RoomDeviceState) => {
    setRoomsConfig(prev => ({ ...prev, [roomName]: newState }));
    setEditingRoom(null);
  };

  const handleGlobalBypassToggle = () => {
    const newState = !globalBypass;
    setGlobalBypass(newState);
    setRoomsConfig(prev => {
      const updatedConfig = { ...prev };
      ALL_SIMULATION_ROOMS.forEach(roomName => {
        const current = updatedConfig[roomName] || {};
        updatedConfig[roomName] = {
          ...current, maintenanceBypass: newState,
          ...(newState ? { acOn: true, lightsOn: true, projectorOn: !roomName.includes('Cafe') && !roomName.includes('Lounge'), isAiOptimized: false, occupancy: 20 } : {})
        } as RoomDeviceState;
      });
      return updatedConfig;
    });
    if (newState) toast.warning('Global Bypass Enabled', { style: { background: '#151515', color: '#f97316', border: '1px solid #f97316' } });
    else toast.info('Global Bypass Disabled', { style: { background: '#151515', color: '#fff', border: '1px solid #333' } });
  };

  const summaryData = [
    { title: 'Total Savings', value: savingsPercent.toFixed(1), unit: '%', sparklineData: savingsHistory },
    { title: 'Baseline Power', value: baselinePower.toFixed(1), unit: 'kW', sparklineData: powerHistory },
    { title: 'Optimized Power', value: currentPower.toFixed(1), unit: 'kW', sparklineData: optHistory }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex font-sans text-gray-100 selection:bg-lime-500/30">
      <Toaster position="bottom-right" visibleToasts={3} expand={false} richColors closeButton={true} /> 
      <div className="w-20 bg-[#151515] border-r border-gray-800 flex flex-col items-center py-6 z-50">
        <div className="mb-8 w-10 h-10 rounded-lg bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center shadow-lg shadow-lime-500/20"><Zap className="w-6 h-6 text-black" /></div>
        <nav className="flex flex-col gap-3 w-full px-2">
          {[ { id: 'overview', icon: LayoutDashboard, label: 'Overview' }, { id: 'analytics', icon: BarChart2, label: 'Analytics' }, { id: 'floors', icon: Layers, label: 'Floors' }, { id: 'settings', icon: Settings, label: 'Settings' } ].map(item => (
            <button key={item.id} onClick={() => setActiveMenu(item.id)} title={item.label} className={`w-full h-12 rounded-xl flex items-center justify-center transition-all ${activeMenu === item.id ? 'bg-lime-500/20 text-lime-400 shadow-[inset_0_0_10px_rgba(132,204,22,0.1)] border border-lime-500/30' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}><item.icon size={22} /></button>
          ))}
        </nav>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-end mb-8">
            <div><h1 className="text-3xl font-bold text-white tracking-tight mb-1">{activeMenu === 'analytics' ? 'System Analytics' : 'Smart Building Energy'}</h1><p className="text-gray-500 text-sm font-medium">{activeMenu === 'analytics' ? 'Historical data and AI performance metrics' : 'Real-time building monitoring dashboard'}</p></div>
            {activeMenu === 'overview' && (
              <div className="flex items-center gap-6">
                <div className="text-right flex items-center gap-3 bg-[#151515] p-3 rounded-2xl border border-gray-800"><Sun size={24} className={currentWeather === 'sunny' ? "text-yellow-400" : currentWeather === 'heatwave' ? "text-orange-500" : "text-blue-400"} /><div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Outdoor</p><p className="text-xl font-mono font-bold text-white leading-none">{getOutsideTemp(simTime)}°C</p></div></div>
                <div className="text-right"><div className="text-lime-400 text-4xl font-mono font-bold tracking-tight flex items-baseline gap-3 justify-end drop-shadow-[0_0_15px_rgba(163,230,53,0.2)]"><span className="text-xl text-lime-400/60 uppercase">{simDay}</span><span>{simTime}</span></div><div className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold">Live Power: <span className="text-red-500 ml-1">{currentPower.toFixed(1)} kW</span></div></div>
              </div>
            )}
          </div>
          {activeMenu === 'overview' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-3 gap-4 mb-8">{summaryData.map((data, index) => <DarkEnergyCard key={index} {...data} />)}</div>
              <div className="mb-6 flex justify-between items-center w-full gap-4">
                <div className="flex bg-[#151515] p-1.5 rounded-xl border border-gray-800 w-fit gap-1">{['floor1', 'floor2', 'floor3'].map((f) => (<button key={f} onClick={() => setSelectedFloor(f as any)} className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${selectedFloor === f ? 'bg-lime-500 text-black shadow-lg shadow-lime-500/20' : 'text-gray-500 hover:text-gray-300'}`}>{f.replace('floor', 'Floor ')}</button>))}</div>
                <button onClick={handleGlobalBypassToggle} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${globalBypass ? 'bg-orange-500/10 text-orange-400 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-[#151515] text-gray-500 border-gray-800 hover:text-gray-300 hover:bg-gray-800/50'}`}><Wrench size={16} />{globalBypass ? 'Global Bypass: ON' : 'Global Bypass: OFF'}</button>
              </div>
              <FloorPlanDark selectedFloor={selectedFloor} simTime={simTime} simDay={simDay} masterSchedule={masterSchedule} meetingRooms={meetingRooms} onRoomClick={(roomName) => setEditingRoom(roomName)} liveRoomData={liveRoomData} />
              <div className="mt-10 pt-8 border-t border-gray-800/50"><MeetingRoomCluster currentSimDay={simDay} onRoomsUpdate={setMeetingRooms} /></div>
              {(selectedFloor === 'floor2' || selectedFloor === 'floor3') && (<div className="mt-8"><button onClick={() => setShowScheduleModal(true)} className="w-full bg-[#1a1a1a] hover:bg-[#222] text-lime-400 border border-lime-500/20 font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 group"><Layers size={20} className="group-hover:scale-110 transition-transform" />Manage Building Class Schedule</button></div>)}
            </div>
          ) : activeMenu === 'analytics' ? ( <AnalyticsDashboard /> ) : ( <div className="flex flex-col items-center justify-center h-[60vh] text-gray-600"><Settings size={48} className="mb-4 opacity-20 animate-spin-slow" /><p className="font-mono text-sm tracking-widest uppercase">Configuration Module Loading...</p></div> )}
        </div>
        {activeMenu === 'overview' && (
          <div className="w-85 bg-[#151515] border-l border-gray-800 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            <SimulationController onSimulationUpdate={handleSimulationData} masterSchedule={masterSchedule} />
            {simEvents.length > 0 && (
              <div className="bg-black/40 p-5 rounded-2xl border border-gray-800/50 backdrop-blur-sm">
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