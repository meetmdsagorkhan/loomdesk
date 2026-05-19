'use client';

import AppShell from '@/components/layout/AppShell';
import { TimeTrackerWidget } from '@/components/time-tracking/TimeTrackerWidget';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      {children}
      <TimeTrackerWidget />
    </AppShell>
  );
}
