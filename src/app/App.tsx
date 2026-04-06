import { useState, useEffect, useRef } from 'react'; // 💡 เพิ่ม useRef
import { LayoutDashboard, Layers, Settings, Zap } from 'lucide-react';
import { DarkEnergyCard } from './components/DarkEnergyCard';
import { FloorPlanDark } from './components/FloorPlanDark';
import { EnergyDataPanel } from './components/EnergyDataPanel';
import { RecentActivities } from './components/RecentActivities';
import { ScheduleModal } from './components/ScheduleModal';
import MeetingRoomCluster from "./components/MeetingRoomCluster";
import { SimulationController } from './components/SimulationController';
import { RoomConfigModal, RoomDeviceState } from './components/RoomConfigModal';
import { supabase } from '../supabaseClient';

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

export default function App() {
  const [activeMenu, setActiveMenu] = useState('overview');
  const [selectedFloor, setSelectedFloor] = useState<'floor1' | 'floor2' | 'floor3'>('floor1');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [masterSchedule, setMasterSchedule] = useState<TimeSlot[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<any[]>([]);

  const [simDay, setSimDay] = useState<string>('Monday');
  const [simTime, setSimTime] = useState<string>('08:00');
  
  // 💡 แยก State เป็น Baseline และ Optimized 
  const [currentPower, setCurrentPower] = useState<number>(0); // Optimized (ใช้ไฟจริง)
  const [baselinePower, setBaselinePower] = useState<number>(0); // Baseline (ถ้าไม่ใช้ AI)
  const [savingsPercent, setSavingsPercent] = useState<number>(0);

  const [simEvents, setSimEvents] = useState<string[]>([]);

  const [powerHistory, setPowerHistory] = useState<number[]>(new Array(7).fill(0));
  const [optHistory, setOptHistory] = useState<number[]>(new Array(7).fill(0));
  const [savingsHistory, setSavingsHistory] = useState<number[]>(new Array(7).fill(0));

  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  
  // 💡 ตัวช่วยป้องกันการยิง Database รัวเกินไป (จะยิงเฉพาะตอนนาทีเปลี่ยน)
  const lastLoggedTime = useRef<string>('');

  const [roomsConfig, setRoomsConfig] = useState<Record<string, RoomDeviceState>>({
    'Classroom 101': { occupancy: 0, acOn: false, acTemp: 25, projectorOn: false, lightsOn: false, isAiOptimized: true },
    'Computer Lab A': { occupancy: 0, acOn: false, acTemp: 25, projectorOn: false, lightsOn: false, isAiOptimized: true },
  });

  // 💡 [อัปเกรดลอจิก] คืนค่าทั้ง Baseline, Optimized และ Log ของทุกห้อง
  const calculateLivePower = (currentDay: string, currentTime: string) => {
    let totalOptimizedW = 0;
    let totalBaselineW = 0;
    const currentHour = currentTime.split(':')[0];
    const roomLogs: any[] = [];

    // Base Load ตึก 10kW
    const buildingBaseLoad = 4500 + 1200 + 4300; 
    totalOptimizedW += buildingBaseLoad;
    totalBaselineW += buildingBaseLoad;

    AVAILABLE_CLASSROOMS.forEach(roomName => {
      const activeClass = masterSchedule.find(s => {
        const classHour = s.time.split(':')[0];
        return s.room === roomName && s.day === currentDay && classHour === currentHour;
      });

      const config = roomsConfig[roomName];
      let optRoomW = 0;
      let baseRoomW = 0;

      const occupancy = config ? config.occupancy : (activeClass ? activeClass.subject.students : 0);
      const acOn = config ? config.acOn : !!activeClass;
      const acTemp = config ? config.acTemp : 24;
      const lightsOn = config ? config.lightsOn : !!activeClass;
      const projectorOn = config ? config.projectorOn : (activeClass?.mode === 'On-site');
      const isAiOptimized = config ? config.isAiOptimized : true;

      // 1. --- คำนวณ Baseline (ถ้าไม่มี AI และลืมปิดไฟแอร์) ---
      if (activeClass || occupancy > 0 || acOn) {
         baseRoomW += 3600; // แอร์ทำงาน 100% ตลอด
         if (lightsOn || activeClass) baseRoomW += 108;
         if (projectorOn || activeClass) baseRoomW += 300;
         baseRoomW += occupancy * 51;
      }

      // 2. --- คำนวณ Optimized (มี AI ปรับลดทอนให้) ---
      if (activeClass || (config && !config.isAiOptimized) || occupancy > 0) {
        if (acOn) {
          let acPwr = 3600;
          if (isAiOptimized && occupancy === 0) acPwr = 0; // AI ตัดแอร์
          else acPwr += (25 - acTemp) * 180;
          optRoomW += acPwr;
        }
        if (lightsOn) {
          let lightPwr = 108;
          if (isAiOptimized && projectorOn) lightPwr *= 0.5; // AI หรี่ไฟ
          optRoomW += lightPwr;
        }
        if (projectorOn) optRoomW += 300;
        optRoomW += occupancy * 51;
      }

      totalOptimizedW += optRoomW;
      totalBaselineW += baseRoomW;

      // 3. --- เตรียมข้อมูลสำหรับส่งเข้า Database (AI Prediction) ---
      roomLogs.push({
        room_id: roomName,
        day_of_week: currentDay,
        is_holiday: false,
        occupancy_count: occupancy,
        is_class_scheduled: !!activeClass,
        outside_temp: 33.5, 
        indoor_temp: (acOn && optRoomW > 0) ? acTemp : 28.0,
        ac_status: (acOn && optRoomW > 0),
        ac_setpoint: acTemp,
        lights_status: (lightsOn && optRoomW > 0),
        projector_status: (projectorOn && optRoomW > 0),
        ai_mode_active: isAiOptimized,
        power_consumption_w: parseFloat(optRoomW.toFixed(2))
      });
    });

    return {
      optimizedKw: totalOptimizedW / 1000,
      baselineKw: totalBaselineW / 1000,
      roomLogs
    };
  };

  const handleSimulationData = async (data: { day: string, timeFormatted: string, powerLoad: number, events: string[] }) => {
    setSimDay(data.day);
    setSimTime(data.timeFormatted);
    setSimEvents(data.events);

    const { optimizedKw, baselineKw, roomLogs } = calculateLivePower(data.day, data.timeFormatted);
    
    // ใส่ค่าแกว่งให้กราฟดูมีชีวิต
    const randomFluctuation = optimizedKw > 10 ? (Math.random() * 0.5) - 0.25 : 0;
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

    // 🚀 ยิงข้อมูลเข้า Database เฉพาะตอนที่ "เวลาเดินไป 1 นาที"
    if (data.timeFormatted !== lastLoggedTime.current) {
      lastLoggedTime.current = data.timeFormatted;
      
      // สร้าง Timestamp หลอก อิงจากเวลาในคอมพิวเตอร์ปัจจุบัน + เวลาในระบบซิม
      const fakeTimestamp = new Date();
      const [hours, minutes] = data.timeFormatted.split(':');
      fakeTimestamp.setHours(parseInt(hours), parseInt(minutes), 0);
      const isoTime = fakeTimestamp.toISOString();

      try {
        // 1. ส่งข้อมูลภาพรวม (ให้ Dashboard ภายนอก)
        await supabase.from('system_energy_logs').insert([{
          timestamp: isoTime,
          baseline_power_kw: parseFloat(finalBaselineKw.toFixed(2)),
          optimized_power_kw: parseFloat(finalOptimizedKw.toFixed(2)),
          saved_power_kw: parseFloat((savingsKw > 0 ? savingsKw : 0).toFixed(2)),
          savings_percentage: parseFloat((savingsPct > 0 ? savingsPct : 0).toFixed(2))
        }]);

        // 2. ส่งข้อมูลรายห้อง (เตรียมไว้เทรน AI)
        const roomLogsWithTime = roomLogs.map(log => ({ ...log, timestamp: isoTime }));
        await supabase.from('room_energy_logs').insert(roomLogsWithTime);
        
      } catch (error) {
        console.error("❌ Error logging to Supabase:", error);
      }
    }
  };

  // อัปเดตตัวเลขหน้าจอบางส่วนทันทีที่ผู้ใช้ปรับค่า Modal
  useEffect(() => {
    const { optimizedKw, baselineKw } = calculateLivePower(simDay, simTime);
    setCurrentPower(optimizedKw);
    setBaselinePower(baselineKw);
    const savingsPct = baselineKw > 0 ? ((baselineKw - optimizedKw) / baselineKw) * 100 : 0;
    setSavingsPercent(savingsPct);
    
    setPowerHistory(prev => { const arr = [...prev]; arr[arr.length - 1] = baselineKw; return arr; });
    setOptHistory(prev => { const arr = [...prev]; arr[arr.length - 1] = optimizedKw; return arr; });
  }, [roomsConfig, masterSchedule]); 

  // --- โค้ดดึงข้อมูล Database ส่วนที่เหลือคงเดิม ---
  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase.from('master_schedule').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        setMasterSchedule(data as TimeSlot[]);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const handleUpdateSchedule = async (newSchedule: TimeSlot[]) => {
    setMasterSchedule(newSchedule);
    try {
      await supabase.from('master_schedule').delete().neq('id', 'dummy'); 
      const { error } = await supabase.from('master_schedule').insert(newSchedule);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating database:', error);
    }
  };

  const handleSaveRoomConfig = (roomName: string, newState: RoomDeviceState, calculatedPowerKw: number) => {
    setRoomsConfig(prev => ({ ...prev, [roomName]: newState }));
    setEditingRoom(null);
  };

  const summaryData = [
    { title: 'Total Savings', value: savingsPercent.toFixed(1), unit: '%', sparklineData: savingsHistory },
    { title: 'Baseline Power', value: baselinePower.toFixed(1), unit: 'kW', sparklineData: powerHistory },
    { title: 'Optimized Power', value: currentPower.toFixed(1), unit: 'kW', sparklineData: optHistory }
  ];

  const floorOptions = [
    { id: 'floor1' as const, label: 'Floor 1: Cafe / Lounge' },
    { id: 'floor2' as const, label: 'Floor 2: Classrooms' },
    { id: 'floor3' as const, label: 'Floor 3: Computer Labs' }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex font-sans">
      <div className="w-20 bg-[#151515] border-r border-gray-800 flex flex-col items-center py-6">
        <div className="mb-8 w-10 h-10 rounded-lg bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center">
          <Zap className="w-6 h-6 text-black" />
        </div>
        <nav className="flex flex-col gap-2 w-full px-2">
          {[{ id: 'overview', icon: LayoutDashboard }, { id: 'floors', icon: Layers }, { id: 'settings', icon: Settings }].map(item => (
            <button key={item.id} onClick={() => setActiveMenu(item.id)} className={`w-full h-12 rounded-lg flex items-center justify-center transition-all ${activeMenu === item.id ? 'bg-lime-500/20 text-lime-400 shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}>
              <item.icon size={22} />
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Smart Building Energy Management</h1>
              <p className="text-gray-400 text-sm">Real-time monitoring and optimization dashboard</p>
            </div>
            <div className="text-right">
              <div className="text-lime-400 text-4xl font-mono font-bold tracking-tight flex items-baseline gap-3 justify-end">
                <span className="text-xl text-lime-400/80 uppercase">{simDay}</span> 
                <span>{simTime} <span className="text-lg text-lime-400/50">น.</span></span>
              </div>
              <div className="text-gray-400 text-sm mt-1">Live Load: <span className="text-red-400 font-bold text-lg">{currentPower.toFixed(1)} kW</span></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {summaryData.map((data, index) => <DarkEnergyCard key={index} {...data} />)}
          </div>

          <div className="mb-6 flex justify-between items-center">
            <div className="inline-flex bg-[#151515] rounded-lg p-1 border border-gray-800">
              {floorOptions.map(floor => (
                <button key={floor.id} onClick={() => setSelectedFloor(floor.id)} className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${selectedFloor === floor.id ? 'bg-lime-500 text-black' : 'text-gray-400 hover:text-gray-200'}`}>{floor.label}</button>
              ))}
            </div>
          </div>

          <FloorPlanDark 
            selectedFloor={selectedFloor} 
            simTime={simTime} 
            simDay={simDay} 
            masterSchedule={masterSchedule} 
            meetingRooms={meetingRooms}
            onRoomClick={(roomName) => setEditingRoom(roomName)} 
          />
          
          <div className="mt-8 pt-8 border-t border-gray-800">
            <MeetingRoomCluster 
              currentSimDay={simDay} 
              onRoomsUpdate={setMeetingRooms}
            />
          </div>

          {(selectedFloor === 'floor2' || selectedFloor === 'floor3') && (
            <div className="mt-6">
              <button onClick={() => setShowScheduleModal(true)} className="w-full bg-lime-500 hover:bg-lime-600 text-black font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-lime-500/10">
                <Layers size={20} /> Manage Master Class Schedule
              </button>
            </div>
          )}
        </div>

        <div className="w-80 bg-[#151515] border-l border-gray-800 p-6 overflow-y-auto flex flex-col gap-6">
          <SimulationController onSimulationUpdate={handleSimulationData} masterSchedule={masterSchedule} />
          {simEvents.length > 0 && (
            <div className="bg-[#0f0f0f] p-4 rounded-xl border border-gray-800 shadow-inner">
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live Events</h3>
              <div className="text-sm text-gray-300 space-y-2">{simEvents.map((ev, i) => <div key={i} className="pb-2 border-b border-gray-800/50 last:border-0">{ev}</div>)}</div>
            </div>
          )}
          <EnergyDataPanel selectedFloor={selectedFloor} />
          <RecentActivities />
        </div>
      </div>

      {showScheduleModal && (
        <ScheduleModal
          schedule={masterSchedule}
          availableRooms={AVAILABLE_CLASSROOMS}
          onUpdateSchedule={handleUpdateSchedule}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {editingRoom && (
        <RoomConfigModal 
          roomName={editingRoom} 
          initialState={roomsConfig[editingRoom] || { occupancy: 0, acOn: false, acTemp: 25, projectorOn: false, lightsOn: false, isAiOptimized: true }}
          onSave={handleSaveRoomConfig}
          onClose={() => setEditingRoom(null)}
        />
      )}
    </div>
  );
}