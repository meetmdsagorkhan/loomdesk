'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
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

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
      transition={{ duration: 0.2 }}
      className="bg-card rounded-2xl shadow-sm border border-border p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-card-foreground mt-2">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              <span className="font-medium">{Math.abs(change)}%</span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-${color}/10 text-${color}`}>{icon}</div>
      </div>
    </motion.div>
  );
}
