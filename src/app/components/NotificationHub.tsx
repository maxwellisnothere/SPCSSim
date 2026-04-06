import React, { useEffect, useState } from 'react';
import { supabaseNew } from '../../supabaseClient';
import { Bell, CheckCircle2, Clock, Wrench, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

export const NotificationHub = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    // 💡 Null Guard: เช็คก่อนเรียกใช้งาน
    if (!supabaseNew) return;

    const { data, error } = await supabaseNew
      .from('maintenance_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (!error) setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    // 💡 Null Guard: เช็คก่อนสร้าง Channel
    if (!supabaseNew) return;

    const channel = supabaseNew.channel('maint-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_logs' }, () => fetchLogs())
      .subscribe();

    return () => {
      // 💡 บรรทัดที่ 33: ใช้ Optional Chaining (?.) เพื่อป้องกัน Error
      supabaseNew?.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    // 💡 Null Guard: เช็คก่อน Update
    if (!supabaseNew) return;

    const { error } = await supabaseNew
      .from('maintenance_logs')
      .update({ 
        status: newStatus, 
        resolved_at: newStatus === 'Fixed' ? new Date().toISOString() : null 
      })
      .eq('id', id);
    
    if (!error) {
      toast.success(`Status updated to ${newStatus}`);
      fetchLogs();
    }
  };

  if (loading) return (
    <div className="p-10 text-center text-gray-500 animate-pulse font-mono text-xs uppercase tracking-widest">
      Loading Infrastructure Logs...
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Notification Hub</h1>
          <p className="text-gray-500 text-sm font-medium">System anomalies and maintenance history</p>
        </div>
        <div className="bg-red-500/10 text-red-500 px-4 py-2 rounded-xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest">
          {logs.filter(l => l.status !== 'Fixed').length} Active Issues
        </div>
      </div>

      <div className="grid gap-4 pb-10">
        {logs.map((log) => (
          <div key={log.id} className={`p-5 rounded-2xl border transition-all ${log.status === 'Fixed' ? 'bg-black/20 border-gray-800 opacity-60' : 'bg-[#151515] border-gray-800 shadow-xl'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${log.status === 'Fixed' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500 animate-pulse'}`}>
                  {log.status === 'Fixed' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                </div>
                <div>
                  <h3 className="text-white font-bold flex items-center gap-3">
                    {log.room_id} 
                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-tighter ${log.status === 'Pending' ? 'bg-red-500 text-white' : log.status === 'Acknowledged' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}`}>
                      {log.status}
                    </span>
                  </h3>
                  <p className="text-gray-400 text-xs mt-1 leading-relaxed">{log.description || 'System anomaly detected.'}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Clock size={12} className="text-gray-600" /> {new Date(log.timestamp).toLocaleString()}</span>
                    {log.resolved_at && <span className="flex items-center gap-1.5 text-green-500"><Check size={12} /> Resolved at: {new Date(log.resolved_at).toLocaleTimeString()}</span>}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                {log.status === 'Pending' && (
                  <button onClick={() => updateStatus(log.id, 'Acknowledged')} className="flex-1 md:flex-none bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-black border border-yellow-500/20 px-4 py-2 rounded-xl text-[10px] font-black transition-all">ACKNOWLEDGE</button>
                )}
                {log.status !== 'Fixed' && (
                  <button onClick={() => updateStatus(log.id, 'Fixed')} className="flex-1 md:flex-none bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-black border border-green-500/20 px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2">
                    <Wrench size={12} /> MARK AS FIXED
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-center py-24 bg-[#151515]/50 rounded-3xl border border-dashed border-gray-800">
            <Bell className="mx-auto text-gray-800 mb-4" size={48} />
            <p className="text-gray-600 text-xs uppercase tracking-[0.3em] font-bold">All systems nominal</p>
          </div>
        )}
      </div>
    </div>
  );
};