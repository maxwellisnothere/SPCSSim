import { useState } from 'react';
import { LayoutDashboard, Layers, Settings, Zap } from 'lucide-react';
import { DarkEnergyCard } from './components/DarkEnergyCard';
import { FloorPlanDark } from './components/FloorPlanDark';
import { EnergyDataPanel } from './components/EnergyDataPanel';
import { RecentActivities } from './components/RecentActivities';
import { ScheduleModal } from './components/ScheduleModal';
import MeetingRoomCluster from "./components/MeetingRoomCluster";
import { SimulationController } from './components/SimulationController';

// 1. เพิ่ม id และ room ใน Interface
export interface TimeSlot {
  id: string; 
  day: string;
  time: string;
  room: string; // ระบุห้องในนี้
  mode: 'On-site' | 'Online';
  subject: { code: string; name: string; students: number; };
}

// 2. กำหนดห้องที่มีอยู่จริงในระบบ (ให้ตรงกับ Floor Plan ชั้น 2 และ 3)
export const AVAILABLE_CLASSROOMS = [
  'Classroom 101', 'Classroom 102', 'Classroom 103', 
  'Classroom 104', 'Classroom 105', 'Classroom 106',
  'Computer Lab A', 'Computer Lab B', 'Computer Lab C', 'Computer Lab D'
];

export default function App() {
  const [activeMenu, setActiveMenu] = useState('overview');
  const [selectedFloor, setSelectedFloor] = useState<'floor1' | 'floor2' | 'floor3'>('floor1');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // 3. เปลี่ยน State เป็น Master Schedule พร้อมใส่ Mockup ด้วยชื่อห้องจริง
  const [masterSchedule, setMasterSchedule] = useState<TimeSlot[]>([
    { id: '1', day: 'Monday', time: '09:00', room: 'Classroom 101', mode: 'On-site', subject: { code: 'CPE101', name: 'Programming', students: 35 } },
    { id: '2', day: 'Monday', time: '09:00', room: 'Computer Lab A', mode: 'Online', subject: { code: 'CPE202', name: 'Network', students: 30 } },
  ]);
  const [meetingRooms, setMeetingRooms] = useState<any[]>([]);

  const [simDay, setSimDay] = useState<string>('Monday');
  const [simTime, setSimTime] = useState<string>('08:00');
  const [currentPower, setCurrentPower] = useState<number>(185.2);
  const [simEvents, setSimEvents] = useState<string[]>([]);

  const handleSimulationData = (data: { day: string, timeFormatted: string, powerLoad: number, events: string[] }) => {
    setSimDay(data.day);
    setSimTime(data.timeFormatted);
    setCurrentPower(data.powerLoad);
    setSimEvents(data.events);
  };

  const summaryData = [
    { title: 'Total Savings', value: '23.4', unit: '%', sparklineData: [18, 19, 20, 19.5, 21, 22, 23.4] },
    { title: 'Baseline Power', value: '185.2', unit: 'kW', sparklineData: [190, 188, 187, 186, 185, 184.5, 185.2] },
    { title: 'Optimized Power', value: '141.8', unit: 'kW', sparklineData: [155, 152, 148, 145, 143, 142, 141.8] }
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
              <div className="text-gray-400 text-sm mt-1">Live Load: <span className="text-red-400 font-bold text-lg">{currentPower} kW</span></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {summaryData.map((data, index) => <DarkEnergyCard key={index} {...data} />)}
          </div>

          <div className="mb-6">
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
              meetingRooms={meetingRooms}  // <-- ตรงนี้สำคัญมากค่ะ
            />
          
                  <div className="mt-8 pt-8 border-t border-gray-800">
            <MeetingRoomCluster 
              currentSimDay={simDay} 
              onRoomsUpdate={setMeetingRooms} // 💡 เพิ่มบรรทัดนี้
            />
          </div>

          {/* ปุ่ม Manage Schedule โชว์ทั้งชั้น 2 และชั้น 3 */}
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
          onUpdateSchedule={setMasterSchedule}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  );
}