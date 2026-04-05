import { useState } from 'react';
import { Search } from 'lucide-react';

interface Subject {
  code: string;
  name: string;
  students: number;
}

interface SubjectSelectionPopoverProps {
  position: { x: number; y: number };
  onSelect: (subject: Subject) => void;
  onClose: () => void;
}

const availableSubjects: Subject[] = [
  { code: 'CPE101', name: 'Programming', students: 35 },
  { code: 'CPE202', name: 'Digital Circuit', students: 28 },
  { code: 'CPE303', name: 'Data Structures', students: 32 },
  { code: 'CPE404', name: 'Computer Networks', students: 30 },
  { code: 'CPE505', name: 'AI & ML', students: 25 },
];

export function SubjectSelectionPopover({ position, onSelect, onClose }: SubjectSelectionPopoverProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const filteredSubjects = availableSubjects.filter(subject =>
    subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-80"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          maxHeight: '400px',
          overflow: 'hidden'
        }}
      >
        {/* Search Header */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search Subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Subject List */}
        <div className="overflow-y-auto max-h-[320px]">
          {filteredSubjects.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No subjects found
            </div>
          ) : (
            filteredSubjects.map((subject, index) => (
              <div
                key={subject.code}
                onClick={() => onSelect(subject)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between p-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                  hoveredIndex === index ? 'bg-blue-50' : 'bg-white'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">{subject.code}</span>
                    <span className="text-sm text-gray-600">-</span>
                    <span className="text-sm text-gray-700">{subject.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <span>👤</span>
                  <span>{subject.students}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
