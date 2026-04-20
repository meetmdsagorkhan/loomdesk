'use client';

interface PageWrapperProps {
  children: React.ReactNode;
  isSidebarCollapsed?: boolean;
}

export default function PageWrapper({ children, isSidebarCollapsed = false }: PageWrapperProps) {
  return (
    <main className={`relative min-h-screen pt-36 transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
      <div className="mx-auto max-w-[1480px] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-[2.25rem] bg-gradient-to-br from-white to-slate-50 p-1 shadow-2xl backdrop-blur-sm dark:from-slate-900 dark:to-slate-950 dark:bg-white/[0.03]">
          <div className="min-h-[calc(100vh-12rem)] rounded-[2rem] bg-white/60 p-4 backdrop-blur-xl sm:p-6 lg:p-8 dark:bg-slate-950/60">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
