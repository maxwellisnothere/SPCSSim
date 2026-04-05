import { useState } from 'react';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';

interface FloorPlanProps {
  onRoomClick: (roomName: string) => void;
}

export function FloorPlan({ onRoomClick }: FloorPlanProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 relative">
      {/* Title */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Building Floor Plan (Interactive 2D)</h2>

      {/* Controls */}
      <div className="absolute top-6 right-6 flex gap-2 z-10">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          title="Zoom In"
        >
          <ZoomIn size={20} className="text-gray-700" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          title="Zoom Out"
        >
          <ZoomOut size={20} className="text-gray-700" />
        </button>
        <button
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          title="Pan"
        >
          <Move size={20} className="text-gray-700" />
        </button>
      </div>

      {/* Floor Plan SVG Area */}
      <div
        className="bg-gray-50 rounded border-2 border-gray-300 overflow-hidden cursor-move"
        style={{ height: '600px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 600"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transition: isPanning ? 'none' : 'transform 0.2s ease'
          }}
        >
          {/* Background Grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E7EB" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="800" height="600" fill="url(#grid)" />

          {/* Cafe */}
          <g onClick={() => onRoomClick('Cafe')} className="cursor-pointer">
            <rect
              x="50" y="50" width="200" height="150"
              fill="#DBEAFE"
              stroke="#3B82F6"
              strokeWidth="2"
              rx="4"
              className="hover:fill-blue-200 transition-colors"
            />
            <text x="150" y="115" textAnchor="middle" className="text-sm font-semibold fill-gray-800">
              Cafe
            </text>
            <text x="150" y="135" textAnchor="middle" className="text-xs fill-gray-600">
              👤 45 | ⚡ 2.3 kW
            </text>
          </g>

          {/* Lounge */}
          <g onClick={() => onRoomClick('Lounge')} className="cursor-pointer">
            <rect
              x="280" y="50" width="200" height="150"
              fill="#DBEAFE"
              stroke="#3B82F6"
              strokeWidth="2"
              rx="4"
              className="hover:fill-blue-200 transition-colors"
            />
            <text x="380" y="115" textAnchor="middle" className="text-sm font-semibold fill-gray-800">
              Lounge
            </text>
            <text x="380" y="135" textAnchor="middle" className="text-xs fill-gray-600">
              👤 28 | ⚡ 1.8 kW
            </text>
          </g>

          {/* Classroom 101 */}
          <g onClick={() => onRoomClick('CPE101')} className="cursor-pointer">
            <rect
              x="510" y="50" width="240" height="150"
              fill="#FEF3C7"
              stroke="#F59E0B"
              strokeWidth="2"
              rx="4"
              className="hover:fill-yellow-200 transition-colors"
            />
            <text x="630" y="115" textAnchor="middle" className="text-sm font-semibold fill-gray-800">
              Classroom CPE101
            </text>
            <text x="630" y="135" textAnchor="middle" className="text-xs fill-gray-600">
              👤 35 | ⚡ 3.1 kW | 🌡️ 22°C
            </text>
          </g>

          {/* Classroom 202 */}
          <g onClick={() => onRoomClick('CPE202')} className="cursor-pointer">
            <rect
              x="50" y="230" width="240" height="150"
              fill="#FEF3C7"
              stroke="#F59E0B"
              strokeWidth="2"
              rx="4"
              className="hover:fill-yellow-200 transition-colors"
            />
            <text x="170" y="295" textAnchor="middle" className="text-sm font-semibold fill-gray-800">
              Classroom CPE202
            </text>
            <text x="170" y="315" textAnchor="middle" className="text-xs fill-gray-600">
              👤 28 | ⚡ 2.8 kW | 🌡️ 23°C
            </text>
          </g>

          {/* Classroom 303 */}
          <g onClick={() => onRoomClick('CPE303')} className="cursor-pointer">
            <rect
              x="320" y="230" width="240" height="150"
              fill="#FEF3C7"
              stroke="#F59E0B"
              strokeWidth="2"
              rx="4"
              className="hover:fill-yellow-200 transition-colors"
            />
            <text x="440" y="295" textAnchor="middle" className="text-sm font-semibold fill-gray-800">
              Classroom CPE303
            </text>
            <text x="440" y="315" textAnchor="middle" className="text-xs fill-gray-600">
              👤 32 | ⚡ 2.9 kW | 🌡️ 21°C
            </text>
          </g>

          {/* Classroom 404 */}
          <g onClick={() => onRoomClick('CPE404')} className="cursor-pointer">
            <rect
              x="50" y="410" width="240" height="150"
              fill="#FEF3C7"
              stroke="#F59E0B"
              strokeWidth="2"
              rx="4"
              className="hover:fill-yellow-200 transition-colors"
            />
            <text x="170" y="475" textAnchor="middle" className="text-sm font-semibold fill-gray-800">
              Classroom CPE404
            </text>
            <text x="170" y="495" textAnchor="middle" className="text-xs fill-gray-600">
              👤 30 | ⚡ 3.0 kW | 🌡️ 22°C
            </text>
          </g>

          {/* Lab Room */}
          <g onClick={() => onRoomClick('Lab CPE495')} className="cursor-pointer">
            <rect
              x="320" y="410" width="430" height="150"
              fill="#D1FAE5"
              stroke="#10B981"
              strokeWidth="2"
              rx="4"
              className="hover:fill-green-200 transition-colors"
            />
            <text x="535" y="475" textAnchor="middle" className="text-sm font-semibold fill-gray-800">
              Computer Lab CPE495
            </text>
            <text x="535" y="495" textAnchor="middle" className="text-xs fill-gray-600">
              👤 25 | ⚡ 4.5 kW | 🌡️ 20°C
            </text>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-200 border-2 border-blue-600 rounded"></div>
          <span className="text-gray-600">Common Areas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-600 rounded"></div>
          <span className="text-gray-600">Classrooms</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 border-2 border-green-600 rounded"></div>
          <span className="text-gray-600">Labs</span>
        </div>
      </div>
    </div>
  );
}
