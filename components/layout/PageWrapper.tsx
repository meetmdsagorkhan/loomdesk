'use client';

interface PageWrapperProps {
  children: React.ReactNode;
}

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <main className="relative min-h-screen pt-36 lg:pl-72">
      <div className="mx-auto max-w-[1480px] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-[2.25rem] border border-white/45 bg-white/22 p-1 shadow-[0_30px_90px_-48px_rgba(15,23,42,0.42)] backdrop-blur-sm dark:border-white/8 dark:bg-white/[0.03]">
          <div className="min-h-[calc(100vh-12rem)] rounded-[2rem] border border-white/60 bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-xl sm:p-6 lg:p-8 dark:border-white/8 dark:bg-slate-950/38 dark:shadow-none">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
