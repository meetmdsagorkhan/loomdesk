'use client';

import { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  color?: string;
}

export default function StatCard({ title, value, change, icon, color = 'primary' }: StatCardProps) {
  const trend = change === undefined ? 'none' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const toneMap: Record<string, string> = {
    primary: 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg',
    accent: 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg',
    warning: 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg',
    success: 'bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg',
  };

  const cardGradientMap: Record<string, string> = {
    primary: 'from-indigo-500/18 via-violet-500/10 to-transparent',
    accent: 'from-cyan-500/18 via-sky-500/10 to-transparent',
    warning: 'from-orange-500/18 via-amber-500/10 to-transparent',
    success: 'from-emerald-500/18 via-green-500/10 to-transparent',
  };

  const trendTone = {
    up: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    down: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    flat: 'bg-muted text-muted-foreground',
    none: '',
  };

  return (
    <div
      className={`glass-card h-full rounded-[1.25rem] border border-white/20 bg-gradient-to-br ${cardGradientMap[color] ?? cardGradientMap.primary} p-5`}
    >
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate" title={title}>{title}</p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold leading-none text-foreground truncate">{value}</p>
          </div>
          <div className={`rounded-xl p-2.5 ring-1 ring-white/20 ${toneMap[color] ?? toneMap.primary}`}>{icon}</div>
        </div>
        {change !== undefined && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                trendTone[trend]
              }`}
            >
              {trend === 'up' && <ArrowUp size={12} />}
              {trend === 'down' && <ArrowDown size={12} />}
              {trend === 'flat' && <Minus size={12} />}
              {Math.abs(change)}%
            </span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}
