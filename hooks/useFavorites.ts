'use client';

import { useState, useEffect } from 'react';

export interface FavoriteItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  url: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('loomdesk_favorites');
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse favorites:', e);
      }
    }
  }, []);

  const addFavorite = (item: FavoriteItem) => {
    setFavorites((prev) => {
      const next = prev.some((i) => i.id === item.id && i.type === item.type)
        ? prev
        : [...prev, item];
      localStorage.setItem('loomdesk_favorites', JSON.stringify(next));
      return next;
    });
  };

  const removeFavorite = (id: string, type: string) => {
    setFavorites((prev) => {
      const next = prev.filter((i) => !(i.id === id && i.type === type));
      localStorage.setItem('loomdesk_favorites', JSON.stringify(next));
      return next;
    });
  };

  const toggleFavorite = (item: FavoriteItem) => {
    const isFav = favorites.some((i) => i.id === item.id && i.type === item.type);
    if (isFav) {
      removeFavorite(item.id, item.type);
    } else {
      addFavorite(item);
    }
  };

  const isFavorite = (id: string, type: string) => {
    return favorites.some((i) => i.id === id && i.type === type);
  };

  return {
    favorites: mounted ? favorites : [],
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
}
