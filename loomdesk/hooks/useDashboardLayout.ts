'use client';

import { useState, useEffect } from 'react';

export interface WidgetConfig {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

const DEFAULT_ADMIN_WIDGETS: WidgetConfig[] = [
  { id: 'leaderboard', title: 'Operational Team Standing', visible: true, order: 0 },
  { id: 'system-status', title: 'System Status', visible: true, order: 1 },
  { id: 'leave-dispatch', title: 'Real-time Leave Dispatch', visible: true, order: 2 },
  { id: 'quick-actions', title: 'Quick Admin Actions', visible: true, order: 3 },
];

const DEFAULT_MEMBER_WIDGETS: WidgetConfig[] = [
  { id: 'zen-timer', title: 'Zen Focus Shift Timer', visible: true, order: 0 },
  { id: 'work-logging', title: 'Shift Work Logging', visible: true, order: 1 },
  { id: 'benchmarking', title: 'My Dashboard Benchmarking', visible: true, order: 2 },
  { id: 'quick-nav', title: 'Quick Navigation', visible: true, order: 3 },
  { id: 'coaching', title: 'Coaching & Growth opportunities', visible: true, order: 4 },
];

export function useDashboardLayout(isAdmin: boolean) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [mounted, setMounted] = useState(false);

  const key = isAdmin ? 'loomdesk_widgets_admin' : 'loomdesk_widgets_member';

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(key);
    const defaults = isAdmin ? DEFAULT_ADMIN_WIDGETS : DEFAULT_MEMBER_WIDGETS;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as WidgetConfig[];
        const merged = defaults.map((def) => {
          const match = parsed.find((p) => p.id === def.id);
          return match ? { ...def, visible: match.visible, order: match.order } : def;
        });
        merged.sort((a, b) => a.order - b.order);
        setWidgets(merged);
      } catch (e) {
        setWidgets(defaults);
      }
    } else {
      setWidgets(defaults);
    }
  }, [isAdmin, key]);

  const updateWidgets = (newWidgets: WidgetConfig[]) => {
    const ordered = newWidgets.map((w, index) => ({ ...w, order: index }));
    setWidgets(ordered);
    localStorage.setItem(key, JSON.stringify(ordered));
  };

  const toggleVisibility = (id: string) => {
    const next = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    updateWidgets(next);
  };

  const moveWidget = (dragIndex: number, hoverIndex: number) => {
    const next = [...widgets];
    const [dragged] = next.splice(dragIndex, 1);
    next.splice(hoverIndex, 0, dragged);
    updateWidgets(next);
  };

  return {
    widgets: mounted ? widgets : [],
    toggleVisibility,
    moveWidget,
    setWidgets: updateWidgets,
  };
}
