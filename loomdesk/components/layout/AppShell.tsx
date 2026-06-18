'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import PageWrapper from '@/components/layout/PageWrapper';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import CommandMenu from '@/components/shared/CommandMenu';
import { useHotkeys } from '@/hooks/useHotkeys';
import { PresenceAgentProvider } from '@/components/providers/PresenceAgentProvider';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user } = useCurrentUser();
  const router = useRouter();

  // Navigation shortcuts
  useHotkeys('g d', () => router.push('/dashboard'));
  useHotkeys('g q', () => router.push('/dashboard/qa'));
  useHotkeys('g l', () => router.push('/dashboard/leave'));
  useHotkeys('g s', () => router.push('/dashboard/my-submissions'));
  useHotkeys('g m', () => router.push('/dashboard/messages'));
  useHotkeys('g h', () => router.push('/scheduling'));

  useEffect(() => {
    const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    setIsSidebarCollapsed(collapsed);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  return (
    <PresenceAgentProvider>
      <div className="liquid-shell min-h-screen bg-transparent text-foreground">
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
          user={user}
        />
        <Navbar onMobileMenuToggle={() => setIsMobileMenuOpen((open) => !open)} />
        <PageWrapper isSidebarCollapsed={isSidebarCollapsed}>{children}</PageWrapper>
        <CommandMenu />
      </div>
    </PresenceAgentProvider>
  );
}
