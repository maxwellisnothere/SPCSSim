import { useEffect, useState } from 'react';
import { supabaseNew } from '../../supabaseClient'; 
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { Leaf, Activity, Zap, TrendingDown, BarChart3 } from 'lucide-react';
import { DarkEnergyCard } from './DarkEnergyCard';

export const AnalyticsDashboard = () => {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalSavedW: 0,
    avgEfficiency: 0,
    carbonReduction: 0,
    treesEquivalent: 0
  });
  const [loading, setLoading] = useState(true);

  // 1. ฟังก์ชันดึงข้อมูลจาก Database
  const fetchAnalytics = async () => {
    // 💡 แก้ปัญหา 'supabaseNew' is possibly 'null'
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

        const totalSaved = data.reduce((acc, curr) => acc + (curr.energy_saved_w || 0), 0);
        const avgEff = data.reduce((acc, curr) => acc + (curr.energy_saved_pct || 0), 0) / data.length;

        setSummary({
          totalSavedW: totalSaved,
          avgEfficiency: avgEff || 0,
          carbonReduction: (totalSaved / 1000) * 0.507, 
          treesEquivalent: (totalSaved / 1000) * 0.02
        });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    // 💡 แก้ปัญหา 'supabaseNew' is possibly 'null' สำหรับ Real-time
    if (!supabaseNew) return;

    const channel = supabaseNew.channel('analytics-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'energy_logs' }, 
        (payload) => {
          const newItem = payload.new;
          const formattedNew = {
            time: newItem.timestamp?.split(' ')[1]?.substring(0, 5) || '00:00',
            baseline: (newItem.energy_baseline || 0) / 1000,
            optimized: (newItem.energy_ai || 0) / 1000,
            saved: (newItem.energy_saved_w || 0) / 1000,
            percent: newItem.energy_saved_pct || 0
          };

          setHistoryData(prev => {
            const updated = [...prev, formattedNew];
            return updated.length > 50 ? updated.slice(1) : updated;
          });
          
          setSummary(prev => {
            const newTotalW = prev.totalSavedW + (newItem.energy_saved_w || 0);
            return {
              totalSavedW: newTotalW,
              avgEfficiency: (prev.avgEfficiency + (newItem.energy_saved_pct || 0)) / 2,
              carbonReduction: (newTotalW / 1000) * 0.507,
              treesEquivalent: (newTotalW / 1000) * 0.02
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabaseNew?.removeChannel(channel);
    };
  }, []);

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-lime-400 font-mono">
      <Activity className="animate-spin" size={48} />
      <p className="animate-pulse tracking-widest uppercase text-xs">Fetching Energy Data...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DarkEnergyCard 
          title="Total Energy Saved" 
          value={(summary.totalSavedW / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} 
          unit="kW" 
          sparklineData={historyData.length > 0 ? historyData.slice(-15).map(d => d.saved) : [0,0,0]}
        />
        
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
              <Zap size={10} /> ~{summary.treesEquivalent.toFixed(2)} trees equivalent
            </p>
          </div>
        </div>

        <div className="bg-[#151515] p-5 rounded-2xl border border-gray-800 flex items-center gap-4 border-l-4 border-l-lime-500">
          <div className="w-12 h-12 rounded-xl bg-lime-500/10 flex items-center justify-center text-lime-400">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Avg. AI Efficiency</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {summary.avgEfficiency.toFixed(1)}%
            </h3>
            <p className="text-[10px] text-gray-500 font-medium mt-1.5 uppercase tracking-tighter">System Optimization Performance</p>
          </div>
        </div>
      </div>

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
        </div>
        
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.05}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#84cc16" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#84cc16" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis dataKey="time" stroke="#404040" fontSize={10} tickLine={false} axisLine={false} dy={15} />
              <YAxis stroke="#404040" fontSize={10} tickLine={false} axisLine={false} unit=" kW" dx={-5} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '16px', fontSize: '12px' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="baseline" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorBaseline)" name="Baseline" />
              <Area type="monotone" dataKey="optimized" stroke="#84cc16" strokeWidth={3} fill="url(#colorOptimized)" name="AI Optimized" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};