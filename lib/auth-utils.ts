import type { Session } from 'next-auth';

type AuthSubject =
  | Session
  | Session['user']
  | {
      user?: Session['user'] | null;
      role?: string | null;
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
