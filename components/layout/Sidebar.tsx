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
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Settings,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';
import { isNavItemActive, navItems, type NavIcon } from '@/lib/navigation';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const iconMap: Record<NavIcon, React.ComponentType<{ size?: number; className?: string }>> = {
  dashboard: LayoutDashboard,
  reports: FileText,
  qa: CheckSquare,
  leave: CalendarOff,
  shifts: Clock,
  attendance: UserCheck,
  analytics: BarChart2,
  messages: MessageSquare,
  scoring: TrendingUp,
  settings: Settings,
};

export default function Sidebar({ isMobileOpen, onMobileClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
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
          'fixed inset-y-0 left-0 z-50 border-r border-slate-200/70 bg-gradient-to-b from-slate-50 to-white backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950',
          isCollapsed ? 'w-20' : 'w-72',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-3 py-4 shadow-sm">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={onMobileClose}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 dark:from-blue-600 dark:to-blue-700">
                <Activity size={20} />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    LoomDesk
                  </p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Operations
                  </p>
                </div>
              )}
            </Link>

            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                className="hidden lg:flex shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                onClick={onToggleCollapse}
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
              <button
                type="button"
                className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={onMobileClose}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {Object.entries(groupedItems).map(([section, items]) => (
              <div key={section} className="mb-4">
                {!isCollapsed && (
                  <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {section}
                  </p>
                )}
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = iconMap[item.icon];
                    const isActive = isNavItemActive(pathname, item.href, item.matches);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onMobileClose}
                        className={[
                          'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all',
                          isCollapsed ? 'justify-center' : '',
                          isActive
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20 dark:from-blue-600 dark:to-blue-700'
                            : 'text-slate-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-blue-900/10',
                        ].join(' ')}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <div
                          className={[
                            'flex shrink-0 items-center justify-center rounded-lg transition-colors',
                            isCollapsed ? 'h-9 w-9' : 'h-8 w-8',
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:bg-blue-900/40',
                          ].join(' ')}
                        >
                          <Icon size={isCollapsed ? 20 : 16} />
                        </div>
                        {!isCollapsed && (
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{item.label}</p>
                          </div>
                        )}
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
