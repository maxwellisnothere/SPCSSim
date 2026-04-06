import { useState, useEffect } from 'react';
import { X, Users, Wind, Monitor, Lightbulb, Zap, Cpu } from 'lucide-react';

export interface RoomDeviceState {
  occupancy: number;
  acOn: boolean;
  acTemp: number;
  projectorOn: boolean;
  lightsOn: boolean;
  isAiOptimized: boolean; // ปุ่มเปิดระบบ AI ช่วยประหยัด
}

interface RoomConfigModalProps {
  roomName: string;
  initialState: RoomDeviceState;
  onSave: (roomName: string, newState: RoomDeviceState, calculatedPower: number) => void;
  onClose: () => void;
}

export function RoomConfigModal({ roomName, initialState, onSave, onClose }: RoomConfigModalProps) {
  const [state, setState] = useState<RoomDeviceState>(initialState);
  const [roomPowerKw, setRoomPowerKw] = useState(0);

  // ฟังก์ชันคำนวณการกินไฟของห้องนี้ (ทำงานทุกครั้งที่มีการปรับตั้งค่า)
  useEffect(() => {
    let powerW = 0;
    
    // 1. ระบบปรับอากาศ (แอร์ 36,000 BTU ~ 3600W)
    if (state.acOn) {
      let baseAcPower = 3600;
      // ถ้าเปิด AI และไม่มีคนอยู่เลย แอร์จะหรี่การทำงานลง 80% หรือปิดไปเลย
      if (state.isAiOptimized && state.occupancy === 0) {
        baseAcPower = 0; 
      } else {
        // ยิ่งตั้งอุณหภูมิต่ำ ยิ่งกินไฟ (สมมติลด 1 องศา กินไฟเพิ่ม 5%)
        const tempDiff = 25 - state.acTemp;
        baseAcPower += (tempDiff * 180); 
      }
      powerW += baseAcPower;
    }

    // 2. แสงสว่าง (หลอด LED 12 หลอด หลอดละ 9W = 108W)
    if (state.lightsOn) {
      let lightPower = 108;
      // ถ้าเปิด AI และโปรเจกเตอร์ทำงานอยู่ AI จะหรี่ไฟลง 50%
      if (state.isAiOptimized && state.projectorOn) {
        lightPower *= 0.5;
      }
      powerW += lightPower;
    }

    // 3. โปรเจกเตอร์ (300W)
    if (state.projectorOn) {
      powerW += 300;
    }

    // 4. อุปกรณ์ส่วนตัว (Plug Loads) อิงจากจำนวนคน
    // สมมติ 60% ของคนในห้องใช้ Laptop (75W) และชาร์จมือถือ (10W)
    const plugLoadPerPerson = (0.6 * 75) + (0.6 * 10);
    powerW += state.occupancy * plugLoadPerPerson;

    // แปลงหน่วยจาก Watt เป็น Kilowatt (kW)
    setRoomPowerKw(powerW / 1000);
  }, [state]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#151515] border border-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-[#1a1a1a]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {roomName}
            </h2>
            <div className="text-lime-400 text-sm font-mono mt-1 flex items-center gap-1">
              <Zap size={14} /> Current Load: {roomPowerKw.toFixed(2)} kW
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body / Controls */}
        <div className="p-6 space-y-6">
          
          {/* AI Optimization Toggle */}
          <div className="flex items-center justify-between bg-lime-500/10 p-4 rounded-lg border border-lime-500/20">
            <div className="flex items-center gap-3">
              <Cpu className="text-lime-400" size={24} />
              <div>
                <div className="text-white font-medium">Smart AI Mode</div>
                <div className="text-gray-400 text-xs">Auto-adjust AC & Lights based on context</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={state.isAiOptimized} onChange={(e) => setState({...state, isAiOptimized: e.target.checked})} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-500"></div>
            </label>
          </div>

          {/* Occupancy Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300 flex items-center gap-2"><Users size={16}/> Occupancy (คน)</span>
              <span className="text-lime-400 font-bold">{state.occupancy} / 40</span>
            </div>
            <input type="range" min="0" max="40" value={state.occupancy} onChange={(e) => setState({...state, occupancy: parseInt(e.target.value)})} className="w-full accent-lime-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* AC Control */}
            <div className="bg-[#0f0f0f] p-4 rounded-lg border border-gray-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm flex items-center gap-2"><Wind size={16}/> AC Unit</span>
                <input type="checkbox" checked={state.acOn} onChange={(e) => setState({...state, acOn: e.target.checked})} className="accent-lime-500 w-4 h-4" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500">Temp</span>
                <input type="number" disabled={!state.acOn} value={state.acTemp} onChange={(e) => setState({...state, acTemp: parseInt(e.target.value)})} className="w-16 bg-[#1a1a1a] text-white text-sm px-2 py-1 rounded border border-gray-700 text-center" />
                <span className="text-xs text-gray-500">°C</span>
              </div>
            </div>

            {/* Other Devices */}
            <div className="bg-[#0f0f0f] p-4 rounded-lg border border-gray-800 flex flex-col justify-between gap-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm flex items-center gap-2"><Monitor size={16}/> Projector</span>
                <input type="checkbox" checked={state.projectorOn} onChange={(e) => setState({...state, projectorOn: e.target.checked})} className="accent-lime-500 w-4 h-4" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm flex items-center gap-2"><Lightbulb size={16}/> Lights</span>
                <input type="checkbox" checked={state.lightsOn} onChange={(e) => setState({...state, lightsOn: e.target.checked})} className="accent-lime-500 w-4 h-4" />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 bg-[#1a1a1a] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={() => onSave(roomName, state, roomPowerKw)} className="px-6 py-2 rounded-lg text-sm font-bold bg-lime-500 text-black hover:bg-lime-400 transition-colors">Save Changes</button>
        </div>
      </div>
    </div>
  );
}