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
    primary: 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg',
    accent: 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg',
    warning: 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg',
    success: 'bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg',
  };

  const cardGradientMap: Record<string, string> = {
    primary: 'from-indigo-500/15 via-violet-500/10 to-white/5',
    accent: 'from-cyan-500/15 via-sky-500/10 to-white/5',
    warning: 'from-orange-500/15 via-amber-500/10 to-white/5',
    success: 'from-emerald-500/15 via-green-500/10 to-white/5',
  };

  return (
    <div className={`glass-card rounded-[1.6rem] bg-gradient-to-br ${cardGradientMap[color] ?? cardGradientMap.primary} p-6`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {change !== undefined && (
            <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              <span>{Math.abs(change)}%</span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          )}
        </div>
        <div className={`rounded-2xl p-3 shadow-md ring-1 ring-white/20 ${toneMap[color] ?? toneMap.primary}`}>{icon}</div>
      </div>
    </div>
  );
}
