import React from 'react';

export interface LiveRoomData {
  room_id: string;
  power_consumption_w: number;
  ai_mode_active: boolean;
  occupancy_count: number;
}

interface EnergyDataPanelProps {
  selectedFloor: 'floor1' | 'floor2' | 'floor3';
  liveRoomData?: LiveRoomData[]; // 💡 จุดที่ทำให้ Error หายคือบรรทัดนี้ครับ!
}

export function EnergyDataPanel({ selectedFloor, liveRoomData = [] }: EnergyDataPanelProps) {
  const floorRoomNames = {
    floor1: ['Cafe', 'Lounge', 'Meeting Room 1', 'Meeting Room 2', 'Meeting Room 3', 'Meeting Room 4', 'Meeting Room 5', 'Meeting Room 6'],
    floor2: ['Classroom 101', 'Classroom 102', 'Classroom 103', 'Classroom 104', 'Classroom 105', 'Classroom 106'],
    floor3: ['Computer Lab A', 'Computer Lab B', 'Computer Lab C', 'Computer Lab D']
  };

  const rooms = floorRoomNames[selectedFloor].map(roomName => {
    const liveData = liveRoomData.find(d => d.room_id === roomName);

    if (liveData) {
      const powerKw = liveData.power_consumption_w / 1000;
      let status = 'Standby';
      let statusClass = 'text-gray-400 bg-gray-500/10 border border-gray-500/20';

      if (powerKw > 0) {
        if (liveData.ai_mode_active) {
          status = 'Optimized'; 
          statusClass = 'text-lime-400 bg-lime-500/10 border border-lime-500/20';
        } else {
          status = 'Manual'; 
          statusClass = 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20';
        }
      } else if (liveData.occupancy_count > 0) {
        status = 'Locked'; 
        statusClass = 'text-red-400 bg-red-500/10 border border-red-500/20';
      }

      return { name: roomName, power: powerKw.toFixed(2), status, statusClass };
    }

    const fallbackPower = roomName.includes('Meeting') ? 0 : (roomName === 'Cafe' ? 12 : 8);
    return {
      name: roomName,
      power: fallbackPower.toFixed(2),
      status: fallbackPower > 0 ? 'Optimized' : 'Standby',
      statusClass: fallbackPower > 0 
        ? 'text-lime-400 bg-lime-500/10 border border-lime-500/20' 
        : 'text-gray-400 bg-gray-500/10 border border-gray-500/20'
    };
  });

  const totalPower = rooms.reduce((sum, room) => sum + parseFloat(room.power), 0).toFixed(2);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Live Energy Usage</h3>
        <div className="text-lime-400 text-lg font-mono font-bold drop-shadow-[0_0_10px_rgba(163,230,53,0.3)]">
          {totalPower} kW
        </div>
      </div>

      <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 overflow-hidden shadow-xl shadow-black/50">
        <div className="grid grid-cols-[2fr,1fr,1fr] gap-4 px-4 py-3 bg-[#151515] border-b border-gray-800">
          <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Room Name</div>
          <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest text-right">Power</div>
          <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest text-right">Status</div>
        </div>

        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {rooms.map((room, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[2fr,1fr,1fr] gap-4 px-4 py-3 border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors items-center"
            >
              <div className="text-gray-300 text-xs font-bold">{room.name}</div>
              <div className={`text-xs text-right font-mono font-bold ${parseFloat(room.power) > 0 ? 'text-white' : 'text-gray-600'}`}>
                {room.power} kW
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${room.statusClass}`}>
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