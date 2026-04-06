import React, { useState } from 'react';
import { X, Plus, Search, Laptop, Users, MapPin } from 'lucide-react';
import { EnergyPredictionGauge } from './EnergyPredictionGauge';
import { TimeSlot } from '../App';

interface ScheduleModalProps {
  schedule: TimeSlot[];
  availableRooms: string[];
  onUpdateSchedule: (newSchedule: TimeSlot[]) => void;
  onClose: () => void;
}

export function ScheduleModal({ schedule, availableRooms, onUpdateSchedule, onClose }: ScheduleModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<'On-site' | 'Online'>('On-site');
  const [selectedRoom, setSelectedRoom] = useState<string>(''); // เก็บค่าห้องที่เลือกใน Popover

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  const availableSubjects = [
    { code: 'CPE101', name: 'Programming', students: 35 },
    { code: 'CPE202', name: 'Network', students: 30 },
    { code: 'CPE303', name: 'Database Systems', students: 28 },
    { code: 'CPE404', name: 'AI Fundamentals', students: 32 },
  ].filter(sub => sub.code.toLowerCase().includes(searchQuery.toLowerCase()) || sub.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // ดึงคลาสเรียนทั้งหมดที่อยู่ในวันและเวลานั้น
  const getClassesInSlot = (day: string, time: string) => schedule.filter(s => s.day === day && s.time === time);

  // หาว่าห้องไหนถูกจองไปแล้วในวัน/เวลานั้นบ้าง (เพื่อนำไป Disable ปุ่ม)
  const getBookedRoomsInSlot = (day: string, time: string) => getClassesInSlot(day, time).map(s => s.room);

  // เปิด Popover เพิ่มคลาส
  const handleOpenAddPopover = (day: string, time: string) => {
    setSelectedSlot({ day, time });
    setSelectedMode('On-site');
    setSelectedRoom(''); // รีเซ็ตห้อง
    setSearchQuery('');
  };

  // ลบคลาสเฉพาะตัวที่กด
  const handleDeleteClass = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // ป้องกันไม่ให้ทะลุไปคลิกเปิด Popover
    if (window.confirm('ลบวิชานี้ออกจากตารางใช่ไหม?')) {
      onUpdateSchedule(schedule.filter(s => s.id !== id));
    }
  };

  // กดยืนยันเพิ่มคลาส
  const handleSubjectSelect = (subject: typeof availableSubjects[0]) => {
    if (selectedSlot && selectedRoom) {
      const newClass: TimeSlot = {
        id: Math.random().toString(36).substr(2, 9), // สุ่ม ID
        day: selectedSlot.day,
        time: selectedSlot.time,
        room: selectedRoom,
        mode: selectedMode,
        subject
      };
      onUpdateSchedule([...schedule, newClass]);
      setSelectedSlot(null);
    } else if (!selectedRoom) {
      alert("กรุณาเลือกห้องก่อนนะคะ!");
    }
  };

  const totalEnergyCost = schedule.reduce((total, slot) => total + (slot.mode === 'On-site' ? 2.5 : 0.5), 0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-[#0f0f0f]/95 backdrop-blur-xl rounded-2xl border border-lime-500/30 shadow-2xl w-full max-w-[90vw] max-h-[90vh] overflow-hidden flex relative">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-[#121212]">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><span className="w-2 h-6 bg-lime-500 rounded-full"></span> Master Class Schedule</h2>
              <p className="text-gray-400 text-[11px] mt-1">จัดการตารางเรียนทุกห้องในตึกเดียว</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center"><X size={16} /></button>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-[#0a0a0a]/50">
            <div className="min-w-max text-xs">
              <div className="grid grid-cols-6 gap-2">
                <div className="bg-[#1a1a1a] rounded-lg p-2 text-center uppercase tracking-widest text-gray-500 font-bold border border-gray-800">Time</div>
                {days.map(day => (<div key={day} className="bg-[#1a1a1a] rounded-lg p-2 text-center text-white font-bold border border-gray-800">{day}</div>))}

                {timeSlots.map(time => (
                  <React.Fragment key={`time-${time}`}>
                    <div className="bg-[#151515] rounded-lg p-2 flex items-center justify-center text-lime-400 font-mono font-bold border border-gray-800">{time}</div>
                    {days.map(day => {
                      const classesInSlot = getClassesInSlot(day, time);
                      const isSelected = selectedSlot?.day === day && selectedSlot?.time === time;

                      return (
                        <div key={`${day}-${time}`} 
                             onClick={() => handleOpenAddPopover(day, time)}
                             className={`relative rounded-xl p-1.5 min-h-[80px] border-2 cursor-pointer transition-all flex flex-col gap-1.5 ${isSelected ? 'bg-lime-500/10 border-lime-500/50' : 'bg-[#151515] border-gray-800 hover:border-gray-600'}`}>
                          
                          {/* ลูปแสดงการ์ดวิชาที่อยู่ในสล็อตเวลานี้ (ถ้ามีหลายห้องก็ซ้อนกัน) */}
                          {classesInSlot.map(cls => {
                            const isOnline = cls.mode === 'Online';
                            return (
                              <div key={cls.id} onClick={(e) => handleDeleteClass(e, cls.id)} className={`p-2 rounded-lg border flex flex-col gap-1 group hover:bg-red-500/10 hover:border-red-500/50 transition-colors ${isOnline ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-lime-500/10 border-lime-500/30'}`}>
                                <div className="flex justify-between items-start">
                                  <div className={`font-bold text-[9px] ${isOnline ? 'text-indigo-400' : 'text-lime-400'}`}>{cls.subject.code}</div>
                                  <div className={`text-[8px] font-black uppercase px-1 rounded ${isOnline ? 'bg-indigo-500/20 text-indigo-300' : 'bg-lime-500/20 text-lime-300'}`}>{cls.room}</div>
                                </div>
                                <div className="text-[9px] text-gray-300 truncate">{cls.subject.name}</div>
                              </div>
                            );
                          })}

                          {/* ปุ่มกดเพิ่ม (แสดงตอน Hover หรือไม่มีคลาสเลย) */}
                          <div className={`flex items-center justify-center h-full transition-opacity ${classesInSlot.length > 0 ? 'opacity-0 hover:opacity-100 py-1' : 'opacity-100'}`}>
                            <Plus size={16} className="text-gray-600" />
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* POPOVER เพิ่มวิชา */}
          {selectedSlot && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#121212] border border-gray-700 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] p-5 w-[340px] z-50">
              <h3 className="text-white font-bold mb-3 text-sm flex justify-between items-center">
                Add New Class <span className="bg-gray-800 text-[10px] px-2 py-0.5 rounded text-gray-400">{selectedSlot.day} {selectedSlot.time}</span>
              </h3>

              {/* 1. เลือกโหมด */}
              <div className="flex gap-2 mb-3 bg-[#0a0a0a] p-1 rounded-xl border border-gray-800">
                <button onClick={() => setSelectedMode('On-site')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${selectedMode === 'On-site' ? 'bg-lime-500 text-black' : 'text-gray-500'}`}><Users size={12}/> On-site</button>
                <button onClick={() => setSelectedMode('Online')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${selectedMode === 'Online' ? 'bg-indigo-500 text-white' : 'text-gray-500'}`}><Laptop size={12}/> Online</button>
              </div>

              {/* 2. เลือกห้อง (ของใหม่!) */}
              <div className="mb-3">
                <p className="text-[10px] text-gray-400 font-bold mb-1.5 flex items-center gap-1"><MapPin size={10} /> Select Room</p>
                <div className="grid grid-cols-2 gap-2">
                  {availableRooms.map(room => {
                    const isBooked = getBookedRoomsInSlot(selectedSlot.day, selectedSlot.time).includes(room);
                    return (
                      <button key={room} disabled={isBooked} onClick={() => setSelectedRoom(room)}
                        className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                          isBooked ? 'bg-gray-800/50 border-gray-800 text-gray-600 cursor-not-allowed line-through' 
                          : selectedRoom === room ? 'bg-white text-black border-white' 
                          : 'bg-[#1a1a1a] border-gray-700 text-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {room}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. ค้นหาวิชา */}
              <div className="mb-3 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={14} />
                <input type="text" placeholder="Search subject..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500/50" />
              </div>
              
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                {availableSubjects.map(sub => (
                  <button key={sub.code} onClick={() => handleSubjectSelect(sub)} className={`w-full bg-[#1a1a1a] border border-gray-800 rounded-xl p-2.5 text-left transition-all ${selectedRoom ? 'hover:border-lime-500/50 hover:bg-gray-800' : 'opacity-50 cursor-not-allowed'}`}>
                    <div className="font-bold text-white text-[11px]">{sub.code}</div>
                    <div className="text-gray-500 text-[9px]">{sub.name}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setSelectedSlot(null)} className="w-full mt-3 text-gray-500 hover:text-white text-[10px] font-bold py-1">ยกเลิก</button>
            </div>
          )}
        </div>

        <div className="w-72 bg-[#0d0d0d] border-l border-gray-800 p-5 flex flex-col gap-5 overflow-y-auto">
          <EnergyPredictionGauge totalClasses={schedule.length} estimatedCost={totalEnergyCost} />
        </div>
      </div>
    </div>
  );
}