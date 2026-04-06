import React from 'react';
import { TimeSlot } from '../App';

interface FloorPlanProps {
  selectedFloor: 'floor1' | 'floor2' | 'floor3';
  simTime: string;
  simDay: string;
  masterSchedule?: TimeSlot[]; 
  meetingRooms?: any[]; 
  onRoomClick?: (roomName: string) => void; // 💡 1. เพิ่ม Prop สำหรับรับคำสั่งตอนโดนคลิก
}

export const FloorPlanDark: React.FC<FloorPlanProps> = ({ 
  selectedFloor, 
  simTime, 
  simDay, 
  masterSchedule = [],
  meetingRooms = [], 
  onRoomClick // 💡 2. รับค่า onRoomClick มาใช้งาน
}) => {

  const getRoomStatus = (roomName: string) => {
    const simHour = simTime.split(':')[0];
    const activeClass = masterSchedule.find(s => {
      const classHour = s.time.split(':')[0];
      return s.room === roomName && s.day === simDay && classHour === simHour;
    });

    if (activeClass) return { active: true, mode: activeClass.mode, subject: activeClass.subject.code };
    return { active: false, mode: 'Standby', subject: '' };
  };

  const getMeetingRoomStatus = (roomName: string) => {
    const room = meetingRooms.find(r => r.name === roomName);
    if (!room) return { active: false, user: '' };

    const simHourNum = parseInt(simTime.split(':')[0], 10);
    const activeBooking = room.bookedSlots?.find((slot: any) => 
      slot.day === simDay && simHourNum >= slot.start && simHourNum < slot.end
    );

    if (activeBooking) return { active: true, user: activeBooking.user };
    return { active: false, user: '' };
  };

  const renderRoom = (roomName: string, basePower: number, activePower: number, onlinePower: number) => {
    const status = getRoomStatus(roomName);
    let bgClass = "bg-[#121212]";
    let borderClass = "border-gray-800";
    let textClass = "text-gray-500";
    let powerText = `${basePower.toFixed(1)} kW (Standby)`;
    let shadowClass = "";

    if (status.active) {
      if (status.mode === 'On-site') {
        bgClass = "bg-lime-500/10 backdrop-blur-sm"; borderClass = "border-lime-500/50";
        shadowClass = "shadow-[0_0_30px_rgba(132,204,22,0.15)]"; textClass = "text-lime-400";
        powerText = `${activePower.toFixed(1)} kW (On-site: ${status.subject})`;
      } else {
        bgClass = "bg-indigo-500/10 backdrop-blur-sm"; borderClass = "border-indigo-500/50";
        shadowClass = "shadow-[0_0_30px_rgba(99,102,241,0.15)]"; textClass = "text-indigo-400";
        powerText = `${onlinePower.toFixed(1)} kW (Online: ${status.subject})`;
      }
    }

    return (
      <div 
        key={roomName} 
        onClick={() => onRoomClick && onRoomClick(roomName)} // 💡 3. สั่งให้ส่งชื่อห้องกลับไปเมื่อถูกคลิก
        className={`${bgClass} border-2 ${borderClass} ${shadowClass} rounded-2xl p-6 flex flex-col items-center justify-center transition-all duration-1000 h-44 cursor-pointer hover:border-lime-500/80 hover:bg-lime-500/5`} // 💡 4. เพิ่ม cursor-pointer และ effect ตอนเอาเมาส์ชี้
      >
        <h3 className={`text-lg font-bold ${status.active ? 'text-white' : 'text-gray-500'} mb-2 transition-colors duration-700`}>{roomName}</h3>
        <div className={`text-sm font-medium flex items-center gap-2 ${textClass} transition-colors duration-700`}>
          {status.active && <span className={`w-2.5 h-2.5 rounded-full ${status.mode === 'On-site' ? 'bg-lime-400' : 'bg-indigo-400'} animate-pulse`}></span>}
          {powerText}
        </div>
      </div>
    );
  };

  const gridBackground = {
    backgroundImage: 'linear-gradient(#1f2937 1px, transparent 1px), linear-gradient(90deg, #1f2937 1px, transparent 1px)',
    backgroundSize: '40px 40px', backgroundColor: '#0a0a0a'
  };

  return (
    <div className="w-full bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden relative min-h-[500px] flex flex-col shadow-inner">
      <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-center z-20">
        <h2 className="text-white font-bold flex items-center gap-2">Building Floor Plan (Live 2D)<span className="w-2.5 h-2.5 bg-lime-500 rounded-full animate-pulse"></span></h2>
      </div>

      <div className="absolute inset-0 opacity-20 z-0" style={gridBackground}></div>

      <div className="relative z-10 p-12 mt-10 flex-1 flex items-center justify-center w-full">
        
        {/* --- ชั้น 1 --- */}
        {selectedFloor === 'floor1' && (
          <div className="flex flex-col gap-6 w-full max-w-5xl">
            <div className="grid grid-cols-2 gap-8 w-full">
               <div className="bg-amber-500/10 border-2 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.1)] rounded-2xl p-6 flex flex-col items-center justify-center h-44 transition-all duration-1000">
                 <h3 className="text-lg font-bold text-white mb-2">Cafe (24/7)</h3>
                 <div className="text-sm font-medium flex items-center gap-2 text-amber-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>4.5 kW (Active)</div>
               </div>
               <div className="bg-[#121212] border-2 border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center h-44">
                 <h3 className="text-lg font-bold text-gray-500 mb-2">Student Lounge</h3>
                 <div className="text-sm font-medium flex items-center gap-2 text-gray-500">1.2 kW (Standby)</div>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-6 w-full mt-2">
               {meetingRooms.length === 0 && (
                 <div className="col-span-3 text-center text-gray-600 text-xs py-4 animate-pulse">
                   กำลังเชื่อมต่อข้อมูลห้องประชุม...
                 </div>
               )}
               {meetingRooms.map((room) => {
                 const status = getMeetingRoomStatus(room.name);
                 return (
                   <div key={room.id} className={`border-2 rounded-2xl p-4 flex flex-col items-center justify-center h-28 relative overflow-hidden transition-all duration-1000 ${
                     status.active ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'bg-[#121212]/50 border-dashed border-gray-700'
                   }`}>
                     {!status.active && <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]"></div>}
                     <h3 className={`text-sm font-bold mb-1 z-10 ${status.active ? 'text-red-400' : 'text-gray-500'}`}>{room.name}</h3>
                     <div className={`text-[10px] font-medium z-10 flex items-center gap-1 ${status.active ? 'text-red-300' : 'text-gray-600'}`}>
                        {status.active ? (
                          <><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span> In Use: {status.user}</>
                        ) : 'Available (Managed below)'}
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        {/* --- ชั้น 2 --- */}
        {selectedFloor === 'floor2' && (
          <div className="grid grid-cols-3 gap-6 w-full max-w-5xl">
            {['Classroom 101', 'Classroom 102', 'Classroom 103', 'Classroom 104', 'Classroom 105', 'Classroom 106'].map(room => renderRoom(room, 0.6, 4.2, 1.2))}
          </div>
        )}

        {/* --- ชั้น 3 --- */}
        {selectedFloor === 'floor3' && (
          <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
            {['Computer Lab A', 'Computer Lab B', 'Computer Lab C', 'Computer Lab D'].map(room => renderRoom(room, 1.8, 8.5, 3.0))}
          </div>
        )}
      </div>
    </div>
  );
};