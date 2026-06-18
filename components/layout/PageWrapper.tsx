'use client';

interface PageWrapperProps {
  children: React.ReactNode;
  isSidebarCollapsed?: boolean;
}

export default function PageWrapper({ children, isSidebarCollapsed = false }: PageWrapperProps) {
  return (
    <main className={`relative min-h-screen pt-4 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
      <div className="mx-auto max-w-[1480px] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="liquid-shell glass-panel min-h-[calc(100vh-10rem)] rounded-[2rem] p-6 pb-24 sm:p-7 sm:pb-24 lg:p-9 lg:pb-24">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <div className="pointer-events-none absolute -left-16 top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-10 h-56 w-56 rounded-full bg-info/10 blur-3xl" />
          {children}
        </div>
      </div>
    </main>
  );
}
