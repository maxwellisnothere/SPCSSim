import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'; // 💡 1. Import YAxis เพิ่ม

interface DarkEnergyCardProps {
  title: string;
  value: string;
  unit: string;
  sparklineData: number[];
}

export function DarkEnergyCard({ title, value, unit, sparklineData }: DarkEnergyCardProps) {
  const chartData = sparklineData.map((val, idx) => ({ value: val, index: idx }));

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-5 border border-gray-800 hover:border-lime-500/30 transition-all">
      <div className="text-gray-400 text-sm mb-3">{title}</div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold text-white">{value}</span>
        <span className="text-lime-400 text-lg">{unit}</span>
      </div>
      <div className="h-12 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            {/* 💡 2. ใส่ YAxis แบบซ่อน (hide) และเผื่อขอบบน-ล่างให้กราฟ (domain) เพื่อไม่ให้กราฟเด้งสั่น */}
            <YAxis hide domain={['dataMin - (dataMin * 0.05)', 'dataMax + (dataMax * 0.05)']} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#84cc16"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false} // 💡 3. ปิดอนิเมชันกราฟเพื่อลดการกระตุกเมื่อข้อมูลเข้ามารัวๆ
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}