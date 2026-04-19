'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import PageWrapper from '@/components/layout/PageWrapper';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at top left, oklch(0.92 0.08 219 / 0.4), transparent 30%), radial-gradient(circle at top right, oklch(0.88 0.12 30 / 0.22), transparent 26%), linear-gradient(180deg, oklch(0.99 0.002 248), oklch(0.965 0.004 248))',
        }}
      />
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      <Navbar onMobileMenuToggle={() => setIsMobileMenuOpen((open) => !open)} />
      <PageWrapper>{children}</PageWrapper>
    </div>
  );
}
