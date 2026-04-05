import React, { useState } from 'react';
import { User, Clock, Zap, Calendar, X, AlertCircle } from 'lucide-react';

// --- Types & Interfaces ---
interface BookedSlot {
  start: number;
  end: number;
  user: string;
}

interface MeetingRoom {
  id: string;
  name: string;
  status: 'Available' | 'Occupied';
  currentUser?: string;
  bookedSlots: BookedSlot[];
  autoOffEnabled: boolean;
}

// กำหนดเวลาทำการ 09:00 - 18:00 (ตัวเลขคือเวลาเริ่มต้นของแต่ละ 1 ชม.)
const WORK_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

export default function App() {
  const [showBookingForm, setShowBookingForm] = useState<string | null>(null); 
  
  // ปรับ State การจองให้เก็บแค่ ชื่อผู้จอง และ เวลาเริ่ม (startHour)
  const [bookingData, setBookingData] = useState<{ user: string; startHour: number | '' }>({ 
    user: '', 
    startHour: '' 
  });
  const [error, setError] = useState<string>('');
  
  const [rooms, setRooms] = useState<MeetingRoom[]>([
    {
      id: 'meeting1',
      name: 'Meeting Room 1',
      status: 'Occupied',
      currentUser: 'John Doe',
      bookedSlots: [{ start: 9, end: 11, user: 'John Doe' }, { start: 14, end: 15, user: 'Jane Smith' }],
      autoOffEnabled: true,
    },
    {
      id: 'meeting2',
      name: 'Meeting Room 2',
      status: 'Available',
      bookedSlots: [{ start: 13, end: 14, user: 'Team Alpha' }],
      autoOffEnabled: true,
    },
    {
      id: 'meeting3',
      name: 'Meeting Room 3',
      status: 'Occupied',
      currentUser: 'Sarah Lee',
      bookedSlots: [{ start: 10, end: 11, user: 'Sarah Lee' }, { start: 15, end: 16, user: 'Bob Wilson' }],
      autoOffEnabled: false,
    },
    {
      id: 'meeting4',
      name: 'Meeting Room 4',
      status: 'Available',
      bookedSlots: [{ start: 11, end: 12, user: 'Product Team' }],
      autoOffEnabled: true,
    },
    {
      id: 'meeting5',
      name: 'Meeting Room 5',
      status: 'Available',
      bookedSlots: [],
      autoOffEnabled: true,
    },
    {
      id: 'meeting6',
      name: 'Meeting Room 6',
      status: 'Occupied',
      currentUser: 'Mike Chen',
      bookedSlots: [{ start: 9, end: 10, user: 'Mike Chen' }, { start: 16, end: 17, user: 'Design Team' }],
      autoOffEnabled: true,
    }
  ]);

  // ฟังก์ชันเช็กว่าช่วงเวลานั้นว่างหรือไม่
  const isSlotAvailable = (roomId: string, start: number, end: number): boolean => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return false;
    
    return !room.bookedSlots.some(slot => {
      // ตรวจสอบการทับซ้อนของเวลา
      return !(end <= slot.start || start >= slot.end);
    });
  };

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const { user, startHour } = bookingData;
    const roomId = showBookingForm;

    if (!roomId) return;
    if (!user) return setError('โปรดระบุชื่อผู้จองค่ะ');
    if (startHour === '') return setError('โปรดเลือกเวลาที่ต้องการจองค่ะ');

    const start = Number(startHour);
    const end = start + 1; // บังคับจองครั้งละ 1 ชั่วโมง

    if (isSlotAvailable(roomId, start, end)) {
      const newRooms = rooms.map(room => {
  if (room.id === roomId) {
    const newSlot: BookedSlot = { start, end, user };
    const updatedSlots = [...room.bookedSlots, newSlot].sort((a, b) => a.start - b.start);
    
    return { 
      ...room, 
      bookedSlots: updatedSlots,
      status: 'Occupied' as const, // 👈 เติม as const ตรงนี้ค่ะ
      currentUser: user
    };
  }
  return room;
});
      setRooms(newRooms);
      setError('');
      
      // ถ้ายืนยันแล้ว ปิด Modal เลย หรือจะเคลียร์ค่าเพื่อจองต่อก็ได้ค่ะ
      // ในที่นี้เคลียร์ค่า startHour ให้กลับไปว่าง เพื่อให้จองเพิ่มง่ายขึ้น
      setBookingData({ user: user, startHour: '' });
      alert(`🎉 จองสำเร็จ! เวลา ${String(start).padStart(2, '0')}:00 - ${String(end).padStart(2, '0')}:00 น.`);
      
    } else {
      setError('ช่วงเวลานี้มีการจองไว้แล้วค่ะ โปรดเลือกเวลาอื่นนะคะ');
    }
  };

  const toggleAutoOff = (roomId: string) => {
    setRooms(rooms.map(room =>
      room.id === roomId ? { ...room, autoOffEnabled: !room.autoOffEnabled } : room
    ));
  };

  // หาข้อมูลห้องที่กำลังเลือกเปิด Modal อยู่
  const activeRoom = rooms.find(r => r.id === showBookingForm);
  // หาเฉพาะเวลาที่ยังว่างอยู่ (ไว้แสดงใน Dropdown)
  const availableHours = activeRoom 
    ? WORK_HOURS.filter(hour => isSlotAvailable(activeRoom.id, hour, hour + 1))
    : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8 text-gray-100 font-sans">
      <div className="max-w-6xl mx-auto bg-[#151515] rounded-2xl border border-gray-800 p-8 shadow-2xl">
        <div className="flex justify-between items-end mb-8 border-b border-gray-800 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Calendar className="text-lime-400" /> Meeting Room Cluster
            </h2>
            <p className="text-gray-400 mt-2">ระบบจองห้องประชุมอัจฉริยะ คณะวิศวกรรมศาสตร์</p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-lime-500 rounded-full"></span> Occupied</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-700 rounded-full"></span> Available</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map(room => (
            <div
              key={room.id}
              className={`group relative bg-[#0f0f0f] rounded-xl p-6 border transition-all duration-300 hover:scale-[1.02] ${
                room.status === 'Occupied' 
                  ? 'border-lime-500/50 shadow-[0_0_20px_rgba(163,230,53,0.1)]' 
                  : 'border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-xl font-bold text-white">{room.name}</h4>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                  room.status === 'Occupied' ? 'bg-lime-500 text-black' : 'bg-gray-800 text-gray-400'
                }`}>
                  {room.status}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <User size={16} className={room.currentUser ? 'text-lime-400' : 'text-gray-600'} />
                  <span className={room.currentUser ? 'text-gray-200' : 'text-gray-500'}>
                    {room.currentUser || 'No active user'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <Clock size={16} className="text-gray-600" />
                  <span>{room.bookedSlots.length} Bookings today</span>
                </div>
              </div>

              {/* Progress Bar แสดงการจอง (ปรับให้เข้ากับ 9.00 - 18.00) */}
              <div className="h-1.5 w-full bg-gray-800 rounded-full mb-6 overflow-hidden flex relative">
                {room.bookedSlots.map((slot, i) => {
                  if(slot.end <= 9 || slot.start >= 18) return null; // ไม่แสดงนอกเวลาทำการ
                  const startPos = Math.max(9, slot.start);
                  const endPos = Math.min(18, slot.end);
                  return (
                    <div 
                      key={i}
                      className="absolute h-full bg-lime-500/80"
                      style={{ 
                        left: `${((startPos - 9) / 9) * 100}%`,
                        width: `${((endPos - startPos) / 9) * 100}%` 
                      }}
                      title={`${slot.start}:00 - ${slot.end}:00`}
                    />
                  )
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowBookingForm(room.id)}
                  className="flex-1 bg-lime-500 hover:bg-lime-400 text-black font-bold py-2.5 rounded-lg transition-all active:scale-95 text-sm"
                >
                  Book Now
                </button>
                <button
                  onClick={() => toggleAutoOff(room.id)}
                  className={`p-2.5 rounded-lg border transition-all ${
                    room.autoOffEnabled 
                      ? 'bg-lime-500/10 border-lime-500/50 text-lime-400' 
                      : 'bg-gray-800 border-gray-700 text-gray-500'
                  }`}
                >
                  <Zap size={18} fill={room.autoOffEnabled ? "currentColor" : "none"} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showBookingForm && activeRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151515] border border-gray-800 w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Calendar size={24} className="text-lime-400" /> จองห้องประชุม
              </h3>
              <button 
                onClick={() => { 
                  setShowBookingForm(null); 
                  setError(''); 
                  setBookingData({ user: '', startHour: '' });
                }} 
                className="text-gray-500 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-gray-400 mb-4 text-sm">
              กำลังจอง: <span className="text-lime-400 font-bold">{activeRoom.name}</span>
            </p>

            {/* ส่วนแสดงเวลาที่ถูกจองไปแล้ว */}
            <div className="mb-6 bg-[#0f0f0f] border border-gray-800 rounded-lg p-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                <Clock size={14} /> เวลาที่ถูกจองไปแล้ว (วันนี้)
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeRoom.bookedSlots.length > 0 ? (
                  activeRoom.bookedSlots
                    .filter(slot => slot.end > 9 && slot.start < 18) // กรองเฉพาะเวลาทำการ
                    .map((slot, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded border border-gray-700">
                        {String(slot.start).padStart(2, '0')}:00 - {String(slot.end).padStart(2, '0')}:00
                        <span className="text-gray-500 ml-1">({slot.user})</span>
                      </span>
                    ))
                ) : (
                  <span className="text-lime-400 text-xs">ว่างตลอดทั้งวันค่ะ!</span>
                )}
              </div>
            </div>

            <form onSubmit={handleBooking} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">ชื่อผู้จอง / หน่วยงาน</label>
                <input 
                  type="text" 
                  value={bookingData.user}
                  onChange={(e) => setBookingData({...bookingData, user: e.target.value})}
                  placeholder="เช่น CPE Team"
                  className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-lime-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">
                  เลือกเวลา (เฉพาะเวลาที่ว่าง)
                </label>
                <select 
                  value={bookingData.startHour}
                  onChange={(e) => setBookingData({...bookingData, startHour: e.target.value === '' ? '' : Number(e.target.value)})}
                  className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-lime-500"
                >
                  <option value="" disabled>-- กรุณาเลือกเวลา (ครั้งละ 1 ชม.) --</option>
                  {availableHours.map((hour) => (
                    <option key={hour} value={hour}>
                      {String(hour).padStart(2, '0')}:00 - {String(hour + 1).padStart(2, '0')}:00 น.
                    </option>
                  ))}
                </select>
                {availableHours.length === 0 && (
                  <p className="text-red-400 text-xs mt-2">ขออภัยค่ะ คิวจองของห้องนี้เต็มแล้วสำหรับวันนี้</p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400 text-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={availableHours.length === 0}
                className={`w-full font-bold py-4 rounded-xl transition-all ${
                  availableHours.length > 0 
                    ? 'bg-lime-500 hover:bg-lime-400 text-black shadow-lg shadow-lime-500/20' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                ยืนยันการจอง 1 ชั่วโมง
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}