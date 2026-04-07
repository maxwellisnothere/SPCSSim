import { useEffect, useState } from 'react';
import { supabaseNew } from '../../supabaseClient'; 
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, Legend, BarChart, Bar
} from 'recharts';
import { 
  Leaf, Activity, Zap, TrendingDown, BarChart3, Download, 
  CircleDollarSign, BrainCircuit, Database, Trophy, TrendingUp 
} from 'lucide-react';
import { DarkEnergyCard } from './DarkEnergyCard';
import { toast } from 'sonner';

// --- 💡 ปรับปรุงความแม่นยำของมาตรฐาน ESG ---
const GRID_EMISSION_FACTOR = 0.4999; // kgCO2e / kWh (อ้างอิง TGO Thailand)
const TREE_ABSORPTION_RATE = 25.2;   // kgCO2e / ต้น / ปี (ค่าเฉลี่ยไม้ยืนต้น)
const ESTIMATED_SETUP_COST = 15000;  // งบประมาณติดตั้งระบบ (บาท) สำหรับคำนวณ ROI

interface LeaderboardData {
  name: string;
  savedW: number;
  savedTHB: number;
  classes: number;
}

export const AnalyticsDashboard = () => {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]); 
  const [leaderboard, setLeaderboard] = useState<LeaderboardData[]>([]);
  const [summary, setSummary] = useState({
    totalSavedW: 0,
    avgEfficiency: 0,
    carbonReduction: 0,
    treesEquivalent: 0,
    totalSavedTHB: 0,
    roi_percentage: 0
  });
  const [loading, setLoading] = useState(true);

  // 1. ฟังก์ชันดึงข้อมูลและคำนวณเชิงลึก (ESG & ROI)
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
        // จัดรูปแบบข้อมูลสำหรับกราฟเปรียบเทียบ
        const formattedData = [...data].reverse().map(item => ({
          time: item.timestamp?.split(' ')[1]?.substring(0, 5) || '00:00', 
          baseline: (item.energy_baseline || 0) / 1000,
          optimized: (item.energy_ai || 0) / 1000,
          saved: (item.energy_saved_w || 0) / 1000,
          percent: item.energy_saved_pct || 0,
          carbon: ((item.energy_saved_w || 0) / 1000) * GRID_EMISSION_FACTOR
        }));

        setHistoryData(formattedData);

        // จำลองข้อมูลพยากรณ์
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

        // คำนวณค่าสรุป (Summary Metrics)
        const totalSavedW = data.reduce((acc, curr) => acc + (curr.energy_saved_w || 0), 0);
        const avgEff = data.reduce((acc, curr) => acc + (curr.energy_saved_pct || 0), 0) / data.length;
        const totalTHB = data.reduce((acc, curr) => acc + ((curr.cost_baseline || 0) - (curr.cost_ai || 0)), 0);
        const carbonRed = (totalSavedW / 1000) * GRID_EMISSION_FACTOR;

        setSummary({
          totalSavedW: totalSavedW,
          avgEfficiency: avgEff || 0,
          carbonReduction: carbonRed,
          treesEquivalent: carbonRed / (TREE_ABSORPTION_RATE / 365), // คำนวณเป็นอัตราต่อวัน
          totalSavedTHB: totalTHB,
          roi_percentage: (totalTHB / ESTIMATED_SETUP_COST) * 100
        });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. ดึงอันดับอาจารย์รักษ์โลก
  const fetchLeaderboard = async () => {
    if (!supabaseNew) return;
    const { data, error } = await supabaseNew
      .from('energy_logs')
      .select('teacher_name, energy_saved_w, cost_baseline, cost_ai')
      .not('teacher_name', 'is', null);

    if (data && !error) {
      const grouped = data.reduce((acc: any, curr) => {
        const name = curr.teacher_name;
        if (!acc[name]) acc[name] = { name, savedW: 0, savedTHB: 0, classes: 0 };
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'energy_logs' }, fetchAnalytics)
      .subscribe();
    return () => { supabaseNew?.removeChannel(channel); };
  }, []);

  // 3. ฟังก์ชัน Export รายงาน
  const handleExportCSV = async () => {
    if (!supabaseNew) return toast.error('Database connection error');
    try {
      const toastId = toast.loading('Generating ESG Report...');
      const { data, error } = await supabaseNew.from('energy_logs').select('*').order('timestamp', { ascending: false }).limit(1000);
      if (error || !data) throw error;
      const headers = ["Timestamp", "Teacher", "Baseline(W)", "AI(W)", "Saved(W)", "CarbonRed(kg)", "Saved(THB)"];
      const csvRows = data.map(item => [
        item.timestamp, 
        item.teacher_name || 'System', 
        item.energy_baseline, 
        item.energy_ai, 
        item.energy_saved_w,
        ((item.energy_saved_w / 1000) * GRID_EMISSION_FACTOR).toFixed(4),
        (item.cost_baseline - item.cost_ai).toFixed(2)
      ]);
      const csvContent = "\uFEFF" + [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `PHAM_ESG_Report.csv`;
      link.click();
      toast.dismiss(toastId);
      toast.success('ESG Report Downloaded!');
    } catch (error) { toast.error('Export failed'); }
  };

  const handleExportMLDataset = async () => {
    if (!supabaseNew) return toast.error('Database connection error');
    try {
      const toastId = toast.loading('Extracting Features...');
      const { data, error } = await supabaseNew.from('room_energy_logs').select('*').order('timestamp', { ascending: false }).limit(5000);
      if (error || !data) throw error;
      const headers = ["timestamp", "day_of_week", "is_weekend", "hour_sin", "hour_cos", "room_id", "outside_temp", "indoor_temp", "occupancy_count", "target_power_w"];
      const csvRows = data.map(item => {
        const date = new Date(item.timestamp);
        const hour = date.getHours() + (date.getMinutes() / 60);
        return [item.timestamp, item.day_of_week, (date.getDay() === 0 || date.getDay() === 6) ? 1 : 0, Math.sin(2 * Math.PI * hour / 24).toFixed(4), Math.cos(2 * Math.PI * hour / 24).toFixed(4), item.room_id, item.outside_temp || 0, item.indoor_temp || 0, item.occupancy_count || 0, item.power_consumption_w || 0];
      });
      const csvContent = "\uFEFF" + [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `PHAM_ML_Advanced.csv`;
      link.click();
      toast.dismiss(toastId);
      toast.success('ML Dataset Ready!');
    } catch (error) { toast.error('Export failed'); }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-lime-400 font-mono">
      <Activity className="animate-spin" size={48} />
      <p className="animate-pulse tracking-widest uppercase text-xs">Processing Big Data Analytics...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      {/* --- 📊 Section 1: ESG & Financial KPI Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Money Saved & ROI Percentage */}
        <div className="bg-[#151515] p-5 rounded-2xl border border-gray-800 relative overflow-hidden group hover:border-emerald-500/30 transition-all border-b-4 border-b-emerald-500 shadow-xl shadow-emerald-500/5">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
              <CircleDollarSign size={20} />
            </div>
            <div className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md font-black">ROI {summary.roi_percentage.toFixed(1)}%</div>
          </div>
          <div className="mt-4">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Total Money Saved</p>
            <h3 className="text-2xl font-bold text-white mt-1">฿{summary.totalSavedTHB.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="mt-4 bg-gray-900 rounded-full h-1 w-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(summary.roi_percentage, 100)}%` }}></div>
          </div>
        </div>
        
        {/* Carbon Reduction Impact */}
        <div className="bg-[#151515] p-5 rounded-2xl border border-gray-800 border-b-4 border-b-green-500 relative group overflow-hidden">
          <div className="absolute top-[-20px] right-[-20px] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <Leaf size={120} className="text-green-500" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 mb-4">
            <Leaf size={20} />
          </div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Carbon Footprint</p>
          <h3 className="text-2xl font-bold text-white mt-1">{summary.carbonReduction.toFixed(2)} <span className="text-xs font-normal text-gray-500">kg CO₂e</span></h3>
          <p className="text-[10px] text-green-500 font-bold mt-2 flex items-center gap-1">
             <TrendingDown size={12} /> ~{summary.treesEquivalent.toFixed(2)} Trees Equivalent
          </p>
        </div>

        {/* Energy Performance Card */}
        <DarkEnergyCard 
          title="Total Energy Saved" 
          value={(summary.totalSavedW / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} 
          unit="kWh" 
          sparklineData={historyData.map(d => d.saved)}
        />

        {/* AI Efficiency Metric */}
        <div className="bg-[#151515] p-5 rounded-2xl border border-gray-800 border-l-4 border-l-lime-500">
          <div className="flex justify-between items-center">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 flex items-center justify-center text-lime-400">
              <TrendingUp size={20} />
            </div>
            <Zap className="text-lime-500/30 animate-pulse" size={16} />
          </div>
          <div className="mt-4">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Avg. AI Efficiency</p>
            <h3 className="text-2xl font-bold text-white mt-1">{summary.avgEfficiency.toFixed(1)}%</h3>
            <p className="text-[10px] text-gray-500 mt-2 uppercase font-bold tracking-widest">Active Optimization</p>
          </div>
        </div>
      </div>

      {/* --- 📉 Section 2: Energy & Carbon Trends --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#151515] p-7 rounded-3xl border border-gray-800 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="text-lime-500" size={20} /> Energy Consumption Timeline
              </h3>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Real-time Comparison (kW)</p>
            </div>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 text-gray-300 border border-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
              <Download size={14} /> ESG Report
            </button>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.05}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#84cc16" stopOpacity={0.15}/><stop offset="95%" stopColor="#84cc16" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="time" stroke="#404040" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#404040" fontSize={10} tickLine={false} axisLine={false} unit=" kW" />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '16px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="baseline" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorBaseline)" name="Baseline" />
                <Area type="monotone" dataKey="optimized" stroke="#84cc16" strokeWidth={3} fill="url(#colorOptimized)" name="AI Optimized" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Chart: Carbon Reduction Breakdown */}
        <div className="bg-[#151515] p-7 rounded-3xl border border-gray-800">
           <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Leaf className="text-green-500" size={20} /> Carbon Trend
           </h3>
           <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={historyData.slice(-15)}>
                    <XAxis dataKey="time" hide />
                    <Tooltip cursor={{fill: '#222'}} contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                    <Bar dataKey="carbon" fill="#10b981" radius={[4, 4, 0, 0]} name="kg CO₂e Saved" />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* --- 🧠 Section 3: AI Insights & ML Dataset --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#151515] p-7 rounded-3xl border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.05)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><BrainCircuit className="text-blue-400" size={20} /> AI Demand Forecasting</h3>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Predictive Load Analysis</p>
            </div>
            <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg text-[10px] font-black border border-blue-500/20 animate-pulse uppercase tracking-widest">Running Inference...</span>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="time" stroke="#404040" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#404040" fontSize={10} tickLine={false} axisLine={false} unit=" kW" />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #3b82f6', borderRadius: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
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
            <h3 className="text-xl font-bold text-white mb-2">ML Data Extraction</h3>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">สกัดข้อมูลเชิงลึกรายห้องเพื่อทำ <span className="text-indigo-400 font-bold">Model Retraining</span> ประกอบด้วย Features และ Target Variable</p>
            <div className="bg-black/50 rounded-xl p-3 border border-gray-800 space-y-2 font-mono text-[10px]">
              <div className="flex justify-between"><span className="text-lime-400">X_train</span> <span>[Temp, People, Time]</span></div>
              <div className="flex justify-between"><span className="text-orange-400">y_train</span> <span>[Actual_kW]</span></div>
            </div>
          </div>
          <button onClick={handleExportMLDataset} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-wider py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,22,0.3)] active:scale-95 flex items-center justify-center gap-2"><Download size={16} /> Export ML Dataset</button>
        </div>
      </div>

      {/* --- 🏆 Section 4: Eco-Teacher Leaderboard --- */}
      <div className="bg-[#151515] p-7 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="text-yellow-500" size={20} /> Energy Saver Leaderboard</h3>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Top 5 Teachers (ESG Contribution Rank)</p>
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