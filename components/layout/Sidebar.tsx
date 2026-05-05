'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  BarChart2,
  CalendarDays,
  CalendarOff,
  Calendar,
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
  Shield,
  Crown,
  ChevronRight,
  ExternalLink,
  Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  isNavItemActive,
  navItems,
  getNavItemLabel,
  getNavItemDescription,
  type NavIcon,
} from '@/lib/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

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
  analytics: BarChart2,
  messages: MessageSquare,
  scoring: TrendingUp,
  submissions: Send,
  scheduling: Calendar,
  settings: Settings,
  profile: User,
};

const ROLE_DISPLAY: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ADMIN: { label: 'Admin', icon: Crown, color: 'text-violet-400' },
  TEAM_LEAD: { label: 'Team Lead', icon: Shield, color: 'text-sky-400' },
  MEMBER: { label: 'Member', icon: UserCheck, color: 'text-emerald-400' },
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarGradient(name: string) {
  const gradients = [
    'from-violet-500 to-indigo-500',
    'from-sky-500 to-cyan-400',
    'from-emerald-500 to-teal-400',
    'from-rose-500 to-pink-400',
    'from-amber-500 to-orange-400',
    'from-fuchsia-500 to-purple-500',
  ];
  return gradients[name.charCodeAt(0) % gradients.length];
}

/* ── Profile Popup ─────────────────────────────────── */
interface ProfilePopupProps {
  user: SidebarProps['user'];
  profileImage: string | null;
  isCollapsed: boolean;
  onClose: () => void;
  onLogout: () => void;
  role: string;
}

function ProfilePopup({ user, profileImage, isCollapsed, onClose, onLogout, role }: ProfilePopupProps) {
  const router = useRouter();
  const popupRef = useRef<HTMLDivElement>(null);
  const gradient = getAvatarGradient(user?.name || 'U');
  const roleInfo = ROLE_DISPLAY[role] ?? ROLE_DISPLAY.MEMBER;
  const RoleIcon = roleInfo.icon;

  /* close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  /* close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <motion.div
      ref={popupRef}
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        'absolute bottom-full mb-3 z-[100] w-72 rounded-2xl overflow-hidden',
        'border border-white/20 bg-white text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-950 dark:text-white',
        isCollapsed ? 'left-16' : 'left-3 right-3 w-auto',
      )}
    >
      {/* Header — user identity */}
      <div className="relative p-5 pb-4 overflow-hidden">
        {/* ambient glow */}
        <div className={cn('absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-40 bg-gradient-to-br', gradient)} />

        <div className="relative flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className={cn(
              'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-lg font-bold overflow-hidden ring-2 ring-white/20',
              !profileImage && gradient,
            )}>
              {profileImage ? (
                <img src={profileImage} alt={user?.name || ''} className="w-full h-full object-cover" />
              ) : (
                getInitials(user?.name || 'U')
              )}
            </div>
            {/* online indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 shadow-sm" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
            <span className={cn('inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold', roleInfo.color)}>
              <RoleIcon size={10} />
              {roleInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50 mx-4" />

      {/* Actions */}
      <div className="p-2">
        <button
          onClick={() => navigate('/profile')}
          className="w-full cursor-pointer flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/8 text-foreground/80 hover:text-foreground transition-colors duration-150 group text-left"
        >
          <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/15 transition-colors">
            <User size={13} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">View Profile</p>
            <p className="text-[11px] text-muted-foreground">Personal info & security</p>
          </div>
          <ChevronRight size={12} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
        </button>


      </div>

      {/* Divider */}
      <div className="h-px bg-border/50 mx-4" />

      {/* Sign out */}
      <div className="p-2">
        <button
          onClick={onLogout}
          className="w-full cursor-pointer flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors duration-150 group text-left"
        >
          <div className="p-1.5 rounded-lg bg-muted group-hover:bg-destructive/15 transition-colors">
            <LogOut size={13} className="transition-colors group-hover:text-destructive" />
          </div>
          <p className="text-xs font-semibold">Sign Out</p>
        </button>
      </div>
    </motion.div>
  );
}

