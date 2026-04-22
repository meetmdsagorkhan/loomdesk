'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart2,
  CalendarDays,
  CalendarOff,
  CheckSquare,
  Clock,
  FileText,
  LayoutDashboard,
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
import { signOut } from 'next-auth/react';

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
  const sidebarRef = useRef<HTMLElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

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

  // Swipe-to-close gesture for mobile
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar || !isMobileOpen) return;

    const handleTouchStart = (e: TouchEvent) => {
      setTouchStart(e.touches[0].clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStart === null) return;
      const currentX = e.touches[0].clientX;
      const diff = currentX - touchStart;

      // Swipe right to close
      if (diff > 50) {
        onMobileClose?.();
        setTouchStart(null);
      }
    };

    const handleTouchEnd = () => {
      setTouchStart(null);
    };

    sidebar.addEventListener('touchstart', handleTouchStart);
    sidebar.addEventListener('touchmove', handleTouchMove);
    sidebar.addEventListener('touchend', handleTouchEnd);

    return () => {
      sidebar.removeEventListener('touchstart', handleTouchStart);
      sidebar.removeEventListener('touchmove', handleTouchMove);
      sidebar.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobileOpen, touchStart, onMobileClose]);

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
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden fade-in"
          onClick={onMobileClose}
        />
      )}

      <aside
        ref={sidebarRef}
        className={[
          'glass-nav fixed inset-y-0 left-0 z-50 rounded-r-[2rem] transition-all duration-300 ease-out',
          isCollapsed ? 'w-20' : 'w-72',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-4">
            <Link href="/dashboard" className="flex items-center gap-3 min-h-[44px]" onClick={onMobileClose}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                <img src="/icon.png" alt="Icon" className="w-10 h-10 object-contain drop-shadow-sm" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col justify-center">
                  <img src="/logo.png" alt="LoomDesk" className="h-6 w-auto object-contain ml-1" />
                  <p className="text-[10px] font-medium text-sidebar-foreground/60 ml-2 tracking-wider uppercase mt-0.5">
                    Executive Ops
                  </p>
                </div>
              )}
            </Link>

            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                className="glass-pill hidden shrink-0 rounded-xl p-3 text-muted-foreground lg:flex min-h-[44px] min-w-[44px]"
                onClick={onToggleCollapse}
              >
                {isCollapsed ? <PanelRightClose size={18} /> : <PanelLeftClose size={18} />}
              </button>
              <button
                type="button"
                className="glass-pill shrink-0 rounded-xl p-3 text-muted-foreground lg:hidden min-h-[44px] min-w-[44px]"
                onClick={onMobileClose}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <nav className={["flex-1 px-3 py-4", isCollapsed ? "" : "overflow-y-auto"].join(" ")}>
            {Object.entries(groupedItems).map(([section, items]) => {
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
                            'group relative flex items-center gap-3 rounded-2xl px-3 py-3 min-h-[44px] transition-all duration-300',
                            isCollapsed ? 'justify-center' : '',
                            isActive
                              ? 'glass-pill border-white/30 bg-white/45 text-slate-900 dark:bg-white/10 dark:text-white'
                              : 'text-sidebar-foreground/70 hover:bg-white/35 dark:hover:bg-white/10 hover:text-sidebar-foreground',
                          ].join(' ')}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <div
                            className={[
                              'flex shrink-0 items-center justify-center rounded-lg transition-colors',
                              isCollapsed ? 'h-11 w-11' : 'h-10 w-10',
                              isActive
                                ? 'bg-primary/20 text-primary dark:bg-primary/20 dark:text-primary'
                                : 'bg-white/10 text-sidebar-foreground group-hover:bg-white/50 dark:group-hover:bg-white/15',
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
                  <button className="glass-pill flex w-full items-center gap-3 rounded-2xl p-3 min-h-[44px]">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors">
                      <Avatar className="h-11 w-11 bg-primary/10 dark:bg-primary/20 shrink-0 rounded-full border-2 border-white/30">
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
                <DropdownMenuContent align="end" className="glass-panel w-48 rounded-2xl p-1.5">
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
