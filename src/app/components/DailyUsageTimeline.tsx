import { X } from 'lucide-react';

interface MeetingRoom {
  id: string;
  name: string;
  bookedSlots: Array<{ start: number; end: number; user: string }>;
}

interface DailyUsageTimelineProps {
  room: MeetingRoom;
  onClose: () => void;
}

export function DailyUsageTimeline({ room, onClose }: DailyUsageTimelineProps) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

  return (
    <div className="bg-[#0a0a0a] border border-lime-500/30 rounded-lg p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-white font-semibold">{room.name} - Daily Usage Timeline</h4>
          <p className="text-gray-400 text-sm">Booking schedule for today</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Hour Labels */}
        <div className="flex mb-2">
          {hours.map(hour => (
            <div key={hour} className="flex-1 text-center text-gray-500 text-xs">
              {hour}:00
            </div>
          ))}
        </div>

        {/* Timeline Bar */}
        <div className="relative h-12 bg-[#1a1a1a] rounded-lg overflow-hidden">
          {/* Grid Lines */}
          {hours.map((hour, index) => (
            <div
              key={hour}
              className="absolute top-0 bottom-0 border-l border-gray-800"
              style={{ left: `${(index / hours.length) * 100}%` }}
            />
          ))}

          {/* Booked Slots */}
          {room.bookedSlots.map((slot, index) => {
            const startPercent = ((slot.start - 8) / (hours.length - 1)) * 100;
            const widthPercent = ((slot.end - slot.start) / (hours.length - 1)) * 100;

            return (
              <div
                key={index}
                className="absolute top-1 bottom-1 bg-lime-500 rounded flex items-center justify-center group cursor-pointer"
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                }}
              >
                <span className="text-black text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  {slot.user}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-lime-500 rounded"></div>
            <span className="text-gray-400 text-xs">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#1a1a1a] rounded border border-gray-800"></div>
            <span className="text-gray-400 text-xs">Available</span>
          </div>
        </div>

        {/* Booking Details */}
        {room.bookedSlots.length > 0 && (
          <div className="mt-4 space-y-2">
            {room.bookedSlots.map((slot, index) => (
              <div key={index} className="bg-[#1a1a1a] rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-semibold">{slot.user}</div>
                  <div className="text-gray-400 text-xs">
                    {slot.start}:00 - {slot.end}:00 ({slot.end - slot.start}h)
                  </div>
                </div>
                <div className="text-lime-400 text-xs font-semibold">Confirmed</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
