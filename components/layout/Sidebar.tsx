'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart2,
  CalendarDays,
  CalendarOff,
  CheckSquare,
  Clock,
  FileText,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  PanelRightClose,
  MessageSquare,
  Settings,
  TrendingUp,
  UserCheck,
  X,
  User,
  LogOut,
} from 'lucide-react';
import { isNavItemActive, navItems, type NavIcon } from '@/lib/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/auth';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  user?: { name?: string; email?: string; role?: string; image?: string | null } | null;
}

const iconMap: Record<NavIcon, React.ComponentType<{ size?: number; className?: string }>> = {
  dashboard: LayoutDashboard,
  reports: FileText,
  qa: CheckSquare,
  leave: CalendarOff,
  shifts: Clock,
  calendar: CalendarDays,
  attendance: UserCheck,
  analytics: BarChart2,
  messages: MessageSquare,
  scoring: TrendingUp,
  settings: Settings,
};

export default function Sidebar({ isMobileOpen, onMobileClose, isCollapsed = false, onToggleCollapse, user }: SidebarProps) {
  const pathname = usePathname();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await signOut({ redirectTo: '/login' });
  };

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
          'fixed inset-y-0 left-0 z-50 border-r border-white/10 glass-card transition-all duration-300',
          isCollapsed ? 'w-20' : 'w-72',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-4">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={onMobileClose}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg ring-2 ring-white/20 backdrop-blur-sm">
                <Activity size={20} />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    LoomDesk
                  </p>
                  <p className="text-sm font-semibold text-sidebar-foreground">
                    Executive Ops
                  </p>
                </div>
              )}
            </Link>

            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                className="hidden shrink-0 rounded-xl p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex"
                onClick={onToggleCollapse}
              >
                {isCollapsed ? <PanelRightClose size={18} /> : <PanelLeftClose size={18} />}
              </button>
              <button
                type="button"
                className="shrink-0 rounded-xl p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
                onClick={onMobileClose}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <nav className={["flex-1 px-3 py-4", isCollapsed ? "" : "overflow-y-auto"].join(" ")}>
            {Object.entries(groupedItems).map(([section, items]) => {
              const hasActiveItem = items.some(item => isNavItemActive(pathname, item.href, item.matches));
              return (
                <div key={section} className="mb-4">
                  {!isCollapsed && (
                    <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/60">
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
                            'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all relative',
                            isCollapsed ? 'justify-center' : '',
                            isActive
                              ? 'bg-primary/20 text-slate-800 dark:bg-white/20 dark:text-white'
                              : 'text-sidebar-foreground/70 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-sidebar-foreground',
                          ].join(' ')}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <div
                            className={[
                              'flex shrink-0 items-center justify-center rounded-lg transition-colors',
                              isCollapsed ? 'h-9 w-9' : 'h-8 w-8',
                              isActive
                                ? 'bg-primary/20 text-primary dark:bg-primary/20 dark:text-primary backdrop-blur-sm'
                                : 'bg-white/10 text-sidebar-foreground group-hover:bg-slate-200 dark:group-hover:bg-white/20 backdrop-blur-sm',
                            ].join(' ')}
                          >
                            <Icon size={isCollapsed ? 20 : 16} />
                          </div>
                          {!isCollapsed && (
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{item.label}</p>
                              <p className="truncate text-xs text-current/70">{item.description}</p>
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Profile Button at Bottom - Floated inside sidebar */}
          {user && (
            <div className="p-3 sticky bottom-0">
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full">
                  <button className="flex items-center gap-3 w-full rounded-xl p-2 hover:bg-white/10 transition-colors">
                    <div className="flex shrink-0 items-center justify-center rounded-full transition-colors h-8 w-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm">
                      <Avatar className="h-8 w-8 bg-primary/10 dark:bg-primary/20 shrink-0 rounded-full border-2 border-white/30">
                        {user.image ? (
                          <AvatarImage src={user.image} alt={user.name || 'User'} />
                        ) : (
                          <AvatarFallback className="text-slate-800 dark:text-white text-sm font-medium">
                            {getInitials(user.name || 'User')}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground capitalize truncate">{user.role?.toLowerCase().replace('_', ' ')}</p>
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User size={16} className="mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings size={16} className="mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
