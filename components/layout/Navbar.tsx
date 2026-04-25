'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, Bell, Sun, Moon, Loader2, X, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SubmissionModal } from '@/components/feedback/SubmissionModal';

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
  const { user } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      if (!user) return;

      const response = await fetch('/api/notifications');
      if (!response.ok) return;

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount((data.notifications || []).filter((n: Notification) => !n.is_read).length);
    } catch (error) {
      // Silently fail - notifications are optional
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
      });
      if (!response.ok) return;
      fetchNotifications();
    } catch (error) {
      // Silently fail
    }
  };

  const markAllAsRead = async () => {
    setIsMarkingAllRead(true);
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      if (!response.ok) return;
      fetchNotifications();

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      // Silently fail - notification read status is optional
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    // This is a placeholder - you can add navigation logic based on notification type
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SCORE_DEDUCTION':
        return <X size={16} className="text-destructive" />;
      case 'NEW_FEEDBACK':
        return <Check size={16} className="text-primary" />;
      case 'LEAVE_UPDATE':
        return <Check size={16} className="text-green-500" />;
      default:
        return <Bell size={16} className="text-muted-foreground" />;
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMobileMenuToggle}
        className="glass-pill lg:hidden fixed top-4 left-4 z-50 rounded-2xl"
      >
        <Menu size={20} className="text-foreground" />
      </Button>

      {/* Floating Buttons at Bottom Right - Vertical */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {/* Submission Modal */}
        <SubmissionModal />

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="glass-pill flex h-12 w-12 items-center justify-center rounded-full"
        >
          <Sun size={20} className="hidden dark:block text-white" />
          <Moon size={20} className="block dark:hidden text-slate-800" />
        </button>

        {/* Notifications */}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger>
            <div className="glass-pill relative flex h-12 w-12 items-center justify-center rounded-full cursor-pointer">
              <Bell size={20} className="text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground shadow-lg backdrop-blur-sm">
                  {unreadCount}
                </span>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="glass-panel w-80 max-h-[400px] overflow-y-auto rounded-3xl p-2"
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
                  className="cursor-pointer rounded-2xl p-3"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
