'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart2,
  CalendarOff,
  CheckSquare,
  Clock,
  FileText,
  LayoutDashboard,
  Settings,
  UserCheck,
  X,
} from 'lucide-react';
import { isNavItemActive, navItems, type NavIcon } from '@/lib/navigation';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const iconMap: Record<NavIcon, React.ComponentType<{ size?: number; className?: string }>> = {
  dashboard: LayoutDashboard,
  reports: FileText,
  qa: CheckSquare,
  leave: CalendarOff,
  shifts: Clock,
  attendance: UserCheck,
  analytics: BarChart2,
  settings: Settings,
};

export default function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const groupedItems = navItems.reduce<Record<string, typeof navItems>>((groups, item) => {
    groups[item.section] ??= [];
    groups[item.section].push(item);
    return groups;
  }, {});

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200/70 bg-white/88 backdrop-blur-xl transition-transform duration-300 dark:border-white/10 dark:bg-slate-950/85',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200/70 px-6 py-5 dark:border-white/10">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={onMobileClose}>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15 dark:bg-white dark:text-slate-950">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  LoomDesk
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Operations Console
                </p>
              </div>
            </Link>

            <button
              type="button"
              className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={onMobileClose}
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            {Object.entries(groupedItems).map(([section, items]) => (
              <div key={section} className="mb-6">
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  {section}
                </p>
                <div className="space-y-1.5">
                  {items.map((item) => {
                    const Icon = iconMap[item.icon];
                    const isActive = isNavItemActive(pathname, item.href, item.matches);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onMobileClose}
                        className={[
                          'group flex items-start gap-3 rounded-2xl border px-3.5 py-3 transition-all',
                          isActive
                            ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/12 dark:border-white dark:bg-white dark:text-slate-950'
                            : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/5',
                        ].join(' ')}
                      >
                        <div
                          className={[
                            'mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl transition-colors',
                            isActive
                              ? 'bg-white/12 text-white dark:bg-slate-900/10 dark:text-slate-950'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-white dark:bg-white/5 dark:text-slate-300',
                          ].join(' ')}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{item.label}</p>
                          <p
                            className={[
                              'mt-0.5 text-xs leading-5',
                              isActive
                                ? 'text-slate-200 dark:text-slate-700'
                                : 'text-slate-500 dark:text-slate-400',
                            ].join(' ')}
                          >
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
