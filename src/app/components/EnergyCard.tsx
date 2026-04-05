import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface EnergyCardProps {
  title: string;
  value: string;
  unit: string;
  trend: 'up' | 'down';
  chartData: Array<{ value: number }>;
}

export function EnergyCard({ title, value, unit, trend, chartData }: EnergyCardProps) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-gray-600 text-sm mb-2">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-gray-900">{value}</span>
            <span className="text-gray-500 text-sm">{unit}</span>
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-xs ${trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend === 'up' ? '↑' : '↓'} {trend === 'up' ? '+' : '-'}3.2%
        </div>
      </div>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
