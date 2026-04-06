import { useEffect, useState } from 'react';
import { supabaseNew } from '../../supabaseClient'; 
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { Leaf, Activity, Zap, TrendingDown, BarChart3, Download, CircleDollarSign, BrainCircuit, Database, Trophy } from 'lucide-react';
import { DarkEnergyCard } from './DarkEnergyCard';
import { toast } from 'sonner';

// --- 💡 Interface สำหรับข้อมูลจัดอันดับ ---
interface LeaderboardData {
  name: string;
  savedW: number;
  savedTHB: number;
  classes: number;
}

export const AnalyticsDashboard = () => {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]); 
  const [leaderboard, setLeaderboard] = useState<LeaderboardData[]>([]); // 💡 State สำหรับ Leaderboard
  const [summary, setSummary] = useState({
    totalSavedW: 0,
    avgEfficiency: 0,
    carbonReduction: 0,
    treesEquivalent: 0,
    totalSavedTHB: 0
  });
  const [loading, setLoading] = useState(true);

  // 1. ฟังก์ชันดึงข้อมูลวิเคราะห์หลัก
  const fetchAnalytics = async () => {
    if (!supabaseNew) return; 

    try {
      const { data, error } = await supabaseNew
        .from('energy_logs')
        .select('*')
        .order('timestamp', { ascending: false }) 
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedData = [...data].reverse().map(item => ({
          time: item.timestamp?.split(' ')[1]?.substring(0, 5) || '00:00', 
          baseline: (item.energy_baseline || 0) / 1000,
          optimized: (item.energy_ai || 0) / 1000,
          saved: (item.energy_saved_w || 0) / 1000,
          percent: item.energy_saved_pct || 0
        }));

        setHistoryData(formattedData);

        // --- 💡 จำลองการทำนายข้อมูลอนาคต (Predictive Data) ---
        const lastVal = formattedData[formattedData.length - 1];
        const forecast = Array.from({ length: 10 }).map((_, i) => {
          const futureTime = new Date();
          futureTime.setMinutes(futureTime.getMinutes() + ((i + 1) * 15));
          return {
            time: `${String(futureTime.getHours()).padStart(2, '0')}:${String(futureTime.getMinutes()).padStart(2, '0')}`,
            predictedLoad: Math.max(0, lastVal.optimized + (Math.random() * 2 - 1)),
            confidenceLower: Math.max(0, lastVal.optimized - 1.5),
            confidenceUpper: lastVal.optimized + 1.5
          };
        });
        setForecastData(forecast);

        const totalSaved = data.reduce((acc, curr) => acc + (curr.energy_saved_w || 0), 0);
        const avgEff = data.reduce((acc, curr) => acc + (curr.energy_saved_pct || 0), 0) / data.length;
        const totalTHB = data.reduce((acc, curr) => acc + ((curr.cost_baseline || 0) - (curr.cost_ai || 0)), 0);

        setSummary({
          totalSavedW: totalSaved,
          avgEfficiency: avgEff || 0,
          carbonReduction: (totalSaved / 1000) * 0.507, 
          treesEquivalent: (totalSaved / 1000) * 0.02,
          totalSavedTHB: totalTHB
        });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. 💡 ฟังก์ชันดึงอันดับอาจารย์รักษ์โลก
  const fetchLeaderboard = async () => {
    if (!supabaseNew) return;
    
    const { data, error } = await supabaseNew
      .from('energy_logs')
      .select('teacher_name, energy_saved_w, cost_baseline, cost_ai')
      .not('teacher_name', 'is', null);

    if (data && !error) {
      const grouped = data.reduce((acc: any, curr) => {
        const name = curr.teacher_name;
        if (!acc[name]) {
          acc[name] = { name, savedW: 0, savedTHB: 0, classes: 0 };
        }
        acc[name].savedW += (curr.energy_saved_w || 0);
        acc[name].savedTHB += ((curr.cost_baseline || 0) - (curr.cost_ai || 0));
        acc[name].classes += 1;
        return acc;
      }, {});

      const sorted = Object.values(grouped) as LeaderboardData[];
      setLeaderboard(sorted.sort((a, b) => b.savedW - a.savedW).slice(0, 5));
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchLeaderboard();

    if (!supabaseNew) return;

    const channel = supabaseNew.channel('analytics-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'energy_logs' }, 
        () => {
          fetchAnalytics(); // รีเฟรชข้อมูลเมื่อมีการเพิ่ม Log ใหม่
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabaseNew?.removeChannel(channel);
    };
  }, []);

  // --- 💡 ฟังก์ชัน Export ข้อมูล ---
  const handleExportCSV = async () => {
    if (!supabaseNew) return toast.error('Database connection error');
    try {
      const toastId = toast.loading('Preparing Report...');
      const { data, error } = await supabaseNew.from('energy_logs').select('*').order('timestamp', { ascending: false }).limit(1000);
      if (error || !data) throw error;
      
      const headers = ["Timestamp", "Teacher", "Baseline Energy (W)", "AI Energy (W)", "Saved Energy (W)", "Saved (%)", "Baseline Cost (THB)", "AI Cost (THB)"];
      const csvRows = data.map(item => [item.timestamp, item.teacher_name || 'System', item.energy_baseline, item.energy_ai, item.energy_saved_w, item.energy_saved_pct, item.cost_baseline, item.cost_ai]);
      const csvContent = "\uFEFF" + [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `PHAM_Report.csv`;
      link.click();
      toast.dismiss(toastId);
      toast.success('Exported successfully!');
    } catch (error) { toast.error('Failed to export'); }
  };

  const handleExportMLDataset = async () => {
    if (!supabaseNew) return toast.error('Database connection error');
    try {
      const toastId = toast.loading('Extracting ML Features...');
      const { data, error } = await supabaseNew.from('room_energy_logs').select('*').order('timestamp', { ascending: false }).limit(2000);
      if (error || !data) throw error;

      const headers = ["timestamp", "day_of_week", "room_id", "feature_outside_temp", "feature_indoor_temp", "feature_occupancy", "feature_ac_status", "feature_lights_status", "target_power_w"];
      const csvRows = data.map(item => [item.timestamp, item.day_of_week, item.room_id, item.outside_temp, item.indoor_temp, item.occupancy_count, item.ac_status ? 1 : 0, item.lights_status ? 1 : 0, item.power_consumption_w]);
      const csvContent = "\uFEFF" + [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `ML_Dataset.csv`;
      link.click();
      toast.dismiss(toastId);
      toast.success('Dataset ready for analysis!');
    } catch (error) { toast.error('Failed to generate dataset'); }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-lime-400 font-mono">
      <Activity className="animate-spin" size={48} />
      <p className="animate-pulse tracking-widest uppercase text-xs">Fetching Energy Data...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      {/* --- 📊 ส่วนที่ 1: การ์ดสรุปผล --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <DarkEnergyCard 
          title="Total Energy Saved" 
          value={(summary.totalSavedW / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} 
          unit="kW" 
          sparklineData={historyData.length > 0 ? historyData.slice(-15).map(d => d.saved) : [0,0,0]}
        />
        
        <div className="bg-[#151515] p-5 rounded-2xl border border-gray-800 flex items-center gap-4 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="absolute top-[-10px] right-[-10px] p-2 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
             <CircleDollarSign size={120} className="text-emerald-500" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <CircleDollarSign size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Money Saved</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              ฿{summary.totalSavedTHB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-emerald-500 font-bold mt-1.5 uppercase tracking-tighter">Cost Reduction via AI</p>
          </div>
        </div>
        
        <div className="bg-[#151515] p-5 rounded-2xl border border-gray-800 flex items-center gap-4 relative overflow-hidden group hover:border-green-500/30 transition-all">
          <div className="absolute top-[-10px] right-[-10px] p-2 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
             <Leaf size={120} className="text-green-500" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            <Leaf size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Carbon Reduction</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {summary.carbonReduction.toFixed(2)} <span className="text-xs font-normal text-gray-500">kg CO₂e</span>
            </h3>
            <p className="text-[10px] text-green-500 font-bold mt-1.5 flex items-center gap-1">
              <Zap size={10} /> ~{summary.treesEquivalent.toFixed(2)} trees eq.
            </p>
          </div>
        </div>

        <div className="bg-[#151515] p-5 rounded-2xl border border-gray-800 flex items-center gap-4 border-l-4 border-l-lime-500 shadow-xl shadow-lime-500/5">
          <div className="w-12 h-12 rounded-xl bg-lime-500/10 flex items-center justify-center text-lime-400">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Avg. AI Efficiency</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {summary.avgEfficiency.toFixed(1)}%
            </h3>
            <p className="text-[10px] text-gray-500 font-medium mt-1.5 uppercase tracking-tighter">Optimization Performance</p>
          </div>
        </div>
      </div>

      {/* --- 📉 ส่วนที่ 2: กราฟเปรียบเทียบการใช้พลังงาน --- */}
      <div className="bg-[#151515] p-7 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-lime-500/20 to-transparent"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
               <BarChart3 className="text-lime-500" size={20} />
               Energy Consumption Timeline
            </h3>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Real-time Comparison (kW)</p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            <div className="flex gap-6 p-2 px-4 bg-black/40 rounded-full border border-gray-800/50">
               <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]"></span> 
                  <span className="text-gray-400">Baseline</span>
               </div>
               <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest">
                  <span className="w-2.5 h-2.5 bg-lime-500 rounded-full shadow-[0_0_8px_rgba(132,204,22,0.4)]"></span> 
                  <span className="text-gray-400">AI Optimized</span>
               </div>
            </div>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 text-gray-300 border border-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95">
              <Download size={14} /> Basic Report
            </button>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.05}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#84cc16" stopOpacity={0.15}/><stop offset="95%" stopColor="#84cc16" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis dataKey="time" stroke="#404040" fontSize={10} tickLine={false} axisLine={false} dy={15} />
              <YAxis stroke="#404040" fontSize={10} tickLine={false} axisLine={false} unit=" kW" dx={-5} />
              <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '16px', fontSize: '12px' }} itemStyle={{ fontWeight: 'bold' }} />
              <Area type="monotone" dataKey="baseline" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorBaseline)" name="Baseline" />
              <Area type="monotone" dataKey="optimized" stroke="#84cc16" strokeWidth={3} fill="url(#colorOptimized)" name="AI Optimized" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- 🧠 ส่วนที่ 3: กราฟพยากรณ์ AI และสกัด Dataset --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#151515] p-7 rounded-3xl border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.05)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><BrainCircuit className="text-blue-400" size={20} /> AI Demand Forecasting</h3>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Predictive Load Analysis</p>
            </div>
            <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg text-[10px] font-black border border-blue-500/20 uppercase tracking-widest animate-pulse">Running Prediction Model...</span>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="time" stroke="#404040" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#404040" fontSize={10} tickLine={false} axisLine={false} unit=" kW" dx={-5} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #3b82f6', borderRadius: '12px', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                <Line type="monotone" dataKey="confidenceUpper" stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 3" name="Upper Bound" dot={false} opacity={0.3} />
                <Line type="monotone" dataKey="predictedLoad" stroke="#60a5fa" strokeWidth={3} name="Predicted Load (kW)" dot={false} />
                <Line type="monotone" dataKey="confidenceLower" stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 3" name="Lower Bound" dot={false} opacity={0.3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] p-7 rounded-3xl border border-gray-800 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/20"><Database size={24} /></div>
            <h3 className="text-xl font-bold text-white mb-2">Machine Learning Dataset</h3>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">สกัดข้อมูลเชิงลึกรายห้องเพื่อนำไปทำ <span className="text-indigo-400 font-bold">Data Analysis</span> ประกอบด้วย Features และ Target Variable</p>
            <div className="bg-black/50 rounded-xl p-3 border border-gray-800 space-y-2 font-mono text-[10px]">
              <div className="flex justify-between"><span className="text-lime-400">X_train</span> <span>[Temp, People, Time]</span></div>
              <div className="flex justify-between"><span className="text-orange-400">y_train</span> <span>[Actual_kW]</span></div>
            </div>
          </div>
          <button onClick={handleExportMLDataset} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-wider py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,22,0.3)] active:scale-95 flex items-center justify-center gap-2"><Download size={16} /> Export ML Dataset</button>
        </div>
      </div>

      {/* --- 🏆 ส่วนที่ 4: อันดับอาจารย์รักษ์โลก --- */}
      <div className="bg-[#151515] p-7 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="text-yellow-500" size={20} /> Energy Saver Leaderboard</h3>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Top 5 Teachers (Energy Reduction Rank)</p>
          </div>
          <Zap className="text-lime-500/20" size={40} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-[10px] uppercase tracking-[0.2em] border-b border-gray-800">
                <th className="pb-4 pl-2">Rank</th>
                <th className="pb-4">Teacher Name</th>
                <th className="pb-4 text-right">Saved (kW)</th>
                <th className="pb-4 text-right">Saved (THB)</th>
                <th className="pb-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {leaderboard.map((item, index) => (
                <tr key={item.name} className="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors group">
                  <td className="py-4 pl-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 
                      index === 1 ? 'bg-gray-300 text-black' : 
                      index === 2 ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}>{index + 1}</div>
                  </td>
                  <td className="py-4 font-bold text-white">{item.name}</td>
                  <td className="py-4 text-right font-mono text-lime-400">{(item.savedW / 1000).toFixed(2)}</td>
                  <td className="py-4 text-right font-mono text-emerald-400">฿{item.savedTHB.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-4 text-right"><span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded-md font-black uppercase">{item.classes} Sessions</span></td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-gray-600 text-xs uppercase tracking-widest italic">No ranking data available yet...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};