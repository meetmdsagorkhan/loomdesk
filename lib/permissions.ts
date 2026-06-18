import { Role } from '@prisma/client';
import type { Session } from 'next-auth';

export type Permission =
  | 'view_team_analytics'
  | 'manage_users'
  | 'manage_invitations'
  | 'manage_shifts'
  | 'manage_leaves'
  | 'score_reports'
  | 'view_all_reports'
  | 'view_audit_logs'
  | 'system_settings'
  | 'post_announcements';

// Implicit role-based defaults mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'view_team_analytics',
    'manage_users',
    'manage_invitations',
    'manage_shifts',
    'manage_leaves',
    'score_reports',
    'view_all_reports',
    'view_audit_logs',
    'system_settings',
    'post_announcements',
  ],
  TEAM_LEAD: [
    'view_team_analytics',
    'manage_shifts',
    'manage_leaves',
    'score_reports',
    'view_all_reports',
    'post_announcements',
  ],
  MEMBER: [],
};

type AuthUserSubject =
  | Session['user']
  | Role
  | string
  | {
      role?: Role | null;
      permissions?: string[] | null;
    }
  | null
  | undefined;

/**
 * Evaluates whether a user has a specific granular permission.
 * Supports standard role-based defaults, explicit user permission overrides,
 * and explicit denials (prefixed with "-").
 */
export function hasPermission(
  user: AuthUserSubject,
  permission: Permission
): boolean {
  if (!user) return false;

  let role: Role = 'MEMBER';
  let customPermissions: string[] = [];

  if (typeof user === 'string') {
    role = user as Role;
  } else if (user && typeof user === 'object') {
    role = (user.role as Role) || 'MEMBER';
    if ('permissions' in user && Array.isArray(user.permissions)) {
      customPermissions = user.permissions;
    }
  }

  // 1. Explicit denial override check: e.g. "-manage_shifts"
  if (customPermissions.includes(`-${permission}`)) {
    return false;
  }

  // 2. Explicit privilege override grant check: e.g. "manage_shifts"
  if (customPermissions.includes(permission)) {
    return true;
  }

  // 3. Fallback to implicit role-based defaults mapping
  const defaultRolePermissions = ROLE_PERMISSIONS[role] || [];
  return defaultRolePermissions.includes(permission);
}

/**
 * Next.js API Route authorization check helper.
 * Returns true if session user is authorized, throws or returns false if unauthorized.
 */
export function authorizeRequest(
  session: Session | null,
  permission: Permission
): boolean {
  if (!session?.user) {
    return false;
  }
  return hasPermission(session.user, permission);
}

/**
 * Middleware/Proxy routing guard check.
 */
export function canAccessRoute(role: Role | string | undefined | null, path: string): boolean {
  if (!role) return false;
  if (role === 'ADMIN') return true;

  // Normalize path to handle both /dashboard/xxx and /xxx
  const normalizedPath = path.startsWith('/dashboard/') 
    ? path.replace('/dashboard/', '/') 
    : path === '/dashboard' ? '/' : path;

  // Define strictly protected routes (Global Admin/Lead only)
  const routeProtections: { path: string; allowedRoles: Role[] }[] = [
    { path: '/analytics', allowedRoles: ['ADMIN', 'TEAM_LEAD'] },
  ];

  // Check if normalized path is protected
  const protection = routeProtections.find(p => normalizedPath.startsWith(p.path));
  
  if (protection) {
    return (protection.allowedRoles as string[]).includes(role as string);
  }

  // Default to allowing access (pages handle internal filtering)
  return true;
}
