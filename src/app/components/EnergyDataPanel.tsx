interface Room {
  name: string;
  power: number;
  status: 'Optimized' | 'Normal' | 'Alert';
}

interface EnergyDataPanelProps {
  selectedFloor: 'floor1' | 'floor2' | 'floor3';
}

export function EnergyDataPanel({ selectedFloor }: EnergyDataPanelProps) {
  const floorRooms: Record<string, Room[]> = {
    floor1: [
      { name: 'Cafe', power: 12, status: 'Optimized' },
      { name: 'Lounge', power: 8, status: 'Optimized' },
      { name: 'Meeting Room 1', power: 2, status: 'Optimized' },
      { name: 'Meeting Room 2', power: 2, status: 'Optimized' },
      { name: 'Meeting Room 3', power: 2, status: 'Optimized' },
      { name: 'Meeting Room 4', power: 2, status: 'Optimized' },
      { name: 'Meeting Room 5', power: 2, status: 'Optimized' },
      { name: 'Meeting Room 6', power: 2, status: 'Optimized' },
    ],
    floor2: [
      { name: 'Classroom 101', power: 6, status: 'Optimized' },
      { name: 'Classroom 102', power: 6, status: 'Optimized' },
      { name: 'Classroom 103', power: 6, status: 'Normal' },
      { name: 'Classroom 104', power: 6, status: 'Optimized' },
      { name: 'Classroom 105', power: 6, status: 'Optimized' },
      { name: 'Classroom 106', power: 6, status: 'Optimized' },
    ],
    floor3: [
      { name: 'Computer Lab A', power: 18, status: 'Optimized' },
      { name: 'Computer Lab B', power: 18, status: 'Optimized' },
      { name: 'Computer Lab C', power: 18, status: 'Normal' },
      { name: 'Computer Lab D', power: 18, status: 'Optimized' },
    ]
  };

  const rooms = floorRooms[selectedFloor];
  const totalPower = rooms.reduce((sum, room) => sum + room.power, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Energy Consumption Estimate</h3>
        <div className="text-lime-400 text-sm font-mono">{totalPower} kW</div>
      </div>

      <div className="bg-[#0a0a0a] rounded-lg border border-gray-800 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr,1fr,1fr] gap-4 px-4 py-3 bg-[#1a1a1a] border-b border-gray-800">
          <div className="text-gray-400 text-xs font-medium uppercase">Room Name</div>
          <div className="text-gray-400 text-xs font-medium uppercase text-right">Power</div>
          <div className="text-gray-400 text-xs font-medium uppercase text-right">Status</div>
        </div>

        {/* Table Rows */}
        <div className="max-h-96 overflow-y-auto">
          {rooms.map((room, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[2fr,1fr,1fr] gap-4 px-4 py-3 border-b border-gray-800/50 hover:bg-[#1a1a1a] transition-colors"
            >
              <div className="text-gray-200 text-sm">{room.name}</div>
              <div className="text-white text-sm text-right font-mono">{room.power} kW</div>
              <div className="text-right">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    room.status === 'Optimized'
                      ? 'text-lime-400 bg-lime-500/10'
                      : room.status === 'Normal'
                      ? 'text-yellow-400 bg-yellow-500/10'
                      : 'text-red-400 bg-red-500/10'
                  }`}
                >
                  {room.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
