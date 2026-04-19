'use client';

import { ReactNode } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  color?: string;
}

export default function StatCard({ title, value, change, icon, color = 'primary' }: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const toneMap: Record<string, string> = {
    primary: 'bg-primary/12 text-primary',
    accent: 'bg-accent/18 text-accent-foreground',
    warning: 'bg-warning/16 text-amber-700 dark:text-amber-300',
    success: 'bg-success/16 text-success',
  };

  return (
    <div className="rounded-[1.6rem] border border-border bg-card p-6 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.28)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-card-foreground">{value}</p>
          {change !== undefined && (
            <div className={`mt-2 flex items-center gap-1 text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              <span className="font-medium">{Math.abs(change)}%</span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          )}
        </div>
        <div className={`rounded-2xl p-3 ${toneMap[color] ?? toneMap.primary}`}>{icon}</div>
      </div>
    </div>
  );
}
