import React, { useState, useEffect } from 'react';
import { User, Clock, Zap, Calendar, X, AlertCircle, CalendarDays } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface BookedSlot {
  day: string;
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

// 💡 เพิ่ม onRoomsUpdate ใน Props
interface MeetingRoomProps {
  currentSimDay?: string; 
  onRoomsUpdate?: (rooms: any[]) => void; 
}

const WORK_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function MeetingRoomCluster({ currentSimDay = 'Monday', onRoomsUpdate }: MeetingRoomProps) { 
  const [showBookingForm, setShowBookingForm] = useState<string | null>(null); 
  const [bookingData, setBookingData] = useState<{ user: string; day: string; startHour: number | '' }>({ 
    user: '', day: currentSimDay, startHour: '' 
  });
  const [error, setError] = useState<string>('');
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('rooms')
      .select(`id, name, status, "autoOffEnabled", bookings ( day, start_hour, end_hour, user_name )`);

    if (error) {
      console.error('Error fetching rooms:', error);
      setError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
      setIsLoading(false);
      return;
    }

    if (data) {
      const formattedRooms: MeetingRoom[] = data.map((room: any) => ({
        id: room.id,
        name: room.name,
        status: room.status,
        autoOffEnabled: room.autoOffEnabled,
        bookedSlots: room.bookings ? room.bookings.map((b: any) => ({
          day: b.day, start: b.start_hour, end: b.end_hour, user: b.user_name
        })) : []
      }));
      setRooms(formattedRooms);
      if (onRoomsUpdate) onRoomsUpdate(formattedRooms); // 💡 ส่งข้อมูลขึ้นไปให้ App.tsx
    }
    setIsLoading(false);
  };

  const isSlotAvailable = (roomId: string, targetDay: string, start: number, end: number): boolean => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return false;
    return !room.bookedSlots.some(slot => {
      if (slot.day !== targetDay) return false; 
      return !(end <= slot.start || start >= slot.end);
    });
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const { user, day, startHour } = bookingData;
    const roomId = showBookingForm;

    if (!roomId || !user || startHour === '') return setError('โปรดกรอกข้อมูลให้ครบถ้วนค่ะ');

    const start = Number(startHour);
    const end = start + 1; 

    if (isSlotAvailable(roomId, day, start, end)) {
      const { error: insertError } = await supabase
        .from('bookings').insert([{ room_id: roomId, day: day, user_name: user, start_hour: start, end_hour: end }]);

      if (insertError) {
        setError('เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูลค่ะ');
      } else {
        await supabase.from('rooms').update({ status: 'Occupied' }).eq('id', roomId);
        await fetchRooms();
        setError('');
        setBookingData({ user: user, day: currentSimDay, startHour: '' });
        alert(`🎉 จองสำเร็จ! ข้อมูลถูกบันทึกลงระบบคลาวด์เรียบร้อยแล้วค่ะ`);
        setShowBookingForm(null); 
      }
    } else {
      setError('ช่วงเวลานี้ของวันดังกล่าวมีการจองไว้แล้วค่ะ');
    }
  };

  const toggleAutoOff = async (roomId: string, currentStatus: boolean) => {
    const newRooms = rooms.map(room => room.id === roomId ? { ...room, autoOffEnabled: !currentStatus } : room);
    setRooms(newRooms);
    if (onRoomsUpdate) onRoomsUpdate(newRooms); // 💡 ส่งข้อมูลอัปเดตขึ้นไปให้ App.tsx

    await supabase.from('rooms').update({ "autoOffEnabled": !currentStatus }).eq('id', roomId);
  };

  const activeRoom = rooms.find(r => r.id === showBookingForm);
  const availableHours = activeRoom ? WORK_HOURS.filter(hour => isSlotAvailable(activeRoom.id, bookingData.day, hour, hour + 1)) : [];

  if (isLoading) return <div className="flex justify-center p-12 text-lime-400"><Zap className="animate-pulse mr-2" /> กำลังเชื่อมต่อฐานข้อมูล...</div>;

  // ... (ส่วน Return หน้าตา UI ด้านล่างเหมือนเดิมทุกประการค่ะ)
  return (
    <div className="bg-[#0a0a0a] p-8 text-gray-100 font-sans">
      <div className="max-w-6xl mx-auto bg-[#151515] rounded-2xl border border-gray-800 p-8 shadow-2xl">
        <div className="flex justify-between items-end mb-8 border-b border-gray-800 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Calendar className="text-lime-400" /> Meeting Room Cluster
            </h2>
            <p className="text-gray-400 mt-2">สถานะการใช้งานของวัน: <span className="text-lime-400 font-bold uppercase">{currentSimDay}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map(room => {
            const todaySlots = room.bookedSlots.filter(slot => slot.day === currentSimDay);
            return (
              <div key={room.id} className={`group relative bg-[#0f0f0f] rounded-xl p-6 border transition-all duration-300 hover:scale-[1.02] ${room.status === 'Occupied' ? 'border-lime-500/50 shadow-[0_0_20px_rgba(163,230,53,0.1)]' : 'border-gray-800 hover:border-gray-600'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-xl font-bold text-white">{room.name}</h4>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${room.status === 'Occupied' ? 'bg-lime-500 text-black' : 'bg-gray-800 text-gray-400'}`}>{room.status}</span>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-400"><Clock size={16} /><span>{todaySlots.length} Bookings today</span></div>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full mb-6 overflow-hidden flex relative">
                  {todaySlots.map((slot, i) => {
                    if(slot.end <= 9 || slot.start >= 18) return null; 
                    return <div key={i} className="absolute h-full bg-lime-500/80" style={{ left: `${((Math.max(9, slot.start) - 9) / 9) * 100}%`, width: `${((Math.min(18, slot.end) - Math.max(9, slot.start)) / 9) * 100}%` }} title={`${slot.start}:00 - ${slot.end}:00`} />
                  })}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowBookingForm(room.id); setBookingData({ ...bookingData, day: currentSimDay, startHour: '' }); }} className="flex-1 bg-lime-500 hover:bg-lime-400 text-black font-bold py-2.5 rounded-lg transition-all text-sm">Book Now</button>
                  <button onClick={() => toggleAutoOff(room.id, room.autoOffEnabled)} className={`p-2.5 rounded-lg border transition-all ${room.autoOffEnabled ? 'bg-lime-500/10 border-lime-500/50 text-lime-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}><Zap size={18} fill={room.autoOffEnabled ? "currentColor" : "none"} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showBookingForm && activeRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151515] border border-gray-800 w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><CalendarDays size={20} className="text-lime-400" /> จองห้องประชุม</h3>
              <button onClick={() => { setShowBookingForm(null); setError(''); }} className="text-gray-500 hover:text-white"><X size={24} /></button>
            </div>
            <p className="text-gray-400 mb-6 text-sm">กำลังจอง: <span className="text-lime-400 font-bold">{activeRoom.name}</span></p>

            <form onSubmit={handleBooking} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">เลือกวัน</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {DAYS_OF_WEEK.map(d => (
                    <button type="button" key={d} onClick={() => setBookingData({...bookingData, day: d, startHour: ''})} className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${bookingData.day === d ? 'bg-lime-500 border-lime-500 text-black' : 'bg-[#0f0f0f] border-gray-800 text-gray-400'}`}>{d.substring(0, 3)}</button>
                  ))}
                </div>
              </div>

              <div className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Clock size={14} /> คิวจองวัน {bookingData.day}</h4>
                <div className="flex flex-wrap gap-2">
                  {activeRoom.bookedSlots.filter(slot => slot.day === bookingData.day).map((slot, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded border border-gray-700">{slot.start}:00 - {slot.end}:00 ({slot.user})</span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">ชื่อผู้จอง / หน่วยงาน</label>
                <input type="text" value={bookingData.user} onChange={(e) => setBookingData({...bookingData, user: e.target.value})} className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg py-3 px-4 text-white focus:border-lime-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">เลือกเวลา (เฉพาะเวลาที่ว่าง)</label>
                <select value={bookingData.startHour} onChange={(e) => setBookingData({...bookingData, startHour: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg py-3 px-4 text-white focus:border-lime-500">
                  <option value="" disabled>-- กรุณาเลือกเวลา (ครั้งละ 1 ชม.) --</option>
                  {availableHours.map((hour) => <option key={hour} value={hour}>{hour}:00 - {hour + 1}:00 น.</option>)}
                </select>
              </div>

              {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400 text-sm"><AlertCircle size={18} />{error}</div>}
              
              <button type="submit" disabled={availableHours.length === 0} className={`w-full font-bold py-4 rounded-xl transition-all ${availableHours.length > 0 ? 'bg-lime-500 hover:bg-lime-400 text-black' : 'bg-gray-800 text-gray-500'}`}>ยืนยันการจอง 1 ชั่วโมง</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}