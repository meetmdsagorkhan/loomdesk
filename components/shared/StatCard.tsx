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
    primary: 'bg-primary text-primary-foreground shadow-lg',
    accent: 'bg-accent text-accent-foreground shadow-lg',
    warning: 'bg-warning text-warning-foreground shadow-lg',
    success: 'bg-success text-success-foreground shadow-lg',
  };

  const cardGradientMap: Record<string, string> = {
    primary: 'from-primary/18 via-primary/10 to-transparent',
    accent: 'from-accent/18 via-accent/10 to-transparent',
    warning: 'from-warning/18 via-warning/10 to-transparent',
    success: 'from-success/18 via-success/10 to-transparent',
  };

  const trendTone = {
    up: 'bg-success/15 text-success dark:text-success',
    down: 'bg-destructive/15 text-destructive dark:text-destructive',
    flat: 'bg-muted text-muted-foreground',
    none: '',
  };

  return (
    <div
      className={`glass-card h-full rounded-[1.25rem] border border-white/20 bg-gradient-to-br ${cardGradientMap[color] ?? cardGradientMap.primary} p-5`}
    >
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold leading-none text-foreground">{value}</p>
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
