import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string | null;
  content: string;
  createdAt: string | Date;
  read: boolean;
  readAt: string | Date | null;
};

export function useChat(
  roomId: string,
  currentUser: { id: string; name: string } | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const client = supabase;

    if (!client || !currentUser || !roomId) return;

    // Connect to room-specific channel
    const channel = client.channel(`chat:${roomId}`);
    channelRef.current = channel;

    channel
      .on(
        'broadcast',
        { event: 'new_message' },
        (payload) => {
          const newMsg = payload.payload as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicates if the sender receives their own broadcast
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          
          // Try to play sound for incoming messages not from ourselves
          if (newMsg.senderId !== currentUser.id) {
            try {
              const audio = new Audio('/sounds/notification.mp3');
              audio.volume = 0.5;
              audio.play().catch(() => {
                // Ignore audio auto-play blocked errors
              });
            } catch {
              // Ignore audio errors
            }
          }
        }
      )
      .on(
        'broadcast',
        { event: 'typing' },
        (payload) => {
          const { userId, isTyping: typing } = payload.payload;
          if (userId !== currentUser.id) {
            setIsTyping((prev) => ({ ...prev, [userId]: typing }));
          }
        }
      )
      .on(
        'broadcast',
        { event: 'messages_read' },
        (payload) => {
          const { readerId } = payload.payload;
          // Update local state to mark messages read by this user as read
          setMessages((prev) =>
            prev.map((m) =>
              m.senderId === currentUser.id && m.receiverId === readerId && !m.read
                ? { ...m, read: true, readAt: new Date().toISOString() }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, currentUser]);

  const broadcastMessage = useCallback((message: ChatMessage) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'new_message',
        payload: message,
      });
    }
  }, []);

  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (channelRef.current && currentUser) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, isTyping },
      });
    }
  }, [currentUser]);

  const broadcastRead = useCallback((readerId: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'messages_read',
        payload: { readerId },
      });
    }
  }, []);

  return {
    messages,
    setMessages,
    isTyping,
    broadcastMessage,
    broadcastTyping,
    broadcastRead,
  };
}
