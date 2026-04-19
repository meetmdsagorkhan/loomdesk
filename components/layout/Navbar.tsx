'use client';

import { useEffect, useRef, useState, useEffectEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Check, Loader2, Menu, Moon, Sun, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getRouteMeta } from '@/lib/navigation';
import { supabase } from '@/lib/supabase';

interface NavbarProps {
  onMobileMenuToggle?: () => void;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function Navbar({ onMobileMenuToggle }: NavbarProps) {
  const pathname = usePathname();
  const routeMeta = getRouteMeta(pathname);
  const { user, isLoading } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !supabase) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  const fetchNotifications = useEffectEvent(async () => {
    try {
      if (!supabase || !user?.id) return;

      const result = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!result) {
        return;
      }

      const { data, error } = result;

      if (error) {
        console.error('Failed to fetch notifications:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount((data || []).filter((notification: Notification) => !notification.is_read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  });

  const markAsRead = async (notificationId: string) => {
    try {
      if (supabase) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
      }

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setIsMarkingAllRead(true);

    try {
      if (supabase) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user?.id)
          .eq('is_read', false);
      }

      setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    setIsOpen(false);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SCORE_DEDUCTION':
        return <X size={16} className="text-destructive" />;
      case 'NEW_FEEDBACK':
      case 'LEAVE_UPDATE':
        return <Check size={16} className="text-primary" />;
      default:
        return <Bell size={16} className="text-muted-foreground" />;
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-slate-200/70 bg-white/78 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/78 lg:left-72">
      <div className="mx-auto flex max-w-[1480px] items-start justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMobileMenuToggle}
              className="mt-1 rounded-2xl lg:hidden"
            >
              <Menu size={20} className="text-foreground" />
            </Button>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                {routeMeta.href}
              </p>
              <h1 className="truncate text-xl font-semibold text-slate-950 dark:text-white">
                {routeMeta.title}
              </h1>
              <p className="hidden truncate text-sm text-slate-500 md:block dark:text-slate-400">
                {routeMeta.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-100 dark:hover:border-white/10 dark:hover:bg-white/5"
            >
              <Sun size={18} className="hidden dark:block text-foreground" />
              <Moon size={18} className="block dark:hidden text-foreground" />
            </Button>

            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger className="relative rounded-2xl border border-transparent p-2.5 transition-colors hover:border-slate-200 hover:bg-slate-100 dark:hover:border-white/10 dark:hover:bg-white/5">
                <Bell size={18} className="text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-[420px] w-80 overflow-y-auto rounded-2xl"
                ref={dropdownRef}
              >
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      disabled={isMarkingAllRead}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      {isMarkingAllRead ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        'Mark all as read'
                      )}
                    </button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="cursor-pointer p-3"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex w-full items-start gap-3">
                        <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {!isLoading && user && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 rounded-2xl border border-transparent px-1.5 py-1.5 transition-colors hover:border-slate-200 hover:bg-slate-100 dark:hover:border-white/10 dark:hover:bg-white/5">
                  <Avatar className="h-10 w-10 bg-slate-900 text-white dark:bg-white dark:text-slate-950">
                    <AvatarFallback className="text-sm font-semibold">
                      {getInitials(user.name || 'User')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-semibold text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role.toLowerCase().replace('_', ' ')}
                    </p>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-2xl">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href="/settings" className="block w-full">
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/dashboard" className="block w-full">
                      Overview
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>
      </div>
    </header>
  );
}
