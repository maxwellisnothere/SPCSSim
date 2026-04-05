import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  power: number;
  devices: number;
}

interface FloorPlanDarkProps {
  selectedFloor: 'floor1' | 'floor2' | 'floor3';
}

export function FloorPlanDark({ selectedFloor }: FloorPlanDarkProps) {
  const [zoom, setZoom] = useState(1);

  const floorData: Record<string, Room[]> = {
    floor1: [
      { id: 'cafe', name: 'Cafe', x: 50, y: 50, width: 300, height: 200, power: 12, devices: 24 },
      { id: 'lounge', name: 'Lounge', x: 380, y: 50, width: 280, height: 200, power: 8, devices: 16 },
      { id: 'meeting1', name: 'Meeting Room 1', x: 50, y: 280, width: 140, height: 120, power: 2, devices: 4 },
      { id: 'meeting2', name: 'Meeting Room 2', x: 220, y: 280, width: 140, height: 120, power: 2, devices: 4 },
      { id: 'meeting3', name: 'Meeting Room 3', x: 390, y: 280, width: 140, height: 120, power: 2, devices: 4 },
      { id: 'meeting4', name: 'Meeting Room 4', x: 560, y: 280, width: 140, height: 120, power: 2, devices: 4 },
      { id: 'meeting5', name: 'Meeting Room 5', x: 50, y: 430, width: 140, height: 120, power: 2, devices: 4 },
      { id: 'meeting6', name: 'Meeting Room 6', x: 220, y: 430, width: 140, height: 120, power: 2, devices: 4 },
    ],
    floor2: [
      { id: 'classroom1', name: 'Classroom 101', x: 50, y: 50, width: 200, height: 180, power: 6, devices: 12 },
      { id: 'classroom2', name: 'Classroom 102', x: 280, y: 50, width: 200, height: 180, power: 6, devices: 12 },
      { id: 'classroom3', name: 'Classroom 103', x: 510, y: 50, width: 200, height: 180, power: 6, devices: 12 },
      { id: 'classroom4', name: 'Classroom 104', x: 50, y: 260, width: 200, height: 180, power: 6, devices: 12 },
      { id: 'classroom5', name: 'Classroom 105', x: 280, y: 260, width: 200, height: 180, power: 6, devices: 12 },
      { id: 'classroom6', name: 'Classroom 106', x: 510, y: 260, width: 200, height: 180, power: 6, devices: 12 },
    ],
    floor3: [
      { id: 'lab1', name: 'Computer Lab A', x: 50, y: 50, width: 320, height: 220, power: 18, devices: 36 },
      { id: 'lab2', name: 'Computer Lab B', x: 400, y: 50, width: 320, height: 220, power: 18, devices: 36 },
      { id: 'lab3', name: 'Computer Lab C', x: 50, y: 300, width: 320, height: 220, power: 18, devices: 36 },
      { id: 'lab4', name: 'Computer Lab D', x: 400, y: 300, width: 320, height: 220, power: 18, devices: 36 },
    ]
  };

  const rooms = floorData[selectedFloor];

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Building Floor Plan (Interactive 2D)</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center transition-colors"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center transition-colors"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <div className="bg-black rounded-lg p-8 overflow-auto" style={{ height: '600px' }}>
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s'
          }}
        >
          <svg width="750" height="600" className="mx-auto">
            {/* Grid Pattern */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a1a1a" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="750" height="600" fill="url(#grid)" />

            {/* Rooms */}
            {rooms.map(room => (
              <g key={room.id}>
                {/* Room Rectangle */}
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  height={room.height}
                  fill="#0f0f0f"
                  stroke="#333"
                  strokeWidth="2"
                  className="cursor-pointer hover:fill-[#1a1a1a] transition-all"
                  rx="4"
                />

                {/* Room Name */}
                <text
                  x={room.x + room.width / 2}
                  y={room.y + room.height / 2 - 10}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="14"
                  fontWeight="600"
                >
                  {room.name}
                </text>

                {/* Power Info */}
                <text
                  x={room.x + room.width / 2}
                  y={room.y + room.height / 2 + 10}
                  textAnchor="middle"
                  fill="#84cc16"
                  fontSize="12"
                >
                  {room.power} kW
                </text>

                {/* Active Device Indicators (Glowing Green Dots) */}
                {Array.from({ length: Math.min(8, room.devices) }).map((_, idx) => {
                  const cols = Math.ceil(Math.sqrt(Math.min(8, room.devices)));
                  const row = Math.floor(idx / cols);
                  const col = idx % cols;
                  const spacing = Math.min(room.width, room.height) / (cols + 1);

                  return (
                    <g key={idx}>
                      <circle
                        cx={room.x + spacing * (col + 1)}
                        cy={room.y + spacing * (row + 1) + 30}
                        r="4"
                        fill="#84cc16"
                        className="animate-pulse"
                      />
                      <circle
                        cx={room.x + spacing * (col + 1)}
                        cy={room.y + spacing * (row + 1) + 30}
                        r="8"
                        fill="none"
                        stroke="#84cc16"
                        strokeWidth="1"
                        opacity="0.3"
                      />
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
