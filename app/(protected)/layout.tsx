import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getSessionForPage } from "@/lib/auth";
import { dashboardShellClassName } from "@/lib/ui";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getSessionForPage();

  return (
    <div className={dashboardShellClassName}>
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[280px_1fr] lg:px-6">
        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <AppSidebar user={session.profile} />
        </div>
        <main className="rounded-[2rem] border border-white/60 bg-white/70 p-4 shadow-panel backdrop-blur md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
