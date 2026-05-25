import type { Session } from 'next-auth';
import { hasPermission, Permission } from './permissions';

type AuthSubject =
  | Session
  | Session['user']
  | {
      user?: Session['user'] | null;
      role?: string | null;
      permissions?: string[] | null;
    }
  | null
  | undefined;

function getUserFromInput(input: AuthSubject) {
  return input && 'user' in input ? input.user : input;
}

export function isAdmin(input: AuthSubject) {
  const user = getUserFromInput(input);
  return user?.role === 'ADMIN';
}

export function isTeamLead(input: AuthSubject) {
  const user = getUserFromInput(input);
  return user?.role === 'ADMIN' || user?.role === 'TEAM_LEAD';
}

export function isAuthorized(input: AuthSubject, permission: Permission): boolean {
  const user = getUserFromInput(input);
  return hasPermission(user as any, permission);
}
