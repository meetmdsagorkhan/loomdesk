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
    primary: 'from-primary/30 via-primary/20 to-primary/5 dark:from-primary/20 dark:via-primary/10 dark:to-transparent',
    accent: 'from-accent/30 via-accent/20 to-accent/5 dark:from-accent/20 dark:via-accent/10 dark:to-transparent',
    warning: 'from-warning/30 via-warning/20 to-warning/5 dark:from-warning/20 dark:via-warning/10 dark:to-transparent',
    success: 'from-success/30 via-success/20 to-success/5 dark:from-success/20 dark:via-success/10 dark:to-transparent',
  };

  const trendTone = {
    up: 'bg-success/15 text-success dark:text-success',
    down: 'bg-destructive/15 text-destructive dark:text-destructive',
    flat: 'bg-muted text-muted-foreground',
    none: '',
  };

  return (
    <div
      className={`glass-card h-full rounded-[1.25rem] border border-white/20 bg-gradient-to-br ${cardGradientMap[color] ?? cardGradientMap.primary} p-5 hover:border-white/40 transition-colors shadow-sm dark:shadow-none`}
    >
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold leading-none text-foreground">{value}</p>
          </div>
          <div className={`rounded-xl p-2.5 ring-1 ring-white/20 ${toneMap[color] ?? toneMap.primary} shadow-md`}>{icon}</div>
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
