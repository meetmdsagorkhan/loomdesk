import { supabase } from '@/lib/supabase';
import { prisma } from '@/lib/db';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type SupabaseNotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read?: boolean | null;
  created_at?: string | null;
  read?: boolean | null;
  createdAt?: string | null;
};

export function mapSupabaseNotification(row: SupabaseNotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: Boolean(row.is_read ?? row.read),
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  };
}

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
}) {
  if (!supabase) {
    return { success: false as const, reason: 'disabled' as const };
  }

  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
      },
    });

    if (supabase) {
      supabase.channel(`notifications:${input.userId}`).send({
        type: 'broadcast',
        event: 'new_notification',
        payload: notification
      });
    }

    return { success: true as const };
  } catch (error) {
    throw error;
  }

  return { success: true as const };
}
