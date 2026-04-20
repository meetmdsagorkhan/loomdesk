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
    primary: 'bg-primary text-primary-foreground',
    accent: 'bg-accent text-accent-foreground',
    warning: 'bg-yellow-500 text-white',
    success: 'bg-green-500 text-white',
  };

  return (
    <div className="rounded-lg bg-card p-6 shadow-lg transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-card-foreground">{value}</p>
          {change !== undefined && (
            <div className={`mt-2 flex items-center gap-1 text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              <span className="font-medium">{Math.abs(change)}%</span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          )}
        </div>
        <div className={`rounded-lg p-3 ${toneMap[color] ?? toneMap.primary}`}>{icon}</div>
      </div>
    </div>
  );
}
