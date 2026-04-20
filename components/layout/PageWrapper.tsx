'use client';

interface PageWrapperProps {
  children: React.ReactNode;
  isSidebarCollapsed?: boolean;
}

export default function PageWrapper({ children, isSidebarCollapsed = false }: PageWrapperProps) {
  return (
    <main className={`relative min-h-screen pt-4 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
      <div className="mx-auto max-w-[1480px] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="min-h-[calc(100vh-10rem)] rounded-3xl border border-border/60 bg-card/80 p-6 card-elevation-lg backdrop-blur-sm sm:p-7 lg:p-9">
          {children}
        </div>
      </div>
    </main>
  );
}
