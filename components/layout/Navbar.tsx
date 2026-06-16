'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, Bell, Sun, Moon, Loader2, X, Check, Calendar } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
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
  read: boolean;
  createdAt: string;
}

export default function Navbar({ onMobileMenuToggle }: NavbarProps) {
  const { user } = useCurrentUser();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState<Record<string, boolean>>({});

  const handleLeaveAction = async (
    notificationId: string,
    leaveId: string,
    status: 'APPROVED' | 'REJECTED'
  ) => {
    setIsProcessingAction((prev) => ({ ...prev, [notificationId]: true }));
    try {
      const response = await fetch(`/api/leave/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        console.error('Failed to update leave request status');
        return;
      }

      // Mark the notification as read since the action was taken
      await markAsRead(notificationId);
      fetchNotifications();
    } catch (error) {
      console.error('Leave action error:', error);
    } finally {
      setIsProcessingAction((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  // Close dropdown and manage focus trap + keyboard navigation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key === 'Tab') {
        if (!dropdownRef.current) return;
        const focusableElements = dropdownRef.current.querySelectorAll(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!dropdownRef.current) return;
        const items = dropdownRef.current.querySelectorAll('.notification-item');
        if (items.length === 0) return;
        
        const activeIndex = Array.from(items).indexOf(document.activeElement as Element);
        let nextIndex = activeIndex;
        
        if (event.key === 'ArrowDown') {
          nextIndex = activeIndex === -1 || activeIndex === items.length - 1 ? 0 : activeIndex + 1;
        } else {
          nextIndex = activeIndex === -1 || activeIndex === 0 ? items.length - 1 : activeIndex - 1;
        }
        
        (items[nextIndex] as HTMLElement).focus();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      
      // Auto focus first item on open
      const timer = setTimeout(() => {
        if (!dropdownRef.current) return;
        const firstBtn = dropdownRef.current.querySelector('button') as HTMLElement;
        firstBtn?.focus();
      }, 50);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
        clearTimeout(timer);
      };
    }
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
      const list = data.notifications || [];
      setNotifications(list);
      const unread = list.filter((n: Notification) => !n.read).length;
      setUnreadCount(unread);
      if (unread > 0) {
        setLiveAnnouncement(`Loaded ${list.length} notifications, ${unread} unread.`);
      }
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

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      setLiveAnnouncement('All notifications marked as read.');
    } catch (error) {
      // Silently fail - notification read status is optional
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    setLiveAnnouncement(`Notification marked as read: ${notification.title}`);
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'NEW_MESSAGE') {
      // Navigate to messages page
      router.push('/messages');
    } else if (notification.type === 'SCORE_DEDUCTION' || notification.type === 'NEW_FEEDBACK') {
      // Navigate to scoring page
      router.push('/scoring');
    } else if (notification.type === 'LEAVE_UPDATE') {
      // Navigate to leave page
      router.push('/leave');
    } else if (notification.type === 'LEAVE_REQUEST') {
      router.push('/leave/admin');
    } else if (notification.type === 'SHIFT_ASSIGNMENT') {
      // Navigate to shifts page
      router.push('/shifts/my-schedule');
    } else if (notification.type === 'NEW_REPORT') {
      // Navigate to QA page
      router.push('/qa');
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
      case 'LEAVE_REQUEST':
        return <Calendar size={16} className="text-amber-500" />;
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

      {/* Accessibility Announcements live region */}
      <div className="sr-only" role="status" aria-live="polite">
        {liveAnnouncement}
      </div>

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
          ref={triggerRef}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Toggle notifications menu"
          className="glass-pill relative flex h-12 w-12 items-center justify-center rounded-full cursor-pointer"
        >
          <Bell size={20} className="text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-background"></span>
            </span>
          )}
        </button>

        {isOpen && (
          <div 
            ref={dropdownRef}
            role="menu"
            aria-label="User notifications"
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
              <div className="p-4 text-center text-sm text-muted-foreground" role="menuitem">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => {
                const match = notification.message.match(/\[LeaveID:\s*([^\]]+)\]/);
                const leaveId = match ? match[1] : null;

                return (
                  <div
                    key={notification.id}
                    role="menuitem"
                    tabIndex={0}
                    className="notification-item w-full text-left cursor-pointer rounded-2xl p-3 hover:bg-white/5 focus:bg-white/5 focus:outline-none transition-colors"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground break-words whitespace-normal leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-semibold text-[10px]">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>

                        {/* Inline Actions for LEAVE_REQUEST */}
                        {notification.type === 'LEAVE_REQUEST' && leaveId && (
                          <div className="flex gap-1.5 mt-2.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleLeaveAction(notification.id, leaveId, 'APPROVED')}
                              disabled={isProcessingAction[notification.id]}
                              className="flex-1 text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-all text-center disabled:opacity-50"
                            >
                              {isProcessingAction[notification.id] ? (
                                <Loader2 size={10} className="animate-spin mx-auto" />
                              ) : (
                                'Approve'
                              )}
                            </button>
                            <button
                              onClick={() => handleLeaveAction(notification.id, leaveId, 'REJECTED')}
                              disabled={isProcessingAction[notification.id]}
                              className="flex-1 text-[10px] font-bold px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/25 transition-all text-center disabled:opacity-50"
                            >
                              {isProcessingAction[notification.id] ? (
                                <Loader2 size={10} className="animate-spin mx-auto" />
                              ) : (
                                'Reject'
                              )}
                            </button>
                            <button
                              onClick={() => {
                                router.push('/leave/admin');
                                setIsOpen(false);
                              }}
                              className="flex-1 text-[10px] font-bold px-2 py-1 rounded bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 transition-all text-center"
                            >
                              Open Queue
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}
