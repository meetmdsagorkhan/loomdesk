'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import PageHeader from '@/components/shared/PageHeader';

export const dynamic = 'force-dynamic';

export default function SchedulingAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/scheduling/analytics')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Bookings',
      value: stats?.totalBookings || 0,
      icon: Calendar,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'This Month',
      value: stats?.thisMonthBookings || 0,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      growth: stats?.growthRate || 0,
    },
    {
      title: 'Upcoming',
      value: stats?.upcomingBookings || 0,
      icon: Clock,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Cancelled',
      value: stats?.cancelledBookings || 0,
      icon: Users,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scheduling Analytics"
        subtitle="Track your booking performance and metrics"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <GlassCard key={card.title} variant="panel" padding="none">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  {card.growth !== undefined && (
                    <div className="flex items-center gap-1 text-xs">
                      {card.growth >= 0 ? (
                        <ArrowUpRight size={12} className="text-emerald-400" />
                      ) : (
                        <ArrowDownRight size={12} className="text-rose-400" />
                      )}
                      <span className={card.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {Math.abs(card.growth).toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground">vs last month</span>
                    </div>
                  )}
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bgColor} ${card.color}`}>
                  <card.icon size={20} />
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Additional Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard variant="panel" padding="none">
          <div className="border-b border-white/10 px-6 py-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <BarChart3 size={16} />
              Booking Trends
            </h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-muted-foreground">
              Detailed booking analytics will be available soon. Track monthly trends, peak booking times, and conversion rates.
            </p>
          </div>
        </GlassCard>

        <GlassCard variant="panel" padding="none">
          <div className="border-b border-white/10 px-6 py-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users size={16} />
              Popular Event Types
            </h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-muted-foreground">
              See which event types are most booked. This helps you understand what your audience prefers.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
