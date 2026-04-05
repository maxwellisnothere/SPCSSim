import { Zap } from 'lucide-react';

interface EnergyPredictionGaugeProps {
  totalClasses: number;
  estimatedCost: number;
}

export function EnergyPredictionGauge({ totalClasses, estimatedCost }: EnergyPredictionGaugeProps) {
  const maxCost = 50;
  const percentage = Math.min((estimatedCost / maxCost) * 100, 100);
  const efficiency = percentage < 50 ? 'Excellent' : percentage < 75 ? 'Good' : 'High';
  const efficiencyColor = percentage < 50 ? 'text-lime-400' : percentage < 75 ? 'text-yellow-400' : 'text-orange-400';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-lime-500/20 flex items-center justify-center">
          <Zap className="text-lime-400" size={20} />
        </div>
        <div>
          <h3 className="text-white font-semibold">AI Energy Prediction</h3>
          <p className="text-gray-500 text-xs">Real-time cost analysis</p>
        </div>
      </div>

      {/* Gauge */}
      <div className="mb-6">
        <div className="relative w-48 h-48 mx-auto">
          <svg width="192" height="192" viewBox="0 0 192 192" className="transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="96"
              cy="96"
              r="80"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="16"
            />
            {/* Progress Circle */}
            <circle
              cx="96"
              cy="96"
              r="80"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="16"
              strokeDasharray={`${(percentage / 100) * 502.4} 502.4`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#84cc16" />
                <stop offset="100%" stopColor="#a3e635" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-white">${estimatedCost.toFixed(1)}</div>
            <div className="text-gray-400 text-sm">per day</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-4">
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-gray-800">
          <div className="text-gray-400 text-sm mb-1">Total Classes</div>
          <div className="text-2xl font-bold text-white">{totalClasses}</div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-gray-800">
          <div className="text-gray-400 text-sm mb-1">Efficiency Rating</div>
          <div className={`text-2xl font-bold ${efficiencyColor}`}>{efficiency}</div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-gray-800">
          <div className="text-gray-400 text-sm mb-1">Est. Monthly Cost</div>
          <div className="text-2xl font-bold text-lime-400">${(estimatedCost * 30).toFixed(0)}</div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="mt-6 bg-lime-500/10 border border-lime-500/30 rounded-lg p-4">
        <div className="text-lime-400 font-semibold text-sm mb-2">💡 AI Recommendations</div>
        <ul className="text-gray-300 text-xs space-y-1">
          <li>• Consider consolidating morning classes</li>
          <li>• Auto-dim lights during lunch hours</li>
          <li>• Schedule AC pre-cooling at off-peak</li>
        </ul>
      </div>
    </div>
  );
}
