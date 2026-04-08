"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CalendarDays, ChartColumn, ClipboardList, LogOut, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRecord } from "@/types/app";

interface AppSidebarProps {
  user: UserRecord;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems =
    user.role === "admin"
      ? [
          { href: "/admin", label: "Overview", icon: ShieldCheck },
          { href: "/admin#team", label: "Team", icon: Users },
          { href: "/admin#calendar", label: "Calendar", icon: CalendarDays },
          { href: "/admin#performance", label: "Performance", icon: ChartColumn },
          { href: "/admin#messages", label: "Messages", icon: Bell }
        ]
      : [
          { href: "/member", label: "Reports", icon: ClipboardList },
          { href: "/member#performance", label: "Performance", icon: ChartColumn },
          { href: "/member#messages", label: "Messages", icon: Bell }
        ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-full flex-col rounded-3xl border border-white/60 bg-white/80 p-5 shadow-panel backdrop-blur">
      <div className="mb-8">
        <div className="mb-2">
          <img src="/icon.png" alt="Loomdesk" className="h-16 w-auto" />
        </div>
        <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-white">
          <p className="text-sm font-medium">{user.email}</p>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{user.role}</p>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                pathname === item.href.split("#")[0]
                  ? "bg-sky-500 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Button variant="outline" className="w-full justify-start rounded-2xl" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
