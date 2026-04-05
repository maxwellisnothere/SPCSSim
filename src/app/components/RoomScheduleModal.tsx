import { useState } from 'react';
import { X } from 'lucide-react';
import { SubjectSelectionPopover } from './SubjectSelectionPopover';

interface ScheduleSlot {
  day: string;
  time: string;
  subject?: {
    code: string;
    name: string;
    students: number;
  };
}

interface RoomScheduleModalProps {
  roomName: string;
  onClose: () => void;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const timeSlots = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
  '4:00 PM', '5:00 PM', '6:00 PM'
];

export function RoomScheduleModal({ roomName, onClose }: RoomScheduleModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string } | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([
    { day: 'Monday', time: '9:00 AM', subject: { code: 'CPE495', name: 'Senior Project', students: 25 } },
    { day: 'Wednesday', time: '1:00 PM', subject: { code: 'CPE301', name: 'Database Systems', students: 30 } },
  ]);

  const handleCellClick = (day: string, time: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedSlot({ day, time });
    setPopoverPosition({ x: rect.left, y: rect.bottom + 5 });
  };

  const handleSubjectSelect = (subject: { code: string; name: string; students: number }) => {
    if (selectedSlot) {
      setSchedule([...schedule, { ...selectedSlot, subject }]);
      setSelectedSlot(null);
      setPopoverPosition(null);
    }
  };

  const getSubjectForSlot = (day: string, time: string) => {
    return schedule.find(s => s.day === day && s.time === time)?.subject;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl w-[900px] max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Room Schedule: {roomName}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Schedule Grid */}
            <div className="mb-6 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-50 p-3 text-left text-sm font-semibold text-gray-700 w-24">
                      Time
                    </th>
                    {daysOfWeek.map(day => (
                      <th key={day} className="border border-gray-300 bg-gray-50 p-3 text-center text-sm font-semibold text-gray-700">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(time => (
                    <tr key={time}>
                      <td className="border border-gray-300 bg-gray-50 p-3 text-sm text-gray-600 font-medium">
                        {time}
                      </td>
                      {daysOfWeek.map(day => {
                        const subject = getSubjectForSlot(day, time);
                        const isSelected = selectedSlot?.day === day && selectedSlot?.time === time;
                        return (
                          <td
                            key={`${day}-${time}`}
                            onClick={(e) => handleCellClick(day, time, e)}
                            className={`border border-gray-300 p-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-500 border-2 bg-blue-50'
                                : subject
                                  ? 'bg-blue-100 hover:bg-blue-200'
                                  : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            {subject && (
                              <div className="text-xs">
                                <div className="font-semibold text-blue-900">{subject.code}</div>
                                <div className="text-gray-600 truncate">{subject.name}</div>
                                <div className="text-gray-500 mt-1">👤 {subject.students}</div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Available Subjects */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Subjects</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { code: 'CPE101', name: 'Programming', students: 35 },
                  { code: 'CPE202', name: 'Digital Circuit', students: 28 },
                  { code: 'CPE303', name: 'Data Structures', students: 32 },
                  { code: 'CPE404', name: 'Computer Networks', students: 30 },
                  { code: 'CPE505', name: 'AI & ML', students: 25 },
                ].map(subject => (
                  <div
                    key={subject.code}
                    className="bg-white border border-gray-300 rounded px-3 py-2 text-xs cursor-move hover:shadow-md transition-shadow"
                  >
                    <div className="font-semibold text-gray-900">{subject.code}</div>
                    <div className="text-gray-600">{subject.name}</div>
                    <div className="text-gray-500 mt-1">👤 {subject.students}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Save Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Subject Selection Popover */}
      {popoverPosition && selectedSlot && (
        <SubjectSelectionPopover
          position={popoverPosition}
          onSelect={handleSubjectSelect}
          onClose={() => {
            setSelectedSlot(null);
            setPopoverPosition(null);
          }}
        />
      )}
    </>
  );
}
