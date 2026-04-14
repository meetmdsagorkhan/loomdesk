import { auth } from '@/auth';

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin only');
  }

  return session;
}

export async function requireTeamLead() {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'TEAM_LEAD') {
    throw new Error('Forbidden: Admin or Team Lead only');
  }

  return session;
}

export function isAdmin(input: any) {
  // Support both session object and { user } object
  const user = input?.user || input;
  return user?.role === 'ADMIN';
}

export function isTeamLead(input: any) {
  // Support both session object and { user } object
  const user = input?.user || input;
  return user?.role === 'ADMIN' || user?.role === 'TEAM_LEAD';
}
