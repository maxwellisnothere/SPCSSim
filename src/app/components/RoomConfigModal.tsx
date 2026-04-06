import { useState, useEffect } from 'react';
import { X, Users, Wind, Monitor, Lightbulb, Zap, Cpu, Wrench, Lock, UserCircle, Mail, Key, ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';
import { supabaseNew } from '../../supabaseClient'; 
import { toast } from 'sonner';

export interface RoomDeviceState {
  occupancy: number;
  acOn: boolean;
  acTemp: number;
  projectorOn: boolean;
  lightsOn: boolean;
  isAiOptimized: boolean;
  isLoggedIn: boolean;         
  maintenanceBypass: boolean;
  authorizedUser?: string;      
}

interface RoomConfigModalProps {
  roomName: string;
  initialState: RoomDeviceState;
  simTime?: string; // 💡 รับค่าเวลาจำลองมาด้วยเพื่อคำนวณอุณหภูมิข้างนอก
  onSave: (roomName: string, newState: RoomDeviceState, calculatedPower: number) => void;
  onClose: () => void;
}

export function RoomConfigModal({ roomName, initialState, simTime = '08:00', onSave, onClose }: RoomConfigModalProps) {
  const [state, setState] = useState<RoomDeviceState>({
    ...initialState,
    isLoggedIn: initialState.isLoggedIn ?? false
  });
  const [roomPowerKw, setRoomPowerKw] = useState(0);

  // View States
  const [view, setView] = useState<'login' | 'forgot' | 'verify' | 'reset'>('login');
  
  // Form States
  const [loginUser, setLoginUser] = useState(initialState.authorizedUser || '');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 1. ฟังก์ชัน Logout
  const handleLogout = () => {
    setState({ ...state, isLoggedIn: false, authorizedUser: '' });
    setLoginUser('');
    setLoginPass('');
    setView('login');
    toast.info('Logged out from ' + roomName);
  };

  // 2. ฟังก์ชัน Login
  const handleLogin = async () => {
    try {
      if (!supabaseNew) return;
      const { data, error } = await supabaseNew.from('teacher_profiles').select('*').eq('username', loginUser).single(); 
      
      if (error || !data) {
        setLoginError('ไม่พบชื่อผู้ใช้งานนี้ในระบบ'); 
        return;
      }
      
      if (data.password === loginPass) {
        setState({ ...state, isLoggedIn: true, authorizedUser: data.teacher_name || loginUser });
        setLoginError('');
        toast.success(`ยินดีต้อนรับ อ. ${data.teacher_name || loginUser}`);
      } else {
        setLoginError('รหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleRequestOTP = async () => {
    try {
      if (!supabaseNew) return;
      const { data: teacher, error: fetchError } = await supabaseNew.from('teacher_profiles').select('email').eq('username', loginUser).single();

      if (fetchError || !teacher?.email) {
        setLoginError('ไม่พบอีเมลที่ผูกกับชื่อผู้ใช้นี้');
        return;
      }

      const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
      const { error: insertError } = await supabaseNew.from('otp_storage').insert([{ email: teacher.email, code: generatedOTP }]);

      if (insertError) throw insertError;

      setResetEmail(teacher.email);
      toast.success('รหัส OTP ถูกส่งไปที่ ' + teacher.email);
      setView('verify');
      setLoginError('');
    } catch (err: any) {
      console.error("🔥 OTP Error Detail:", err.message || err); 
      setLoginError('ระบบขัดข้อง ไม่สามารถส่งรหัสได้ในขณะนี้');
    }
  };

  const handleVerifyOTP = async () => {
    if (!supabaseNew) return;
    const { data, error } = await supabaseNew.from('otp_storage').select('*').eq('email', resetEmail).eq('code', otpInput).order('created_at', { ascending: false }).limit(1).single();

    if (!error && data) {
      setView('reset');
      setLoginError('');
    } else {
      setLoginError('รหัสยืนยันไม่ถูกต้องหรือหมดอายุ');
    }
  };

  const handleResetPassword = async () => {
    if (!supabaseNew) return;
    const { error } = await supabaseNew.from('teacher_profiles').update({ password: newPassword }).eq('username', loginUser);

    if (!error) {
      toast.success('เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง');
      setView('login');
      setLoginPass('');
    } else {
      setLoginError('ไม่สามารถอัปเดตรหัสผ่านได้');
    }
  };

  // --- 🤖 6. AI Auto-Adjustment Logic ---
  useEffect(() => {
    if (state.isAiOptimized) {
      const isPowerAuthorized = state.isLoggedIn || state.maintenanceBypass;

      if (isPowerAuthorized && state.occupancy > 0) {
        let optimalTemp = 25;
        if (state.occupancy >= 30) optimalTemp = 23;      
        else if (state.occupancy >= 15) optimalTemp = 24; 

        setState(prev => ({
          ...prev,
          acOn: true,
          lightsOn: true,
          projectorOn: true,
          acTemp: optimalTemp
        }));
      } 
      else if (isPowerAuthorized && state.occupancy === 0) {
        setState(prev => ({
          ...prev,
          acOn: false,
          lightsOn: false,
          projectorOn: false
        }));
      }
    }
  }, [state.isAiOptimized, state.occupancy, state.isLoggedIn, state.maintenanceBypass]);

  // 💡 ดึงอุณหภูมิภายนอก (เหมือนใน App.tsx เป๊ะๆ)
  const getOutsideTemp = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    const temps = [25, 24, 24, 24, 25, 26, 28, 30, 32, 34, 36, 37, 38, 39, 38, 36, 34, 32, 30, 28, 27, 26, 25, 25];
    return temps[hour] || 30;
  };

  // 💡 คำนวณพลังงานแบบ Real-time ให้ตรงกับหน้าเว็บเป๊ะๆ
  useEffect(() => {
    let powerW = 0;
    const outdoorTemp = getOutsideTemp(simTime);
    const isPowerAuthorized = state.isLoggedIn || state.maintenanceBypass;
    
    if (isPowerAuthorized) {
      const aiForceOff = state.isAiOptimized && state.occupancy === 0;

      let finalAcOn = state.maintenanceBypass ? state.acOn : (state.acOn && !aiForceOff);
      let finalLightsOn = state.maintenanceBypass ? state.lightsOn : (state.lightsOn && !aiForceOff);
      let finalProjectorOn = state.maintenanceBypass ? state.projectorOn : (state.projectorOn && !aiForceOff);

      const tempDelta = Math.max(0, outdoorTemp - state.acTemp);
      const currentAcLoad = 3600 + (tempDelta * 150);

      if (finalAcOn) powerW += currentAcLoad;
      if (finalLightsOn) {
        if (state.isAiOptimized && finalProjectorOn && !state.maintenanceBypass) {
          powerW += (108 * 0.5);
        } else {
          powerW += 108;
        }
      }
      if (finalProjectorOn) powerW += 300;
      if (state.occupancy > 0) powerW += state.occupancy * 51;
    }
    setRoomPowerKw(powerW / 1000);
  }, [state, simTime]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#151515] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-[#1a1a1a]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">{roomName}</h2>
            <div className="text-lime-400 text-sm font-mono mt-1 flex items-center gap-1">
              <Zap size={14} className={roomPowerKw > 0 ? "animate-pulse" : ""} /> 
              Current Load: {roomPowerKw.toFixed(2)} kW
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-5 custom-scrollbar max-h-[80vh] overflow-y-auto">
          <div className="space-y-3">
            {!state.isLoggedIn && !state.maintenanceBypass ? (
              <div className="bg-gray-900/80 p-5 rounded-xl border border-gray-800 space-y-4">
                {view === 'login' && (
                  <>
                    <div className="text-lime-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-1"><Lock size={14} /> Teacher Authentication</div>
                    <input type="text" placeholder="Username" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} className="w-full bg-black text-white text-sm px-3 py-2.5 rounded-lg border border-gray-700 focus:border-lime-500 focus:outline-none" />
                    <input type="password" placeholder="Password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full bg-black text-white text-sm px-3 py-2.5 rounded-lg border border-gray-700 focus:border-lime-500 focus:outline-none" />
                    <div className="flex justify-end"><button onClick={() => setView('forgot')} className="text-[10px] text-gray-500 hover:text-lime-400 uppercase font-bold transition-colors">ลืมรหัสผ่าน?</button></div>
                    <button onClick={handleLogin} className="w-full bg-lime-500 hover:bg-lime-400 text-black font-black py-2.5 rounded-lg transition-all text-xs uppercase shadow-lg shadow-lime-500/10">Authorize Room Power</button>
                  </>
                )}

                {view === 'forgot' && (
                  <>
                    <div className="text-blue-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-1"><Mail size={14} /> Reset Password</div>
                    <p className="text-[10px] text-gray-400">ระบุ Username เพื่อรับรหัส OTP ทางอีเมล</p>
                    <input type="text" placeholder="Username" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} className="w-full bg-black text-white text-sm px-3 py-2.5 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none" />
                    <button onClick={handleRequestOTP} className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black py-2.5 rounded-lg transition-all text-xs uppercase">Send Verify Code</button>
                    <button onClick={() => setView('login')} className="w-full text-[10px] text-gray-500 font-bold uppercase flex items-center justify-center gap-1"><ArrowLeft size={10}/> กลับหน้าล็อกอิน</button>
                  </>
                )}

                {view === 'verify' && (
                  <>
                    <div className="text-orange-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-1"><Key size={14} /> Verification</div>
                    <p className="text-[10px] text-gray-400">รหัสถูกส่งไปที่: {resetEmail}</p>
                    <input type="text" placeholder="เลข 6 หลัก" maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value)} className="w-full bg-black text-white text-center text-xl font-mono py-2 rounded-lg border border-gray-700 focus:border-orange-500 focus:outline-none tracking-[0.5em]" />
                    <button onClick={handleVerifyOTP} className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-2.5 rounded-lg transition-all text-xs uppercase">Verify Code</button>
                  </>
                )}

                {view === 'reset' && (
                  <>
                    <div className="text-purple-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-1"><RefreshCw size={14} /> New Password</div>
                    <input type="password" placeholder="รหัสผ่านใหม่" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-black text-white text-sm px-3 py-2.5 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none" />
                    <button onClick={handleResetPassword} className="w-full bg-purple-500 hover:bg-purple-400 text-white font-black py-2.5 rounded-lg transition-all text-xs uppercase">Update Password</button>
                  </>
                )}

                {loginError && <p className="text-red-400 text-[10px] font-bold text-center animate-pulse">{loginError}</p>}
              </div>
            ) : (
              state.isLoggedIn && (
                <div className="flex items-center justify-between p-4 rounded-xl border bg-blue-500/10 border-blue-500/30 text-blue-400">
                  <div className="flex items-center gap-3">
                    <UserCircle size={24} />
                    <div><div className="text-[10px] font-black uppercase opacity-70">Active Teacher</div><div className="text-sm text-white font-bold">{state.authorizedUser}</div></div>
                  </div>
                  <button onClick={handleLogout} className="bg-blue-500/20 hover:bg-blue-500/40 px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors">LOGOUT</button>
                </div>
              )
            )}
            
            <button onClick={() => setState({...state, maintenanceBypass: !state.maintenanceBypass})} className={`flex items-center justify-between p-3 rounded-xl border w-full transition-all ${state.maintenanceBypass ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.1)]' : 'border-gray-800 text-gray-500'}`}><div className="flex items-center gap-2 text-xs font-bold uppercase"><Wrench size={18} /> Bypass Mode</div><span className="text-[10px] font-black">{state.maintenanceBypass ? 'ACTIVE' : 'OFF'}</span></button>
          </div>

          <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${state.isAiOptimized ? 'border-lime-500/30 bg-lime-500/5' : 'border-gray-800 opacity-60'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${state.isAiOptimized ? 'bg-lime-500/20 text-lime-400' : 'bg-gray-800 text-gray-500'}`}>
                <Cpu size={20} />
              </div>
              <div>
                <div className="text-white text-sm font-bold flex items-center gap-2">
                  System Mode: {state.isAiOptimized ? 'AUTO' : 'MANUAL'}
                </div>
                <div className="text-gray-500 text-[10px] uppercase tracking-wider">
                  {state.isAiOptimized ? 'AI Manages Temp. Lights/Proj Always ON' : 'Teacher Configures Devices'}
                </div>
              </div>
            </div>
            <input type="checkbox" checked={state.isAiOptimized} onChange={(e) => setState({...state, isAiOptimized: e.target.checked})} className="accent-lime-500 w-5 h-5 cursor-pointer" />
          </div>

          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-400">
              <span>Room Occupancy</span>
              <span className="text-lime-400 font-mono text-xs">{state.occupancy} / 40</span>
            </div>
            <input type="range" min="0" max="40" value={state.occupancy} onChange={(e) => setState({...state, occupancy: parseInt(e.target.value)})} className="w-full accent-lime-500 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border bg-white/5 border-white/5 space-y-4 transition-all ${(!state.isLoggedIn && !state.maintenanceBypass) ? 'opacity-20 grayscale cursor-not-allowed' : 'opacity-100'}`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><Wind size={14} className="inline mr-1"/> AC Unit</span>
                {state.isAiOptimized && <span className="text-[8px] bg-lime-500/20 text-lime-400 px-1.5 py-0.5 rounded font-bold">AUTO</span>}
                <input type="checkbox" checked={state.acOn} disabled={state.isAiOptimized || (!state.isLoggedIn && !state.maintenanceBypass)} onChange={(e) => setState({...state, acOn: e.target.checked})} className="accent-lime-500 disabled:opacity-50" />
              </div>
              <div className="flex items-center justify-between gap-1 bg-black/40 p-1.5 rounded-lg relative">
                {state.isAiOptimized && state.acOn && <Sparkles size={12} className="text-lime-400 absolute left-2" />}
                <input type="number" min="18" max="30" value={state.acTemp} disabled={state.isAiOptimized || !state.acOn || (!state.isLoggedIn && !state.maintenanceBypass)} onChange={(e) => setState({...state, acTemp: parseInt(e.target.value)})} className={`w-full bg-transparent text-center text-xs font-bold focus:outline-none ${state.isAiOptimized ? 'text-lime-400' : 'text-white'}`} />
                <span className="text-[10px] text-gray-500 font-bold pr-2">°C</span>
              </div>
            </div>
            
            <div className={`p-4 rounded-xl border bg-white/5 border-white/5 space-y-3 transition-all ${(!state.isLoggedIn && !state.maintenanceBypass) ? 'opacity-20 grayscale cursor-not-allowed' : 'opacity-100'}`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><Monitor size={14} className="inline mr-1"/> Projector</span>
                <input type="checkbox" checked={state.projectorOn} disabled={state.isAiOptimized || (!state.isLoggedIn && !state.maintenanceBypass)} onChange={(e) => setState({...state, projectorOn: e.target.checked})} className="accent-lime-500 disabled:opacity-50" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><Lightbulb size={14} className="inline mr-1"/> Lights</span>
                <input type="checkbox" checked={state.lightsOn} disabled={state.isAiOptimized || (!state.isLoggedIn && !state.maintenanceBypass)} onChange={(e) => setState({...state, lightsOn: e.target.checked})} className="accent-lime-500 disabled:opacity-50" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-800 bg-[#1a1a1a] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-[10px] font-black text-gray-500 uppercase hover:text-white transition-colors">Cancel</button>
          <button onClick={() => onSave(roomName, state, roomPowerKw)} className="px-6 py-2 rounded-xl text-[10px] font-black bg-lime-500 text-black uppercase shadow-lg shadow-lime-500/20 hover:bg-lime-400 active:scale-95 transition-all">Save Changes</button>
        </div>
      </div>
    </div>
  );
}