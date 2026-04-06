import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, BarChart, Bar 
} from 'recharts';
import { Leaf, Activity, Zap, TrendingDown } from 'lucide-react';
import { DarkEnergyCard } from './DarkEnergyCard';

export const AnalyticsDashboard = () => {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [totalSavedKw, setTotalSavedKw] = useState(0);
  const [avgEfficiency, setAvgEfficiency] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // 1. ดึงข้อมูลย้อนหลัง 7 วัน
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
          .from('system_energy_logs')
          .select('*')
          .gte('timestamp', sevenDaysAgo.toISOString())
          .order('timestamp', { ascending: true });

        if (error) throw error;

        if (data) {
          const formattedData = data.map(item => ({
            time: new Date(item.timestamp).toLocaleDateString('th-TH', { 
              day: '2-digit', month: 'short', hour: '2-digit' 
            }),
            baseline: item.baseline_power_kw,
            optimized: item.optimized_power_kw,
            saved: item.saved_power_kw,
            percent: item.savings_percentage
          }));
          setHistoryData(formattedData);

          // 2. คำนวณค่าเฉลี่ยประสิทธิภาพ
          const avg = data.reduce((acc, curr) => acc + curr.savings_percentage, 0) / data.length;
          setAvgEfficiency(avg || 0);
        }

        // 3. คำนวณ Total Savings ทั้งหมดจาก Database
        const { data: sumData, error: sumError } = await supabase
          .from('system_energy_logs')
          .select('saved_power_kw');
        
        if (!sumError && sumData) {
          const total = sumData.reduce((acc, curr) => acc + (curr.saved_power_kw || 0), 0);
          setTotalSavedKw(total);
        }

      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div className="text-lime-400 font-mono animate-pulse p-10">Loading building analytics...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DarkEnergyCard 
          title="Total Energy Saved" 
          value={totalSavedKw.toLocaleString(undefined, { maximumFractionDigits: 2 })} 
          unit="kW" 
          sparklineData={historyData.slice(-10).map(d => d.saved)}
        />
        
        <div className="bg-[#151515] p-5 rounded-2xl border border-gray-800 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
             <Leaf size={80} className="text-green-500" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
            <Leaf size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Carbon Reduction</p>
            <h3 className="text-2xl font-bold text-white">
              {(totalSavedKw * 0.507).toFixed(2)} <span className="text-sm font-normal text-gray-500">kg CO₂e</span>
            </h3>
            <p className="text-[10px] text-green-500/70 mt-1">Equivalent to ~{(totalSavedKw * 0.02).toFixed(1)} trees planted</p>
          </div>
        </div>

        <div className="bg-[#151515] p-5 rounded-2xl border border-gray-800 flex items-center gap-4 border-l-4 border-l-lime-500">
          <div className="w-12 h-12 rounded-xl bg-lime-500/10 flex items-center justify-center text-lime-400">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Avg. AI Efficiency</p>
            <h3 className="text-2xl font-bold text-white">
              {avgEfficiency.toFixed(1)}%
            </h3>
            <p className="text-[10px] text-gray-500 mt-1">Optimization vs Baseline</p>
          </div>
        </div>
      </div>

      {/* Main Consumption Chart */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-[#151515] p-6 rounded-2xl border border-gray-800 shadow-xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-white">Building Performance History</h3>
              <p className="text-sm text-gray-500">7-Day consumption comparison: Baseline vs AI Optimized</p>
            </div>
            <div className="flex gap-4 text-xs font-mono">
               <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-full"></span> <span className="text-gray-400">Baseline</span></div>
               <div className="flex items-center gap-2"><span className="w-3 h-3 bg-lime-500 rounded-full"></span> <span className="text-gray-400">Optimized</span></div>
            </div>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#84cc16" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#84cc16" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="time" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} unit="kW" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="baseline" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorBaseline)" 
                  name="Baseline"
                />
                <Area 
                  type="monotone" 
                  dataKey="optimized" 
                  stroke="#84cc16" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorOptimized)" 
                  name="AI Optimized"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};