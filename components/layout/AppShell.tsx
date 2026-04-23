'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import PageWrapper from '@/components/layout/PageWrapper';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user } = useCurrentUser();

  useEffect(() => {
    const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    setIsSidebarCollapsed(collapsed);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  return (
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
    </div>
  );
}
