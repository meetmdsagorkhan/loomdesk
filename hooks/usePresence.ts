import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type OnlineUser = {
  id: string;
  name: string;
  email: string;
  onlineAt: string;
};

export function usePresence(currentUser: { id: string; name: string; email: string } | null) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!supabase || !currentUser) return;

    // Create a global presence channel
    const channel = supabase.channel('presence:global', {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        
        // Flatten the presence state into a simple array
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences.length > 0) {
            users.push(presences[0] as OnlineUser);
          }
        });
        
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  return { onlineUsers };
}
