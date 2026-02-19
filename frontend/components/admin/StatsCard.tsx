import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, icon: Icon, description, trend }: StatsCardProps) {
  return (
    <div className="neo-card p-5 group">
      <div className="flex items-start justify-between mb-4">
        <div className="icon-box-purple w-10 h-10">
          <Icon className="w-5 h-5 text-purple-400" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              trend.isPositive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {trend.isPositive
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />
            }
            {Math.abs(trend.value).toFixed(1)}%
          </div>
        )}
      </div>

      <div className="stat-value mb-1">{value}</div>
      <div className="text-xs text-slate-400 font-medium mb-0.5">{title}</div>
      {description && (
        <div className="text-xs text-slate-500">{description}</div>
      )}
    </div>
  );
}
