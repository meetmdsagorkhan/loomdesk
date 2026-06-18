'use client';

import { useState, useEffect } from 'react';

export interface RecentItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  url: string;
  visitedAt: number;
}

export function useRecentlyViewed() {
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('loomdesk_recents');
    if (stored) {
      try {
        setRecents(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recents:', e);
      }
    }
  }, []);

  const recordVisit = (item: Omit<RecentItem, 'visitedAt'>) => {
    setRecents((prev) => {
      const filtered = prev.filter((i) => !(i.id === item.id && i.type === item.type));
      const newItem: RecentItem = { ...item, visitedAt: Date.now() };
      const next = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem('loomdesk_recents', JSON.stringify(next));
      return next;
    });
  };

  const clearRecents = () => {
    setRecents([]);
    localStorage.removeItem('loomdesk_recents');
  };

  return {
    recents: mounted ? recents : [],
    recordVisit,
    clearRecents,
  };
}
