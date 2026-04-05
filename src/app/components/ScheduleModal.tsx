import { useState } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { EnergyPredictionGauge } from './EnergyPredictionGauge';

interface TimeSlot {
  day: string;
  time: string;
  subject?: {
    code: string;
    name: string;
    students: number;
  };
}

interface ScheduleModalProps {
  roomName: string;
  onClose: () => void;
}

export function ScheduleModal({ roomName, onClose }: ScheduleModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [schedule, setSchedule] = useState<TimeSlot[]>([
    { day: 'Monday', time: '09:00', subject: { code: 'CPE101', name: 'Programming', students: 35 } },
    { day: 'Monday', time: '13:00', subject: { code: 'CPE202', name: 'Network', students: 30 } },
    { day: 'Wednesday', time: '09:00', subject: { code: 'CPE101', name: 'Programming', students: 35 } },
  ]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  const availableSubjects = [
    { code: 'CPE101', name: 'Programming', students: 35 },
    { code: 'CPE202', name: 'Network', students: 30 },
    { code: 'CPE303', name: 'Database Systems', students: 28 },
    { code: 'CPE404', name: 'AI Fundamentals', students: 32 },
    { code: 'CPE505', name: 'Cloud Computing', students: 25 },
  ].filter(subject =>
    subject.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSlotSubject = (day: string, time: string) => {
    return schedule.find(s => s.day === day && s.time === time)?.subject;
  };

  const handleSlotClick = (day: string, time: string) => {
    const subject = getSlotSubject(day, time);
    if (!subject) {
      setSelectedSlot({ day, time });
    }
  };

  const handleSubjectSelect = (subject: typeof availableSubjects[0]) => {
    if (selectedSlot) {
      setSchedule([...schedule, { ...selectedSlot, subject }]);
      setSelectedSlot(null);
      setSearchQuery('');
    }
  };

  const totalEnergyCost = schedule.length * 2.5;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f]/95 backdrop-blur-xl rounded-2xl border border-lime-500/30 shadow-2xl shadow-lime-500/20 w-full max-w-7xl max-h-[90vh] overflow-hidden flex">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div>
              <h2 className="text-2xl font-bold text-white">Schedule Management - {roomName}</h2>
              <p className="text-gray-400 text-sm mt-1">Click empty slots to add subjects</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Schedule Grid */}
          <div className="flex-1 overflow-auto p-6">
            <div className="min-w-max">
              <div className="grid grid-cols-6 gap-2">
                {/* Header Row */}
                <div className="bg-[#1a1a1a] rounded-lg p-3 font-semibold text-gray-400 text-center">
                  Time
                </div>
                {days.map(day => (
                  <div key={day} className="bg-[#1a1a1a] rounded-lg p-3 font-semibold text-white text-center">
                    {day}
                  </div>
                ))}

                {/* Time Slots */}
                {timeSlots.map(time => (
                  <>
                    <div key={`time-${time}`} className="bg-[#1a1a1a] rounded-lg p-3 text-lime-400 text-center font-mono">
                      {time}
                    </div>
                    {days.map(day => {
                      const subject = getSlotSubject(day, time);
                      const isSelected = selectedSlot?.day === day && selectedSlot?.time === time;

                      return (
                        <div
                          key={`${day}-${time}`}
                          onClick={() => handleSlotClick(day, time)}
                          className={`relative rounded-lg p-3 min-h-[80px] cursor-pointer transition-all ${
                            subject
                              ? 'bg-lime-500/10 border-2 border-lime-500/50 hover:border-lime-500'
                              : isSelected
                              ? 'bg-lime-500/20 border-2 border-lime-500 animate-pulse'
                              : 'bg-[#1a1a1a] border-2 border-gray-800 hover:border-lime-500/30'
                          }`}
                        >
                          {subject ? (
                            <div>
                              <div className="font-bold text-lime-400 text-sm">{subject.code}</div>
                              <div className="text-gray-300 text-xs mt-1">{subject.name}</div>
                              <div className="text-gray-500 text-xs mt-1">👤 {subject.students}</div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Plus className="text-gray-600 group-hover:text-lime-400" size={20} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>

          {/* Subject Picker Popover */}
          {selectedSlot && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0f0f0f] border border-lime-500/50 rounded-xl shadow-2xl shadow-lime-500/30 p-4 w-80 z-10">
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="text"
                    placeholder="Search subjects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500"
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableSubjects.map(subject => (
                  <button
                    key={subject.code}
                    onClick={() => handleSubjectSelect(subject)}
                    className="w-full bg-[#1a1a1a] hover:bg-lime-500/10 border border-gray-800 hover:border-lime-500/50 rounded-lg p-3 text-left transition-all"
                  >
                    <div className="font-semibold text-white text-sm">{subject.code} - {subject.name}</div>
                    <div className="text-gray-400 text-xs mt-1">👤 {subject.students} students</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="w-full mt-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar - Energy Prediction */}
        <div className="w-80 bg-[#0a0a0a] border-l border-gray-800 p-6">
          <EnergyPredictionGauge totalClasses={schedule.length} estimatedCost={totalEnergyCost} />
        </div>
      </div>
    </div>
  );
}
