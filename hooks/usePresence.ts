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
    const client = supabase;

    if (!client || !currentUser) return;

    // Create a global presence channel
    const channel = client.channel('presence:global', {
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
          const presences = state[key] as OnlineUser[];
          if (presences.length > 0) {
            users.push(presences[0]);
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
      client.removeChannel(channel);
    };
  }, [currentUser]);

  return { onlineUsers };
}
