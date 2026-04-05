import { AlertCircle, CheckCircle, Info, Zap } from 'lucide-react';

interface Activity {
  id: string;
  type: 'success' | 'info' | 'warning' | 'alert';
  message: string;
  time: string;
}

export function RecentActivities() {
  const activities: Activity[] = [
    {
      id: '1',
      type: 'success',
      message: 'Floor 1 Cafe optimized - 15% power reduction',
      time: '2 min ago'
    },
    {
      id: '2',
      type: 'info',
      message: 'Meeting Room 3 lights auto-dimmed',
      time: '5 min ago'
    },
    {
      id: '3',
      type: 'success',
      message: 'Computer Lab A HVAC adjusted for occupancy',
      time: '12 min ago'
    },
    {
      id: '4',
      type: 'warning',
      message: 'Classroom 103 - High consumption detected',
      time: '18 min ago'
    },
    {
      id: '5',
      type: 'success',
      message: 'Lounge lighting schedule updated',
      time: '25 min ago'
    },
    {
      id: '6',
      type: 'info',
      message: 'Daily energy report generated',
      time: '1 hour ago'
    }
  ];

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="text-lime-400" />;
      case 'warning':
        return <AlertCircle size={16} className="text-yellow-400" />;
      case 'alert':
        return <Zap size={16} className="text-red-400" />;
      default:
        return <Info size={16} className="text-blue-400" />;
    }
  };

  return (
    <div>
      <h3 className="text-white font-semibold mb-4">Recent Activities</h3>
      <div className="space-y-3">
        {activities.map(activity => (
          <div
            key={activity.id}
            className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-800 hover:border-gray-700 transition-colors"
          >
            <div className="flex gap-3">
              <div className="mt-0.5">{getIcon(activity.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-200 text-sm leading-snug mb-1">
                  {activity.message}
                </p>
                <p className="text-gray-500 text-xs">{activity.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
