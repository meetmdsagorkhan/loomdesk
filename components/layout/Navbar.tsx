'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, Bell, Sun, Moon, Loader2, X, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { formatDistanceToNow } from 'date-fns';
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotifications = useCallback(async () => {
    try {
      if (!user) return;

      const response = await fetch('/api/notifications');
      if (!response.ok) {
        console.error('Failed to fetch notifications:', response.status);
        return;
      }

      const data = await response.json();
      console.log('Notifications data:', data);
      setNotifications(data.notifications || []);
      setUnreadCount((data.notifications || []).filter((n: Notification) => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
      if (!response.ok) {
        console.error('Failed to mark notification as read:', response.status);
        return;
      }
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
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
    if (notification.type === 'NEW_MESSAGE') {
      // Navigate to messages page
      window.location.href = '/dashboard/messages';
    } else if (notification.type === 'SCORE_DEDUCTION' || notification.type === 'NEW_FEEDBACK') {
      // Navigate to scoring page
      window.location.href = '/dashboard/scoring';
    } else if (notification.type === 'LEAVE_UPDATE') {
      // Navigate to leave page
      window.location.href = '/dashboard/leave';
    } else if (notification.type === 'SHIFT_ASSIGNMENT') {
      // Navigate to shifts page
      window.location.href = '/dashboard/shifts/my-schedule';
    } else if (notification.type === 'NEW_REPORT') {
      // Navigate to QA page
      window.location.href = '/dashboard/qa';
    }
    
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
      case 'SHIFT_ASSIGNMENT':
        return <Check size={16} className="text-blue-500" />;
      case 'NEW_REPORT':
        return <Check size={16} className="text-purple-500" />;
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
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="glass-pill relative flex h-12 w-12 items-center justify-center rounded-full cursor-pointer"
        >
          <Bell size={20} className="text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground shadow-lg backdrop-blur-sm">
              {unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div 
            ref={dropdownRef}
            className="absolute bottom-16 right-0 w-80 max-h-[400px] overflow-y-auto glass-panel rounded-3xl p-2 shadow-xl z-50"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
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
            </div>
            <div className="border-t border-white/10 my-2" />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="cursor-pointer rounded-2xl p-3 hover:bg-white/5 transition-colors"
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
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
