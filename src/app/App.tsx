import { useState, useEffect } from 'react'; // 💡 นำเข้า useEffect
import { LayoutDashboard, Layers, Settings, Zap } from 'lucide-react';
import { DarkEnergyCard } from './components/DarkEnergyCard';
import { FloorPlanDark } from './components/FloorPlanDark';
import { EnergyDataPanel } from './components/EnergyDataPanel';
import { RecentActivities } from './components/RecentActivities';
import { ScheduleModal } from './components/ScheduleModal';
import MeetingRoomCluster from "./components/MeetingRoomCluster";
import { SimulationController } from './components/SimulationController';
import { RoomConfigModal, RoomDeviceState } from './components/RoomConfigModal';
import { supabase } from '../supabaseClient'; // 💡 เรียกใช้ Supabase

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

  // 💡 1. ปรับ Master Schedule เป็น Array ว่าง เพื่อรอรับจาก DB
  const [masterSchedule, setMasterSchedule] = useState<TimeSlot[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<any[]>([]);

  const [simDay, setSimDay] = useState<string>('Monday');
  const [simTime, setSimTime] = useState<string>('08:00');
  const [currentPower, setCurrentPower] = useState<number>(185.2);
  const [simEvents, setSimEvents] = useState<string[]>([]);

  const [powerHistory, setPowerHistory] = useState<number[]>([190, 188, 187, 186, 185, 184.5, 185.2]);
  const [optHistory, setOptHistory] = useState<number[]>([155, 152, 148, 145, 143, 142, 141.8]);
  const [savingsHistory, setSavingsHistory] = useState<number[]>([18, 19, 20, 19.5, 21, 22, 23.4]);

  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  
  const [roomsConfig, setRoomsConfig] = useState<Record<string, RoomDeviceState>>({
    'Classroom 101': { occupancy: 25, acOn: true, acTemp: 24, projectorOn: true, lightsOn: true, isAiOptimized: true },
    'Computer Lab A': { occupancy: 30, acOn: true, acTemp: 23, projectorOn: false, lightsOn: true, isAiOptimized: false },
  });

  // 💡 2. ดึงข้อมูลจาก DB ทันทีเมื่อเปิดหน้าเว็บ
  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('master_schedule')
        .select('*');

      if (error) throw error;
      
      if (data && data.length > 0) {
        setMasterSchedule(data as TimeSlot[]);
      } else {
        // หากไม่มีข้อมูลในฐานข้อมูล ให้ใช้ข้อมูล Mockup ชั่วคราวไปก่อน
        setMasterSchedule([
          { id: '1', day: 'Monday', time: '09:00', room: 'Classroom 101', mode: 'On-site', subject: { code: 'CPE101', name: 'Programming', students: 35 } },
          { id: '2', day: 'Monday', time: '09:00', room: 'Computer Lab A', mode: 'Online', subject: { code: 'CPE202', name: 'Network', students: 30 } },
        ]);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  // 💡 3. ฟังก์ชันเซฟข้อมูลลง Supabase
  const handleUpdateSchedule = async (newSchedule: TimeSlot[]) => {
    setMasterSchedule(newSchedule);

    try {
      // ใช้วิธีลบข้อมูลเก่าทั้งหมดในตารางแล้วเพิ่มใหม่ (แทนการ upsert) เพื่อป้องกันปัญหาตารางเรียนที่ถูกลบไปแล้วยังค้างอยู่ในฐานข้อมูล
      await supabase.from('master_schedule').delete().neq('id', 'dummy'); 
      const { error } = await supabase.from('master_schedule').insert(newSchedule);

      if (error) throw error;
      console.log('✅ บันทึกตารางเรียนลง Database สำเร็จ!');
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการบันทึกตารางเรียน:', error);
    }
  };

  const handleSaveRoomConfig = (roomName: string, newState: RoomDeviceState, calculatedPowerKw: number) => {
    setRoomsConfig(prev => ({
      ...prev,
      [roomName]: newState
    }));
    setEditingRoom(null);
    console.log(`ห้อง ${roomName} อัปเดตการกินไฟเป็น: ${calculatedPowerKw.toFixed(2)} kW`);
  };

  const handleSimulationData = (data: { day: string, timeFormatted: string, powerLoad: number, events: string[] }) => {
    setSimDay(data.day);
    setSimTime(data.timeFormatted);
    setCurrentPower(data.powerLoad);
    setSimEvents(data.events);

    const randomFluctuation = (Math.random() * 4) - 2;
    const newOptimized = (data.powerLoad * 0.76) + randomFluctuation;
    const newSavings = data.powerLoad > 0 ? (((data.powerLoad - newOptimized) / data.powerLoad) * 100) : 0;

    setPowerHistory(prev => [...prev.slice(1), data.powerLoad]);
    setOptHistory(prev => [...prev.slice(1), newOptimized]);
    setSavingsHistory(prev => [...prev.slice(1), newSavings]);
  };

  const optimizedPower = currentPower * 0.76; 
  const totalSavingsPercentage = currentPower > 0 
    ? (((currentPower - optimizedPower) / currentPower) * 100).toFixed(1) 
    : '0.0';

  const summaryData = [
    { title: 'Total Savings', value: totalSavingsPercentage, unit: '%', sparklineData: savingsHistory },
    { title: 'Baseline Power', value: currentPower.toFixed(1), unit: 'kW', sparklineData: powerHistory },
    { title: 'Optimized Power', value: optimizedPower.toFixed(1), unit: 'kW', sparklineData: optHistory }
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
          onUpdateSchedule={handleUpdateSchedule} // 💡 4. เปลี่ยนให้มาเรียกใช้ฟังก์ชันเซฟตัวใหม่
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