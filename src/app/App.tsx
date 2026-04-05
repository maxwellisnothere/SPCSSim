import { useState } from 'react';
import { LayoutDashboard, Layers, Settings, Zap } from 'lucide-react';
import { DarkEnergyCard } from './components/DarkEnergyCard';
import { FloorPlanDark } from './components/FloorPlanDark';
import { EnergyDataPanel } from './components/EnergyDataPanel';
import { RecentActivities } from './components/RecentActivities';
import { ScheduleModal } from './components/ScheduleModal';
import MeetingRoomCluster from "./components/MeetingRoomCluster";

export default function App() {
  const [activeMenu, setActiveMenu] = useState('overview');
  const [selectedFloor, setSelectedFloor] = useState<'floor1' | 'floor2' | 'floor3'>('floor1');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('Room 201');

  const summaryData = [
    {
      title: 'Total Savings',
      value: '23.4',
      unit: '%',
      sparklineData: [18, 19, 20, 19.5, 21, 22, 23.4]
    },
    {
      title: 'Baseline Power',
      value: '185.2',
      unit: 'kW',
      sparklineData: [190, 188, 187, 186, 185, 184.5, 185.2]
    },
    {
      title: 'Optimized Power',
      value: '141.8',
      unit: 'kW',
      sparklineData: [155, 152, 148, 145, 143, 142, 141.8]
    }
  ];

  const floorOptions = [
    { id: 'floor1' as const, label: 'Floor 1: Cafe / Lounge' },
    { id: 'floor2' as const, label: 'Floor 2: Classrooms' },
    { id: 'floor3' as const, label: 'Floor 3: Computer Labs' }
  ];

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'floors', label: 'Floors Layer', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Left Sidebar */}
      <div className="w-20 bg-[#151515] border-r border-gray-800 flex flex-col items-center py-6">
        {/* Logo */}
        <div className="mb-8 w-10 h-10 rounded-lg bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center">
          <Zap className="w-6 h-6 text-black" />
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 w-full px-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full h-12 rounded-lg flex items-center justify-center transition-all ${
                  activeMenu === item.id
                    ? 'bg-lime-500/20 text-lime-400 shadow-lg shadow-lime-500/20'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
                title={item.label}
              >
                <Icon size={22} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">Smart Building Energy Management</h1>
            <p className="text-gray-400 text-sm">Real-time monitoring and optimization dashboard</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {summaryData.map((data, index) => (
              <DarkEnergyCard key={index} {...data} />
            ))}
          </div>

          {/* Floor Selector */}
          <div className="mb-6">
            <div className="inline-flex bg-[#151515] rounded-lg p-1 border border-gray-800">
              {floorOptions.map(floor => (
                <button
                  key={floor.id}
                  onClick={() => setSelectedFloor(floor.id)}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    selectedFloor === floor.id
                      ? 'bg-lime-500 text-black'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {floor.label}
                </button>
              ))}
            </div>
          </div>

          {/* Floor Plan Canvas */}
          <FloorPlanDark selectedFloor={selectedFloor} />

          {/* Meeting Room Cluster (Only show on Floor 1) */}
          {selectedFloor === 'floor1' && (
            <div className="mt-6">
              <MeetingRoomCluster />
            </div>
          )}

          {/* Quick Access Button for Schedule */}
          {selectedFloor === 'floor2' && (
            <div className="mt-6">
              <button
                onClick={() => setShowScheduleModal(true)}
                className="w-full bg-lime-500 hover:bg-lime-600 text-black font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Layers size={20} />
                Open Classroom Schedule Manager
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar - Data Panel */}
        <div className="w-80 bg-[#151515] border-l border-gray-800 p-6 overflow-y-auto">
          <EnergyDataPanel selectedFloor={selectedFloor} />
          <div className="mt-6">
            <RecentActivities />
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          roomName={selectedClassroom}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  );
}