/* ── Sidebar ───────────────────────────────────────── */
export default function Sidebar({ isMobileOpen, onMobileClose, isCollapsed = false, onToggleCollapse, user }: SidebarProps) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const role = user?.role || 'MEMBER';

  /* fetch real profile image (was stripped from JWT) */
  useEffect(() => {
    if (!user) return;
    fetch('/api/user/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.user?.image) setProfileImage(data.user.image);
      })
      .catch(() => {});
  }, [user]);

  const handleLogout = async () => {
    setProfileOpen(false);
    await signOut({ redirectTo: '/login' });
  };

  /* swipe-to-close on mobile */
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar || !isMobileOpen) return;
    const onStart = (e: TouchEvent) => setTouchStart(e.touches[0].clientX);
    const onMove = (e: TouchEvent) => {
      if (touchStart === null) return;
      if (e.touches[0].clientX - touchStart > 50) { onMobileClose?.(); setTouchStart(null); }
    };
    const onEnd = () => setTouchStart(null);
    sidebar.addEventListener('touchstart', onStart);
    sidebar.addEventListener('touchmove', onMove);
    sidebar.addEventListener('touchend', onEnd);
    return () => {
      sidebar.removeEventListener('touchstart', onStart);
      sidebar.removeEventListener('touchmove', onMove);
      sidebar.removeEventListener('touchend', onEnd);
    };
  }, [isMobileOpen, touchStart, onMobileClose]);

  /* filter + group nav items — exclude "Account" section (profile moved to popup) */
  const filteredItems = navItems.filter((item) => {
    if (item.section === 'Account') return false;
    if (!item.roles) return true;
    return item.roles.includes(role);
  });

  const groupedItems = filteredItems.reduce<Record<string, typeof navItems>>((groups, item) => {
    groups[item.section] ??= [];
    groups[item.section].push(item);
    return groups;
  }, {});

  const gradient = getAvatarGradient(user?.name || 'U');

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        ref={sidebarRef}
        className={cn(
          'glass-nav fixed inset-y-0 left-0 z-50 rounded-r-[2rem] transition-all duration-300 ease-out flex flex-col',
          isCollapsed ? 'w-20' : 'w-72',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* ── Logo / Header ──────────────────────────── */}
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-4 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 min-h-[44px]" onClick={onMobileClose}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <img src="/icon.png" alt="Icon" className="w-10 h-10 object-contain drop-shadow-sm" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col justify-center">
                <img src="/logo_text.png" alt="LoomDesk" className="h-6 w-auto object-contain ml-1" />
                <p className="text-[10px] font-medium text-sidebar-foreground/60 ml-2 tracking-wider uppercase mt-0.5">
                  {role === 'ADMIN' ? 'Executive Ops' : 'Workspace'}
                </p>
              </div>
            )}
          </Link>

          {!isCollapsed ? (
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                className="glass-pill hidden shrink-0 rounded-xl p-3 text-muted-foreground lg:flex min-h-[44px] min-w-[44px] hover:text-foreground transition-colors"
                onClick={onToggleCollapse}
              >
                <PanelLeftClose size={18} />
              </button>
              <button
                type="button"
                className="glass-pill shrink-0 rounded-xl p-3 text-muted-foreground lg:hidden min-h-[44px] min-w-[44px]"
                onClick={onMobileClose}
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="glass-pill flex shrink-0 rounded-full text-muted-foreground mx-auto h-9 w-9 items-center justify-center hover:text-foreground transition-colors"
              onClick={onToggleCollapse}
            >
              <PanelRightClose size={16} />
            </button>
          )}
        </div>

        {/* ── Nav ────────────────────────────────────── */}
        <nav className={cn('flex-1 px-3 py-4 space-y-5', !isCollapsed && 'overflow-y-auto')}>
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section}>
              {!isCollapsed && (
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground/50">
                  {section}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = iconMap[item.icon];
                  const isActive = isNavItemActive(pathname, item.href, item.matches);
                  const label = getNavItemLabel(item, role);
                  const description = getNavItemDescription(item, role);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      title={isCollapsed ? label : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 transition-all duration-200',
                        isCollapsed
                          ? 'justify-center rounded-xl h-11 w-11 mx-auto'
                          : 'rounded-2xl px-3 py-2.5 min-h-[44px]',
                        isActive
                          ? 'glass-pill border-white/30 bg-white/45 text-slate-900 dark:bg-white/10 dark:text-white shadow-sm'
                          : 'text-sidebar-foreground/65 hover:bg-primary/20 hover:border-primary/30 hover:text-sidebar-foreground hover:backdrop-blur-sm',
                      )}
                    >
                      {/* active indicator bar */}
                      {isActive && !isCollapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary" />
                      )}

                      <div
                        className={cn(
                          'flex shrink-0 items-center justify-center transition-colors',
                          isCollapsed ? 'h-8 w-8 rounded-xl' : 'h-9 w-9 rounded-xl',
                          isActive
                            ? 'bg-primary/20 text-primary'
                            : 'bg-white/10 text-sidebar-foreground/70 group-hover:bg-white/40 dark:group-hover:bg-white/12 group-hover:text-sidebar-foreground',
                        )}
                      >
                        <Icon size={isCollapsed ? 17 : 15} />
                      </div>

                      {!isCollapsed && (
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight">{label}</p>
                          <p className="truncate text-[11px] text-current/60 mt-0.5">{description}</p>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Profile Button ─────────────────────────── */}
        {user && (
          <div className={cn('shrink-0 p-3 border-t border-white/10 relative')}>
            <AnimatePresence>
              {profileOpen && (
                <ProfilePopup
                  user={user}
                  profileImage={profileImage}
                  isCollapsed={isCollapsed}
                  onClose={() => setProfileOpen(false)}
                  onLogout={handleLogout}
                  role={role}
                />
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className={cn(
                'glass-solid w-full flex items-center gap-3 rounded-2xl transition-all duration-200',
                isCollapsed ? 'justify-center p-2' : 'p-2.5',
                profileOpen
                  ? 'ring-1 ring-primary/25'
                  : 'hover:border-white/35 dark:hover:border-white/15',
              )}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className={cn(
                  'rounded-xl overflow-hidden flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br ring-2 ring-white/20',
                  isCollapsed ? 'w-10 h-10' : 'w-10 h-10',
                  !profileImage && gradient,
                )}>
                  {profileImage ? (
                    <img src={profileImage} alt={user.name || ''} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(user.name || 'U')
                  )}
                </div>
                {/* online dot */}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-[1.5px] border-white dark:border-slate-900" />
              </div>

              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-foreground truncate leading-tight">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize truncate mt-0.5">
                      {role.toLowerCase().replace('_', ' ')}
                    </p>
                  </div>
                  <div className={cn(
                    'shrink-0 p-1 rounded-lg transition-all duration-200',
                    profileOpen ? 'bg-primary/20 text-primary' : 'text-muted-foreground/50',
                  )}>
                    <ChevronRight size={13} className={cn('transition-transform duration-200', profileOpen && 'rotate-90')} />
                  </div>
                </>
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
